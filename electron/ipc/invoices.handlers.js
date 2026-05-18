const { logAction } = require("../utils/activityLog");
function currentMonthStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

// YYYY-MM -> next month string
function addMonthsToMonthStr(monthStr, add) {
  const [y, m] = String(monthStr).split("-").map(Number);
  const dt = new Date(y, m - 1 + add, 1);
  return currentMonthStr(dt);
}

// ISO date helpers: expiry_date stored as "YYYY-MM-DD"
function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseISODate(s) {
  if (!s) return null;
  const parts = String(s).split("-");
  if (parts.length !== 3) return null;
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d))
    return null;

  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d)
    return null;
  return dt;
}

// add months keeping day-of-month when possible; clamp to last day
function addMonthsISO(isoDate, months) {
  const base = parseISODate(isoDate);
  if (!base) return null;

  const y = base.getFullYear();
  const m = base.getMonth();
  const d = base.getDate();

  const candidate = new Date(y, m + months, d);

  // clamp to last day if month rollover changed day
  const targetMonth = (((m + months) % 12) + 12) % 12;
  if (candidate.getMonth() !== targetMonth) {
    const last = new Date(y, m + months + 1, 0);
    return toISODate(last);
  }
  return toISODate(candidate);
}

// status is automatic based on expiry_date (and blocked)
function calcStatus(blocked, expiry_date) {
  if (Number(blocked) === 1) return "SUSPENDED";
  const exp = parseISODate(expiry_date);
  if (!exp) return "INACTIVE";

  const today = new Date();
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const e = new Date(exp.getFullYear(), exp.getMonth(), exp.getDate());

  return t <= e ? "ACTIVE" : "INACTIVE";
}

function recalcUserStatus(db, userId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT id, blocked, expiry_date FROM users WHERE id = ? AND COALESCE(is_deleted,0)=0`,
      [userId],
      (err, u) => {
        if (err) return reject(err);
        if (!u) return resolve({ ok: false, reason: "USER_NOT_FOUND" });

        // Suspended takes priority
        if (Number(u.blocked) === 1) {
          return db.run(
            `UPDATE users SET status = 'SUSPENDED' WHERE id = ? AND COALESCE(is_deleted,0)=0`,
            [userId],
            (e) => e ? reject(e) : resolve({ ok: true, status: "SUSPENDED" })
          );
        }

        const currentMonth = currentMonthStr();

        // ONLY check: does the user have a PAID invoice for the current month?
        db.get(
          `SELECT id FROM invoices
           WHERE user_id = ?
             AND month = ?
             AND status = 'PAID'
             AND COALESCE(affects_expiry, 1) = 1
             AND COALESCE(is_deleted, 0) = 0
           LIMIT 1`,
          [userId, currentMonth],
          (err2, paidRow) => {
            if (err2) return reject(err2);

            const newStatus = paidRow ? "ACTIVE" : "INACTIVE";

            db.run(
              `UPDATE users SET status = ? WHERE id = ? AND COALESCE(is_deleted,0)=0`,
              [newStatus, userId],
              (err3) => {
                if (err3) reject(err3);
                else resolve({ ok: true, status: newStatus });
              }
            );
          }
        );
      },
    );
  });
}

function ensureInvoice(db, { user_id, month, amount, affects_expiry = 1 }) {
  const invNum = `INV-${new Date().toISOString().replace(/[-:.TZ]/g, "")}-${user_id}-${month}`;

  return new Promise((resolve, reject) => {
    db.get(
      `SELECT id, status FROM invoices
WHERE user_id = ? AND month = ?
  AND COALESCE(is_deleted,0)=0`,
      [user_id, month],
      (err, row) => {
        if (err) return reject(err);

        if (row)
          return resolve({ id: row.id, existed: true, status: row.status });

        db.run(
          `INSERT INTO invoices (invoice_number, user_id, month, amount, status, affects_expiry)
           VALUES (?, ?, ?, ?, 'UNPAID', ?)`,
          [invNum, user_id, month, amount, affects_expiry],
          function (err2) {
            if (err2) reject(err2);
            else resolve({ id: this.lastID, existed: false, status: "UNPAID" });
          },
        );
      },
    );
  });
}

function markInvoicePaid(db, invoiceId) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE invoices SET status='PAID', paid_at=?
WHERE id = ? AND COALESCE(is_deleted,0)=0`,
      [new Date().toISOString(), invoiceId],
      function (err) {
        if (err) reject(err);
        else resolve({ updated: this.changes });
      },
    );
  });
}

