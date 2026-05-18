// electron/ipc/company_handlers.js
const { logAction } = require("../utils/activityLog");

function registerCompanyHandlers(ipcMain, db) {

  // ── LIST ────────────────────────────────────────────────────────────────
  ipcMain.handle("list-companies", async () => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT c.*,
           (SELECT COUNT(*) FROM services s WHERE s.company_id = c.id) AS service_count
         FROM companies c
         ORDER BY c.name ASC`,
        [],
        (err, rows) => err ? reject(err) : resolve(rows || [])
      );
    });
  });

  // ── ADD ─────────────────────────────────────────────────────────────────
  ipcMain.handle("add-company", async (event, p) => {
    const name    = String(p?.name    || "").trim();
    const contact = String(p?.contact || "").trim() || null;
    const phone   = String(p?.phone   || "").trim() || null;
    const notes   = String(p?.notes   || "").trim() || null;

    if (!name) return { ok: false, reason: "NAME_REQUIRED" };

    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO companies (name, contact, phone, notes) VALUES (?, ?, ?, ?)`,
        [name, contact, phone, notes],
        function(err) {
          if (err) {
            if (err.message?.includes("UNIQUE")) return resolve({ ok: false, reason: "DUPLICATE" });
            return reject(err);
          }
          logAction(db, { action:"ADD_COMPANY", entity:"companies", entity_id:this.lastID, message:`Company: ${name}` });
          resolve({ ok: true, id: this.lastID });
        }
      );
    });
  });

  // ── UPDATE ───────────────────────────────────────────────────────────────
  ipcMain.handle("update-company", async (event, p) => {
    const id      = Number(p?.id);
    const name    = String(p?.name    || "").trim();
    const contact = String(p?.contact || "").trim() || null;
    const phone   = String(p?.phone   || "").trim() || null;
    const notes   = String(p?.notes   || "").trim() || null;

    if (!id || !name) return { ok: false, reason: "INVALID" };

    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE companies SET name=?, contact=?, phone=?, notes=? WHERE id=?`,
        [name, contact, phone, notes, id],
        function(err) {
          if (err) return reject(err);
          resolve({ ok: true, changes: this.changes });
        }
      );
    });
  });

  // ── DELETE ───────────────────────────────────────────────────────────────
  ipcMain.handle("delete-company", async (event, id) => {
    id = Number(id);

    const inUse = await new Promise((res, rej) =>
      db.get(`SELECT COUNT(*) AS c FROM services WHERE company_id = ?`, [id],
        (err, row) => err ? rej(err) : res(Number(row?.c || 0)))
    );
    if (inUse > 0) return { ok: false, reason: "IN_USE", count: inUse };

    return new Promise((resolve, reject) => {
      db.serialize(() => {
        // Preserve drawer history — NULL out company_id so transactions
        // stay visible in "All Combined" but no longer tied to this company
        db.run(
          `UPDATE drawer_transactions SET company_id = NULL WHERE company_id = ?`,
          [id],
          () => {}
        );

        db.run(`DELETE FROM companies WHERE id = ?`, [id], function(err) {
          if (err) return reject(err);
          resolve({ ok: true });
        });
      });
    });
  });

  // ── PROFIT REPORT ─────────────────────────────────────────────────────────
  // Returns per-service: revenue, cost, profit, user_count for a given month
  ipcMain.handle("get-profit-report", async (event, { month }) => {
    if (!month) return [];

    return new Promise((resolve, reject) => {
      db.all(
        `SELECT
           s.id               AS service_id,
           s.name             AS service_name,
           s.price            AS sell_price,
           COALESCE(s.cost,0) AS cost_price,
           c.name             AS company_name,
           -- how many users are on this service (active)
           (SELECT COUNT(*) FROM users u
            WHERE u.service_id = s.id AND COALESCE(u.is_deleted,0)=0) AS user_count,
           -- revenue = sum of PAID invoices this month for this service
           COALESCE((
             SELECT SUM(i.amount) FROM invoices i
             JOIN users u ON u.id = i.user_id
             WHERE u.service_id = s.id
               AND i.month = ?
               AND i.status = 'PAID'
               AND COALESCE(i.is_deleted,0)=0
           ), 0) AS revenue,
           -- unpaid = sum of UNPAID invoices this month
           COALESCE((
             SELECT SUM(i.amount) FROM invoices i
             JOIN users u ON u.id = i.user_id
             WHERE u.service_id = s.id
               AND i.month = ?
               AND i.status != 'PAID'
               AND COALESCE(i.is_deleted,0)=0
           ), 0) AS unpaid
         FROM services s
         LEFT JOIN companies c ON c.id = s.company_id
         ORDER BY s.name ASC`,
        [month, month],
        (err, rows) => {
          if (err) return reject(err);
          const result = (rows || []).map(r => ({
            ...r,
            cost_total: Number(r.cost_price || 0) * Number(r.user_count || 0),
            profit:     Number(r.revenue    || 0) - (Number(r.cost_price || 0) * Number(r.user_count || 0)),
          }));
          resolve(result);
        }
      );
    });
  });

}

module.exports = { registerCompanyHandlers };