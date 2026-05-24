const { logAction } = require("../utils/activityLog");

function registerDrawerHandlers(ipcMain, db) {

  // -------- ADD TRANSACTION --------
  ipcMain.handle("drawer-add", async (event, payload) => {
    const type       = String(payload?.type || "").toUpperCase();
    const amount_usd = Number(payload?.amount_usd ?? payload?.amount ?? 0);
    const amount_lbp = Number(payload?.amount_lbp ?? 0);
    const reason     = String(payload?.reason || "MANUAL").trim();
    const note       = String(payload?.note   || "").trim();
    const actor      = String(payload?.actor  || "system").trim();
    const company_id = payload?.company_id ? Number(payload.company_id) : null;

    if (type !== "IN" && type !== "OUT")
      return { ok: false, reason: "INVALID_TYPE" };
    if (amount_usd === 0 && amount_lbp === 0)
      return { ok: false, reason: "INVALID_AMOUNT" };

    const amount = amount_usd;

    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO drawer_transactions
          (type, amount, amount_usd, amount_lbp, reason, ref_type, ref_id, actor, note, company_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [type, amount, amount_usd, amount_lbp, reason,
         payload?.ref_type || null, payload?.ref_id || null,
         actor, note || null, company_id],
        function (err) {
          if (err) return resolve({ ok: false, reason: err.message });
          logAction(db, {
            actor,
            action: type === "IN" ? "DRAWER_IN" : "DRAWER_OUT",
            entity: "drawer_transactions",
            entity_id: this.lastID,
            message: `Drawer ${type}: USD ${amount_usd} / LBP ${amount_lbp} — ${reason}`,
          });
          resolve({ ok: true, id: this.lastID });
        }
      );
    });
  });

  // -------- LIST TRANSACTIONS --------
  ipcMain.handle("drawer-list", async (event, filters) => {
    const day        = (filters?.day      || "").trim();
    const month      = (filters?.month    || "").trim();
    const dateFrom   = (filters?.dateFrom || "").trim();
    const dateTo     = (filters?.dateTo   || "").trim();
    const type       = (filters?.type     || "").trim();
    const reason     = (filters?.reason   || "").trim();
    const actor      = (filters?.actor    || "").trim();
    const search     = (filters?.search   || "").trim();
    const company_id = filters?.company_id ? Number(filters.company_id) : null;
    const limit      = Number(filters?.limit  || 200);
    const offset     = Number(filters?.offset || 0);

    let sql = `SELECT * FROM drawer_transactions WHERE 1=1`;
    const params = [];

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

    if (type === "IN" || type === "OUT") { sql += ` AND type = ?`; params.push(type); }
    if (reason)  { sql += ` AND reason = ?`; params.push(reason); }
    if (actor)   { sql += ` AND actor = ?`;  params.push(actor); }
    if (search)  {
      sql += ` AND (note LIKE ? OR reason LIKE ? OR actor LIKE ?)`;
      const like = `%${search}%`;
      params.push(like, like, like);
    }
    if (company_id) { sql += ` AND company_id = ?`; params.push(company_id); }

    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    return new Promise((resolve, reject) =>
      db.all(sql, params, (err, rows) => err ? resolve([]) : resolve(rows || []))
    );
  });

  // -------- SUMMARY --------
  ipcMain.handle("drawer-summary", async (event, filters) => {
    const day        = (filters?.day      || "").trim();
    const month      = (filters?.month    || "").trim();
    const dateFrom   = (filters?.dateFrom || "").trim();
    const dateTo     = (filters?.dateTo   || "").trim();
    const reason     = (filters?.reason   || "").trim();
    const actor      = (filters?.actor    || "").trim();
    const company_id = filters?.company_id ? Number(filters.company_id) : null;

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

    if (reason)     { where += ` AND reason = ?`;     params.push(reason); }
    if (actor)      { where += ` AND actor = ?`;      params.push(actor); }
    if (company_id) { where += ` AND company_id = ?`; params.push(company_id); }

    const sql = `
      SELECT
        COALESCE(SUM(CASE WHEN type='IN'  THEN COALESCE(amount_usd,0) ELSE 0 END), 0) AS total_in_usd,
        COALESCE(SUM(CASE WHEN type='OUT' THEN COALESCE(amount_usd,0) ELSE 0 END), 0) AS total_out_usd,
        COALESCE(SUM(CASE WHEN type='IN'  THEN COALESCE(amount_lbp,0) ELSE 0 END), 0) AS total_in_lbp,
        COALESCE(SUM(CASE WHEN type='OUT' THEN COALESCE(amount_lbp,0) ELSE 0 END), 0) AS total_out_lbp,
        COUNT(*) AS tx_count
      FROM drawer_transactions ${where}
    `;

    return new Promise((resolve) =>
      db.get(sql, params, (err, row) => {
        if (err) return resolve({ total_in_usd:0, total_out_usd:0, total_in_lbp:0, total_out_lbp:0, balance_usd:0, balance_lbp:0, tx_count:0 });
        const total_in_usd  = Number(row?.total_in_usd  || 0);
        const total_out_usd = Number(row?.total_out_usd || 0);
        const total_in_lbp  = Number(row?.total_in_lbp  || 0);
        const total_out_lbp = Number(row?.total_out_lbp || 0);
        resolve({
          total_in_usd, total_out_usd,
          total_in_lbp, total_out_lbp,
          balance_usd: total_in_usd - total_out_usd,
          balance_lbp: total_in_lbp - total_out_lbp,
          tx_count: Number(row?.tx_count || 0),
        });
      })
    );
  });

  // -------- ALL-TIME BALANCE --------
  ipcMain.handle("drawer-balance", async (event, filters) => {
    const company_id = filters?.company_id ? Number(filters.company_id) : null;
    let sql = `SELECT
      COALESCE(SUM(CASE WHEN type='IN'  THEN COALESCE(amount_usd,0) ELSE 0 END), 0) AS total_in_usd,
      COALESCE(SUM(CASE WHEN type='OUT' THEN COALESCE(amount_usd,0) ELSE 0 END), 0) AS total_out_usd,
      COALESCE(SUM(CASE WHEN type='IN'  THEN COALESCE(amount_lbp,0) ELSE 0 END), 0) AS total_in_lbp,
      COALESCE(SUM(CASE WHEN type='OUT' THEN COALESCE(amount_lbp,0) ELSE 0 END), 0) AS total_out_lbp
    FROM drawer_transactions WHERE 1=1`;
    const params = [];
    if (company_id) { sql += ` AND company_id = ?`; params.push(company_id); }

    return new Promise((resolve) =>
      db.get(sql, params, (err, row) => {
        const balance_usd = Number(row?.total_in_usd || 0) - Number(row?.total_out_usd || 0);
        const balance_lbp = Number(row?.total_in_lbp || 0) - Number(row?.total_out_lbp || 0);
        resolve({ ok: true, balance: balance_usd, balance_usd, balance_lbp });
      })
    );
  });

  // -------- DAILY SUMMARY LIST --------
  ipcMain.handle("drawer-daily-list", async (event, filters) => {
    const month = (filters?.month || "").trim();
    const limit = Number(filters?.limit || 60);

    let where = "WHERE 1=1";
    const params = [];

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      where += ` AND strftime('%Y-%m', created_at) = ?`;
      params.push(month);
    }

    const sql = `
      SELECT
        date(created_at) AS day,
        COALESCE(SUM(CASE WHEN type='IN'  THEN COALESCE(amount_usd,0) ELSE 0 END), 0) AS total_in_usd,
        COALESCE(SUM(CASE WHEN type='OUT' THEN COALESCE(amount_usd,0) ELSE 0 END), 0) AS total_out_usd,
        COALESCE(SUM(CASE WHEN type='IN'  THEN COALESCE(amount_lbp,0) ELSE 0 END), 0) AS total_in_lbp,
        COALESCE(SUM(CASE WHEN type='OUT' THEN COALESCE(amount_lbp,0) ELSE 0 END), 0) AS total_out_lbp,
        COUNT(*) AS tx_count
      FROM drawer_transactions
      ${where}
      GROUP BY date(created_at)
      ORDER BY day DESC
      LIMIT ?
    `;
    params.push(limit);

    return new Promise((resolve) =>
      db.all(sql, params, (err, rows) => resolve(err ? [] : (rows || [])))
    );
  });

  // -------- DELETE (DISABLED) --------
  ipcMain.handle("drawer-delete", async () => ({
    ok: false, reason: "FORBIDDEN",
    message: "Drawer transactions are permanent financial records and cannot be deleted.",
  }));

  // -------- DISTINCT ACTORS --------
  ipcMain.handle("drawer-actors", async (event, filters) => {
    const company_id = filters?.company_id ? Number(filters.company_id) : null;
    let sql = `SELECT DISTINCT actor FROM drawer_transactions WHERE actor IS NOT NULL`;
    const params = [];
    if (company_id) { sql += ` AND company_id = ?`; params.push(company_id); }
    sql += ` ORDER BY actor ASC`;
    return new Promise((resolve) =>
      db.all(sql, params, (err, rows) => resolve(err ? [] : (rows || []).map(r => r.actor)))
    );
  });

  // -------- MIGRATE COMPANIES --------
  ipcMain.handle("migrate-drawer-companies", async () => {
    return new Promise((resolve) =>
      db.run(`
        UPDATE drawer_transactions
        SET company_id = (
          SELECT COALESCE(s.company_id, u.company_id)
          FROM payments p
          JOIN invoices i ON i.id = p.invoice_id
          JOIN users    u ON u.id = i.user_id
          LEFT JOIN services s ON s.id = u.service_id
          WHERE p.id = drawer_transactions.ref_id
            AND COALESCE(s.company_id, u.company_id) IS NOT NULL
        )
        WHERE ref_type = 'payment' AND company_id IS NULL
      `, [], function(err) {
        err ? resolve({ ok: false, reason: err.message }) : resolve({ ok: true, updated: this.changes });
      })
    );
  });
}

module.exports = { registerDrawerHandlers };