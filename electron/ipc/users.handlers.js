const { computeStatus } = require("./status");
const { logAction } = require("../utils/activityLog");
function registerUserHandlers(ipcMain, db) {
  // -------- ADD USER --------
  ipcMain.handle("add-user", async (event, user) => {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO users (
          username, name, pppoe_password,
          address, mobile, notes,
          reseller, collector,
          expiry_date, service_id, blocked,
          switch_name, price, balance,
          region, building, nationality, mac_address,
          daily_quota, daily_free_quota, used_quota,
          lat, lng,
          status, role, company_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.run(
        sql,
        [
          user.username ?? null,
          user.name,
          user.pppoe_password ?? null,

          user.address ?? "",
          user.mobile ?? "",
          user.notes ?? "",

          user.reseller ?? null,
          user.collector ?? null,

          user.expiry_date ?? null,
          user.service_id ?? null,
          user.blocked ? 1 : 0,

          user.switch_name ?? null,
          Number(user.price ?? 0),
          Number(user.balance ?? 0),

          user.region ?? null,
          user.building ?? null,
          user.nationality ?? null,
          user.mac_address ?? null,

          Number(user.daily_quota ?? 0),
          Number(user.daily_free_quota ?? 0),
          Number(user.used_quota ?? 0),

          user.lat ?? null,
          user.lng ?? null,

          computeStatus({ blocked: user.blocked ? 1 : 0, expiry_date: user.expiry_date ?? null }),
          user.role ?? "USER",
          user.company_id ?? null,
        ],
function (err) {
  if (err) return reject(err);

  logAction(db, {
    action: "ADD_USER",
    entity: "users",
    entity_id: this.lastID,
    message: `User created: ${user.name}`
  });

  resolve({ id: this.lastID });
},
      );
    });
  });

  // -------- LIST USERS --------
ipcMain.handle("list-users", async (event, args) => {
  const {
    search,
    service,
    address,
    blocked, // 0/1 or boolean/string
    status, // "ACTIVE" | "INACTIVE" | "SUSPENDED" | ""

    expiry_before, // 'YYYY-MM-DD'
    expiry_after,  // 'YYYY-MM-DD'

    price_min,
    price_max,
    balance_min,
    balance_max,

    company_id,      // filter by company
    mobile_empty,    // only users without phone
    mobile_required, // only users with phone

    limit = 50,
    offset = 0,
  } = args || {};

  return new Promise((resolve, reject) => {
    const where = [];
    const params = [];

    // ✅ Soft delete: hide archived users by default
    where.push("COALESCE(u.is_deleted, 0) = 0");

    if (search) {
      where.push(`
        (
          u.name LIKE ?
          OR u.mobile LIKE ?
          OR u.username LIKE ?
          OR u.address LIKE ?
          OR s.name LIKE ?
        )
      `);
      const q = `%${search}%`;
      params.push(q, q, q, q, q);
    }

    if (service) {
      where.push("TRIM(s.name) = TRIM(?)");
      params.push(service);
    }

    if (address) {
      where.push("TRIM(u.address) = TRIM(?)");
      params.push(address);
    }

    if (blocked !== undefined && blocked !== null && blocked !== "") {
      where.push("u.blocked = ?");
      params.push(Number(blocked) ? 1 : 0);
    }

    if (status) {
      where.push("u.status = ?");
      params.push(String(status).trim());
    }

    if (expiry_before) {
      where.push("u.expiry_date IS NOT NULL AND u.expiry_date <= ?");
      params.push(expiry_before);
    }

    if (expiry_after) {
      where.push("u.expiry_date IS NOT NULL AND u.expiry_date >= ?");
      params.push(expiry_after);
    }

    // price range
    if (price_min !== undefined && price_min !== null && price_min !== "") {
      where.push("COALESCE(u.price, 0) >= ?");
      params.push(Number(price_min) || 0);
    }
    if (price_max !== undefined && price_max !== null && price_max !== "") {
      where.push("COALESCE(u.price, 0) <= ?");
      params.push(Number(price_max) || 0);
    }

    // balance range
    if (balance_min !== undefined && balance_min !== null && balance_min !== "") {
      where.push("COALESCE(u.balance, 0) >= ?");
      params.push(Number(balance_min) || 0);
    }
    if (balance_max !== undefined && balance_max !== null && balance_max !== "") {
      where.push("COALESCE(u.balance, 0) <= ?");
      params.push(Number(balance_max) || 0);
    }

    // company filter — check service company first, fallback to user company
    if (company_id) { where.push("COALESCE(s.company_id, u.company_id) = ?"); params.push(Number(company_id)); }

    // phone filters
    if (mobile_empty)    { where.push("(u.mobile IS NULL OR TRIM(u.mobile) = '')"); }
    if (mobile_required) { where.push("(u.mobile IS NOT NULL AND TRIM(u.mobile) <> '')"); }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // single query: rows + total count via window function
    const sql = `
      SELECT u.*, s.name AS service_name,
             s.price AS service_price,
             COALESCE(s.company_id, u.company_id) AS company_id,
             c.name AS company_name,
             COUNT(*) OVER() AS _total_count
      FROM users u
      LEFT JOIN services s ON s.id = u.service_id
      LEFT JOIN companies c ON c.id = COALESCE(s.company_id, u.company_id)
      ${whereSql}
      ORDER BY u.id DESC
      LIMIT ? OFFSET ?
    `;

    params.push(Number(limit), Number(offset));

    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      const total = rows.length > 0 ? Number(rows[0]._total_count || 0) : 0;
      const clean = rows.map(({ _total_count, ...rest }) => rest);
      resolve({ rows: clean, total });
    });
  });
});

