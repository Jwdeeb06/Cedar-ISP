// electron/ipc/auth_handlers.js
const bcrypt     = require("bcryptjs");
const { logAction } = require("../utils/activityLog");

const BCRYPT_ROUNDS = 10;

// Default permissions for a new employee
const DEFAULT_PERMISSIONS = {
  dashboard:        false,
  users_view:       true,
  users_add:        true,
  users_edit:       true,
  users_delete:     false,
  payments_view:    true,
  payments_create:  true,
  drawer_view:      false,
  drawer_add:       false,
  services_view:    true,
  services_edit:    false,
  whatsapp:         false,
  reports:          false,
  settings:         false,
  archive:          false,
  map:              true,
  activity:         false,
};

function registerAuthHandlers(ipcMain, db) {

  // ── LOGIN ─────────────────────────────────────────────────────────────────
  ipcMain.handle("auth-login", async (event, { username, password }) => {
    if (!username || !password) return { ok: false, reason: "MISSING_FIELDS" };

    const row = await new Promise((resolve, reject) =>
      db.get(
        `SELECT * FROM employees WHERE username = ? COLLATE NOCASE AND is_active = 1`,
        [username.trim()],
        (err, r) => err ? reject(err) : resolve(r || null)
      )
    );

    if (!row) return { ok: false, reason: "INVALID_CREDENTIALS" };

    // Support both bcrypt hashes and legacy plain-text passwords during transition
    let passwordMatch = false;
    if (row.password.startsWith("$2b$") || row.password.startsWith("$2a$")) {
      // bcrypt hash — compare properly
      passwordMatch = await bcrypt.compare(password, row.password);
    } else {
      // plain-text (legacy) — compare directly, then upgrade to hash
      passwordMatch = row.password === password;
      if (passwordMatch) {
        // Silently upgrade to bcrypt on successful login
        const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        db.run(`UPDATE employees SET password = ? WHERE id = ?`, [hash, row.id], () => {});
      }
    }

    if (!passwordMatch) return { ok: false, reason: "INVALID_CREDENTIALS" };

    // Update last_login
    const now = new Date().toISOString();
    db.run(`UPDATE employees SET last_login = ? WHERE id = ?`, [now, row.id], () => {});

    logAction(db, {
      actor:     row.username,
      action:    "LOGIN",
      entity:    "employees",
      entity_id: row.id,
      message:   `${row.full_name} logged in`,
    });

    const permissions = row.role === "admin"
      ? { all: true }
      : (() => { try { return JSON.parse(row.permissions || "{}"); } catch { return {}; } })();

    return {
      ok: true,
      employee: {
        id:          row.id,
        username:    row.username,
        full_name:   row.full_name,
        role:        row.role,
        permissions,
      },
    };
  });

  // ── LIST EMPLOYEES ────────────────────────────────────────────────────────
  ipcMain.handle("list-employees", async () => {
    return new Promise((resolve, reject) =>
      db.all(
        `SELECT id, username, full_name, role, is_active, permissions, created_at, last_login
         FROM employees ORDER BY role DESC, full_name ASC`,
        [],
        (err, rows) => err ? reject(err) : resolve(rows || [])
      )
    );
  });

  // ── ADD EMPLOYEE ──────────────────────────────────────────────────────────
  ipcMain.handle("add-employee", async (event, p) => {
    const username  = String(p?.username  || "").trim();
    const password  = String(p?.password  || "").trim();
    const full_name = String(p?.full_name || "").trim();
    const role      = p?.role === "admin" ? "admin" : "employee";
    const perms     = role === "admin"
      ? JSON.stringify({ all: true })
      : JSON.stringify(p?.permissions || DEFAULT_PERMISSIONS);

    if (!username || !password || !full_name)
      return { ok: false, reason: "MISSING_FIELDS" };

    // Hash password before storing
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    return new Promise((resolve, reject) =>
      db.run(
        `INSERT INTO employees (username, password, full_name, role, permissions)
         VALUES (?, ?, ?, ?, ?)`,
        [username, hash, full_name, role, perms],
        function(err) {
          if (err) {
            if (err.message?.includes("UNIQUE"))
              return resolve({ ok: false, reason: "USERNAME_TAKEN" });
            return reject(err);
          }
          logAction(db, {
            action: "ADD_EMPLOYEE", entity: "employees", entity_id: this.lastID,
            message: `Employee created: ${username} (${role})`,
          });
          resolve({ ok: true, id: this.lastID });
        }
      )
    );
  });

  // ── UPDATE EMPLOYEE ───────────────────────────────────────────────────────
  ipcMain.handle("update-employee", async (event, p) => {
    const id        = Number(p?.id);
    const full_name = String(p?.full_name || "").trim();
    const role      = p?.role === "admin" ? "admin" : "employee";
    const is_active = p?.is_active ? 1 : 0;
    const perms     = role === "admin"
      ? JSON.stringify({ all: true })
      : JSON.stringify(p?.permissions || DEFAULT_PERMISSIONS);

    if (!id || !full_name) return { ok: false, reason: "INVALID" };

    // Cannot deactivate the last admin
    if (!is_active) {
      const adminCount = await new Promise((res, rej) =>
        db.get(
          `SELECT COUNT(*) AS c FROM employees WHERE role='admin' AND is_active=1 AND id != ?`,
          [id], (err, row) => err ? rej(err) : res(Number(row?.c || 0))
        )
      );
      if (adminCount === 0) return { ok: false, reason: "LAST_ADMIN" };
    }

    return new Promise((resolve, reject) =>
      db.run(
        `UPDATE employees SET full_name = ?, role = ?, is_active = ?, permissions = ? WHERE id = ?`,
        [full_name, role, is_active, perms, id],
        (err) => err ? reject(err) : resolve({ ok: true })
      )
    );
  });

  // ── CHANGE PASSWORD ───────────────────────────────────────────────────────
  ipcMain.handle("change-password", async (event, { id, old_password, new_password }) => {
    id = Number(id);
    if (!id || !new_password) return { ok: false, reason: "INVALID" };

    const emp = await new Promise((res, rej) =>
      db.get(`SELECT password FROM employees WHERE id = ?`, [id],
        (err, row) => err ? rej(err) : res(row))
    );
    if (!emp) return { ok: false, reason: "NOT_FOUND" };

    // Verify old password if provided (supports both bcrypt and legacy)
    if (old_password) {
      let match = false;
      if (emp.password.startsWith("$2b$") || emp.password.startsWith("$2a$")) {
        match = await bcrypt.compare(old_password, emp.password);
      } else {
        match = emp.password === old_password;
      }
      if (!match) return { ok: false, reason: "WRONG_PASSWORD" };
    }

    const hash = await bcrypt.hash(new_password, BCRYPT_ROUNDS);

    return new Promise((resolve, reject) =>
      db.run(`UPDATE employees SET password = ? WHERE id = ?`, [hash, id],
        (err) => err ? reject(err) : resolve({ ok: true }))
    );
  });

  // ── DELETE EMPLOYEE ───────────────────────────────────────────────────────
  ipcMain.handle("delete-employee", async (event, id) => {
    id = Number(id);

    // Cannot delete if they have activity log entries
    const hasActivity = await new Promise((res, rej) =>
      db.get(
        `SELECT COUNT(*) AS c FROM activity_log WHERE actor =
          (SELECT username FROM employees WHERE id = ?)`,
        [id], (err, row) => err ? rej(err) : res(Number(row?.c || 0))
      )
    );
    if (hasActivity > 0)
      return { ok: false, reason: "HAS_ACTIVITY", count: hasActivity };

    // Cannot delete last admin
    const emp = await new Promise((res, rej) =>
      db.get(`SELECT role FROM employees WHERE id = ?`, [id],
        (err, row) => err ? rej(err) : res(row))
    );
    if (emp?.role === "admin") {
      const adminCount = await new Promise((res, rej) =>
        db.get(`SELECT COUNT(*) AS c FROM employees WHERE role = 'admin'`,
          [], (err, row) => err ? rej(err) : res(Number(row?.c || 0)))
      );
      if (adminCount <= 1) return { ok: false, reason: "LAST_ADMIN" };
    }

    return new Promise((resolve, reject) =>
      db.run(`DELETE FROM employees WHERE id = ?`, [id],
        function(err) { err ? reject(err) : resolve({ ok: true }); })
    );
  });

}

module.exports = { registerAuthHandlers, DEFAULT_PERMISSIONS };