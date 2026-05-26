const { logAction } = require("../utils/activityLog");

function registerPosHandlers(ipcMain, db) {

  // ══════════════════════════════════════════════════════════════════════════
  // CATEGORIES
  // ══════════════════════════════════════════════════════════════════════════
  ipcMain.handle("pos-list-categories", async () => new Promise((res, rej) =>
    db.all(`SELECT * FROM pos_categories ORDER BY name ASC`, [], (e, r) => e ? rej(e) : res(r || []))
  ));

  ipcMain.handle("pos-add-category", async (_, { name, color }) => {
    if (!name?.trim()) return { ok: false, reason: "NAME_REQUIRED" };
    return new Promise((res, rej) =>
      db.run(`INSERT INTO pos_categories (name, color) VALUES (?, ?)`,
        [name.trim(), color || "#1565c0"],
        function (e) { e ? rej(e) : res({ ok: true, id: this.lastID }); })
    );
  });

  ipcMain.handle("pos-delete-category", async (_, id) => new Promise((res, rej) =>
    db.run(`DELETE FROM pos_categories WHERE id = ?`, [id],
      function (e) { e ? rej(e) : res({ ok: true, deleted: this.changes }); })
  ));

  // ══════════════════════════════════════════════════════════════════════════
  // ITEMS / CATALOG
  // ══════════════════════════════════════════════════════════════════════════
  ipcMain.handle("pos-list-items", async (_, filters) => {
    const cat      = filters?.category_id ? Number(filters.category_id) : null;
    const search   = (filters?.search || "").trim();
    const lowStock = filters?.low_stock ? 1 : 0;
    const barcode  = (filters?.barcode || "").trim();

    let sql = `SELECT i.*, c.name AS category_name, c.color AS category_color
      FROM pos_items i LEFT JOIN pos_categories c ON c.id = i.category_id
      WHERE COALESCE(i.is_deleted, 0) = 0`;
    const params = [];

    if (cat)      { sql += ` AND i.category_id = ?`; params.push(cat); }
    if (search)   { sql += ` AND (i.name LIKE ? OR i.barcode LIKE ?)`; params.push(`%${search}%`, `%${search}%`); }
    if (barcode)  { sql += ` AND i.barcode = ?`; params.push(barcode); }
    if (lowStock) { sql += ` AND i.track_stock = 1 AND i.stock_qty <= i.stock_min`; }
    sql += ` ORDER BY i.name ASC`;
    return new Promise((res, rej) => db.all(sql, params, (e, r) => e ? rej(e) : res(r || [])));
  });

  ipcMain.handle("pos-get-item", async (_, id) => new Promise((res, rej) =>
    db.get(`SELECT * FROM pos_items WHERE id = ? AND COALESCE(is_deleted,0)=0`, [id],
      (e, r) => e ? rej(e) : res(r || null))
  ));

  ipcMain.handle("pos-add-item", async (_, payload) => {
    const { name, category_id, price, cost, stock_qty, stock_min,
            track_stock, unit, barcode, notes } = payload || {};
    if (!name?.trim()) return { ok: false, reason: "NAME_REQUIRED" };
    if (!Number.isFinite(Number(price)) || Number(price) < 0) return { ok: false, reason: "INVALID_PRICE" };
    return new Promise((res, rej) =>
      db.run(
        `INSERT INTO pos_items (name, category_id, price, cost, stock_qty, stock_min, track_stock, unit, barcode, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name.trim(), category_id || null, Number(price), Number(cost || 0),
         Number(stock_qty || 0), Number(stock_min || 0),
         track_stock ? 1 : 0, unit || "pcs", barcode || null, notes || null],
        function (e) {
          if (e) return rej(e);
          logAction(db, { action: "POS_ADD_ITEM", entity: "pos_items", entity_id: this.lastID, message: `Item added: ${name}` });
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
        `UPDATE pos_items SET name=?, category_id=?, price=?, cost=?, stock_qty=?, stock_min=?,
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
    const hasSales = await new Promise((res, rej) =>
      db.get(`SELECT COUNT(*) AS c FROM pos_sale_items WHERE item_id = ?`, [id],
        (e, r) => e ? rej(e) : res(Number(r?.c || 0) > 0))
    );
    if (hasSales) return { ok: false, reason: "HAS_SALES", message: "Item has sales history — archived instead." };
    return new Promise((res, rej) =>
      db.run(`UPDATE pos_items SET is_deleted=1, deleted_at=CURRENT_TIMESTAMP WHERE id=?`, [id],
        function (e) { e ? rej(e) : res({ ok: true, deleted: this.changes, archived: false }); })
    );
  });

  ipcMain.handle("pos-archive-item", async (_, id) => new Promise((res, rej) =>
    db.run(`UPDATE pos_items SET is_deleted=1, deleted_at=CURRENT_TIMESTAMP WHERE id=?`, [id],
      function (e) { e ? rej(e) : res({ ok: true, archived: this.changes }); })
  ));

  ipcMain.handle("pos-restore-item", async (_, id) => new Promise((res, rej) =>
    db.run(`UPDATE pos_items SET is_deleted=0, deleted_at=NULL WHERE id=?`, [id],
      function (e) { e ? rej(e) : res({ ok: true, restored: this.changes }); })
  ));

  ipcMain.handle("pos-list-archived-items", async () => new Promise((res, rej) =>
    db.all(
      `SELECT i.*, c.name AS category_name,
         (SELECT COUNT(*) FROM pos_sale_items si WHERE si.item_id = i.id) AS sale_count
       FROM pos_items i LEFT JOIN pos_categories c ON c.id = i.category_id
       WHERE i.is_deleted = 1 ORDER BY i.deleted_at DESC`,
      [], (e, r) => e ? rej(e) : res(r || []))
  ));

  ipcMain.handle("pos-adjust-stock", async (_, { item_id, delta, reason, actor }) => {
    if (!item_id || !Number.isFinite(Number(delta))) return { ok: false, reason: "INVALID" };
    const item = await new Promise((res, rej) =>
      db.get(`SELECT id, stock_qty, name FROM pos_items WHERE id=? AND COALESCE(is_deleted,0)=0`,
        [item_id], (e, r) => e ? rej(e) : res(r || null))
    );
    if (!item) return { ok: false, reason: "NOT_FOUND" };
    const newQty = Math.max(0, Number(item.stock_qty) + Number(delta));
    return new Promise((res, rej) =>
      db.run(`UPDATE pos_items SET stock_qty=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
        [newQty, item_id],
        function (e) {
          if (e) return rej(e);
          db.run(`INSERT INTO pos_stock_movements (item_id, delta, reason, ref_type, actor)
                  VALUES (?, ?, ?, 'manual', ?)`,
            [item_id, Number(delta), reason || "ADJUSTMENT", actor || "admin"], () => {});
          logAction(db, { actor: actor || "system", action: "POS_STOCK_ADJUST",
            entity: "pos_items", entity_id: item_id,
            message: `Stock ${delta > 0 ? "+" : ""}${delta} → ${newQty} | ${reason || ""}` });
          res({ ok: true, stock_qty: newQty });
        }
      )
    );
  });

  ipcMain.handle("pos-stock-movements", async (_, filters) => {
    const item_id = filters?.item_id ? Number(filters.item_id) : null;
    const limit   = Number(filters?.limit || 100);
    let sql = `SELECT m.*, i.name AS item_name FROM pos_stock_movements m
               LEFT JOIN pos_items i ON i.id = m.item_id WHERE 1=1`;
    const params = [];
    if (item_id) { sql += ` AND m.item_id = ?`; params.push(item_id); }
    sql += ` ORDER BY m.created_at DESC LIMIT ?`;
    params.push(limit);
    return new Promise((res, rej) => db.all(sql, params, (e, r) => e ? rej(e) : res(r || [])));
  });

  ipcMain.handle("pos-low-stock-count", async () => new Promise((res, rej) =>
    db.get(`SELECT COUNT(*) AS count FROM pos_items
            WHERE COALESCE(is_deleted,0)=0 AND track_stock=1 AND stock_qty <= stock_min`,
      [], (e, r) => e ? rej(e) : res({ count: Number(r?.count || 0) }))
  ));

  // ══════════════════════════════════════════════════════════════════════════
  // HELD CARTS
  // ══════════════════════════════════════════════════════════════════════════
  ipcMain.handle("pos-hold-cart", async (_, { cart, label, customer }) => {
    if (!cart || !Array.isArray(cart) || !cart.length) return { ok: false, reason: "EMPTY_CART" };
    return new Promise((res, rej) =>
      db.run(`INSERT INTO pos_held_carts (label, cart_json, customer) VALUES (?, ?, ?)`,
        [label || `Hold ${new Date().toLocaleTimeString()}`, JSON.stringify(cart), customer || null],
        function (e) { e ? rej(e) : res({ ok: true, id: this.lastID }); })
    );
  });

  ipcMain.handle("pos-list-held-carts", async () => new Promise((res, rej) =>
    db.all(`SELECT * FROM pos_held_carts ORDER BY created_at DESC LIMIT 10`, [], (e, r) => {
      if (e) return rej(e);
      res((r || []).map(h => ({ ...h, cart: JSON.parse(h.cart_json || "[]") })));
    })
  ));

  ipcMain.handle("pos-recall-cart", async (_, id) => {
    const held = await new Promise((res, rej) =>
      db.get(`SELECT * FROM pos_held_carts WHERE id = ?`, [id], (e, r) => e ? rej(e) : res(r || null))
    );
    if (!held) return { ok: false, reason: "NOT_FOUND" };
    await new Promise((res, rej) =>
      db.run(`DELETE FROM pos_held_carts WHERE id = ?`, [id], e => e ? rej(e) : res())
    );
    return { ok: true, cart: JSON.parse(held.cart_json || "[]"), customer: held.customer, label: held.label, id };
  });

  ipcMain.handle("pos-delete-held-cart", async (_, id) => new Promise((res, rej) =>
    db.run(`DELETE FROM pos_held_carts WHERE id = ?`, [id],
      function (e) { e ? rej(e) : res({ ok: true, deleted: this.changes }); })
  ));

  // ══════════════════════════════════════════════════════════════════════════
  // CUSTOMERS
  // ══════════════════════════════════════════════════════════════════════════
  ipcMain.handle("pos-list-customers", async (_, filters) => {
    const search = (filters?.search || "").trim();
    let sql = `SELECT * FROM pos_customers WHERE 1=1`;
    const params = [];
    if (search) { sql += ` AND (name LIKE ? OR phone LIKE ?)`; params.push(`%${search}%`, `%${search}%`); }
    sql += ` ORDER BY name ASC LIMIT 200`;
    return new Promise((res, rej) => db.all(sql, params, (e, r) => e ? rej(e) : res(r || [])));
  });

  ipcMain.handle("pos-add-customer", async (_, { name, phone, notes }) => {
    if (!name?.trim()) return { ok: false, reason: "NAME_REQUIRED" };
    return new Promise((res, rej) =>
      db.run(`INSERT INTO pos_customers (name, phone, notes) VALUES (?, ?, ?)`,
        [name.trim(), phone || null, notes || null],
        function (e) { e ? rej(e) : res({ ok: true, id: this.lastID }); })
    );
  });

  ipcMain.handle("pos-update-customer", async (_, { id, name, phone, notes }) => {
    if (!id) return { ok: false, reason: "ID_REQUIRED" };
    return new Promise((res, rej) =>
      db.run(`UPDATE pos_customers SET name=?, phone=?, notes=? WHERE id=?`,
        [name.trim(), phone || null, notes || null, id],
        function (e) { e ? rej(e) : res({ ok: true, updated: this.changes }); })
    );
  });

  ipcMain.handle("pos-get-customer", async (_, id) => new Promise((res, rej) =>
    db.get(`SELECT * FROM pos_customers WHERE id = ?`, [id], (e, r) => e ? rej(e) : res(r || null))
  ));

  ipcMain.handle("pos-customer-sales", async (_, { customer_id, limit }) => new Promise((res, rej) =>
    db.all(
      `SELECT * FROM pos_sales WHERE customer_id = ? AND COALESCE(is_deleted,0)=0
       ORDER BY created_at DESC LIMIT ?`,
      [customer_id, limit || 50],
      (e, r) => e ? rej(e) : res(r || []))
  ));

  // ══════════════════════════════════════════════════════════════════════════
  // SALES
  // ══════════════════════════════════════════════════════════════════════════
  ipcMain.handle("pos-create-sale", async (_, payload) => {
    const { items, discount = 0, method = "CASH", note, actor, customer,
            customer_id, usd_amount, lbp_amount, lbp_rate,
            line_discounts, voucher_code, shift_id } = payload || {};

    if (!Array.isArray(items) || !items.length) return { ok: false, reason: "NO_ITEMS" };

    for (const li of items) {
      const item = await new Promise((res, rej) =>
        db.get(`SELECT id, name, price, stock_qty, track_stock FROM pos_items WHERE id=? AND COALESCE(is_deleted,0)=0`,
          [li.item_id], (e, r) => e ? rej(e) : res(r || null))
      );
      if (!item) return { ok: false, reason: "ITEM_NOT_FOUND", item_id: li.item_id };
      if (item.track_stock && Number(item.stock_qty) < Number(li.qty))
        return { ok: false, reason: "INSUFFICIENT_STOCK", item_id: li.item_id, name: item.name,
          available: item.stock_qty, requested: li.qty };
    }

    const nowIso  = new Date().toISOString();
    const saleNum = `POS-${nowIso.replace(/[-:.TZ]/g, "")}-${Math.floor(Math.random()*1000)}`;

    let subtotal = 0;
    for (const li of items) subtotal += Number(li.unit_price || li.price || 0) * Number(li.qty || 1);
    const cartDiscount = Math.min(Number(discount || 0), subtotal);
    const total        = subtotal - cartDiscount;

    await new Promise((res, rej) => db.run("BEGIN TRANSACTION", e => e ? rej(e) : res()));

    try {
      const saleId = await new Promise((res, rej) =>
        db.run(
          `INSERT INTO pos_sales (sale_number, subtotal, discount, total, method, note, actor, customer, customer_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [saleNum, subtotal, cartDiscount, total, method, note || null,
           actor || "admin", customer || "Walk-in", customer_id || null, nowIso],
          function (e) { e ? rej(e) : res(this.lastID); }
        )
      );

      for (const li of items) {
        const unitPrice = Number(li.unit_price || li.price || 0);
        const qty       = Number(li.qty || 1);
        const lineDisc  = Number(line_discounts?.[li.item_id] || 0);
        const lineTotal = (unitPrice * qty) - lineDisc;

        await new Promise((res, rej) =>
          db.run(`INSERT INTO pos_sale_items (sale_id, item_id, item_name, unit_price, qty, line_total, discount)
                  VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [saleId, li.item_id, li.item_name || "", unitPrice, qty, lineTotal, lineDisc],
            e => e ? rej(e) : res())
        );

        await new Promise((res, rej) =>
          db.run(`UPDATE pos_items SET stock_qty = MAX(0, stock_qty - ?), updated_at = CURRENT_TIMESTAMP
                  WHERE id = ? AND track_stock = 1`,
            [qty, li.item_id], e => e ? rej(e) : res())
        );

        db.run(`INSERT INTO pos_stock_movements (item_id, delta, reason, ref_type, ref_id, actor)
                VALUES (?, ?, 'SALE', 'pos_sale', ?, ?)`,
          [li.item_id, -qty, saleId, actor || "admin"], () => {});
      }

      // Update customer stats
      if (customer_id) {
        db.run(`UPDATE pos_customers SET total_spent = COALESCE(total_spent,0) + ?,
                visit_count = COALESCE(visit_count,0) + 1, last_visit = CURRENT_TIMESTAMP WHERE id = ?`,
          [total, customer_id], () => {});
      }

      // Determine sale status
      const drawerUsd  = Number(usd_amount ?? 0);
      const drawerLbp  = Number(lbp_amount ?? 0);
      const lbpAsUsd   = drawerLbp > 0 && Number(lbp_rate || 0) > 0 ? drawerLbp / Number(lbp_rate) : 0;
      const totalPaid  = drawerUsd + lbpAsUsd;
      const saleStatus = method === "PAY_LATER" || totalPaid === 0
        ? "UNPAID"
        : totalPaid >= total - 0.01 ? "PAID" : "PARTIAL";

      await new Promise((res, rej) =>
        db.run(`UPDATE pos_sales SET status = ? WHERE id = ?`, [saleStatus, saleId],
          e => e ? rej(e) : res())
      );

      if (drawerUsd > 0 || drawerLbp > 0) {
        await new Promise((res, rej) =>
          db.run(
            `INSERT INTO pos_drawer_transactions (type, amount, amount_usd, amount_lbp, reason, ref_type, ref_id, method, actor, note)
             VALUES ('IN', ?, ?, ?, 'SALE', 'pos_sale', ?, ?, ?, ?)`,
            [drawerUsd, drawerUsd, drawerLbp, saleId, method, actor || "admin", `Sale ${saleNum}`],
            e => e ? rej(e) : res())
        );
      }

      await new Promise((res, rej) => db.run("COMMIT", e => e ? rej(e) : res()));

      logAction(db, { actor: actor || "admin", action: "POS_SALE", entity: "pos_sales",
        entity_id: saleId, message: `Sale ${saleNum} — $${total.toFixed(2)} [${saleStatus}]` });

      return { ok: true, sale_id: saleId, sale_number: saleNum, total, status: saleStatus };

    } catch (e) {
      await new Promise(res => db.run("ROLLBACK", () => res()));
      return { ok: false, reason: "FAILED", error: String(e?.message || e) };
    }
  });

  ipcMain.handle("pos-list-sales", async (_, filters) => {
    const day    = (filters?.day    || "").trim();
    const month  = (filters?.month  || "").trim();
    const search = (filters?.search || "").trim();
    const status = (filters?.status || "").trim();
    const limit  = Number(filters?.limit  || 200);
    const offset = Number(filters?.offset || 0);

    let sql = `SELECT s.*, c.name AS customer_name, c.phone AS customer_phone
               FROM pos_sales s
               LEFT JOIN pos_customers c ON c.id = s.customer_id
               WHERE COALESCE(s.is_deleted,0)=0`;
    const params = [];

    if (day)    { sql += ` AND date(s.created_at) = date(?)`; params.push(day); }
    else if (month && /^\d{4}-\d{2}$/.test(month))
                { sql += ` AND strftime('%Y-%m', s.created_at) = ?`; params.push(month); }
    if (status) { sql += ` AND s.status = ?`; params.push(status); }
    if (search) { sql += ` AND (s.sale_number LIKE ? OR s.customer LIKE ?)`; params.push(`%${search}%`, `%${search}%`); }

    sql += ` ORDER BY s.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    return new Promise((res, rej) => db.all(sql, params, (e, r) => e ? rej(e) : res(r || [])));
  });

  ipcMain.handle("pos-get-sale", async (_, id) => {
    const sale = await new Promise((res, rej) =>
      db.get(`SELECT s.*, c.name AS customer_name, c.phone AS customer_phone
              FROM pos_sales s LEFT JOIN pos_customers c ON c.id = s.customer_id
              WHERE s.id = ? AND COALESCE(s.is_deleted,0)=0`, [id],
        (e, r) => e ? rej(e) : res(r || null))
    );
    if (!sale) return null;
    const items = await new Promise((res, rej) =>
      db.all(`SELECT * FROM pos_sale_items WHERE sale_id = ?`, [id],
        (e, r) => e ? rej(e) : res(r || []))
    );
    return { ...sale, items };
  });

  ipcMain.handle("pos-refund-sale", async (_, { sale_id, reason, actor }) => {
    const sale = await new Promise((res, rej) =>
      db.get(`SELECT * FROM pos_sales WHERE id=? AND COALESCE(is_deleted,0)=0`, [sale_id],
        (e, r) => e ? rej(e) : res(r || null))
    );
    if (!sale) return { ok: false, reason: "NOT_FOUND" };
    if (sale.status === "REFUNDED") return { ok: false, reason: "ALREADY_REFUNDED" };

    const items = await new Promise((res, rej) =>
      db.all(`SELECT * FROM pos_sale_items WHERE sale_id = ?`, [sale_id],
        (e, r) => e ? rej(e) : res(r || []))
    );

    await new Promise((res, rej) => db.run("BEGIN TRANSACTION", e => e ? rej(e) : res()));
    try {
      await new Promise((res, rej) =>
        db.run(`UPDATE pos_sales SET status='REFUNDED', updated_at=CURRENT_TIMESTAMP WHERE id=?`,
          [sale_id], e => e ? rej(e) : res())
      );
      for (const li of items) {
        await new Promise((res, rej) =>
          db.run(`UPDATE pos_items SET stock_qty = stock_qty + ?, updated_at=CURRENT_TIMESTAMP
                  WHERE id = ? AND track_stock = 1`,
            [li.qty, li.item_id], e => e ? rej(e) : res())
        );
        db.run(`INSERT INTO pos_stock_movements (item_id, delta, reason, ref_type, ref_id, actor)
                VALUES (?, ?, 'REFUND', 'pos_sale', ?, ?)`,
          [li.item_id, li.qty, sale_id, actor || "admin"], () => {});
      }
      if (sale.customer_id) {
        db.run(`UPDATE pos_customers SET total_spent = MAX(0, COALESCE(total_spent,0) - ?),
                visit_count = MAX(0, COALESCE(visit_count,0) - 1) WHERE id = ?`,
          [sale.total, sale.customer_id], () => {});
      }
      await new Promise((res, rej) =>
        db.run(
          `INSERT INTO pos_drawer_transactions (type, amount, amount_usd, amount_lbp, reason, ref_type, ref_id, actor, note)
           VALUES ('OUT', ?, ?, 0, 'REFUND', 'pos_sale', ?, ?, ?)`,
          [sale.total, sale.total, sale_id, actor || "admin", reason || `Refund — ${sale.sale_number}`],
          e => e ? rej(e) : res())
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
  // POS DRAWER — dual currency
  // ══════════════════════════════════════════════════════════════════════════
  ipcMain.handle("pos-drawer-add", async (_, payload) => {
    const type       = String(payload?.type || "").toUpperCase();
    const amount_usd = Number(payload?.amount_usd ?? payload?.amount ?? 0);
    const amount_lbp = Number(payload?.amount_lbp ?? 0);
    const reason     = String(payload?.reason || "MANUAL").trim();
    const note       = String(payload?.note   || "").trim();
    const actor      = String(payload?.actor  || "admin").trim();

    if (type !== "IN" && type !== "OUT") return { ok: false, reason: "INVALID_TYPE" };
    if (amount_usd === 0 && amount_lbp === 0) return { ok: false, reason: "INVALID_AMOUNT" };

    return new Promise((res, rej) =>
      db.run(
        `INSERT INTO pos_drawer_transactions (type, amount, amount_usd, amount_lbp, reason, ref_type, actor, note)
         VALUES (?, ?, ?, ?, ?, 'manual', ?, ?)`,
        [type, amount_usd, amount_usd, amount_lbp, reason, actor, note || null],
        function (e) { e ? rej(e) : res({ ok: true, id: this.lastID }); }
      )
    );
  });

  ipcMain.handle("pos-drawer-list", async (_, filters) => {
    const day    = (filters?.day    || "").trim();
    const month  = (filters?.month  || "").trim();
    const type   = (filters?.type   || "").trim();
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
    return new Promise((res, rej) => db.all(sql, params, (e, r) => e ? res([]) : res(r || [])));
  });

  ipcMain.handle("pos-drawer-summary", async (_, filters) => {
    const day   = (filters?.day   || "").trim();
    const month = (filters?.month || "").trim();
    let where = "WHERE 1=1";
    const params = [];
    if (day)   { where += ` AND date(created_at) = date(?)`; params.push(day); }
    else if (month && /^\d{4}-\d{2}$/.test(month))
               { where += ` AND strftime('%Y-%m', created_at) = ?`; params.push(month); }

    return new Promise((res) =>
      db.get(
        `SELECT
           COALESCE(SUM(CASE WHEN type='IN'  THEN COALESCE(amount_usd,0) ELSE 0 END),0) AS total_in_usd,
           COALESCE(SUM(CASE WHEN type='OUT' THEN COALESCE(amount_usd,0) ELSE 0 END),0) AS total_out_usd,
           COALESCE(SUM(CASE WHEN type='IN'  THEN COALESCE(amount_lbp,0) ELSE 0 END),0) AS total_in_lbp,
           COALESCE(SUM(CASE WHEN type='OUT' THEN COALESCE(amount_lbp,0) ELSE 0 END),0) AS total_out_lbp,
           COUNT(*) AS tx_count
         FROM pos_drawer_transactions ${where}`,
        params,
        (e, r) => {
          const ti_usd = Number(r?.total_in_usd || 0), to_usd = Number(r?.total_out_usd || 0);
          const ti_lbp = Number(r?.total_in_lbp || 0), to_lbp = Number(r?.total_out_lbp || 0);
          res({ total_in_usd: ti_usd, total_out_usd: to_usd, total_in_lbp: ti_lbp, total_out_lbp: to_lbp,
            balance_usd: ti_usd - to_usd, balance_lbp: ti_lbp - to_lbp, tx_count: Number(r?.tx_count || 0) });
        }
      )
    );
  });

  ipcMain.handle("pos-drawer-balance", async () => new Promise((res) =>
    db.get(
      `SELECT
         COALESCE(SUM(CASE WHEN type='IN'  THEN COALESCE(amount_usd,0) ELSE 0 END),0) AS ti_usd,
         COALESCE(SUM(CASE WHEN type='OUT' THEN COALESCE(amount_usd,0) ELSE 0 END),0) AS to_usd,
         COALESCE(SUM(CASE WHEN type='IN'  THEN COALESCE(amount_lbp,0) ELSE 0 END),0) AS ti_lbp,
         COALESCE(SUM(CASE WHEN type='OUT' THEN COALESCE(amount_lbp,0) ELSE 0 END),0) AS to_lbp
       FROM pos_drawer_transactions`,
      [],
      (e, r) => res({ ok: true,
        balance_usd: Number(r?.ti_usd || 0) - Number(r?.to_usd || 0),
        balance_lbp: Number(r?.ti_lbp || 0) - Number(r?.to_lbp || 0) }))
  ));

  ipcMain.handle("pos-drawer-daily-list", async (_, filters) => {
    const month = (filters?.month || "").trim();
    let where = "WHERE 1=1";
    const params = [];
    if (month && /^\d{4}-\d{2}$/.test(month)) { where += ` AND strftime('%Y-%m', created_at) = ?`; params.push(month); }
    return new Promise((res) =>
      db.all(
        `SELECT date(created_at) AS day,
           COALESCE(SUM(CASE WHEN type='IN'  THEN COALESCE(amount_usd,0) ELSE 0 END),0) AS total_in_usd,
           COALESCE(SUM(CASE WHEN type='OUT' THEN COALESCE(amount_usd,0) ELSE 0 END),0) AS total_out_usd,
           COALESCE(SUM(CASE WHEN type='IN'  THEN COALESCE(amount_lbp,0) ELSE 0 END),0) AS total_in_lbp,
           COALESCE(SUM(CASE WHEN type='OUT' THEN COALESCE(amount_lbp,0) ELSE 0 END),0) AS total_out_lbp,
           COUNT(*) AS tx_count
         FROM pos_drawer_transactions ${where}
         GROUP BY date(created_at) ORDER BY day DESC LIMIT 60`,
        params, (e, r) => res(e ? [] : (r || [])))
    );
  });

  // ══════════════════════════════════════════════════════════════════════════
  // REPORTS / STATS
  // ══════════════════════════════════════════════════════════════════════════
  ipcMain.handle("pos-sales-summary", async (_, filters) => {
    const month = (filters?.month || "").trim();
    const day   = (filters?.day   || "").trim();
    let where = `WHERE COALESCE(s.is_deleted,0)=0 AND s.status != 'REFUNDED'`;
    const params = [];
    if (day)   { where += ` AND date(s.created_at) = date(?)`; params.push(day); }
    else if (month && /^\d{4}-\d{2}$/.test(month)) { where += ` AND strftime('%Y-%m', s.created_at) = ?`; params.push(month); }
    return new Promise((res, rej) =>
      db.get(
        `SELECT COUNT(*) AS sale_count, COALESCE(SUM(s.total),0) AS revenue,
           COALESCE(SUM(s.discount),0) AS total_discount, COALESCE(SUM(s.subtotal),0) AS subtotal,
           COALESCE(AVG(s.total),0) AS avg_sale
         FROM pos_sales s ${where}`,
        params, (e, r) => e ? rej(e) : res(r || {}))
    );
  });

  ipcMain.handle("pos-top-items", async (_, filters) => {
    const month = (filters?.month || "").trim();
    let where = `WHERE COALESCE(s.is_deleted,0)=0 AND s.status != 'REFUNDED'`;
    const params = [];
    if (month && /^\d{4}-\d{2}$/.test(month)) { where += ` AND strftime('%Y-%m', s.created_at) = ?`; params.push(month); }
    return new Promise((res, rej) =>
      db.all(
        `SELECT si.item_name, si.item_id, SUM(si.qty) AS total_qty, SUM(si.line_total) AS total_revenue
         FROM pos_sale_items si JOIN pos_sales s ON s.id = si.sale_id
         ${where} GROUP BY si.item_id, si.item_name ORDER BY total_revenue DESC LIMIT 10`,
        params, (e, r) => e ? rej(e) : res(r || []))
    );
  });

  ipcMain.handle("pos-profit-report", async (_, filters) => {
    const month = (filters?.month || "").trim();
    let where = `WHERE COALESCE(s.is_deleted,0)=0 AND s.status != 'REFUNDED'`;
    const params = [];
    if (month && /^\d{4}-\d{2}$/.test(month)) { where += ` AND strftime('%Y-%m', s.created_at) = ?`; params.push(month); }
    return new Promise((res, rej) =>
      db.get(
        `SELECT COALESCE(SUM(si.line_total),0) AS revenue,
           COALESCE(SUM(si.qty * COALESCE(i.cost,0)),0) AS cost,
           COALESCE(SUM(si.line_total) - SUM(si.qty * COALESCE(i.cost,0)),0) AS profit
         FROM pos_sale_items si JOIN pos_sales s ON s.id = si.sale_id
         LEFT JOIN pos_items i ON i.id = si.item_id ${where}`,
        params, (e, r) => e ? rej(e) : res(r || { revenue: 0, cost: 0, profit: 0 }))
    );
  });

  ipcMain.handle("pos-sales-by-hour", async (_, filters) => {
    const month = (filters?.month || "").trim();
    let where = `WHERE COALESCE(is_deleted,0)=0 AND status != 'REFUNDED'`;
    const params = [];
    if (month && /^\d{4}-\d{2}$/.test(month)) { where += ` AND strftime('%Y-%m', created_at) = ?`; params.push(month); }
    return new Promise((res, rej) =>
      db.all(
        `SELECT strftime('%H', created_at) AS hour, strftime('%w', created_at) AS weekday,
           COUNT(*) AS count, COALESCE(SUM(total),0) AS revenue
         FROM pos_sales ${where} GROUP BY hour, weekday ORDER BY weekday, hour`,
        params, (e, r) => e ? rej(e) : res(r || []))
    );
  });

  ipcMain.handle("pos-eod-summary", async (_, { day }) => {
    const d = day || new Date().toISOString().slice(0, 10);
    const [sales, drawer, topItems] = await Promise.all([
      new Promise((res, rej) =>
        db.get(`SELECT COUNT(*) AS sale_count, COALESCE(SUM(total),0) AS revenue,
                COALESCE(SUM(discount),0) AS discounts
                FROM pos_sales WHERE date(created_at)=date(?) AND COALESCE(is_deleted,0)=0`,
          [d], (e, r) => e ? rej(e) : res(r || {}))),
      new Promise((res, rej) =>
        db.get(`SELECT
                COALESCE(SUM(CASE WHEN type='IN'  THEN COALESCE(amount_usd,0) ELSE 0 END),0) AS cash_in_usd,
                COALESCE(SUM(CASE WHEN type='OUT' THEN COALESCE(amount_usd,0) ELSE 0 END),0) AS cash_out_usd
                FROM pos_drawer_transactions WHERE date(created_at)=date(?)`,
          [d], (e, r) => e ? rej(e) : res(r || {}))),
      new Promise((res, rej) =>
        db.all(`SELECT si.item_name, SUM(si.qty) AS qty, SUM(si.line_total) AS revenue
                FROM pos_sale_items si JOIN pos_sales s ON s.id=si.sale_id
                WHERE date(s.created_at)=date(?) AND COALESCE(s.is_deleted,0)=0 AND s.status!='REFUNDED'
                GROUP BY si.item_id, si.item_name ORDER BY revenue DESC LIMIT 5`,
          [d], (e, r) => e ? rej(e) : res(r || []))),
    ]);
    return { day: d, sales, drawer, topItems };
  });

  // ══════════════════════════════════════════════════════════════════════════
  // POS INVOICES (Pay Later / Partial)
  // ══════════════════════════════════════════════════════════════════════════
  ipcMain.handle("pos-create-invoice", async (_, payload) => {
    const { sale_id, customer_id, customer_name, total, paid_amount = 0, note, actor, method } = payload || {};
    if (!customer_id) return { ok: false, reason: "CUSTOMER_REQUIRED" };
    if (!total || Number(total) <= 0) return { ok: false, reason: "INVALID_TOTAL" };

    const paidAmt   = Math.min(Number(paid_amount || 0), Number(total));
    const remaining = Number(total) - paidAmt;
    const status    = paidAmt === 0 ? "UNPAID" : paidAmt >= Number(total) ? "PAID" : "PARTIAL";
    const nowIso    = new Date().toISOString();
    const invNum    = `POSINV-${nowIso.replace(/[-:.TZ]/g,"")}-${customer_id}`;

    return new Promise((res, rej) =>
      db.run(
        `INSERT INTO pos_invoices (invoice_number, sale_id, customer_id, customer_name, total, paid, remaining, status, note, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [invNum, sale_id || null, customer_id, customer_name || null,
         Number(total), paidAmt, remaining, status, note || null, nowIso],
        function (e) {
          if (e) { console.error("[POS-INVOICE] Insert error:", e.message); return rej(e); }
          const invoiceId = this.lastID;
          if (paidAmt > 0) {
            db.run(
              `INSERT INTO pos_invoice_payments (invoice_id, amount_usd, amount_lbp, method, actor, note, paid_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [invoiceId, paidAmt, 0, method || "CASH", actor || "admin", "Initial payment", nowIso], () => {}
            );
          }
          res({ ok: true, id: invoiceId, invoice_number: invNum, status, remaining });
        }
      )
    );
  });

  ipcMain.handle("pos-list-invoices", async (_, filters) => {
    const customer_id = filters?.customer_id ? Number(filters.customer_id) : null;
    const sale_id     = filters?.sale_id     ? Number(filters.sale_id)     : null;
    const status      = (filters?.status || "").trim();
    const limit       = Number(filters?.limit || 200);

    let sql = `SELECT i.*, c.name AS customer_name, c.phone AS customer_phone
               FROM pos_invoices i LEFT JOIN pos_customers c ON c.id = i.customer_id WHERE 1=1`;
    const params = [];
    if (customer_id) { sql += ` AND i.customer_id = ?`; params.push(customer_id); }
    if (sale_id)     { sql += ` AND i.sale_id = ?`;     params.push(sale_id); }
    if (status && status !== "ALL") { sql += ` AND i.status = ?`; params.push(status); }
    sql += ` ORDER BY i.created_at DESC LIMIT ?`;
    params.push(limit);
    return new Promise((res, rej) => db.all(sql, params, (e, r) => e ? rej(e) : res(r || [])));
  });

  ipcMain.handle("pos-collect-invoice", async (_, payload) => {
    const { invoice_id, amount_usd, amount_lbp, lbp_rate, method, actor } = payload || {};
    if (!invoice_id) return { ok: false, reason: "INVALID" };

    const inv = await new Promise((res, rej) =>
      db.get(`SELECT * FROM pos_invoices WHERE id = ?`, [invoice_id],
        (e, r) => e ? rej(e) : res(r || null))
    );
    if (!inv) return { ok: false, reason: "NOT_FOUND" };
    if (inv.status === "PAID") return { ok: false, reason: "ALREADY_PAID" };

    const usd      = Number(amount_usd || 0);
    const lbp      = Number(amount_lbp || 0);
    const lbpAsUsd = lbp > 0 && lbp_rate > 0 ? lbp / lbp_rate : 0;
    const totalPay = usd + lbpAsUsd;
    if (totalPay <= 0) return { ok: false, reason: "ZERO_AMOUNT" };

    const effectivePay = Math.min(totalPay, Number(inv.remaining));
    const newPaid      = Number(inv.paid) + effectivePay;
    const newRemaining = Math.max(0, Number(inv.total) - newPaid);
    const newStatus    = newRemaining <= 0 ? "PAID" : "PARTIAL";
    const nowIso       = new Date().toISOString();

    return new Promise((res, rej) =>
      db.run(
        `UPDATE pos_invoices SET paid = ?, remaining = ?, status = ?, paid_at = ? WHERE id = ?`,
        [newPaid, newRemaining, newStatus, newStatus === "PAID" ? nowIso : null, invoice_id],
        function (e) {
          if (e) return rej(e);
          db.run(
            `INSERT INTO pos_invoice_payments (invoice_id, amount_usd, amount_lbp, method, actor, paid_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [invoice_id, usd, lbp, method || "CASH", actor || "admin", nowIso], () => {}
          );
          db.run(
            `INSERT INTO pos_drawer_transactions (type, amount, amount_usd, amount_lbp, reason, ref_type, ref_id, actor, note)
             VALUES ('IN', ?, ?, ?, 'INVOICE_COLLECT', 'pos_invoice', ?, ?, ?)`,
            [usd, usd, lbp, invoice_id, actor || "admin", `Collected: ${inv.invoice_number}`], () => {}
          );
          // Update sale status if fully paid
          if (newStatus === "PAID" && inv.sale_id) {
            db.run(`UPDATE pos_sales SET status = 'PAID' WHERE id = ?`, [inv.sale_id], () => {});
          }
          res({ ok: true, status: newStatus, remaining: newRemaining, paid: newPaid });
        }
      )
    );
  });

  ipcMain.handle("pos-invoice-summary", async (_, filters) => {
    const customer_id = filters?.customer_id ? Number(filters.customer_id) : null;
    let where = "WHERE 1=1";
    const params = [];
    if (customer_id) { where += ` AND customer_id = ?`; params.push(customer_id); }
    return new Promise((res, rej) =>
      db.get(
        `SELECT
           COALESCE(SUM(CASE WHEN status='UNPAID'  THEN remaining ELSE 0 END),0) AS total_unpaid,
           COALESCE(SUM(CASE WHEN status='PARTIAL' THEN remaining ELSE 0 END),0) AS total_partial,
           COUNT(CASE WHEN status != 'PAID' THEN 1 END) AS open_count
         FROM pos_invoices ${where}`,
        params,
        (e, r) => e ? rej(e) : res(r || { total_unpaid: 0, total_partial: 0, open_count: 0 }))
    );
  });

}

module.exports = { registerPosHandlers };