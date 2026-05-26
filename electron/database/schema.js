const db      = require("./db");
const bcrypt  = require("bcryptjs");

// ─────────────────────────────────────────────────────────────────────────────
// Table creation order (FK dependencies):
//   employees, companies, services, stations, fiber_boxes,
//   users, invoices, payments, wallet_transactions,
//   drawer_transactions, settings, activity_log,
//   pos_categories, pos_items, pos_customers,
//   pos_held_carts, pos_stock_movements,
//   pos_sales, pos_sale_items, pos_drawer_transactions,
//   pos_invoices, pos_invoice_payments
// ─────────────────────────────────────────────────────────────────────────────

db.serialize(() => {

  // ── PRAGMAs ──────────────────────────────────────────────────────────────
  db.run(`PRAGMA foreign_keys = ON`);
  db.run(`PRAGMA journal_mode = WAL`);
  db.run(`PRAGMA synchronous  = NORMAL`);
  db.run(`PRAGMA cache_size   = -32000`);   // ~32 MB page cache
  db.run(`PRAGMA temp_store   = MEMORY`);
  db.run(`PRAGMA mmap_size    = 268435456`); // 256 MB memory-mapped I/O


  // ══════════════════════════════════════════════════════════════════════════
  // EMPLOYEES  (app users — admin + staff)
  // ══════════════════════════════════════════════════════════════════════════
  db.run(`
    CREATE TABLE IF NOT EXISTS employees (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      username    TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      password    TEXT    NOT NULL,
      full_name   TEXT    NOT NULL,
      role        TEXT    NOT NULL DEFAULT 'employee'
                          CHECK (role IN ('admin', 'employee')),
      is_active   INTEGER NOT NULL DEFAULT 1
                          CHECK (is_active IN (0, 1)),
      permissions TEXT    DEFAULT '{}',
      created_at  TEXT    DEFAULT CURRENT_TIMESTAMP,
      last_login  TEXT
    )
  `);
  db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_username ON employees(username)`);
  db.run(`CREATE INDEX        IF NOT EXISTS idx_employees_active   ON employees(is_active)`);

  // Seed admin with bcrypt-hashed password (cost factor 10)
  const adminHash = bcrypt.hashSync("admin123", 10);
  db.run(
    `INSERT OR IGNORE INTO employees (username, password, full_name, role, permissions)
     VALUES ('admin', ?, 'Administrator', 'admin', '{"all":true}')`,
    [adminHash]
  );


  // ══════════════════════════════════════════════════════════════════════════
  // COMPANIES  (bandwidth providers / upstream ISPs)
  // ══════════════════════════════════════════════════════════════════════════
  db.run(`
    CREATE TABLE IF NOT EXISTS companies (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL UNIQUE,
      contact    TEXT,
      phone      TEXT,
      notes      TEXT,
      created_at TEXT    DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name)`);


  // ══════════════════════════════════════════════════════════════════════════
  // SERVICES
  // ══════════════════════════════════════════════════════════════════════════
  db.run(`
    CREATE TABLE IF NOT EXISTS services (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL UNIQUE,
      price      REAL    NOT NULL DEFAULT 0,
      cost       REAL             DEFAULT 0,
      speed      TEXT,
      notes      TEXT,
      company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
      created_at TEXT    DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_services_name       ON services(name)`);
  db.run(`CREATE INDEX        IF NOT EXISTS idx_services_company_id ON services(company_id)`);


  // ══════════════════════════════════════════════════════════════════════════
  // STATIONS  (OLTs, routers, towers on the network map)
  // ══════════════════════════════════════════════════════════════════════════
  db.run(`
    CREATE TABLE IF NOT EXISTS stations (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      lat        REAL    NOT NULL,
      lng        REAL    NOT NULL,
      type       TEXT    DEFAULT 'OLT'
                         CHECK (type IN ('OLT', 'ONU', 'ROUTER', 'TOWER', 'SWITCH', 'OTHER')),
      capacity   INTEGER DEFAULT 0,
      notes      TEXT,
      coverage_m INTEGER DEFAULT 500,
      created_at TEXT    DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_stations_name ON stations(name)`);


  // ══════════════════════════════════════════════════════════════════════════
  // FIBER BOXES
  // ══════════════════════════════════════════════════════════════════════════
  db.run(`
    CREATE TABLE IF NOT EXISTS fiber_boxes (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      lat        REAL    NOT NULL,
      lng        REAL    NOT NULL,
      type       TEXT    DEFAULT 'SPLICE'
                         CHECK (type IN ('SPLICE', 'DISTRIBUTION', 'TERMINATION', 'OTHER')),
      port_count INTEGER DEFAULT 0,
      station_id INTEGER REFERENCES stations(id) ON DELETE SET NULL,
      notes      TEXT,
      created_at TEXT    DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_fiber_boxes_station ON fiber_boxes(station_id)`);


  // ══════════════════════════════════════════════════════════════════════════
  // USERS  (ISP subscribers)
  // ══════════════════════════════════════════════════════════════════════════
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,

      -- identity
      username         TEXT,
      name             TEXT    NOT NULL,
      pppoe_password   TEXT,

      -- contact
      mobile           TEXT,
      address          TEXT,
      region           TEXT,
      building         TEXT,
      notes            TEXT,

      -- network
      service_id       INTEGER REFERENCES services(id) ON UPDATE CASCADE ON DELETE SET NULL,
      reseller         TEXT,
      collector        TEXT,
      switch_name      TEXT,
      mac_address      TEXT,
      nationality      TEXT,

      -- location
      lat              REAL,
      lng              REAL,

      -- billing
      price            REAL    DEFAULT 0,
      balance          REAL    DEFAULT 0,

      -- quota
      daily_quota      INTEGER DEFAULT 0,
      daily_free_quota INTEGER DEFAULT 0,
      used_quota       INTEGER DEFAULT 0,

      -- status
      expiry_date      TEXT,
      blocked          INTEGER DEFAULT 0
                                CHECK (blocked IN (0, 1)),
      status           TEXT    DEFAULT 'INACTIVE'
                               CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
      role             TEXT    DEFAULT 'USER',

      -- soft delete
      is_deleted       INTEGER DEFAULT 0
                                CHECK (is_deleted IN (0, 1)),
      deleted_at       TEXT,
      deleted_by       TEXT,
      delete_reason    TEXT,

      -- company link (inherited from service or set directly)
      company_id       INTEGER REFERENCES companies(id) ON DELETE SET NULL,

      created_at       TEXT    DEFAULT CURRENT_TIMESTAMP,
      updated_at       TEXT    DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username   ON users(username) WHERE username IS NOT NULL`);
  db.run(`CREATE INDEX        IF NOT EXISTS idx_users_name       ON users(name)`);
  db.run(`CREATE INDEX        IF NOT EXISTS idx_users_service_id ON users(service_id)`);
  db.run(`CREATE INDEX        IF NOT EXISTS idx_users_company    ON users(company_id)  WHERE COALESCE(is_deleted,0)=0`);
  db.run(`CREATE INDEX        IF NOT EXISTS idx_users_status     ON users(status)      WHERE COALESCE(is_deleted,0)=0`);
  db.run(`CREATE INDEX        IF NOT EXISTS idx_users_expiry     ON users(expiry_date) WHERE COALESCE(is_deleted,0)=0`);
  db.run(`CREATE INDEX        IF NOT EXISTS idx_users_is_deleted ON users(is_deleted, id DESC)`);


  // ══════════════════════════════════════════════════════════════════════════
  // INVOICES
  // ══════════════════════════════════════════════════════════════════════════
  db.run(`
    CREATE TABLE IF NOT EXISTS invoices (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT    UNIQUE,
      user_id        INTEGER NOT NULL REFERENCES users(id)     ON DELETE RESTRICT,
      service_id     INTEGER          REFERENCES services(id)  ON DELETE SET NULL,

      type           TEXT    NOT NULL DEFAULT 'MONTHLY'
                             CHECK (type IN ('MONTHLY', 'MANUAL')),
      month          TEXT,                                -- YYYY-MM (MONTHLY only)
      amount         REAL    NOT NULL DEFAULT 0,
      status         TEXT    NOT NULL DEFAULT 'UNPAID'
                             CHECK (status IN ('UNPAID', 'PAID', 'PARTIAL')),
      affects_expiry INTEGER          DEFAULT 1
                             CHECK (affects_expiry IN (0, 1)),

      note           TEXT,

      -- soft delete
      is_deleted     INTEGER DEFAULT 0
                             CHECK (is_deleted IN (0, 1)),
      deleted_at     TEXT,
      deleted_by     TEXT,
      delete_reason  TEXT,

      paid_at        TEXT,
      created_at     TEXT    DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_user_month        ON invoices(user_id, month)         WHERE type='MONTHLY' AND COALESCE(is_deleted,0)=0`);
  db.run(`CREATE INDEX        IF NOT EXISTS idx_invoices_user_id           ON invoices(user_id)                WHERE COALESCE(is_deleted,0)=0`);
  db.run(`CREATE INDEX        IF NOT EXISTS idx_invoices_month_status      ON invoices(month, status)          WHERE COALESCE(is_deleted,0)=0`);
  db.run(`CREATE INDEX        IF NOT EXISTS idx_invoices_is_deleted        ON invoices(is_deleted)`);
  db.run(`CREATE INDEX        IF NOT EXISTS idx_invoices_paid_at           ON invoices(paid_at)                WHERE status='PAID'`);
  db.run(`CREATE INDEX        IF NOT EXISTS idx_invoices_user_status_month ON invoices(user_id, status, month) WHERE COALESCE(is_deleted,0)=0`);


  // ══════════════════════════════════════════════════════════════════════════
  // PAYMENTS
  // ══════════════════════════════════════════════════════════════════════════
  db.run(`
    CREATE TABLE IF NOT EXISTS payments (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       INTEGER NOT NULL REFERENCES users(id)    ON DELETE RESTRICT,
      invoice_id    INTEGER          REFERENCES invoices(id) ON DELETE RESTRICT,

      amount        REAL    NOT NULL,
      amount_usd    REAL             DEFAULT 0,
      amount_lbp    REAL             DEFAULT 0,
      method        TEXT             DEFAULT 'CASH',

      note          TEXT,

      -- soft delete
      is_deleted    INTEGER DEFAULT 0
                            CHECK (is_deleted IN (0, 1)),
      deleted_at    TEXT,
      deleted_by    TEXT,
      delete_reason TEXT,

      paid_at       TEXT    NOT NULL,
      created_at    TEXT    DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_payments_user_date  ON payments(user_id, paid_at) WHERE COALESCE(is_deleted,0)=0`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_payments_invoice    ON payments(invoice_id)       WHERE COALESCE(is_deleted,0)=0`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_payments_is_deleted ON payments(is_deleted)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_payments_paid_at    ON payments(paid_at DESC)     WHERE COALESCE(is_deleted,0)=0`);


  // ══════════════════════════════════════════════════════════════════════════
  // WALLET TRANSACTIONS
  // ══════════════════════════════════════════════════════════════════════════
  db.run(`
    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

      type       TEXT    NOT NULL
                         CHECK (type IN ('CREDIT', 'DEBIT')),
      amount     REAL    NOT NULL,

      ref_type   TEXT,   -- PAYMENT | INVOICE | MANUAL
      ref_id     INTEGER,

      note       TEXT,
      created_at TEXT    DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_wallet_user ON wallet_transactions(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_wallet_ref  ON wallet_transactions(ref_type, ref_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_wallet_date ON wallet_transactions(created_at DESC)`);


  // ══════════════════════════════════════════════════════════════════════════
  // DRAWER TRANSACTIONS  (ISP cash drawer — separate from POS drawer)
  // ══════════════════════════════════════════════════════════════════════════
  db.run(`
    CREATE TABLE IF NOT EXISTS drawer_transactions (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,

      type       TEXT    NOT NULL
                         CHECK (type IN ('IN', 'OUT')),
      amount     REAL    NOT NULL,
      amount_usd REAL    DEFAULT 0,
      amount_lbp REAL    DEFAULT 0,

      reason     TEXT,   -- PAYMENT | EXPENSE | REFUND | MANUAL | WALLET
      ref_type   TEXT,   -- invoice | payment | manual
      ref_id     INTEGER,

      actor      TEXT,
      note       TEXT,
      company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,

      created_at TEXT    DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_drawer_date    ON drawer_transactions(created_at DESC)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_drawer_type    ON drawer_transactions(type)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_drawer_company ON drawer_transactions(company_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_drawer_day     ON drawer_transactions(date(created_at))`);


  // ══════════════════════════════════════════════════════════════════════════
  // SETTINGS  (key-value store)
  // ══════════════════════════════════════════════════════════════════════════
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    )
  `);
  db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('pos_enabled', '1')`);
  db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('lbp_rate',    '89500')`);


  // ══════════════════════════════════════════════════════════════════════════
  // ACTIVITY LOG
  // ══════════════════════════════════════════════════════════════════════════
  db.run(`
    CREATE TABLE IF NOT EXISTS activity_log (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      actor       TEXT,
      action      TEXT    NOT NULL,
      entity      TEXT    NOT NULL,
      entity_id   INTEGER,
      message     TEXT,
      before_json TEXT,
      after_json  TEXT,
      created_at  TEXT    DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity_log(entity, entity_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_activity_date   ON activity_log(created_at DESC)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_activity_actor  ON activity_log(actor)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_activity_day    ON activity_log(date(created_at) DESC)`);


  // ══════════════════════════════════════════════════════════════════════════
  // POS — CATEGORIES
  // ══════════════════════════════════════════════════════════════════════════
  db.run(`
    CREATE TABLE IF NOT EXISTS pos_categories (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL UNIQUE,
      color      TEXT    DEFAULT '#1565c0',
      created_at TEXT    DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_pos_categories_name ON pos_categories(name)`);


  // ══════════════════════════════════════════════════════════════════════════
  // POS — ITEMS / CATALOG
  // ══════════════════════════════════════════════════════════════════════════
  db.run(`
    CREATE TABLE IF NOT EXISTS pos_items (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      category_id INTEGER REFERENCES pos_categories(id) ON DELETE SET NULL,
      price       REAL    NOT NULL DEFAULT 0,
      cost        REAL             DEFAULT 0,
      unit        TEXT             DEFAULT 'pcs',
      barcode     TEXT,
      notes       TEXT,
      track_stock INTEGER          DEFAULT 1
                          CHECK (track_stock IN (0, 1)),
      stock_qty   REAL             DEFAULT 0,
      stock_min   REAL             DEFAULT 0,
      is_deleted  INTEGER          DEFAULT 0
                          CHECK (is_deleted IN (0, 1)),
      deleted_at  TEXT,
      created_at  TEXT    DEFAULT CURRENT_TIMESTAMP,
      updated_at  TEXT    DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_pos_items_cat        ON pos_items(category_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_pos_items_name       ON pos_items(name)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_pos_items_is_deleted ON pos_items(is_deleted)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_pos_items_barcode    ON pos_items(barcode) WHERE barcode IS NOT NULL AND COALESCE(is_deleted,0)=0`);


  // ══════════════════════════════════════════════════════════════════════════
  // POS — CUSTOMERS
  // ══════════════════════════════════════════════════════════════════════════
  db.run(`
    CREATE TABLE IF NOT EXISTS pos_customers (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      phone       TEXT,
      notes       TEXT,
      total_spent REAL    DEFAULT 0,
      visit_count INTEGER DEFAULT 0,
      last_visit  TEXT,
      created_at  TEXT    DEFAULT CURRENT_TIMESTAMP,
      updated_at  TEXT    DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_pos_customers_name ON pos_customers(name)`);


  // ══════════════════════════════════════════════════════════════════════════
  // POS — HELD CARTS  (parked / on-hold orders)
  // ══════════════════════════════════════════════════════════════════════════
  db.run(`
    CREATE TABLE IF NOT EXISTS pos_held_carts (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      label       TEXT,
      customer    TEXT,
      customer_id INTEGER REFERENCES pos_customers(id) ON DELETE SET NULL,
      cart_json   TEXT    NOT NULL,
      created_at  TEXT    DEFAULT CURRENT_TIMESTAMP
    )
  `);


  // ══════════════════════════════════════════════════════════════════════════
  // POS — STOCK MOVEMENTS
  // ══════════════════════════════════════════════════════════════════════════
  db.run(`
    CREATE TABLE IF NOT EXISTS pos_stock_movements (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id    INTEGER NOT NULL REFERENCES pos_items(id) ON DELETE RESTRICT,
      delta      REAL    NOT NULL,
      reason     TEXT    CHECK (reason IN ('SALE', 'REFUND', 'MANUAL', 'ADJUSTMENT') OR reason IS NULL),
      ref_type   TEXT,
      ref_id     INTEGER,
      actor      TEXT,
      note       TEXT,
      created_at TEXT    DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_pos_stock_item ON pos_stock_movements(item_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_pos_stock_date ON pos_stock_movements(created_at DESC)`);


  // ══════════════════════════════════════════════════════════════════════════
  // POS — SALES  (sale headers)
  // ══════════════════════════════════════════════════════════════════════════
  db.run(`
    CREATE TABLE IF NOT EXISTS pos_sales (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_number TEXT    UNIQUE,
      subtotal    REAL    NOT NULL DEFAULT 0,
      discount    REAL             DEFAULT 0,
      total       REAL    NOT NULL DEFAULT 0,
      method      TEXT             DEFAULT 'CASH',
      status      TEXT    NOT NULL DEFAULT 'PAID'
                          CHECK (status IN ('PAID', 'PARTIAL', 'UNPAID', 'REFUNDED')),
      customer    TEXT,
      customer_id INTEGER REFERENCES pos_customers(id) ON DELETE SET NULL,
      shift_id    INTEGER,
      note        TEXT,
      actor       TEXT,
      is_deleted  INTEGER          DEFAULT 0
                          CHECK (is_deleted IN (0, 1)),
      created_at  TEXT    DEFAULT CURRENT_TIMESTAMP,
      updated_at  TEXT    DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_pos_sales_date        ON pos_sales(created_at DESC)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_pos_sales_status      ON pos_sales(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_pos_sales_customer_id ON pos_sales(customer_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_pos_sales_day         ON pos_sales(date(created_at) DESC)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_pos_sales_is_deleted  ON pos_sales(is_deleted)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_pos_sales_date_status ON pos_sales(date(created_at), status) WHERE COALESCE(is_deleted,0)=0`);


  // ══════════════════════════════════════════════════════════════════════════
  // POS — SALE LINE ITEMS
  // ══════════════════════════════════════════════════════════════════════════
  db.run(`
    CREATE TABLE IF NOT EXISTS pos_sale_items (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id    INTEGER NOT NULL REFERENCES pos_sales(id)  ON DELETE RESTRICT,
      item_id    INTEGER          REFERENCES pos_items(id)  ON DELETE SET NULL,
      item_name  TEXT    NOT NULL,
      unit_price REAL    NOT NULL DEFAULT 0,
      qty        REAL    NOT NULL DEFAULT 1,
      discount   REAL             DEFAULT 0,
      line_total REAL    NOT NULL DEFAULT 0
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_pos_sale_items_sale ON pos_sale_items(sale_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_pos_sale_items_item ON pos_sale_items(item_id)`);


  // ══════════════════════════════════════════════════════════════════════════
  // POS — DRAWER TRANSACTIONS  (separate from ISP drawer)
  // ══════════════════════════════════════════════════════════════════════════
  db.run(`
    CREATE TABLE IF NOT EXISTS pos_drawer_transactions (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      type       TEXT    NOT NULL
                         CHECK (type IN ('IN', 'OUT')),
      amount     REAL    NOT NULL DEFAULT 0,
      amount_usd REAL             DEFAULT 0,
      amount_lbp REAL             DEFAULT 0,
      reason     TEXT,
      ref_type   TEXT,
      ref_id     INTEGER,
      method     TEXT             DEFAULT 'CASH',
      actor      TEXT,
      note       TEXT,
      created_at TEXT    DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_pos_drawer_date ON pos_drawer_transactions(created_at DESC)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_pos_drawer_type ON pos_drawer_transactions(type)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_pos_drawer_day  ON pos_drawer_transactions(date(created_at) DESC)`);


  // ══════════════════════════════════════════════════════════════════════════
  // POS — INVOICES  (pay-later / partial tracking per sale)
  // ══════════════════════════════════════════════════════════════════════════
  db.run(`
    CREATE TABLE IF NOT EXISTS pos_invoices (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT    UNIQUE,
      sale_id        INTEGER REFERENCES pos_sales(id)      ON DELETE SET NULL,
      customer_id    INTEGER NOT NULL REFERENCES pos_customers(id) ON DELETE RESTRICT,
      customer_name  TEXT,
      total          REAL    NOT NULL DEFAULT 0,
      paid           REAL             DEFAULT 0,
      remaining      REAL    NOT NULL DEFAULT 0,
      status         TEXT    NOT NULL DEFAULT 'UNPAID'
                             CHECK (status IN ('UNPAID', 'PARTIAL', 'PAID')),
      note           TEXT,
      paid_at        TEXT,
      created_at     TEXT    DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_pos_invoices_customer        ON pos_invoices(customer_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_pos_invoices_status          ON pos_invoices(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_pos_invoices_date            ON pos_invoices(created_at DESC)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_pos_invoices_customer_status ON pos_invoices(customer_id, status)`);


  // ══════════════════════════════════════════════════════════════════════════
  // POS — INVOICE PAYMENTS
  // ══════════════════════════════════════════════════════════════════════════
  db.run(`
    CREATE TABLE IF NOT EXISTS pos_invoice_payments (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL REFERENCES pos_invoices(id) ON DELETE RESTRICT,
      amount_usd REAL    DEFAULT 0,
      amount_lbp REAL    DEFAULT 0,
      method     TEXT    DEFAULT 'CASH',
      actor      TEXT,
      note       TEXT,
      paid_at    TEXT    DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_pos_inv_payments ON pos_invoice_payments(invoice_id)`);


  // ── ANALYZE — update query planner statistics after all indexes are built ─
  db.run(`ANALYZE`);

  console.log("✅ Database initialized");
});