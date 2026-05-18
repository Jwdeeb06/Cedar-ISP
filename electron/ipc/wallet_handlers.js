const { logAction } = require("../utils/activityLog");

function registerWalletHandlers(ipcMain, db) {

  // ── BALANCE ───────────────────────────────────────────────────────────────
  // Returns users.balance (cached) + recalculates from wallet_transactions for accuracy
  ipcMain.handle("wallet-balance", async (event, userId) => {
    userId = Number(userId);
    if (!Number.isFinite(userId) || userId <= 0) return { ok: false, reason: "INVALID" };

    return new Promise((resolve, reject) => {
      db.get(
        `SELECT
           u.balance AS cached_balance,
           COALESCE(SUM(CASE WHEN wt.type='CREDIT' THEN wt.amount
                             WHEN wt.type='DEBIT'  THEN -wt.amount
                             ELSE 0 END), 0) AS computed_balance
         FROM users u
         LEFT JOIN wallet_transactions wt ON wt.user_id = u.id
         WHERE u.id = ? AND COALESCE(u.is_deleted, 0) = 0
         GROUP BY u.id`,
        [userId],
        (err, row) => {
          if (err) return reject(err);
          if (!row) return resolve({ ok: false, reason: "USER_NOT_FOUND" });
          resolve({
            ok: true,
            balance: Number(row.computed_balance || 0),
            cached:  Number(row.cached_balance  || 0),
          });
        }
      );
    });
  });

  // ── LIST TRANSACTIONS ─────────────────────────────────────────────────────
  ipcMain.handle("wallet-list", async (event, filters) => {
    const userId = Number(filters?.user_id || 0);
    const type   = (filters?.type   || "").trim().toUpperCase(); // CREDIT | DEBIT | ""
    const month  = (filters?.month  || "").trim(); // YYYY-MM
    const limit  = Number(filters?.limit  || 100);
    const offset = Number(filters?.offset || 0);

    if (!userId) return [];

    return new Promise((resolve, reject) => {
      let sql = `SELECT * FROM wallet_transactions WHERE user_id = ?`;
      const params = [userId];

      if (type === "CREDIT" || type === "DEBIT") {
        sql += ` AND type = ?`;
        params.push(type);
      }

      if (month && /^\d{4}-\d{2}$/.test(month)) {
        sql += ` AND strftime('%Y-%m', created_at) = ?`;
        params.push(month);
      }

      sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
    });
  });

  // ── CREDIT (deposit) ──────────────────────────────────────────────────────
  // payload: { user_id, amount, note, actor, ref_type?, ref_id? }
  ipcMain.handle("wallet-credit", async (event, payload) => {
    const userId = Number(payload?.user_id);
    const amount = Number(payload?.amount);
    const note   = String(payload?.note   || "").trim() || null;
    const actor  = String(payload?.actor  || "system").trim();
    const refType = payload?.ref_type || "MANUAL";
    const refId   = payload?.ref_id   || null;

    if (!Number.isFinite(userId) || userId <= 0) return { ok: false, reason: "INVALID_USER" };
    if (!Number.isFinite(amount) || amount <= 0)  return { ok: false, reason: "INVALID_AMOUNT" };

    // Check user exists (also fetch company_id for drawer tagging)
    const user = await db_get(db,
      `SELECT u.id, u.balance, u.name, COALESCE(s.company_id, u.company_id) AS company_id
       FROM users u
       LEFT JOIN services s ON s.id = u.service_id
       WHERE u.id = ? AND COALESCE(u.is_deleted,0)=0`,
      [userId]);
    if (!user) return { ok: false, reason: "USER_NOT_FOUND" };

    const newBalance = Number(user.balance || 0) + amount;

    await db_run(db, "BEGIN TRANSACTION");
    try {
      const txId = await new Promise((resolve, reject) =>
        db.run(
          `INSERT INTO wallet_transactions (user_id, type, amount, ref_type, ref_id, note)
           VALUES (?, 'CREDIT', ?, ?, ?, ?)`,
          [userId, amount, refType, refId, note],
          function (err) { err ? reject(err) : resolve(this.lastID); }
        )
      );

      await db_run(db,
        `UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [newBalance, userId]
      );

      await db_run(db, "COMMIT");

      // Auto drawer IN — cash received from subscriber
      db.run(
        `INSERT INTO drawer_transactions (type, amount, reason, ref_type, ref_id, actor, note, company_id)
         VALUES ('IN', ?, 'PAYMENT', 'wallet', ?, ?, ?, ?)`,
        [amount, txId, actor, note || `Balance credit — ${user.name}`, user.company_id || null],
        () => {}
      );

      logAction(db, {
        actor,
        action: "WALLET_CREDIT",
        entity: "wallet_transactions",
        entity_id: txId,
        message: `Wallet CREDIT $${amount} for user ${userId}. New balance: $${newBalance.toFixed(2)}`,
      });

      return { ok: true, id: txId, balance: newBalance };
    } catch (e) {
      await db_run(db, "ROLLBACK").catch(() => {});
      return { ok: false, reason: "FAILED", error: String(e?.message || e) };
    }
  });

  // ── DEBIT (deduction / spend) ─────────────────────────────────────────────
  // payload: { user_id, amount, note, actor, ref_type?, ref_id?, allow_overdraft? }
  ipcMain.handle("wallet-debit", async (event, payload) => {
    const userId        = Number(payload?.user_id);
    const amount        = Number(payload?.amount);
    const note          = String(payload?.note   || "").trim() || null;
    const actor         = String(payload?.actor  || "system").trim();
    const refType       = payload?.ref_type || "MANUAL";
    const refId         = payload?.ref_id   || null;
    const allowOverdraft = Boolean(payload?.allow_overdraft);

    if (!Number.isFinite(userId) || userId <= 0) return { ok: false, reason: "INVALID_USER" };
    if (!Number.isFinite(amount) || amount <= 0)  return { ok: false, reason: "INVALID_AMOUNT" };

    const user = await db_get(db,
      `SELECT u.id, u.balance, u.name, COALESCE(s.company_id, u.company_id) AS company_id
       FROM users u
       LEFT JOIN services s ON s.id = u.service_id
       WHERE u.id = ? AND COALESCE(u.is_deleted,0)=0`,
      [userId]);
    if (!user) return { ok: false, reason: "USER_NOT_FOUND" };

    const currentBalance = Number(user.balance || 0);
    if (!allowOverdraft && currentBalance < amount)
      return { ok: false, reason: "INSUFFICIENT_BALANCE", balance: currentBalance };

    const newBalance = currentBalance - amount;

    await db_run(db, "BEGIN TRANSACTION");
    try {
      const txId = await new Promise((resolve, reject) =>
        db.run(
          `INSERT INTO wallet_transactions (user_id, type, amount, ref_type, ref_id, note)
           VALUES (?, 'DEBIT', ?, ?, ?, ?)`,
          [userId, amount, refType, refId, note],
          function (err) { err ? reject(err) : resolve(this.lastID); }
        )
      );

      await db_run(db,
        `UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [newBalance, userId]
      );

      await db_run(db, "COMMIT");

      // Auto drawer OUT only for manual debits (not auto-pay — that has its own drawer flow)
      if (refType === "MANUAL") {
        db.run(
          `INSERT INTO drawer_transactions (type, amount, reason, ref_type, ref_id, actor, note, company_id)
           VALUES ('OUT', ?, 'REFUND', 'wallet', ?, ?, ?, ?)`,
          [amount, txId, actor, note || `Balance debit — ${user.name}`, user.company_id || null],
          () => {}
        );
      }

      logAction(db, {
        actor,
        action: "WALLET_DEBIT",
        entity: "wallet_transactions",
        entity_id: txId,
        message: `Wallet DEBIT $${amount} for user ${userId}. New balance: $${newBalance.toFixed(2)}`,
      });

      return { ok: true, id: txId, balance: newBalance };
    } catch (e) {
      await db_run(db, "ROLLBACK").catch(() => {});
      return { ok: false, reason: "FAILED", error: String(e?.message || e) };
    }
  });

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  ipcMain.handle("wallet-summary", async (event, userId) => {
    userId = Number(userId);
    if (!Number.isFinite(userId)) return null;

    return new Promise((resolve, reject) => {
      db.get(
        `SELECT
           COALESCE(SUM(CASE WHEN type='CREDIT' THEN amount ELSE 0 END), 0) AS total_credited,
           COALESCE(SUM(CASE WHEN type='DEBIT'  THEN amount ELSE 0 END), 0) AS total_debited,
           COUNT(*) AS tx_count
         FROM wallet_transactions
         WHERE user_id = ?`,
        [userId],
        (err, row) => {
          if (err) return reject(err);
          const credited = Number(row?.total_credited || 0);
          const debited  = Number(row?.total_debited  || 0);
          resolve({
            total_credited: credited,
            total_debited:  debited,
            balance:        credited - debited,
            tx_count:       Number(row?.tx_count || 0),
          });
        }
      );
    });
  });
}

// ── tiny helpers ──────────────────────────────────────────────────────────────
function db_run(db, sql, params = []) {
  return new Promise((resolve, reject) =>
    db.run(sql, params, (err) => (err ? reject(err) : resolve()))
  );
}
function db_get(db, sql, params = []) {
  return new Promise((resolve, reject) =>
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row || null)))
  );
}

module.exports = { registerWalletHandlers };