// Helper: insert a drawer OUT tagged with the invoice's company_id
function drawerOut(db, { invoiceId, amount, reason = "REFUND", actor = "system", note = null }) {
  db.get(
    `SELECT COALESCE(s.company_id, u.company_id) AS company_id
     FROM invoices i
     JOIN users u ON u.id = i.user_id
     LEFT JOIN services s ON s.id = u.service_id
     WHERE i.id = ?`,
    [invoiceId],
    (err, row) => {
      const company_id = err ? null : (row?.company_id || null);
      db.run(
        `INSERT INTO drawer_transactions (type, amount, reason, ref_type, ref_id, actor, note, company_id)
         VALUES ('OUT', ?, ?, 'invoice', ?, ?, ?, ?)`,
        [amount, reason, invoiceId, actor, note || null, company_id],
        () => {}
      );
    }
  );
}

function registerInvoiceHandlers(ipcMain, db) {
  // --------------------------
  // create-invoice (manual) — allows multiple invoices per month
  ipcMain.handle("create-invoice", async (event, invoice) => {
    return new Promise((resolve, reject) => {
      const nowIso  = new Date().toISOString();
      const status  = invoice.status || "UNPAID";
      const paidDate = status === "PAID" ? nowIso : null;
      const affects = invoice.affects_expiry == null ? 1
        : Number(invoice.affects_expiry) ? 1 : 0;

      // Auto-generate invoice number if not provided
      const invNum = invoice.invoice_number ||
        `INV-${nowIso.replace(/[-:.TZ]/g,"")}-${invoice.user_id}`;

      db.run(
        `INSERT INTO invoices (invoice_number, user_id, month, amount, status, paid_at, affects_expiry, type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [invNum, invoice.user_id, invoice.month, invoice.amount, status, paidDate, affects, "MANUAL"],
        function (err) {
          if (err) return reject(err);
          logAction(db, {
            action: "CREATE_INVOICE",
            entity: "invoices",
            entity_id: this.lastID,
            message: `Invoice created for user ${invoice.user_id} month ${invoice.month}`,
          });
          resolve({ ok: true, id: this.lastID });
        }
      );
    });
  });

  // --------------------------
  // list invoices for one user (small history)
  ipcMain.handle("list-user-invoices", async (event, userId) => {
    const id = Number(userId);
    if (!Number.isFinite(id)) return [];

    return new Promise((resolve, reject) => {
      db.all(
        `
      SELECT
        i.id, i.invoice_number, i.month, i.amount, i.status, i.created_at, i.paid_at,
        COALESCE(i.affects_expiry, 1) AS affects_expiry
      FROM invoices i
      WHERE i.user_id = ?
        AND COALESCE(i.is_deleted, 0) = 0
      ORDER BY i.month DESC, i.id DESC
      LIMIT 12
      `,
        [id],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        },
      );
    });
  });

  // --------------------------
  // list-invoices (filters)
  ipcMain.handle("list-invoices", async (event, filters) => {
    const month  = filters?.month  || null;
    const status = filters?.status || "ALL";
    const search = (filters?.search || "").trim();
    const userId = filters?.user_id ? Number(filters.user_id) : null;
    const type   = filters?.type   || "ALL";
    const paidOn = (filters?.paidOn || "").trim();
    const service = (filters?.service || "").trim();
    const address = (filters?.address || "").trim();
    const region  = (filters?.region  || "").trim();
    const limit   = Number(filters?.limit  || 500);
    const offset  = Number(filters?.offset || 0);

    return new Promise((resolve, reject) => {
      let sql = `
      SELECT
        invoices.*,
        users.name AS user_name,
        users.mobile AS user_mobile,
        users.address AS user_address,
        services.name AS user_service,
        users.expiry_date AS user_expiry_date,
        users.balance AS user_balance,
        users.region AS user_region
      FROM invoices
      LEFT JOIN users ON users.id = invoices.user_id
      LEFT JOIN services ON services.id = users.service_id
      WHERE 1=1
    `;
      const params = [];

      // ✅ soft delete filters
      sql += ` AND COALESCE(invoices.is_deleted, 0) = 0`;
      sql += ` AND COALESCE(users.is_deleted, 0) = 0`;

      // ✅ single user filter
      if (userId && Number.isFinite(userId)) {
        sql += ` AND invoices.user_id = ?`;
        params.push(userId);
      }

      // month
      if (month) {
        sql += ` AND invoices.month = ?`;
        params.push(month);
      }

      // status
      if (status !== "ALL") {
        sql += ` AND invoices.status = ?`;
        params.push(status);
      }

      // ✅ type (affects_expiry)
      if (type !== "ALL") {
        sql += ` AND COALESCE(invoices.affects_expiry, 1) = ?`;
        params.push(type === "STATIC" ? 0 : 1);
      }

      // ✅ paidOn exact date (forces PAID)
      // Works because paid_date is ISO datetime, and SQLite date() extracts date part.
      if (paidOn) {
        sql += ` AND invoices.status = 'PAID' AND date(invoices.paid_at) = date(?)`;
        params.push(paidOn);
      }

      // ✅ user field filters
      if (service) {
        sql += ` AND services.name LIKE ?`;
        params.push(`%${service}%`);
      }

      if (address) {
        sql += ` AND users.address LIKE ?`;
        params.push(`%${address}%`);
      }

      if (region) {
        sql += ` AND users.region LIKE ?`;
        params.push(`%${region}%`);
      }

      // search (keep yours)
      if (search) {
        sql += ` AND (
        users.name LIKE ? OR
        users.mobile LIKE ? OR
        users.username LIKE ? OR
        users.address LIKE ? OR
        services.name LIKE ? OR
        invoices.invoice_number LIKE ?
      )`;
        const like = `%${search}%`;
        params.push(like, like, like, like, like, like);
      }

      sql += ` ORDER BY invoices.id DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  });
  ipcMain.handle("list-paid-days", async (event, payload) => {
    const month = payload?.month || null; // YYYY-MM or null

    return new Promise((resolve, reject) => {
      let sql = `
      SELECT date(paid_at) AS day, COUNT(*) AS count
      FROM invoices
      WHERE status = 'PAID' AND paid_at IS NOT NULL AND COALESCE(is_deleted,0)=0
    `;
      const params = [];

      if (month && /^\d{4}-\d{2}$/.test(month)) {
        sql += ` AND month = ?`;
        params.push(month);
      }

      sql += `
      GROUP BY date(paid_at)
      ORDER BY day DESC
      LIMIT 60
    `;

      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []); // [{day:'2026-02-01', count:5}, ...]
      });
    });
  });

  // --------------------------
  // get-invoice
  ipcMain.handle("get-invoice", async (event, id) => {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          invoices.*,
          users.name AS user_name,
          users.mobile AS user_mobile,
          users.address AS user_address,
          services.name AS user_service
        FROM invoices
        LEFT JOIN users ON users.id = invoices.user_id
        LEFT JOIN services ON services.id = users.service_id
        WHERE invoices.id = ?
  AND COALESCE(invoices.is_deleted, 0) = 0
  AND COALESCE(users.is_deleted, 0) = 0

        LIMIT 1
      `;
      db.get(sql, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    });
  });

  // --------------------------
  // delete-invoice (SOFT DELETE)
  ipcMain.handle("delete-invoice", async (event, payload) => {
    // support both delete-invoice(id) and delete-invoice({ id, actor, reason })
    const invoiceId =
      typeof payload === "object" && payload !== null
        ? Number(payload.id)
        : Number(payload);

    const actor =
      typeof payload === "object" && payload !== null ? payload.actor : null;

    const reason =
      typeof payload === "object" && payload !== null ? payload.reason : null;

    if (!Number.isFinite(invoiceId)) return { ok: false, reason: "INVALID" };

    // get invoice + user info (ignore already-deleted invoices)
    const inv = await new Promise((resolve, reject) => {
      db.get(
        `
      SELECT
        i.id,
        i.user_id,
        i.status,
        COALESCE(i.affects_expiry, 1) AS affects_expiry,
        u.expiry_date,
        u.blocked
      FROM invoices i
      JOIN users u ON u.id = i.user_id
      WHERE i.id = ?
        AND COALESCE(i.is_deleted, 0) = 0
      `,
        [invoiceId],
        (err, row) => (err ? reject(err) : resolve(row || null)),
      );
    });

    if (!inv) return { ok: false, reason: "NOT_FOUND" };

    const now = new Date().toISOString();

    const shiftMonth = (dateStr, delta) => {
      const d = dateStr ? new Date(dateStr) : new Date();
      d.setMonth(d.getMonth() + delta);
      return d.toISOString().slice(0, 10);
    };

    // Get paid sum before deleting
    const paidSum = await new Promise((resolve) => {
      db.get(
        `SELECT COALESCE(SUM(amount),0) AS s FROM payments
         WHERE invoice_id=? AND COALESCE(is_deleted,0)=0`,
        [invoiceId],
        (err, row) => resolve(err ? 0 : Number(row?.s || 0))
      );
    });

    return await new Promise((resolve, reject) => {
      db.serialize(async () => {
        db.run("BEGIN TRANSACTION");

        // Soft-delete payments linked to this invoice
        db.run(
          `UPDATE payments SET is_deleted=1, deleted_at=?, deleted_by=?, delete_reason=?
           WHERE invoice_id=? AND COALESCE(is_deleted,0)=0`,
          [now, actor || "system", "INVOICE_DELETED", invoiceId],
          (err1) => {
            if (err1) { db.run("ROLLBACK"); return reject(err1); }

            // Soft-delete invoice itself
            db.run(
              `UPDATE invoices SET is_deleted=1, deleted_at=?, deleted_by=?, delete_reason=?
               WHERE id=? AND COALESCE(is_deleted,0)=0`,
              [now, actor || "system", reason || "MANUAL_DELETE", invoiceId],
              async function(err2) {
                if (err2) { db.run("ROLLBACK"); return reject(err2); }

                try {
                  // Revert expiry if PAID subscription invoice
                  if (inv.status === "PAID" && Number(inv.affects_expiry) === 1 && Number(inv.blocked) === 0) {
                    const newExpiry = shiftMonth(inv.expiry_date, -1);
                    await new Promise((res, rej) => {
                      db.run(
                        `UPDATE users SET expiry_date=? WHERE id=? AND COALESCE(is_deleted,0)=0`,
                        [newExpiry, inv.user_id],
                        (e) => e ? rej(e) : res()
                      );
                    });
                  }

                  await recalcUserStatus(db, inv.user_id);

                  db.run("COMMIT", (errC) => {
                    if (errC) return reject(errC);

                    // Drawer OUT for paid amount (fire-and-forget after commit)
                    if (paidSum > 0) {
                      drawerOut(db, {
                        invoiceId,
                        amount: paidSum,
                        reason: "INVOICE_DELETED",
                        actor:  actor || "system",
                        note:   `Invoice deleted — was ${inv.status} $${paidSum.toFixed(2)}`,
                      });
                    }

                    logAction(db, { actor: actor || "system", action:"DELETE_INVOICE",
                      entity:"invoices", entity_id:invoiceId,
                      message:`Invoice archived — was ${inv.status}, paid $${paidSum}` });

                    resolve({ ok:true, deleted:this.changes, was_status:inv.status, paid_sum:paidSum });
                  });
                } catch(e) {
                  db.run("ROLLBACK", () => {});
                  reject(e);
                }
              }
            );
          }
        );
      });
    });
  });

  // --------------------------
  // set-invoice-status (with affects_expiry)
  ipcMain.handle("set-invoice-status", async (event, payload) => {
    const { id, status } = payload;
    const nowIso = new Date().toISOString();

    const inv = await new Promise((resolve, reject) => {
      db.get(
        `
        SELECT
          i.id,
          i.status AS old_status,
          i.user_id,
          COALESCE(i.affects_expiry, 1) AS affects_expiry,
          u.expiry_date,
          u.blocked
        FROM invoices i
        JOIN users u ON u.id = i.user_id
        WHERE i.id = ?
        AND COALESCE(i.is_deleted,0)=0
AND COALESCE(u.is_deleted,0)=0
        `,
        [id],
        (err, row) => (err ? reject(err) : resolve(row)),
      );
    });

    if (!inv) return { ok: false, reason: "NOT_FOUND" };

    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE invoices
SET status = ?, paid_at = ?
WHERE id = ? AND COALESCE(is_deleted,0)=0`,
        [status, status === "PAID" ? nowIso : null, id],
        (err) => (err ? reject(err) : resolve()),
      );
    });

    // blocked users never change expiry
    if (Number(inv.blocked) === 1) {
      if (status === "UNPAID" && inv.old_status === "PAID") {
        await new Promise((resolve, reject) => {
          db.run(
            `UPDATE payments
             SET is_deleted = 1, deleted_at = ?, deleted_by = 'system', delete_reason = 'INVOICE_UNPAID'
             WHERE invoice_id = ? AND COALESCE(is_deleted, 0) = 0`,
            [nowIso, id],
            (err) => (err ? reject(err) : resolve())
          );
        });
      }
      await recalcUserStatus(db, inv.user_id);
      return { ok: true, note: "blocked-user" };
    }

    // static invoices don't change expiry but still need payment cleanup
    if (Number(inv.affects_expiry) === 0) {
      if (status === "UNPAID" && inv.old_status === "PAID") {
        // soft-delete payments
        const paidSum = await new Promise((resolve) => {
          db.get(
            `SELECT COALESCE(SUM(amount), 0) AS s FROM payments
             WHERE invoice_id = ? AND COALESCE(is_deleted, 0) = 0`,
            [id],
            (err, row) => resolve(err ? 0 : Number(row?.s || 0))
          );
        });
        await new Promise((resolve, reject) => {
          db.run(
            `UPDATE payments
             SET is_deleted = 1, deleted_at = ?, deleted_by = 'system', delete_reason = 'INVOICE_UNPAID'
             WHERE invoice_id = ? AND COALESCE(is_deleted, 0) = 0`,
            [nowIso, id],
            (err) => (err ? reject(err) : resolve())
          );
        });
        if (paidSum > 0) {
          db.run(
            `INSERT INTO drawer_transactions (type, amount, reason, ref_type, ref_id, actor, note)
             VALUES ('OUT', ?, 'REFUND', 'invoice', ?, 'system', ?)`,
            [paidSum, id, `Static invoice unpaid: refund $${paidSum.toFixed(2)}`],
            () => {}
          );
        }
      }
      await recalcUserStatus(db, inv.user_id);
      return { ok: true, note: "static-invoice" };
    }

    const shiftMonth = (dateStr, delta) => {
      const d = dateStr ? new Date(dateStr) : new Date();
      d.setMonth(d.getMonth() + delta);
      return d.toISOString().slice(0, 10);
    };

    if (inv.old_status !== status) {
      if (status === "PAID") {
        const newExpiry = shiftMonth(inv.expiry_date, +1);
        await new Promise((resolve, reject) => {
          db.run(
            `UPDATE users SET expiry_date = ? WHERE id = ? AND COALESCE(is_deleted,0)=0
`,
            [newExpiry, inv.user_id],
            (err) => (err ? reject(err) : resolve()),
          );
        });
      }

      if (status === "UNPAID" && inv.old_status === "PAID") {
        const newExpiry = shiftMonth(inv.expiry_date, -1);
        await new Promise((resolve, reject) => {
          db.run(
            `UPDATE users SET expiry_date = ? WHERE id = ? AND COALESCE(is_deleted,0)=0`,
            [newExpiry, inv.user_id],
            (err) => (err ? reject(err) : resolve()),
          );
        });

        // ── Get paid sum BEFORE soft-deleting payments ──
        const paidSum = await new Promise((resolve) => {
          db.get(
            `SELECT COALESCE(SUM(amount), 0) AS s FROM payments
             WHERE invoice_id = ? AND COALESCE(is_deleted, 0) = 0`,
            [id],
            (err, row) => resolve(err ? 0 : Number(row?.s || 0))
          );
        });

        // ── Soft-delete all payment rows for this invoice ──
        await new Promise((resolve, reject) => {
          db.run(
            `UPDATE payments
             SET is_deleted = 1, deleted_at = ?, deleted_by = 'system', delete_reason = 'INVOICE_UNPAID'
             WHERE invoice_id = ? AND COALESCE(is_deleted, 0) = 0`,
            [nowIso, id],
            (err) => (err ? reject(err) : resolve())
          );
        });

        // ── Drawer OUT: withdraw the total paid amount ──
        if (paidSum > 0) {
          db.run(
            `INSERT INTO drawer_transactions (type, amount, reason, ref_type, ref_id, actor, note)
             VALUES ('OUT', ?, 'REFUND', 'invoice', ?, 'system', ?)`,
            [paidSum, id, `Invoice unpaid: refund $${paidSum.toFixed(2)}`],
            () => {}
          );
        }
      }
    }

    await recalcUserStatus(db, inv.user_id);
    logAction(db, {
  action: "SET_INVOICE_STATUS",
  entity: "invoices",
  entity_id: id,
  message: `Invoice status changed to ${status}`
});
    return { ok: true };
  });

  // --------------------------
  // generate-month-payments (subscription only)
  ipcMain.handle("generate-month-payments", async (event, payload) => {
    const { month } = payload || {};
    if (!month || !/^\d{4}-\d{2}$/.test(month))
      return { ok: false, reason: "INVALID_MONTH" };

    const nowIso = new Date().toISOString();

    const addOneMonth = (expiry_date) => {
      const base = expiry_date ? new Date(expiry_date) : new Date();
      base.setMonth(base.getMonth() + 1);
      return base.toISOString().slice(0, 10);
    };

    return await new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        // Compute last day of target month so <= catches overdue users too
        const [yStr, mStr] = month.split("-");
        const lastDay = new Date(Number(yStr), Number(mStr), 0);
        const monthEnd =
          `${lastDay.getFullYear()}-` +
          `${String(lastDay.getMonth() + 1).padStart(2, "0")}-` +
          `${String(lastDay.getDate()).padStart(2, "0")}`;

        const insertSql = `
          INSERT INTO invoices (invoice_number, user_id, month, amount, status, created_at, affects_expiry)
          SELECT
            ('INV-' || strftime('%Y%m%d%H%M%S','now') || '-' || u.id),
            u.id,
            ?,
            COALESCE(NULLIF(u.price, 0), s.price, 0),
            'UNPAID',
            CURRENT_TIMESTAMP,
            1
          FROM users u
          LEFT JOIN services s ON s.id = u.service_id
          WHERE COALESCE(u.blocked, 0) = 0
            AND COALESCE(u.is_deleted, 0) = 0
            AND u.expiry_date IS NOT NULL
            AND u.expiry_date <= ?
            AND NOT EXISTS (
              SELECT 1 FROM invoices i
              WHERE i.user_id = u.id
                AND i.month = ?
                AND COALESCE(i.is_deleted, 0) = 0
            )
        `;

        db.run(insertSql, [month, monthEnd, month], function (err1) {
          if (err1) {
            db.run("ROLLBACK");
            return reject(err1);
          }

          const inserted = this.changes || 0;

          const eligibleSql = `
            SELECT
              i.id AS invoice_id,
              i.user_id,
              COALESCE(i.amount, 0) AS amount,
              COALESCE(u.balance, 0) AS balance,
              u.expiry_date,
              COALESCE(u.blocked, 0) AS blocked
            FROM invoices i
            JOIN users u ON u.id = i.user_id
            WHERE i.month = ?
              AND i.status = 'UNPAID'
              AND COALESCE(i.affects_expiry, 1) = 1
              AND COALESCE(u.blocked, 0) = 0
              AND COALESCE(i.amount, 0) > 0
              AND COALESCE(u.balance, 0) >= COALESCE(i.amount, 0)
              AND COALESCE(i.is_deleted,0)=0
              AND COALESCE(u.is_deleted,0)=0
          `;

          db.all(eligibleSql, [month], (err2, rows) => {
            if (err2) {
              db.run("ROLLBACK");
              return reject(err2);
            }

            let autoPaid = 0;

            const processNext = (idx) => {
              if (idx >= rows.length) {
                db.run("COMMIT", (errC) => {
                  if (errC) return reject(errC);
                  logAction(db, {
  action: "GENERATE_MONTH_INVOICES",
  entity: "invoices",
  message: `Generated invoices for ${month} (created ${inserted}, autoPaid ${autoPaid})`
});

resolve({ ok: true, inserted, autoPaid, month });
                });
                return;
              }

              const r = rows[idx];
              const newBalance = Number(r.balance) - Number(r.amount);
              const newExpiry = addOneMonth(r.expiry_date);

              db.run(
                `UPDATE invoices
   SET status = 'PAID', paid_at = ?
   WHERE id = ? AND COALESCE(is_deleted,0)=0`,
                [nowIso, r.invoice_id],
                (err3) => {
                  if (err3) {
                    db.run("ROLLBACK");
                    return reject(err3);
                  }

                  db.run(
                    `UPDATE users
   SET balance = ?, expiry_date = ?
   WHERE id = ? AND COALESCE(is_deleted,0)=0`,
                    [newBalance, newExpiry, r.user_id],
                    async (err4) => {
                      if (err4) {
                        db.run("ROLLBACK");
                        return reject(err4);
                      }

                      // Record wallet DEBIT so wallet history stays in sync
                      db.run(
                        `INSERT INTO wallet_transactions (user_id, type, amount, ref_type, ref_id, note)
                         VALUES (?, 'DEBIT', ?, 'invoice', ?, ?)`,
                        [r.user_id, r.amount, r.invoice_id,
                         `Auto-paid invoice for ${month}`],
                        () => {}
                      );

                      autoPaid++;

                      try {
                        await recalcUserStatus(db, r.user_id);
                      } catch {}

                      processNext(idx + 1);
                    },
                  );
                },
              );
            };

            processNext(0);
          });
        });
      });
    });
  });

  // --------------------------
  // adjust-balance
  ipcMain.handle("adjust-balance", async (event, payload) => {
    const userId = payload?.user_id;
    const delta = Number(payload?.delta);

    if (!userId || !Number.isFinite(delta) || delta === 0) {
      return { ok: false, reason: "INVALID" };
    }

    const u = await new Promise((resolve, reject) => {
      db.get(
        `SELECT id, balance FROM users WHERE id = ? AND COALESCE(is_deleted,0)=0`,
        [userId],
        (err, row) => (err ? reject(err) : resolve(row || null)),
      );
    });

    if (!u) return { ok: false, reason: "USER_NOT_FOUND" };

    const curBal = Number(u.balance || 0);
    const nextBal = curBal + delta;

    if (nextBal < 0)
      return { ok: false, reason: "INSUFFICIENT_BALANCE", balance: curBal };

    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE users SET balance = ? WHERE id = ? AND COALESCE(is_deleted,0)=0`,
        [nextBal, userId],
        (err) => (err ? reject(err) : resolve()),
      );
    });

    return { ok: true, balance: nextBal };
  });

  // --------------------------
  // apply-subscription-payment (creates/marks invoices paid + extends expiry + optional balance)
  ipcMain.handle("apply-subscription-payment", async (event, payload) => {
    const userId = payload?.user_id;
    const months = Math.max(1, Number(payload?.months || 1));
    const useBalance = Boolean(payload?.use_balance);

    if (!userId || !Number.isFinite(months) || months <= 0) {
      return { ok: false, reason: "INVALID" };
    }

    const user = await new Promise((resolve, reject) => {
      db.get(
        `SELECT id, blocked, status, price, balance, expiry_date FROM users WHERE id = ? AND COALESCE(is_deleted,0)=0`,
        [userId],
        (err, row) => (err ? reject(err) : resolve(row || null)),
      );
    });

    if (!user) return { ok: false, reason: "USER_NOT_FOUND" };

    if (Number(user.blocked) === 1 || user.status === "SUSPENDED") {
      return { ok: false, reason: "BLOCKED" };
    }

    const price = Number(user.price || 0);
    if (price <= 0) return { ok: false, reason: "NO_PRICE" };

    const total = price * months;
    const curBalance = Number(user.balance || 0);

    if (useBalance && curBalance < total) {
      return {
        ok: false,
        reason: "INSUFFICIENT_BALANCE",
        need: total,
        balance: curBalance,
      };
    }

    await new Promise((resolve, reject) =>
      db.run("BEGIN TRANSACTION", (e) => (e ? reject(e) : resolve())),
    );

    try {
      let monthStr = currentMonthStr();
      for (let i = 0; i < months; i++) {
        const ensured = await ensureInvoice(db, {
          user_id: userId,
          month: monthStr,
          amount: price,
          affects_expiry: 1,
        });
        await markInvoicePaid(db, ensured.id);
        monthStr = addMonthsToMonthStr(monthStr, 1);
      }

      const base = user.expiry_date ? user.expiry_date : toISODate(new Date());
      const nextExpiry = addMonthsISO(base, months);
      if (!nextExpiry) throw new Error("BAD_EXPIRY");

      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE users SET expiry_date = ? WHERE id = ? AND COALESCE(is_deleted,0)=0`,
          [nextExpiry, userId],
          (err) => (err ? reject(err) : resolve()),
        );
      });

      let newBalance = curBalance;
      if (useBalance) {
        newBalance = curBalance - total;
        await new Promise((resolve, reject) => {
          db.run(
            `UPDATE users SET balance = ? WHERE id = ? AND COALESCE(is_deleted,0)=0`,
            [newBalance, userId],
            (err) => (err ? reject(err) : resolve()),
          );
        });
      }

      await recalcUserStatus(db, userId);

      await new Promise((resolve, reject) =>
        db.run("COMMIT", (e) => (e ? reject(e) : resolve())),
      );

      return {
        ok: true,
        months,
        price,
        total,
        balance: newBalance,
        expiry_date: nextExpiry,
      };
    } catch (e) {
      await new Promise((resolve) => db.run("ROLLBACK", () => resolve()));
      return { ok: false, reason: "FAILED", error: String(e?.message || e) };
    }
  });

  // --------------------------
  // ✅ NEW: create-static-payment (PAID invoice, affects_expiry=0, logs to payments)
  ipcMain.handle("create-static-payment", async (event, payload) => {
    const userId = Number(payload?.user_id);
    const amount = Number(payload?.amount);
    const note = String(payload?.note || "").trim();
    const method = String(payload?.method || "CASH").trim();

    if (!Number.isFinite(userId) || userId <= 0)
      return { ok: false, reason: "INVALID" };
    if (!Number.isFinite(amount) || amount <= 0)
      return { ok: false, reason: "INVALID" };

    const u = await new Promise((resolve, reject) => {
      db.get(
        `SELECT id FROM users WHERE id = ? AND COALESCE(is_deleted,0)=0`,
        [userId],
        (err, row) => (err ? reject(err) : resolve(row || null)),
      );
    });
    if (!u) return { ok: false, reason: "USER_NOT_FOUND" };

    const nowIso = new Date().toISOString();
    const month = currentMonthStr();
    const invNum = `ST-${nowIso.replace(/[-:.TZ]/g, "")}-${userId}`;

    await new Promise((resolve, reject) =>
      db.run("BEGIN TRANSACTION", (e) => (e ? reject(e) : resolve())),
    );

    try {
      const invoiceId = await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO invoices (invoice_number, user_id, month, amount, status, paid_at, affects_expiry, type)
           VALUES (?, ?, ?, ?, 'PAID', ?, 0, 'MANUAL')`,
          [invNum, userId, month, amount, nowIso],
          function (err) {
            if (err) reject(err);
            else resolve(this.lastID);
          },
        );
      });

      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO payments (user_id, invoice_id, amount, paid_at, method, note)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [userId, invoiceId, amount, nowIso, method, note || null],
          (err) => (err ? reject(err) : resolve()),
        );
      });

      await recalcUserStatus(db, userId);

      await new Promise((resolve, reject) =>
        db.run("COMMIT", (e) => (e ? reject(e) : resolve())),
      );

      logAction(db, {
  action: "CREATE_STATIC_PAYMENT",
  entity: "payments",
  entity_id: invoiceId,
  message: `Static payment created for user ${userId}`
});

return { ok: true, invoice_id: invoiceId };
    } catch (e) {
      await new Promise((resolve) => db.run("ROLLBACK", () => resolve()));
      return { ok: false, reason: "FAILED", error: String(e?.message || e) };
    }
  });
  ipcMain.handle("get-user-month-payments", async (event, payload) => {
    const userId = Number(payload?.user_id);
    const month = payload?.month;

    if (!Number.isFinite(userId) || !/^\d{4}-\d{2}$/.test(month)) {
      return [];
    }

    return new Promise((resolve, reject) => {
      db.all(
        `
      SELECT
        invoices.*,
        users.name AS user_name,
        users.mobile AS user_mobile,
        services.name AS user_service,
        users.expiry_date AS user_expiry_date,
        users.balance AS user_balance
      FROM invoices
      JOIN users ON users.id = invoices.user_id
      LEFT JOIN services ON services.id = users.service_id
      WHERE invoices.user_id = ?
        AND invoices.month = ?
        AND COALESCE(invoices.is_deleted,0)=0
        AND COALESCE(users.is_deleted,0)=0

      ORDER BY
        COALESCE(invoices.affects_expiry, 1) DESC,
        invoices.created_at ASC
      `,
        [userId, month],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        },
      );
    });
  });

  // -------- LIST PAYMENTS (soft-delete safe) --------
ipcMain.handle("list-payments", async (event, filters) => {
  const userId = Number(filters?.user_id || 0);
  const month = (filters?.month || "").trim(); // optional YYYY-MM

  return new Promise((resolve, reject) => {
    let sql = `
      SELECT
        p.*,
        u.name AS user_name,
        u.mobile AS user_mobile,
        i.invoice_number AS invoice_number,
        i.month AS invoice_month
      FROM payments p
      LEFT JOIN users u ON u.id = p.user_id
      LEFT JOIN invoices i ON i.id = p.invoice_id
      WHERE COALESCE(p.is_deleted,0)=0
        AND COALESCE(u.is_deleted,0)=0
    `;
    const params = [];

    if (userId) {
      sql += ` AND p.user_id = ?`;
      params.push(userId);
    }

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      // month based on invoice month (best), fallback: paid_at month
      sql += ` AND (i.month = ? OR strftime('%Y-%m', p.paid_at) = ?)`;
      params.push(month, month);
    }

    sql += ` ORDER BY p.paid_at DESC, p.id DESC LIMIT 500`;

    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
});

// -------- DELETE PAYMENT (SOFT DELETE) --------
ipcMain.handle("delete-payment", async (event, payload) => {
  // supports delete-payment(id) and delete-payment({ id, actor, reason })
  const paymentId =
    typeof payload === "object" && payload !== null ? Number(payload.id) : Number(payload);

  const actor =
    typeof payload === "object" && payload !== null ? payload.actor : null;

  const reason =
    typeof payload === "object" && payload !== null ? payload.reason : null;

  if (!Number.isFinite(paymentId)) return { ok: false, reason: "INVALID" };

  const now = new Date().toISOString();

  return new Promise((resolve, reject) => {
    db.run(
      `
      UPDATE payments
      SET
        is_deleted = 1,
        deleted_at = ?,
        deleted_by = ?,
        delete_reason = ?
      WHERE id = ?
        AND COALESCE(is_deleted,0)=0
      `,
      [now, actor || "system", reason || null, paymentId],
      function (err) {
        if (err) return reject(err);
        resolve({ ok: true, deleted: this.changes });
      }
    );
  });
});

}

module.exports = { registerInvoiceHandlers };