ipcMain.handle("list-archived-users", async (event, args) => {
  const {
    search,
    limit = 50,
    offset = 0,
  } = args || {};

  return new Promise((resolve, reject) => {
    const where = [];
    const params = [];

    // ✅ Only archived users
    where.push("COALESCE(u.is_deleted, 0) = 1");

    if (search) {
      where.push(`
        (
          u.name LIKE ?
          OR u.mobile LIKE ?
          OR u.username LIKE ?
          OR u.address LIKE ?
          OR s.name LIKE ?
        )
      `);
      const q = `%${search}%`;
      params.push(q, q, q, q, q);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const sql = `
      SELECT u.*, s.name AS service_name
      FROM users u
      LEFT JOIN services s ON s.id = u.service_id
      ${whereSql}
      ORDER BY u.deleted_at DESC, u.id DESC
      LIMIT ?
      OFFSET ?
    `;

    params.push(limit, offset);

    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
});


  // -------- USER INVOICE COUNT --------
  ipcMain.handle("user-invoice-count", async (event, userId) => {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(*) AS count
   FROM invoices
   WHERE user_id = ?
     AND COALESCE(is_deleted,0)=0`,
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        },
      );
    });
  });

// -------- SOFT DELETE USER (block if has invoices) --------
ipcMain.handle("delete-user", async (event, payload) => {
  // Support old call style: delete-user(userId)
  // And new style: delete-user({ userId, actor, reason })
  const userId =
    typeof payload === "object" && payload !== null ? payload.userId : payload;

  const actor =
    typeof payload === "object" && payload !== null ? payload.actor : null;

  const reason =
    typeof payload === "object" && payload !== null ? payload.reason : null;

  const now = new Date().toISOString();

  if (!userId) throw new Error("Missing userId");

  return new Promise((resolve, reject) => {
    db.get(
      `SELECT COUNT(*) AS count FROM invoices WHERE user_id = ? AND COALESCE(is_deleted,0)=0`,
      [userId],
      (err, row) => {
        if (err) return reject(err);

        if ((row?.count || 0) > 0) {
          return resolve({
            deleted: 0,
            reason: "HAS_INVOICES",
            count: row.count,
          });
        }

        db.run(
          `
          UPDATE users
          SET
            is_deleted = 1,
            deleted_at = ?,
            deleted_by = ?,
            delete_reason = ?,
            updated_at = ?
          WHERE id = ? AND COALESCE(is_deleted,0)=0
          `,
          [now, actor || "system", reason || null, now, userId],
          function (err2) {
            if (err2) return reject(err2);
            logAction(db, {
  actor: actor || "system",
  action: "DELETE_USER",
  entity: "users",
  entity_id: userId,
  message: `User archived`
});

resolve({ deleted: this.changes }); // keep your same response key
          },
        );
      },
    );
  });
});
// -------- RESTORE USER (from archive) --------
ipcMain.handle("restore-user", async (event, userId) => {
  const now = new Date().toISOString();

  if (!userId) throw new Error("Missing userId");

  return new Promise((resolve, reject) => {
    db.run(
      `
      UPDATE users
      SET
        is_deleted = 0,
        deleted_at = NULL,
        deleted_by = NULL,
        delete_reason = NULL,
        updated_at = ?
      WHERE id = ?
        AND COALESCE(is_deleted, 0) = 1
      `,
      [now, userId],
      function (err) {
        if (err) return reject(err);
        logAction(db, {
  action: "RESTORE_USER",
  entity: "users",
  entity_id: userId,
  message: `User restored from archive`
});

resolve({ restored: this.changes });
      }
    );
  });
});


// -------- UPDATE USER (soft-delete safe) --------
ipcMain.handle("update-user", async (event, user) => {
  return new Promise((resolve, reject) => {
    // ✅ Don't allow updating archived users
    db.get(
      `SELECT * FROM users WHERE id = ? AND COALESCE(is_deleted, 0) = 0`,
      [user.id],
      (err, existing) => {
        if (err) return reject(err);
        if (!existing) return resolve({ updated: 0, reason: "NOT_FOUND" });

        // normalize blocked
        const blocked =
          user.blocked === undefined || user.blocked === null
            ? existing.blocked
            : user.blocked
              ? 1
              : 0;

        // compute status ONLY here
        const status = computeStatus({
          blocked,
          expiry_date: user.expiry_date ?? existing.expiry_date,
        });

        const sql = `
          UPDATE users
          SET
            username = ?,
            name = ?,
            pppoe_password = ?,

            address = ?,
            mobile = ?,
            notes = ?,

            reseller = ?,
            collector = ?,

            expiry_date = ?,
            service_id = ?,
            blocked = ?,

            switch_name = ?,
            price = ?,
            balance = ?,

            region = ?,
            building = ?,
            nationality = ?,
            mac_address = ?,

            daily_quota = ?,
            daily_free_quota = ?,
            used_quota = ?,

            lat = ?,
            lng = ?,

            status = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
            AND COALESCE(is_deleted, 0) = 0
        `;

        db.run(
          sql,
          [
            user.username ?? existing.username ?? null,
            user.name ?? existing.name,
            user.pppoe_password ?? existing.pppoe_password ?? null,

            user.address ?? existing.address ?? "",
            user.mobile ?? existing.mobile ?? "",
            user.notes ?? existing.notes ?? "",

            user.reseller ?? existing.reseller ?? null,
            user.collector ?? existing.collector ?? null,

            user.expiry_date ?? existing.expiry_date ?? null,
            user.service_id ?? existing.service_id ?? null,
            blocked,

            user.switch_name ?? existing.switch_name ?? null,
            Number(user.price ?? existing.price ?? 0),
            Number(existing.balance ?? 0), // 🔒 balance not editable here

            user.region ?? existing.region ?? null,
            user.building ?? existing.building ?? null,
            user.nationality ?? existing.nationality ?? null,
            user.mac_address ?? existing.mac_address ?? null,

            Number(user.daily_quota ?? existing.daily_quota ?? 0),
            Number(user.daily_free_quota ?? existing.daily_free_quota ?? 0),
            Number(user.used_quota ?? existing.used_quota ?? 0),

            user.lat ?? existing.lat ?? null,
            user.lng ?? existing.lng ?? null,

            status,
            user.id,
          ],
          function (err2) {
            if (err2) return reject(err2);
            logAction(db, {
  action: "UPDATE_USER",
  entity: "users",
  entity_id: user.id,
  message: `User updated: ${user.name}`
});

resolve({ updated: this.changes, status });
          }
        );
      }
    );
  });
});


  // -------- LIST ADDRESSES (from users table) --------
  ipcMain.handle("list-addresses", async () => {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT DISTINCT address
        FROM users
WHERE COALESCE(is_deleted,0)=0
  AND address IS NOT NULL AND TRIM(address) <> ''

        ORDER BY address ASC
      `;
      db.all(sql, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map((r) => r.address));
      });
    });
  });

  // address "delete" is still virtual (string column)
  ipcMain.handle("delete-address", async (event, address) => {
    return new Promise((resolve, reject) => {
      const addr = String(address || "").trim();
      if (!addr) return resolve({ deleted: 0, reason: "EMPTY" });

      db.get(
        `SELECT COUNT(*) AS count
FROM users
WHERE COALESCE(is_deleted,0)=0
  AND TRIM(address) = TRIM(?)
`,
        [addr],
        (err, row) => {
          if (err) return reject(err);

          if (row.count > 0) {
            return resolve({ deleted: 0, reason: "IN_USE", count: row.count });
          }
          return resolve({ deleted: 1 });
        },
      );
    });
  });

  ipcMain.handle("add-address", async (event, address) => {
    const addr = String(address || "").trim();
    if (!addr) return { ok: false, reason: "EMPTY" };
    return { ok: true, address: addr };
  });
 

  ipcMain.handle("count-users", async (event, filters) => {
    const search = (filters?.search || "").trim();
    const service = (filters?.service || "").trim();
    const address = (filters?.address || "").trim();
    const status = (filters?.status || "").trim();

    const expiryAfter = (filters?.expiry_after || "").trim(); // "YYYY-MM-DD"
    const expiryBefore = (filters?.expiry_before || "").trim(); // "YYYY-MM-DD"

    return new Promise((resolve, reject) => {
      let sql = `
      SELECT COUNT(*) AS total
      FROM users
      LEFT JOIN services ON services.id = users.service_id
      WHERE 1=1
    `;
    sql += ` AND COALESCE(users.is_deleted,0)=0`;

      const params = [];

      if (service) {
        sql += ` AND services.name = ?`;
        params.push(service);
      }

      if (address) {
        sql += ` AND address = ?`;
        params.push(address);
      }

      if (status) {
        sql += ` AND status = ?`;
        params.push(status);
      }

      // expiry filters (ignore NULL expiry)
      if (expiryAfter) {
        sql += ` AND expiry_date IS NOT NULL AND date(expiry_date) >= date(?)`;
        params.push(expiryAfter);
      }

      if (expiryBefore) {
        sql += ` AND expiry_date IS NOT NULL AND date(expiry_date) <= date(?)`;
        params.push(expiryBefore);
      }

      if (search) {
        const like = `%${search}%`;
        sql += ` AND (
        users.name LIKE ? OR
        users.mobile LIKE ? OR
        users.username LIKE ? OR
        users.address LIKE ? OR
        services.name LIKE ?
      )`;
        params.push(like, like, like, like, like);
      }

      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve({ ok: true, total: Number(row?.total || 0) });
      });
    });
  });
}

// helpers
function currentMonthStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function invoiceNumberForUser(userId) {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `INV-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(
    d.getHours(),
  )}${pad(d.getMinutes())}${pad(d.getSeconds())}-${userId}`;
}

module.exports = { registerUserHandlers };