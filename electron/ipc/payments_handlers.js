const { logAction } = require("../utils/activityLog");

// ─────────────────────────────────────────────────────────────────────────────
// Helper: push a cash IN entry to drawer_transactions
// ─────────────────────────────────────────────────────────────────────────────
function drawerIn(db, { amount_usd = 0, amount_lbp = 0, reason = "PAYMENT", ref_type = "payment", ref_id = null, actor = "system", note = null, company_id = null }) {
  const amount = amount_usd; // legacy column
  db.run(
    `INSERT INTO drawer_transactions (type, amount, amount_usd, amount_lbp, reason, ref_type, ref_id, actor, note, company_id)
     VALUES ('IN', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [amount, amount_usd, amount_lbp, reason, ref_type, ref_id, actor, note || null, company_id || null],
    () => {}
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: recalc invoice status from actual payments sum
// ─────────────────────────────────────────────────────────────────────────────
function recalcInvoiceStatus(db, invoiceId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT i.amount,
              COALESCE(SUM(CASE WHEN p.is_deleted = 0 THEN p.amount ELSE 0 END), 0) AS paid_sum
       FROM invoices i
       LEFT JOIN payments p ON p.invoice_id = i.id
       WHERE i.id = ?
       GROUP BY i.id`,
      [invoiceId],
      (err, row) => {
        if (err) return reject(err);
        if (!row) return resolve("UNPAID");
        const paidSum = Number(row.paid_sum || 0);
        const amount  = Number(row.amount  || 0);
        let status = "UNPAID";
        if (paidSum >= amount && amount > 0) status = "PAID";
        else if (paidSum > 0)                status = "PARTIAL";
        resolve(status);
      }
    );
  });
}

