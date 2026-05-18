const { logAction } = require("../utils/activityLog");

function registerServiceHandlers(ipcMain, db) {

  // ── LIST ──────────────────────────────────────────────────────────────────
  ipcMain.handle("list-services", async () => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT s.id, s.name, s.price, COALESCE(s.cost,0) AS cost,
                s.speed, s.notes, s.company_id, s.created_at,
                c.name AS company_name
         FROM services s
         LEFT JOIN companies c ON c.id = s.company_id
         ORDER BY s.name ASC`,
        [],
        (err, rows) => (err ? reject(err) : resolve(rows || []))
      );
    });
  });

  ipcMain.handle("add-service", async (event, payload) => {
    const name       = String(payload?.name  || "").trim();
    const price      = Number(payload?.price ?? 0);
    const cost       = Number(payload?.cost  ?? 0);
    const company_id = payload?.company_id ? Number(payload.company_id) : null;
    const speed      = String(payload?.speed || "").trim() || null;
    const notes      = String(payload?.notes || "").trim() || null;

    if (!name)                              return { ok: false, reason: "NAME_REQUIRED" };
    if (!Number.isFinite(price) || price < 0) return { ok: false, reason: "INVALID_PRICE" };

    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO services (name, price, cost, company_id, speed, notes) VALUES (?, ?, ?, ?, ?, ?)`,
        [name, price, cost, company_id, speed, notes],
        function (err) {
          if (err) {
            if (err.message?.includes("UNIQUE")) return resolve({ ok: false, reason: "DUPLICATE_NAME" });
            return reject(err);
          }
          logAction(db, { action:"ADD_SERVICE", entity:"services", entity_id:this.lastID,
            message:`Service created: ${name} @ $${price} (cost $${cost})` });
          resolve({ ok: true, id: this.lastID });
        }
      );
    });
  });

  ipcMain.handle("update-service", async (event, payload) => {
    const id         = Number(payload?.id);
    const name       = String(payload?.name  || "").trim();
    const price      = Number(payload?.price ?? 0);
    const cost       = Number(payload?.cost  ?? 0);
    const company_id = payload?.company_id ? Number(payload.company_id) : null;
    const speed      = String(payload?.speed || "").trim() || null;
    const notes      = String(payload?.notes || "").trim() || null;

    if (!Number.isFinite(id) || id <= 0)   return { ok: false, reason: "INVALID_ID" };
    if (!name)                              return { ok: false, reason: "NAME_REQUIRED" };
    if (!Number.isFinite(price) || price < 0) return { ok: false, reason: "INVALID_PRICE" };

    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE services SET name=?, price=?, cost=?, company_id=?, speed=?, notes=? WHERE id=?`,
        [name, price, cost, company_id, speed, notes, id],
        function (err) {
          if (err) {
            if (err.message?.includes("UNIQUE")) return resolve({ ok: false, reason: "DUPLICATE_NAME" });
            return reject(err);
          }
          if (this.changes === 0) return resolve({ ok: false, reason: "NOT_FOUND" });
          logAction(db, { action:"UPDATE_SERVICE", entity:"services", entity_id:id,
            message:`Service updated: ${name} @ $${price} (cost $${cost})` });
          resolve({ ok: true });
        }
      );
    });
  });

  // ── DELETE ────────────────────────────────────────────────────────────────
  // Block delete if any active user is on this service
  ipcMain.handle("delete-service", async (event, id) => {
    id = Number(id);
    if (!Number.isFinite(id) || id <= 0) return { ok: false, reason: "INVALID_ID" };

    // Check if any active (non-deleted) user uses this service
    const inUse = await new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(*) AS c FROM users WHERE service_id = ? AND COALESCE(is_deleted,0) = 0`,
        [id],
        (err, row) => (err ? reject(err) : resolve(Number(row?.c || 0)))
      );
    });

    if (inUse > 0) return { ok: false, reason: "IN_USE", count: inUse };

    return new Promise((resolve, reject) => {
      db.run(`DELETE FROM services WHERE id = ?`, [id], function (err) {
        if (err) return reject(err);
        if (this.changes === 0) return resolve({ ok: false, reason: "NOT_FOUND" });
        logAction(db, {
          action: "DELETE_SERVICE",
          entity: "services",
          entity_id: id,
          message: `Service deleted`,
        });
        resolve({ ok: true });
      });
    });
  });
}

module.exports = { registerServiceHandlers };