// electron/ipc/archive_handlers.js
const { logAction } = require("../utils/activityLog");

function registerArchiveHandlers(ipcMain, db) {

  // ── List archived users ───────────────────────────────────────────────────
  ipcMain.handle("archive-list-users", async (event, filters) => {
    const search = (filters?.search || "").trim();
    const limit  = Number(filters?.limit  || 500);
    const offset = Number(filters?.offset || 0);

    return new Promise((resolve, reject) => {
      let sql = `
        SELECT u.*, s.name AS service_name,
          (SELECT COUNT(*) FROM invoices i
           WHERE i.user_id = u.id AND COALESCE(i.is_deleted,0) = 0) AS active_invoice_count,
          (SELECT COUNT(*) FROM invoices i
           WHERE i.user_id = u.id AND COALESCE(i.is_deleted,0) = 1) AS archived_invoice_count
        FROM users u
        LEFT JOIN services s ON s.id = u.service_id
        WHERE COALESCE(u.is_deleted, 0) = 1
      `;
      const params = [];
      if (search) {
        sql += ` AND (u.name LIKE ? OR u.mobile LIKE ? OR u.username LIKE ?)`;
        const q = `%${search}%`;
        params.push(q, q, q);
      }
      sql += ` ORDER BY u.deleted_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);
      db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows || []));
    });
  });

  // ── Restore archived user ─────────────────────────────────────────────────
  ipcMain.handle("archive-restore-user", async (event, userId) => {
    userId = Number(userId);
    if (!userId) return { ok: false, reason: "INVALID" };
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE users SET is_deleted=0, deleted_at=NULL, deleted_by=NULL,
          delete_reason=NULL, updated_at=CURRENT_TIMESTAMP
         WHERE id=? AND COALESCE(is_deleted,0)=1`,
        [userId],
        function(err) {
          if (err) return reject(err);
          logAction(db, { action:"RESTORE_USER", entity:"users", entity_id:userId,
            message:"User restored from archive" });
          resolve({ ok: true, restored: this.changes });
        }
      );
    });
  });

  // ── List archived invoices ────────────────────────────────────────────────
  ipcMain.handle("archive-list-invoices", async (event, filters) => {
    const search = (filters?.search || "").trim();
    const limit  = Number(filters?.limit  || 500);
    const offset = Number(filters?.offset || 0);

    return new Promise((resolve, reject) => {
      let sql = `
        SELECT i.*, u.name AS user_name, u.mobile AS user_mobile,
          s.name AS service_name,
          (SELECT COUNT(*) FROM payments p
           WHERE p.invoice_id = i.id AND COALESCE(p.is_deleted,0) = 0) AS active_payments,
          (SELECT COALESCE(SUM(p.amount),0) FROM payments p
           WHERE p.invoice_id = i.id AND COALESCE(p.is_deleted,0) = 0) AS paid_sum
        FROM invoices i
        LEFT JOIN users u ON u.id = i.user_id
        LEFT JOIN services s ON s.id = u.service_id
        WHERE COALESCE(i.is_deleted, 0) = 1
      `;
      const params = [];
      if (search) {
        sql += ` AND (u.name LIKE ? OR i.invoice_number LIKE ? OR i.month LIKE ?)`;
        const q = `%${search}%`;
        params.push(q, q, q);
      }
      sql += ` ORDER BY i.deleted_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);
      db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows || []));
    });
  });

  // ── Restore archived invoice ──────────────────────────────────────────────
  // Restores invoice + any payments that were deleted as part of this invoice's deletion
  ipcMain.handle("archive-restore-invoice", async (event, invoiceId) => {
    invoiceId = Number(invoiceId);
    if (!invoiceId) return { ok: false, reason: "INVALID" };

    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        // Restore payments that were soft-deleted because of this invoice
        db.run(
          `UPDATE payments SET is_deleted=0, deleted_at=NULL, deleted_by=NULL, delete_reason=NULL
           WHERE invoice_id=? AND delete_reason IN ('INVOICE_DELETED','INVOICE_UNPAID')`,
          [invoiceId],
          (err1) => {
            if (err1) { db.run("ROLLBACK"); return reject(err1); }

            // Restore the invoice itself
            db.run(
              `UPDATE invoices SET is_deleted=0, deleted_at=NULL, deleted_by=NULL,
                delete_reason=NULL WHERE id=? AND COALESCE(is_deleted,0)=1`,
              [invoiceId],
              function(err2) {
                if (err2) { db.run("ROLLBACK"); return reject(err2); }
                db.run("COMMIT", (err3) => {
                  if (err3) return reject(err3);
                  logAction(db, { action:"RESTORE_INVOICE", entity:"invoices",
                    entity_id:invoiceId, message:"Invoice restored from archive" });
                  resolve({ ok: true, restored: this.changes });
                });
              }
            );
          }
        );
      });
    });
  });

}

module.exports = { registerArchiveHandlers };