function registerPaymentHandlers(ipcMain, db) {

  // ── GET LBP RATE ──────────────────────────────────────────────────────────
  ipcMain.handle("get-lbp-rate", async () => {
    return new Promise((resolve, reject) => {
      db.get(`SELECT value FROM settings WHERE key = 'lbp_rate'`, [], (err, row) => {
        if (err) return reject(err);
        resolve({ ok: true, rate: Number(row?.value || 0) });
      });
    });
  });

  // ── PAY INVOICE ───────────────────────────────────────────────────────────
  ipcMain.handle("pay-invoice", async (event, payload) => {
    const invoiceId = Number(payload?.invoice_id);
    const usdAmount = Number(payload?.usd_amount || 0);
    const lbpAmount = Number(payload?.lbp_amount || 0);
    const lbpRate   = Number(payload?.lbp_rate   || 0);
    const method    = String(payload?.method || "CASH").trim();
    const note      = String(payload?.note   || "").trim() || null;
    const actor     = String(payload?.actor  || "system").trim();

    if (!Number.isFinite(invoiceId) || invoiceId <= 0)
      return { ok: false, reason: "INVALID_INVOICE" };
    if (usdAmount < 0 || lbpAmount < 0)
      return { ok: false, reason: "NEGATIVE_AMOUNT" };
    if (lbpAmount > 0 && (!Number.isFinite(lbpRate) || lbpRate <= 0))
      return { ok: false, reason: "LBP_RATE_REQUIRED" };

    const lbpAsUsd = lbpAmount > 0 ? lbpAmount / lbpRate : 0;
    const totalUsd = usdAmount + lbpAsUsd;

    if (totalUsd <= 0)
      return { ok: false, reason: "ZERO_AMOUNT" };

    // Load invoice
    const inv = await new Promise((resolve, reject) =>
      db.get(
        `SELECT i.*, u.expiry_date, u.blocked, u.balance,
                COALESCE(s.company_id, u.company_id) AS company_id
         FROM invoices i
         JOIN users u ON u.id = i.user_id
         LEFT JOIN services s ON s.id = u.service_id
         WHERE i.id = ? AND i.is_deleted = 0`,
        [invoiceId],
        (err, row) => (err ? reject(err) : resolve(row || null))
      )
    );
    if (!inv) return { ok: false, reason: "INVOICE_NOT_FOUND" };
    if (inv.status === "PAID") return { ok: false, reason: "ALREADY_PAID" };

    // How much already paid?
    const alreadyPaid = await new Promise((resolve, reject) =>
      db.get(
        `SELECT COALESCE(SUM(amount), 0) AS s FROM payments
         WHERE invoice_id = ? AND is_deleted = 0`,
        [invoiceId],
        (err, row) => (err ? reject(err) : resolve(Number(row?.s || 0)))
      )
    );

    const invoiceAmount = Number(inv.amount || 0);
    const remaining     = invoiceAmount - alreadyPaid;
    const effectiveUsd  = Math.min(totalUsd, remaining);
    if (effectiveUsd <= 0)
      return { ok: false, reason: "ALREADY_PAID" };

    // Scale lbp/usd proportionally if capped
    const scale        = totalUsd > 0 ? effectiveUsd / totalUsd : 1;
    const effectiveUsdOnly = usdAmount * scale;
    const effectiveLbp     = lbpAmount * scale;

    const nowIso = new Date().toISOString();

    const paymentNote = [
      note,
      lbpAmount > 0 ? `LBP ${lbpAmount.toLocaleString()} @ ${lbpRate} = $${lbpAsUsd.toFixed(2)}` : null,
      usdAmount > 0 ? `USD $${usdAmount.toFixed(2)}` : null,
    ].filter(Boolean).join(" | ") || null;

    await db_run(db, "BEGIN TRANSACTION");
    try {
      // 1. Insert payment
      const paymentId = await new Promise((resolve, reject) =>
        db.run(
          `INSERT INTO payments (user_id, invoice_id, amount, method, note, paid_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [inv.user_id, invoiceId, effectiveUsd, method, paymentNote, nowIso],
          function (err) { err ? reject(err) : resolve(this.lastID); }
        )
      );

      // 2. Recalc invoice status
      const newStatus = await recalcInvoiceStatus(db, invoiceId);
      await db_run(db,
        `UPDATE invoices SET status = ?, paid_at = ? WHERE id = ?`,
        [newStatus, newStatus === "PAID" ? nowIso : inv.paid_at, invoiceId]
      );

      // 3. Extend expiry if fully paid
      if (newStatus === "PAID" && Number(inv.affects_expiry) === 1 && Number(inv.blocked) !== 1) {
        const base      = inv.expiry_date || nowIso.slice(0, 10);
        const newExpiry = addOneMonthISO(base);
        await db_run(db,
          `UPDATE users SET expiry_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [newExpiry, inv.user_id]
        );
      }

      // 4. Recalc user status
      await recalcUserStatus(db, inv.user_id);

      await db_run(db, "COMMIT");

      // 5. Drawer IN — now records both USD and LBP separately
      drawerIn(db, {
        amount_usd: effectiveUsdOnly,
        amount_lbp: effectiveLbp,
        reason:     "PAYMENT",
        ref_type:   "payment",
        ref_id:     paymentId,
        actor,
        note:       `Invoice #${inv.invoice_number || invoiceId}`,
        company_id: inv.company_id || null,
      });

      logAction(db, {
        actor,
        action: "PAY_INVOICE",
        entity: "payments",
        entity_id: paymentId,
        message: `Payment $${effectiveUsd.toFixed(2)} on invoice ${inv.invoice_number || invoiceId} → ${newStatus}`,
      });

      return {
        ok: true,
        payment_id:     paymentId,
        paid_usd:       effectiveUsd,
        invoice_status: newStatus,
      };
    } catch (e) {
      await db_run(db, "ROLLBACK").catch(() => {});
      return { ok: false, reason: "FAILED", error: String(e?.message || e) };
    }
  });

  // ── GET INVOICE DETAIL ────────────────────────────────────────────────────
  ipcMain.handle("get-invoice-detail", async (event, invoiceId) => {
    invoiceId = Number(invoiceId);
    if (!Number.isFinite(invoiceId)) return null;

    return new Promise((resolve, reject) => {
      db.get(
        `SELECT
           i.*,
           u.name AS user_name,
           u.mobile AS user_mobile,
           u.expiry_date AS user_expiry_date,
           u.balance AS user_balance,
           s.name AS service_name,
           COALESCE(SUM(CASE WHEN p.is_deleted = 0 THEN p.amount ELSE 0 END), 0) AS paid_sum
         FROM invoices i
         LEFT JOIN users u ON u.id = i.user_id
         LEFT JOIN services s ON s.id = i.service_id
         LEFT JOIN payments p ON p.invoice_id = i.id
         WHERE i.id = ? AND i.is_deleted = 0
         GROUP BY i.id`,
        [invoiceId],
        (err, row) => {
          if (err) return reject(err);
          if (!row) return resolve(null);
          resolve({
            ...row,
            paid_sum:  Number(row.paid_sum || 0),
            remaining: Math.max(0, Number(row.amount || 0) - Number(row.paid_sum || 0)),
          });
        }
      );
    });
  });

  // ── LIST PAYMENTS FOR INVOICE ─────────────────────────────────────────────
  ipcMain.handle("list-invoice-payments", async (event, invoiceId) => {
    invoiceId = Number(invoiceId);
    if (!Number.isFinite(invoiceId)) return [];

    return new Promise((resolve, reject) => {
      db.all(
        `SELECT p.*, u.name AS user_name
         FROM payments p
         LEFT JOIN users u ON u.id = p.user_id
         WHERE p.invoice_id = ? AND p.is_deleted = 0
         ORDER BY p.paid_at ASC`,
        [invoiceId],
        (err, rows) => (err ? reject(err) : resolve(rows || []))
      );
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
function db_run(db, sql, params = []) {
  return new Promise((resolve, reject) =>
    db.run(sql, params, (err) => (err ? reject(err) : resolve()))
  );
}

function addOneMonthISO(isoDate) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(y, m, d);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function recalcUserStatus(db, userId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT blocked, expiry_date FROM users WHERE id = ? AND COALESCE(is_deleted,0) = 0`,
      [userId],
      (err, u) => {
        if (err || !u) return resolve();
        let status = "INACTIVE";
        if (Number(u.blocked) === 1) {
          status = "SUSPENDED";
        } else if (u.expiry_date) {
          const exp = new Date(u.expiry_date + "T23:59:59");
          status = new Date() <= exp ? "ACTIVE" : "INACTIVE";
        }
        db.run(
          `UPDATE users SET status = ? WHERE id = ?`,
          [status, userId],
          (err2) => (err2 ? reject(err2) : resolve())
        );
      }
    );
  });
}

module.exports = { registerPaymentHandlers };