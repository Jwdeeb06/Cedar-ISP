const { logAction } = require("../utils/activityLog");

function registerDrawerHandlers(ipcMain, db) {

  // -------- ADD TRANSACTION (IN or OUT) --------
  ipcMain.handle("drawer-add", async (event, payload) => {
    const type   = String(payload?.type || "").toUpperCase();   // IN | OUT
    const amount = Number(payload?.amount);
    const reason = String(payload?.reason || "MANUAL").trim();
    const note   = String(payload?.note   || "").trim();
    const actor      = String(payload?.actor  || "system").trim();
    const company_id = payload?.company_id ? Number(payload.company_id) : null;

    if (type !== "IN" && type !== "OUT")
      return { ok: false, reason: "INVALID_TYPE" };

    if (!Number.isFinite(amount) || amount <= 0)
      return { ok: false, reason: "INVALID_AMOUNT" };

    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO drawer_transactions
          (type, amount, reason, ref_type, ref_id, actor, note, company_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          type,
          amount,
          reason,
          payload?.ref_type || payload?.reference_type || null,
          payload?.ref_id   || payload?.reference_id   || null,
          actor,
          note || null,
          company_id,
        ],
        function (err) {
          if (err) return reject(err);

          logAction(db, {
            actor,
            action: type === "IN" ? "DRAWER_IN" : "DRAWER_OUT",
            entity: "drawer_transactions",
            entity_id: this.lastID,
            message: `Drawer ${type}: ${amount} — ${reason}`,
          });

          resolve({ ok: true, id: this.lastID });
        }
      );
    });
  });

  // -------- LIST TRANSACTIONS --------
  ipcMain.handle("drawer-list", async (event, filters) => {
    const day        = (filters?.day    || "").trim();
    const month      = (filters?.month  || "").trim();
    const dateFrom   = (filters?.dateFrom || "").trim();
    const dateTo     = (filters?.dateTo   || "").trim();
    const type       = (filters?.type     || "").trim();
    const reason     = (filters?.reason   || "").trim();
    const actor      = (filters?.actor    || "").trim();
    const search     = (filters?.search   || "").trim();
    const company_id = filters?.company_id ? Number(filters.company_id) : null;
    const limit      = Number(filters?.limit  || 200);
    const offset     = Number(filters?.offset || 0);

    return new Promise((resolve, reject) => {
      let sql = `SELECT * FROM drawer_transactions WHERE 1=1`;
      const params = [];

      // Date range takes priority over month/day
      if (dateFrom && dateTo) {
        sql += ` AND date(created_at) >= date(?) AND date(created_at) <= date(?)`;
        params.push(dateFrom, dateTo);
      } else if (day) {
        sql += ` AND date(created_at) = date(?)`;
        params.push(day);
      } else if (month && /^\d{4}-\d{2}$/.test(month)) {
        sql += ` AND strftime('%Y-%m', created_at) = ?`;
        params.push(month);
      }

      if (type === "IN" || type === "OUT") {
        sql += ` AND type = ?`;
        params.push(type);
      }
      if (reason) {
        sql += ` AND reason = ?`;
        params.push(reason);
      }
      if (actor) {
        sql += ` AND actor = ?`;
        params.push(actor);
      }
      if (search) {
        sql += ` AND (note LIKE ? OR reason LIKE ? OR actor LIKE ?)`;
        const like = `%${search}%`;
        params.push(like, like, like);
      }
      if (company_id) {
        sql += ` AND company_id = ?`;
        params.push(company_id);
      }

      sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  });

  // -------- SUMMARY (balance + totals) --------
  ipcMain.handle("drawer-summary", async (event, filters) => {
    const day        = (filters?.day      || "").trim();
    const month      = (filters?.month    || "").trim();
    const dateFrom   = (filters?.dateFrom || "").trim();
    const dateTo     = (filters?.dateTo   || "").trim();
    const reason     = (filters?.reason   || "").trim();
    const actor      = (filters?.actor    || "").trim();
    const company_id = filters?.company_id ? Number(filters.company_id) : null;

    return new Promise((resolve, reject) => {
      let where = "WHERE 1=1";
      const params = [];

      if (dateFrom && dateTo) {
        where += ` AND date(created_at) >= date(?) AND date(created_at) <= date(?)`;
        params.push(dateFrom, dateTo);
      } else if (day) {
        where += ` AND date(created_at) = date(?)`;
        params.push(day);
      } else if (month && /^\d{4}-\d{2}$/.test(month)) {
        where += ` AND strftime('%Y-%m', created_at) = ?`;
        params.push(month);
      }

      if (reason) { where += ` AND reason = ?`; params.push(reason); }
      if (actor)  { where += ` AND actor = ?`;  params.push(actor);  }
      if (company_id) {
        where += ` AND company_id = ?`;
        params.push(company_id);
      }

      const sql = `
        SELECT
          COALESCE(SUM(CASE WHEN type='IN'  THEN amount ELSE 0 END), 0) AS total_in,
          COALESCE(SUM(CASE WHEN type='OUT' THEN amount ELSE 0 END), 0) AS total_out,
          COUNT(*) AS tx_count
        FROM drawer_transactions
        ${where}
      `;

      db.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve({
          total_in:  Number(row?.total_in  || 0),
          total_out: Number(row?.total_out || 0),
          balance:   Number(row?.total_in  || 0) - Number(row?.total_out || 0),
          tx_count:  Number(row?.tx_count  || 0),
        });
      });
    });
  });

  // -------- ALL-TIME BALANCE (for header badge) --------
  ipcMain.handle("drawer-balance", async (event, filters) => {
    const company_id = filters?.company_id ? Number(filters.company_id) : null;
    return new Promise((resolve, reject) => {
      let sql = `SELECT
           COALESCE(SUM(CASE WHEN type='IN'  THEN amount ELSE 0 END), 0) AS total_in,
           COALESCE(SUM(CASE WHEN type='OUT' THEN amount ELSE 0 END), 0) AS total_out
         FROM drawer_transactions WHERE 1=1`;
      const params = [];
      if (company_id) { sql += ` AND company_id = ?`; params.push(company_id); }
      db.get(sql, params, (err, row) => {
        if (err) return reject(err);
        const balance = Number(row?.total_in || 0) - Number(row?.total_out || 0);
        resolve({ ok: true, balance });
      });
    });
  });

  // -------- DAILY SUMMARY LIST (for calendar/history view) --------
  ipcMain.handle("drawer-daily-list", async (event, filters) => {
    const month = (filters?.month || "").trim();
    const limit = Number(filters?.limit || 60);

    return new Promise((resolve, reject) => {
      let where = "WHERE 1=1";
      const params = [];

      if (month && /^\d{4}-\d{2}$/.test(month)) {
        where += ` AND strftime('%Y-%m', created_at) = ?`;
        params.push(month);
      }

      const sql = `
        SELECT
          date(created_at) AS day,
          COALESCE(SUM(CASE WHEN type='IN'  THEN amount ELSE 0 END), 0) AS total_in,
          COALESCE(SUM(CASE WHEN type='OUT' THEN amount ELSE 0 END), 0) AS total_out,
          COUNT(*) AS tx_count
        FROM drawer_transactions
        ${where}
        GROUP BY date(created_at)
        ORDER BY day DESC
        LIMIT ?
      `;
      params.push(limit);

      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  });

  // -------- DELETE TRANSACTION --------
  // ── Drawer delete — PERMANENTLY DISABLED ─────────────────────────────────
  // Drawer transactions are the financial ledger and cannot be deleted.
  // This handler exists only to return a clear error if called.
  ipcMain.handle("drawer-delete", async () => {
    return { ok: false, reason: "FORBIDDEN",
      message: "Drawer transactions are permanent financial records and cannot be deleted." };
  });
  // -------- DISTINCT ACTORS (for filter dropdown) --------
  ipcMain.handle("drawer-actors", async (event, filters) => {
    const company_id = filters?.company_id ? Number(filters.company_id) : null;
    let sql = `SELECT DISTINCT actor FROM drawer_transactions WHERE actor IS NOT NULL`;
    const params = [];
    if (company_id) { sql += ` AND company_id = ?`; params.push(company_id); }
    sql += ` ORDER BY actor ASC`;
    return new Promise((res, rej) =>
      db.all(sql, params, (e, r) => e ? rej(e) : res((r || []).map(row => row.actor)))
    );
  });

  // ── Migrate: assign existing NULL drawer transactions to companies ────────
  // Based on the invoice/payment ref → look up the user → get company_id
  ipcMain.handle("migrate-drawer-companies", async () => {
    return new Promise((resolve, reject) => {
      // Update drawer transactions that came from payments
      // by joining through payments → invoices → users → company_id
      db.run(
        `UPDATE drawer_transactions
         SET company_id = (
           SELECT COALESCE(s.company_id, u.company_id)
           FROM payments p
           JOIN invoices i ON i.id = p.invoice_id
           JOIN users    u ON u.id = i.user_id
           LEFT JOIN services s ON s.id = u.service_id
           WHERE p.id = drawer_transactions.ref_id
             AND COALESCE(s.company_id, u.company_id) IS NOT NULL
         )
         WHERE ref_type = 'payment'
           AND company_id IS NULL`,
        [],
        function(err) {
          if (err) return reject(err);
          resolve({ ok: true, updated: this.changes });
        }
      );
    });
  });
}

module.exports = { registerDrawerHandlers };