// electron/ipc/map_handlers.js
const { logAction } = require("../utils/activityLog");

function registerMapHandlers(ipcMain, db) {

  // ════════════════════════════════════════════════════════════
  // USERS – location only
  // ════════════════════════════════════════════════════════════

  ipcMain.handle("map-get-users", async () => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT u.id, u.name, u.username, u.mobile, s.name AS service, u.status, u.blocked,
                u.expiry_date, u.price, u.balance, u.address,
                u.lat, u.lng
         FROM users u
         LEFT JOIN services s ON s.id = u.service_id
         WHERE COALESCE(u.is_deleted, 0) = 0
           AND u.lat IS NOT NULL
           AND u.lng IS NOT NULL`,
        [],
        (err, rows) => (err ? reject(err) : resolve(rows || []))
      );
    });
  });

  // Update lat/lng only (called from location picker)
  ipcMain.handle("map-update-user-location", async (event, payload) => {
    const { id, lat, lng } = payload || {};
    if (!id || lat == null || lng == null) return { ok: false, reason: "INVALID" };

    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE users SET lat = ?, lng = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND COALESCE(is_deleted, 0) = 0`,
        [lat, lng, id],
        function (err) {
          if (err) return reject(err);
          logAction(db, {
            action: "UPDATE_USER",
            entity: "users",
            entity_id: id,
            message: `User location updated: (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
          });
          resolve({ ok: true, changes: this.changes });
        }
      );
    });
  });

  // ════════════════════════════════════════════════════════════
  // STATIONS
  // ════════════════════════════════════════════════════════════

  ipcMain.handle("map-list-stations", async () => {
    return new Promise((resolve, reject) => {
      db.all(`SELECT * FROM stations ORDER BY name ASC`, [], (err, rows) =>
        err ? reject(err) : resolve(rows || [])
      );
    });
  });

  ipcMain.handle("map-add-station", async (event, payload) => {
    const { name, lat, lng, type = "OLT", capacity = 0, notes = "", coverage_m = 500 } = payload || {};
    if (!name || lat == null || lng == null) return { ok: false, reason: "INVALID" };

    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO stations (name, lat, lng, type, capacity, notes, coverage_m)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [name, lat, lng, type, capacity, notes, coverage_m],
        function (err) {
          if (err) return reject(err);
          logAction(db, {
            action: "ADD_STATION",
            entity: "stations",
            entity_id: this.lastID,
            message: `Station added: ${name}`,
          });
          resolve({ ok: true, id: this.lastID });
        }
      );
    });
  });

  ipcMain.handle("map-update-station", async (event, payload) => {
    const { id, name, lat, lng, type, capacity, notes, coverage_m } = payload || {};
    if (!id) return { ok: false, reason: "INVALID" };

    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE stations SET name=?, lat=?, lng=?, type=?, capacity=?, notes=?, coverage_m=?
         WHERE id=?`,
        [name, lat, lng, type, capacity, notes, coverage_m, id],
        function (err) {
          if (err) return reject(err);
          resolve({ ok: true, changes: this.changes });
        }
      );
    });
  });

  ipcMain.handle("map-delete-station", async (event, id) => {
    if (!id) return { ok: false, reason: "INVALID" };
    return new Promise((resolve, reject) => {
      db.run(`DELETE FROM stations WHERE id = ?`, [id], function (err) {
        if (err) return reject(err);
        logAction(db, {
          action: "DELETE_STATION",
          entity: "stations",
          entity_id: id,
          message: `Station deleted`,
        });
        resolve({ ok: true, deleted: this.changes });
      });
    });
  });

  // ════════════════════════════════════════════════════════════
  // FIBER BOXES
  // ════════════════════════════════════════════════════════════

  ipcMain.handle("map-list-fiber-boxes", async () => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT fb.*, s.name AS station_name
         FROM fiber_boxes fb
         LEFT JOIN stations s ON s.id = fb.station_id
         ORDER BY fb.name ASC`,
        [],
        (err, rows) => (err ? reject(err) : resolve(rows || []))
      );
    });
  });

  ipcMain.handle("map-add-fiber-box", async (event, payload) => {
    const { name, lat, lng, type = "SPLICE", port_count = 0, station_id = null, notes = "" } = payload || {};
    if (!name || lat == null || lng == null) return { ok: false, reason: "INVALID" };

    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO fiber_boxes (name, lat, lng, type, port_count, station_id, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [name, lat, lng, type, port_count, station_id || null, notes],
        function (err) {
          if (err) return reject(err);
          logAction(db, {
            action: "ADD_FIBER_BOX",
            entity: "fiber_boxes",
            entity_id: this.lastID,
            message: `Fiber box added: ${name}`,
          });
          resolve({ ok: true, id: this.lastID });
        }
      );
    });
  });

  ipcMain.handle("map-update-fiber-box", async (event, payload) => {
    const { id, name, lat, lng, type, port_count, station_id, notes } = payload || {};
    if (!id) return { ok: false, reason: "INVALID" };

    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE fiber_boxes SET name=?, lat=?, lng=?, type=?, port_count=?, station_id=?, notes=?
         WHERE id=?`,
        [name, lat, lng, type, port_count, station_id || null, notes, id],
        function (err) {
          if (err) return reject(err);
          resolve({ ok: true, changes: this.changes });
        }
      );
    });
  });

  ipcMain.handle("map-delete-fiber-box", async (event, id) => {
    if (!id) return { ok: false, reason: "INVALID" };
    return new Promise((resolve, reject) => {
      db.run(`DELETE FROM fiber_boxes WHERE id = ?`, [id], function (err) {
        if (err) return reject(err);
        logAction(db, {
          action: "DELETE_FIBER_BOX",
          entity: "fiber_boxes",
          entity_id: id,
          message: `Fiber box deleted`,
        });
        resolve({ ok: true, deleted: this.changes });
      });
    });
  });
}

module.exports = { registerMapHandlers };