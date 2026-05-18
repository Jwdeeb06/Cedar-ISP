const { logAction } = require("../utils/activityLog");

function registerPosHandlers(ipcMain, db) {

  // ══════════════════════════════════════════════════════════════════════════
  // CATEGORIES
  // ══════════════════════════════════════════════════════════════════════════

  ipcMain.handle("pos-list-categories", async () => {
    return new Promise((res, rej) =>
      db.all(`SELECT * FROM pos_categories ORDER BY name ASC`, [], (e, r) =>
        e ? rej(e) : res(r || []))
    );
  });

  ipcMain.handle("pos-add-category", async (_, { name, color }) => {
    if (!name?.trim()) return { ok: false, reason: "NAME_REQUIRED" };
    return new Promise((res, rej) =>
      db.run(`INSERT INTO pos_categories (name, color) VALUES (?, ?)`,
        [name.trim(), color || "#1565c0"],
        function (e) { e ? rej(e) : res({ ok: true, id: this.lastID }); })
    );
  });

  ipcMain.handle("pos-delete-category", async (_, id) => {
    return new Promise((res, rej) =>
      db.run(`DELETE FROM pos_categories WHERE id = ?`, [id],
        function (e) { e ? rej(e) : res({ ok: true, deleted: this.changes }); })
    );
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ITEMS / CATALOG
  // ══════════════════════════════════════════════════════════════════════════

  ipcMain.handle("pos-list-items", async (_, filters) => {
    const cat    = filters?.category_id ? Number(filters.category_id) : null;
    const search = (filters?.search || "").trim();
    const lowStock = filters?.low_stock ? 1 : 0;

    let sql = `
      SELECT i.*, c.name AS category_name, c.color AS category_color
      FROM pos_items i
      LEFT JOIN pos_categories c ON c.id = i.category_id
      WHERE COALESCE(i.is_deleted, 0) = 0
    `;
    const params = [];

    if (cat) { sql += ` AND i.category_id = ?`; params.push(cat); }
    if (search) { sql += ` AND i.name LIKE ?`; params.push(`%${search}%`); }
    if (lowStock) { sql += ` AND i.track_stock = 1 AND i.stock_qty <= i.stock_min`; }

    sql += ` ORDER BY i.name ASC`;

    return new Promise((res, rej) =>
      db.all(sql, params, (e, r) => e ? rej(e) : res(r || []))
    );
  });

  ipcMain.handle("pos-get-item", async (_, id) => {
    return new Promise((res, rej) =>
      db.get(`SELECT * FROM pos_items WHERE id = ? AND COALESCE(is_deleted,0)=0`, [id],
        (e, r) => e ? rej(e) : res(r || null))
    );
  });

  ipcMain.handle("pos-add-item", async (_, payload) => {
    const { name, category_id, price, cost, stock_qty, stock_min,
            track_stock, unit, barcode, notes } = payload || {};

    if (!name?.trim()) return { ok: false, reason: "NAME_REQUIRED" };
    if (!Number.isFinite(Number(price)) || Number(price) < 0)
      return { ok: false, reason: "INVALID_PRICE" };

    return new Promise((res, rej) =>
      db.run(
        `INSERT INTO pos_items
          (name, category_id, price, cost, stock_qty, stock_min, track_stock, unit, barcode, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name.trim(), category_id || null, Number(price), Number(cost || 0),
         Number(stock_qty || 0), Number(stock_min || 0),
         track_stock ? 1 : 0, unit || "pcs", barcode || null, notes || null],
        function (e) {
          if (e) return rej(e);
          logAction(db, { action: "POS_ADD_ITEM", entity: "pos_items", entity_id: this.lastID,
            message: `Item added: ${name}` });
          res({ ok: true, id: this.lastID });
        }
      )
    );
  });

  ipcMain.handle("pos-update-item", async (_, payload) => {
    const { id, name, category_id, price, cost, stock_qty, stock_min,
            track_stock, unit, barcode, notes } = payload || {};
    if (!id) return { ok: false, reason: "ID_REQUIRED" };

    return new Promise((res, rej) =>
      db.run(
        `UPDATE pos_items SET
          name=?, category_id=?, price=?, cost=?, stock_qty=?, stock_min=?,
          track_stock=?, unit=?, barcode=?, notes=?, updated_at=CURRENT_TIMESTAMP
         WHERE id=? AND COALESCE(is_deleted,0)=0`,
        [name.trim(), category_id || null, Number(price), Number(cost || 0),
         Number(stock_qty || 0), Number(stock_min || 0),
         track_stock ? 1 : 0, unit || "pcs", barcode || null, notes || null, id],
        function (e) { e ? rej(e) : res({ ok: true, updated: this.changes }); }
      )
    );
  });

  ipcMain.handle("pos-delete-item", async (_, id) => {
    // Block delete if item has any sale history
    const hasSales = await new Promise((res, rej) =>
      db.get(`SELECT COUNT(*) AS c FROM pos_sale_items WHERE item_id = ?`, [id],
        (e, r) => e ? rej(e) : res(Number(r?.c || 0) > 0))
    );
    if (hasSales)
      return { ok: false, reason: "HAS_SALES",
        message: "This item has sales history and cannot be deleted. It has been archived instead." };

    return new Promise((res, rej) =>
      db.run(
        `UPDATE pos_items SET is_deleted=1, deleted_at=CURRENT_TIMESTAMP WHERE id=?`, [id],
        function (e) { e ? rej(e) : res({ ok: true, deleted: this.changes, archived: false }); }
      )
    );
  });

  // Archive item (always works, just hides from terminal but keeps sales history)
  ipcMain.handle("pos-archive-item", async (_, id) => {
    return new Promise((res, rej) =>
      db.run(
        `UPDATE pos_items SET is_deleted=1, deleted_at=CURRENT_TIMESTAMP WHERE id=?`, [id],
        function (e) { e ? rej(e) : res({ ok: true, archived: this.changes }); }
      )
    );
  });

  // Restore archived item
  ipcMain.handle("pos-restore-item", async (_, id) => {
    return new Promise((res, rej) =>
      db.run(
        `UPDATE pos_items SET is_deleted=0, deleted_at=NULL WHERE id=?`, [id],
        function (e) { e ? rej(e) : res({ ok: true, restored: this.changes }); }
      )
    );
  });

  // List archived items
  ipcMain.handle("pos-list-archived-items", async () => {
    return new Promise((res, rej) =>
      db.all(
        `SELECT i.*, c.name AS category_name,
           (SELECT COUNT(*) FROM pos_sale_items si WHERE si.item_id = i.id) AS sale_count
         FROM pos_items i LEFT JOIN pos_categories c ON c.id = i.category_id
         WHERE i.is_deleted = 1 ORDER BY i.deleted_at DESC`,
        [], (e, r) => e ? rej(e) : res(r || []))
    );
  });

  // Stock adjustment (restock / manual correction)
  ipcMain.handle("pos-adjust-stock", async (_, { item_id, delta, reason, actor }) => {
    if (!item_id || !Number.isFinite(Number(delta)))
      return { ok: false, reason: "INVALID" };

    const item = await new Promise((res, rej) =>
      db.get(`SELECT id, stock_qty, name FROM pos_items WHERE id=? AND COALESCE(is_deleted,0)=0`,
        [item_id], (e, r) => e ? rej(e) : res(r || null))
    );
    if (!item) return { ok: false, reason: "NOT_FOUND" };

    const newQty = Math.max(0, Number(item.stock_qty) + Number(delta));

    return new Promise((res, rej) =>
      db.run(
        `UPDATE pos_items SET stock_qty=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
        [newQty, item_id],
        function (e) {
          if (e) return rej(e);
          logAction(db, { actor: actor || "system", action: "POS_STOCK_ADJUST",
            entity: "pos_items", entity_id: item_id,
            message: `Stock ${delta > 0 ? "+" : ""}${delta} → ${newQty} | ${reason || ""}` });
          res({ ok: true, stock_qty: newQty });
        }
      )
    );
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SALES
  // ══════════════════════════════════════════════════════════════════════════

  ipcMain.handle("pos-create-sale", async (_, payload) => {
    const { items, discount = 0, method = "CASH", note, actor } = payload || {};

    if (!Array.isArray(items) || !items.length)
      return { ok: false, reason: "NO_ITEMS" };

    // Validate all items exist and have sufficient stock
    for (const li of items) {
      const item = await new Promise((res, rej) =>
        db.get(`SELECT id, name, price, stock_qty, track_stock FROM pos_items WHERE id=? AND COALESCE(is_deleted,0)=0`,
          [li.item_id], (e, r) => e ? rej(e) : res(r || null))
      );
      if (!item) return { ok: false, reason: `ITEM_NOT_FOUND`, item_id: li.item_id };
      if (item.track_stock && Number(item.stock_qty) < Number(li.qty))
        return { ok: false, reason: "INSUFFICIENT_STOCK", item_id: li.item_id, name: item.name,
          available: item.stock_qty, requested: li.qty };
    }

    const nowIso = new Date().toISOString();
    const saleNum = `POS-${nowIso.replace(/[-:.TZ]/g, "")}-${Math.floor(Math.random()*1000)}`;

    // Calculate totals
    let subtotal = 0;
    for (const li of items) {
      subtotal += Number(li.unit_price || li.price || 0) * Number(li.qty || 1);
    }
    const discountAmt = Math.min(Number(discount || 0), subtotal);
    const total = subtotal - discountAmt;

    await new Promise((res, rej) => db.run("BEGIN TRANSACTION", e => e ? rej(e) : res()));

    try {
      // Insert sale header
      const saleId = await new Promise((res, rej) =>
        db.run(
          `INSERT INTO pos_sales (sale_number, subtotal, discount, total, method, note, actor, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [saleNum, subtotal, discountAmt, total, method, note || null, actor || "admin", nowIso],
          function (e) { e ? rej(e) : res(this.lastID); }
        )
      );

      // Insert line items + deduct stock
      for (const li of items) {
        const unitPrice = Number(li.unit_price || li.price || 0);
        const qty       = Number(li.qty || 1);
        const lineTotal = unitPrice * qty;

        await new Promise((res, rej) =>
          db.run(
            `INSERT INTO pos_sale_items (sale_id, item_id, item_name, unit_price, qty, line_total)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [saleId, li.item_id, li.item_name || "", unitPrice, qty, lineTotal],
            e => e ? rej(e) : res()
          )
        );

        // Deduct stock if tracked
        await new Promise((res, rej) =>
          db.run(
            `UPDATE pos_items
             SET stock_qty = MAX(0, stock_qty - ?), updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND track_stock = 1`,
            [qty, li.item_id],
            e => e ? rej(e) : res()
          )
        );
      }

      // Insert POS drawer IN transaction
      await new Promise((res, rej) =>
        db.run(
          `INSERT INTO pos_drawer_transactions (type, amount, reason, ref_type, ref_id, method, actor, note)
           VALUES ('IN', ?, 'SALE', 'pos_sale', ?, ?, ?, ?)`,
          [total, saleId, method, actor || "admin", `Sale ${saleNum}`],
          e => e ? rej(e) : res()
        )
      );

      await new Promise((res, rej) => db.run("COMMIT", e => e ? rej(e) : res()));

      logAction(db, { actor: actor || "admin", action: "POS_SALE", entity: "pos_sales",
        entity_id: saleId, message: `Sale ${saleNum} — $${total.toFixed(2)}` });

      return { ok: true, sale_id: saleId, sale_number: saleNum, total };

    } catch (e) {
      await new Promise(res => db.run("ROLLBACK", () => res()));
      return { ok: false, reason: "FAILED", error: String(e?.message || e) };
    }
  });

  ipcMain.handle("pos-list-sales", async (_, filters) => {
    const day   = (filters?.day   || "").trim();
    const month = (filters?.month || "").trim();
    const limit  = Number(filters?.limit  || 200);
    const offset = Number(filters?.offset || 0);

    let sql = `
      SELECT s.*,
        (SELECT COUNT(*) FROM pos_sale_items si WHERE si.sale_id = s.id) AS item_count
      FROM pos_sales s
      WHERE COALESCE(s.is_deleted, 0) = 0
    `;
    const params = [];

    if (day)   { sql += ` AND date(s.created_at) = date(?)`; params.push(day); }
    else if (month && /^\d{4}-\d{2}$/.test(month))
               { sql += ` AND strftime('%Y-%m', s.created_at) = ?`; params.push(month); }

    sql += ` ORDER BY s.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    return new Promise((res, rej) =>
      db.all(sql, params, (e, r) => e ? rej(e) : res(r || []))
    );
  });

  ipcMain.handle("pos-get-sale", async (_, id) => {
    const sale = await new Promise((res, rej) =>
      db.get(`SELECT * FROM pos_sales WHERE id=?`, [id], (e, r) => e ? rej(e) : res(r || null))
    );
    if (!sale) return null;

    const items = await new Promise((res, rej) =>
      db.all(`SELECT * FROM pos_sale_items WHERE sale_id=?`, [id], (e, r) => e ? rej(e) : res(r || []))
    );

    return { ...sale, items };
  });

  // Refund a sale
  ipcMain.handle("pos-refund-sale", async (_, { sale_id, actor, reason }) => {
    const sale = await new Promise((res, rej) =>
      db.get(`SELECT * FROM pos_sales WHERE id=? AND COALESCE(is_deleted,0)=0`, [sale_id],
        (e, r) => e ? rej(e) : res(r || null))
    );
    if (!sale) return { ok: false, reason: "NOT_FOUND" };
    if (sale.status === "REFUNDED") return { ok: false, reason: "ALREADY_REFUNDED" };

    const items = await new Promise((res, rej) =>
      db.all(`SELECT * FROM pos_sale_items WHERE sale_id=?`, [sale_id],
        (e, r) => e ? rej(e) : res(r || []))
    );

    await new Promise((res, rej) => db.run("BEGIN TRANSACTION", e => e ? rej(e) : res()));

    try {
      // Mark sale as refunded
      await new Promise((res, rej) =>
        db.run(`UPDATE pos_sales SET status='REFUNDED', updated_at=CURRENT_TIMESTAMP WHERE id=?`,
          [sale_id], e => e ? rej(e) : res())
      );

      // Restock items
      for (const li of items) {
        await new Promise((res, rej) =>
          db.run(
            `UPDATE pos_items SET stock_qty = stock_qty + ?, updated_at=CURRENT_TIMESTAMP
             WHERE id = ? AND track_stock = 1`,
            [li.qty, li.item_id], e => e ? rej(e) : res()
          )
        );
      }

      // POS drawer OUT for refund
      await new Promise((res, rej) =>
        db.run(
          `INSERT INTO pos_drawer_transactions (type, amount, reason, ref_type, ref_id, actor, note)
           VALUES ('OUT', ?, 'REFUND', 'pos_sale', ?, ?, ?)`,
          [sale.total, sale_id, actor || "admin", reason || `Refund — ${sale.sale_number}`],
          e => e ? rej(e) : res()
        )
      );

      await new Promise((res, rej) => db.run("COMMIT", e => e ? rej(e) : res()));

      logAction(db, { actor: actor || "admin", action: "POS_REFUND", entity: "pos_sales",
        entity_id: sale_id, message: `Refund ${sale.sale_number} — $${sale.total}` });

      return { ok: true };

    } catch (e) {
      await new Promise(res => db.run("ROLLBACK", () => res()));
      return { ok: false, reason: "FAILED", error: String(e?.message || e) };
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // POS DRAWER
  // ══════════════════════════════════════════════════════════════════════════

  ipcMain.handle("pos-drawer-add", async (_, payload) => {
    const { type, amount, reason, note, actor } = payload || {};
    if (type !== "IN" && type !== "OUT") return { ok: false, reason: "INVALID_TYPE" };
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0)
      return { ok: false, reason: "INVALID_AMOUNT" };

    return new Promise((res, rej) =>
      db.run(
        `INSERT INTO pos_drawer_transactions (type, amount, reason, ref_type, actor, note)
         VALUES (?, ?, ?, 'manual', ?, ?)`,
        [type, Number(amount), reason || "MANUAL", actor || "admin", note || null],
        function (e) { e ? rej(e) : res({ ok: true, id: this.lastID }); }
      )
    );
  });

  ipcMain.handle("pos-drawer-list", async (_, filters) => {
    const day   = (filters?.day   || "").trim();
    const month = (filters?.month || "").trim();
    const type  = (filters?.type  || "").trim();
    const limit  = Number(filters?.limit  || 200);
    const offset = Number(filters?.offset || 0);

    let sql = `SELECT * FROM pos_drawer_transactions WHERE 1=1`;
    const params = [];

    if (day)   { sql += ` AND date(created_at) = date(?)`; params.push(day); }
    else if (month && /^\d{4}-\d{2}$/.test(month))
               { sql += ` AND strftime('%Y-%m', created_at) = ?`; params.push(month); }

    if (type === "IN" || type === "OUT") { sql += ` AND type = ?`; params.push(type); }

    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    return new Promise((res, rej) =>
      db.all(sql, params, (e, r) => e ? rej(e) : res(r || []))
    );
  });

  ipcMain.handle("pos-drawer-summary", async (_, filters) => {
    const day   = (filters?.day   || "").trim();
    const month = (filters?.month || "").trim();

    let where = "WHERE 1=1";
    const params = [];

    if (day)   { where += ` AND date(created_at) = date(?)`; params.push(day); }
    else if (month && /^\d{4}-\d{2}$/.test(month))
               { where += ` AND strftime('%Y-%m', created_at) = ?`; params.push(month); }

    return new Promise((res, rej) =>
      db.get(
        `SELECT
           COALESCE(SUM(CASE WHEN type='IN'  THEN amount ELSE 0 END),0) AS total_in,
           COALESCE(SUM(CASE WHEN type='OUT' THEN amount ELSE 0 END),0) AS total_out,
           COUNT(*) AS tx_count
         FROM pos_drawer_transactions ${where}`,
        params,
        (e, r) => {
          if (e) return rej(e);
          res({
            total_in:  Number(r?.total_in  || 0),
            total_out: Number(r?.total_out || 0),
            balance:   Number(r?.total_in  || 0) - Number(r?.total_out || 0),
            tx_count:  Number(r?.tx_count  || 0),
          });
        }
      )
    );
  });

  ipcMain.handle("pos-drawer-balance", async () => {
    return new Promise((res, rej) =>
      db.get(
        `SELECT
           COALESCE(SUM(CASE WHEN type='IN'  THEN amount ELSE 0 END),0) AS i,
           COALESCE(SUM(CASE WHEN type='OUT' THEN amount ELSE 0 END),0) AS o
         FROM pos_drawer_transactions`,
        [],
        (e, r) => e ? rej(e) : res({ ok: true, balance: Number(r?.i || 0) - Number(r?.o || 0) })
      )
    );
  });

  ipcMain.handle("pos-drawer-daily-list", async (_, filters) => {
    const month = (filters?.month || "").trim();
    let where = "WHERE 1=1";
    const params = [];
    if (month && /^\d{4}-\d{2}$/.test(month))
      { where += ` AND strftime('%Y-%m', created_at) = ?`; params.push(month); }

    return new Promise((res, rej) =>
      db.all(
        `SELECT date(created_at) AS day,
           COALESCE(SUM(CASE WHEN type='IN'  THEN amount ELSE 0 END),0) AS total_in,
           COALESCE(SUM(CASE WHEN type='OUT' THEN amount ELSE 0 END),0) AS total_out,
           COUNT(*) AS tx_count
         FROM pos_drawer_transactions ${where}
         GROUP BY date(created_at) ORDER BY day DESC LIMIT 60`,
        params,
        (e, r) => e ? rej(e) : res(r || [])
      )
    );
  });

  // ══════════════════════════════════════════════════════════════════════════
  // REPORTS / STATS
  // ══════════════════════════════════════════════════════════════════════════

  ipcMain.handle("pos-sales-summary", async (_, filters) => {
    const month = (filters?.month || "").trim();
    let where = `WHERE COALESCE(s.is_deleted,0)=0`;
    const params = [];
    if (month && /^\d{4}-\d{2}$/.test(month))
      { where += ` AND strftime('%Y-%m', s.created_at) = ?`; params.push(month); }

    return new Promise((res, rej) =>
      db.get(
        `SELECT
           COUNT(*)                          AS sale_count,
           COALESCE(SUM(s.total),0)          AS revenue,
           COALESCE(SUM(s.discount),0)       AS total_discount,
           COALESCE(SUM(s.subtotal),0)       AS subtotal,
           COALESCE(AVG(s.total),0)          AS avg_sale
         FROM pos_sales s ${where} AND s.status != 'REFUNDED'`,
        params,
        (e, r) => e ? rej(e) : res(r || {})
      )
    );
  });

  ipcMain.handle("pos-top-items", async (_, filters) => {
    const month = (filters?.month || "").trim();
    let where = `WHERE COALESCE(s.is_deleted,0)=0 AND s.status != 'REFUNDED'`;
    const params = [];
    if (month && /^\d{4}-\d{2}$/.test(month))
      { where += ` AND strftime('%Y-%m', s.created_at) = ?`; params.push(month); }

    return new Promise((res, rej) =>
      db.all(
        `SELECT si.item_name, SUM(si.qty) AS total_qty, SUM(si.line_total) AS total_revenue
         FROM pos_sale_items si
         JOIN pos_sales s ON s.id = si.sale_id
         ${where}
         GROUP BY si.item_id, si.item_name
         ORDER BY total_revenue DESC LIMIT 10`,
        params,
        (e, r) => e ? rej(e) : res(r || [])
      )
    );
  });
}

module.exports = { registerPosHandlers };