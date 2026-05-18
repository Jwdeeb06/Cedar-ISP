const db = require("./db");

// ─────────────────────────────────────────────────────────────────────────────
// RUN ORDER MATTERS in db.serialize():
//   1. PRAGMAs
//   2. CREATE TABLE (no FK deps first, then tables that reference others)
//   3. CREATE INDEX
//   4. Safe ALTER TABLE migrations  (ignored silently if column already exists)
//   5. Data fix migrations          (one-time normalizations)
// ─────────────────────────────────────────────────────────────────────────────

db.serialize(() => {

  // ── PRAGMAs ─────────────────────────────────────────────────────────────────
  db.run(`PRAGMA foreign_keys = ON`);
  db.run(`PRAGMA journal_mode = WAL`);
  db.run(`PRAGMA synchronous  = NORMAL`);
  db.run(`PRAGMA cache_size   = -32000`);
  db.run(`PRAGMA temp_store   = MEMORY`);
  db.run(`PRAGMA mmap_size    = 268435456`);

  // ══════════════════════════════════════════════════════════════════════════
  // EMPLOYEES (app users — admin + staff)
  // ══════════════════════════════════════════════════════════════════════════
  db.run(`
    CREATE TABLE IF NOT EXISTS employees (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      username     TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      password     TEXT    NOT NULL,
      full_name    TEXT    NOT NULL,
      role         TEXT    NOT NULL DEFAULT 'employee',
      is_active    INTEGER NOT NULL DEFAULT 1,
      permissions  TEXT    DEFAULT '{}',
      created_at   TEXT    DEFAULT CURRENT_TIMESTAMP,
      last_login   TEXT
    )
  `);
  db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_username ON employees(username)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(is_active)`);

  // Insert default admin if none exists (password: admin123)
  // Password is stored as plain text — ISP should change after first login
  db.run(`
    INSERT OR IGNORE INTO employees (username, password, full_name, role, permissions)
    VALUES ('admin', 'admin123', 'Administrator', 'admin', '{"all":true}')
  `);


  // ══════════════════════════════════════════════════════════════════════════
  // COMPANIES (bandwidth providers / upstream ISPs)
  // ══════════════════════════════════════════════════════════════════════════
  db.run(`
    CREATE TABLE IF NOT EXISTS companies (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL UNIQUE,
      contact     TEXT,
      phone       TEXT,
      notes       TEXT,
      created_at  TEXT    DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name)`);

  // ══════════════════════════════════════════════════════════════════════════
  // SERVICES  (no FK deps — create first)
  // ══════════════════════════════════════════════════════════════════════════
  db.run(`
    CREATE TABLE IF NOT EXISTS services (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      price      REAL    NOT NULL DEFAULT 0,
      speed      TEXT,
      notes      TEXT,
      created_at TEXT    DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_services_name ON services(name)`);


  // ══════════════════════════════════════════════════════════════════════════
  // STATIONS (OLT / aggregation nodes)
  // ══════════════════════════════════════════════════════════════════════════
  db.run(`
    CREATE TABLE IF NOT EXISTS stations (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      lat        REAL    NOT NULL,
      lng        REAL    NOT NULL,
      type       TEXT    DEFAULT 'OLT',   -- OLT | HUB | POP
      capacity   INTEGER DEFAULT 0,
      notes      TEXT,
      coverage_m INTEGER DEFAULT 500,
      created_at TEXT    DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_stations_name ON stations(name)`);


  // ══════════════════════════════════════════════════════════════════════════
  // FIBER BOXES (distribution / splice boxes)
  // ══════════════════════════════════════════════════════════════════════════
  db.run(`
    CREATE TABLE IF NOT EXISTS fiber_boxes (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      lat        REAL    NOT NULL,
      lng        REAL    NOT NULL,
      type       TEXT    DEFAULT 'SPLICE',  -- SPLICE | DISTRIBUTION | CLOSURE
      port_count INTEGER DEFAULT 0,
      station_id INTEGER REFERENCES stations(id),
      notes      TEXT,
      created_at TEXT    DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_fiber_boxes_station ON fiber_boxes(station_id)`);


  // ══════════════════════════════════════════════════════════════════════════
  // USERS
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

      -- network / ISP
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
      blocked          INTEGER DEFAULT 0,
      status           TEXT    DEFAULT 'INACTIVE',
      role             TEXT    DEFAULT 'USER',

      -- soft delete
      is_deleted       INTEGER DEFAULT 0,
      deleted_at       TEXT,
      deleted_by       TEXT,
      delete_reason    TEXT,

      -- company link
      company_id       INTEGER REFERENCES companies(id),

      created_at       TEXT    DEFAULT CURRENT_TIMESTAMP,
      updated_at       TEXT    DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username
            ON users(username) WHERE username IS NOT NULL`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_users_name
            ON users(name)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_users_service_id
            ON users(service_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_users_status
            ON users(status) WHERE is_deleted = 0`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_users_expiry
            ON users(expiry_date) WHERE is_deleted = 0`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_users_is_deleted
            ON users(is_deleted)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_users_company
            ON users(company_id) WHERE COALESCE(is_deleted,0)=0`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_users_deleted_id
            ON users(is_deleted, id DESC)`);


  // ══════════════════════════════════════════════════════════════════════════
  // INVOICES
  // ══════════════════════════════════════════════════════════════════════════
  db.run(`
    CREATE TABLE IF NOT EXISTS invoices (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT    UNIQUE,
      user_id        INTEGER NOT NULL REFERENCES users(id),
      service_id     INTEGER REFERENCES services(id) ON DELETE SET NULL,

      type           TEXT    NOT NULL DEFAULT 'MONTHLY',  -- MONTHLY | MANUAL
      month          TEXT,
      amount         REAL    NOT NULL DEFAULT 0,

      status         TEXT    DEFAULT 'UNPAID',            -- UNPAID | PARTIAL | PAID
      affects_expiry INTEGER DEFAULT 1,
      note           TEXT,

      is_deleted     INTEGER DEFAULT 0,
      deleted_at     TEXT,
      deleted_by     TEXT,
      delete_reason  TEXT,

      paid_at        TEXT,
      created_at     TEXT    DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_user_month
            ON invoices(user_id, month)
            WHERE type = 'MONTHLY' AND is_deleted = 0`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_invoices_user_id
            ON invoices(user_id) WHERE is_deleted = 0`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_invoices_month_status
            ON invoices(month, status) WHERE is_deleted = 0`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_invoices_is_deleted
            ON invoices(is_deleted)`);


  // ══════════════════════════════════════════════════════════════════════════
  // PAYMENTS
  // ══════════════════════════════════════════════════════════════════════════
  db.run(`
    CREATE TABLE IF NOT EXISTS payments (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id),
      invoice_id INTEGER          REFERENCES invoices(id) ON DELETE SET NULL,

      amount     REAL    NOT NULL,
      method     TEXT    DEFAULT 'CASH',  -- CASH | BANK | WHISH | OMT
      note       TEXT,

      is_deleted    INTEGER DEFAULT 0,
      deleted_at    TEXT,
      deleted_by    TEXT,
      delete_reason TEXT,

      paid_at    TEXT    NOT NULL,
      created_at TEXT    DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_payments_user_date
            ON payments(user_id, paid_at) WHERE is_deleted = 0`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_payments_invoice
            ON payments(invoice_id) WHERE is_deleted = 0`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_payments_is_deleted
            ON payments(is_deleted)`);


  // ══════════════════════════════════════════════════════════════════════════
  // WALLET TRANSACTIONS
  // ══════════════════════════════════════════════════════════════════════════
  db.run(`
    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id),

      type       TEXT    NOT NULL,   -- CREDIT | DEBIT
      amount     REAL    NOT NULL,

      ref_type   TEXT,               -- PAYMENT | INVOICE | MANUAL
      ref_id     INTEGER,

      note       TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_wallet_user
            ON wallet_transactions(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_wallet_ref
            ON wallet_transactions(ref_type, ref_id)`);


  // ══════════════════════════════════════════════════════════════════════════
  // DRAWER TRANSACTIONS
  // ══════════════════════════════════════════════════════════════════════════
  db.run(`
    CREATE TABLE IF NOT EXISTS drawer_transactions (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,

      type       TEXT    NOT NULL,   -- IN | OUT
      amount     REAL    NOT NULL,

      reason     TEXT,               -- PAYMENT | EXPENSE | REFUND | MANUAL
      ref_type   TEXT,               -- invoice | payment | manual
      ref_id     INTEGER,

      actor      TEXT,
      note       TEXT,
      company_id INTEGER REFERENCES companies(id),

      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_drawer_date
            ON drawer_transactions(created_at)`);


  // ══════════════════════════════════════════════════════════════════════════
  // SETTINGS
  // ══════════════════════════════════════════════════════════════════════════
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    )
  `);


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

  db.run(`CREATE INDEX IF NOT EXISTS idx_activity_entity
            ON activity_log(entity, entity_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_activity_date
            ON activity_log(created_at DESC)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_activity_actor
            ON activity_log(actor)`);


  // ══════════════════════════════════════════════════════════════════════════
  // SAFE MIGRATIONS
  // No-ops on fresh installs. Safely add columns to existing databases.
  // ══════════════════════════════════════════════════════════════════════════

  // users
  db.run(`ALTER TABLE users ADD COLUMN service_id    INTEGER`, () => {});
  db.run(`ALTER TABLE users ADD COLUMN lat           REAL`,    () => {});
  db.run(`ALTER TABLE users ADD COLUMN lng           REAL`,    () => {});
  db.run(`ALTER TABLE users ADD COLUMN is_deleted    INTEGER DEFAULT 0`, () => {});
  db.run(`ALTER TABLE users ADD COLUMN deleted_at    TEXT`,   () => {});
  db.run(`ALTER TABLE users ADD COLUMN deleted_by    TEXT`,   () => {});
  db.run(`ALTER TABLE users ADD COLUMN delete_reason TEXT`,   () => {});
  db.run(`ALTER TABLE users ADD COLUMN company_id    INTEGER REFERENCES companies(id)`, () => {});

  // drawer_transactions: tag each transaction with a company
  db.run(`ALTER TABLE drawer_transactions ADD COLUMN company_id INTEGER REFERENCES companies(id)`, () => {});

  // services: add cost (what ISP pays to provider) and company link
  db.run(`ALTER TABLE services ADD COLUMN cost       REAL    DEFAULT 0`,    () => {});
  db.run(`ALTER TABLE services ADD COLUMN company_id INTEGER REFERENCES companies(id)`, () => {});

  // invoices
  db.run(`ALTER TABLE invoices ADD COLUMN type          TEXT DEFAULT 'MONTHLY'`, () => {});
  db.run(`ALTER TABLE invoices ADD COLUMN service_id    INTEGER`, () => {});
  db.run(`ALTER TABLE invoices ADD COLUMN note          TEXT`,    () => {});
  db.run(`ALTER TABLE invoices ADD COLUMN affects_expiry INTEGER DEFAULT 1`, () => {});
  db.run(`ALTER TABLE invoices ADD COLUMN is_deleted    INTEGER DEFAULT 0`,  () => {});
  db.run(`ALTER TABLE invoices ADD COLUMN deleted_at    TEXT`,   () => {});
  db.run(`ALTER TABLE invoices ADD COLUMN deleted_by    TEXT`,   () => {});
  db.run(`ALTER TABLE invoices ADD COLUMN delete_reason TEXT`,   () => {});
  db.run(`ALTER TABLE invoices ADD COLUMN paid_at       TEXT`,   () => {});

  // payments
  db.run(`ALTER TABLE payments ADD COLUMN is_deleted    INTEGER DEFAULT 0`, () => {});
  db.run(`ALTER TABLE payments ADD COLUMN deleted_at    TEXT`,  () => {});
  db.run(`ALTER TABLE payments ADD COLUMN deleted_by    TEXT`,  () => {});
  db.run(`ALTER TABLE payments ADD COLUMN delete_reason TEXT`,  () => {});


  // ══════════════════════════════════════════════════════════════════════════
  // DATA FIX MIGRATIONS  (idempotent — safe to run multiple times)
  // ══════════════════════════════════════════════════════════════════════════
  db.run(`UPDATE users    SET is_deleted = 0 WHERE is_deleted IS NULL`);
  db.run(`UPDATE invoices SET is_deleted = 0 WHERE is_deleted IS NULL`);
  db.run(`UPDATE payments SET is_deleted = 0 WHERE is_deleted IS NULL`);



  // pos_sales customer column migration (for existing DBs)
  db.run(`ALTER TABLE pos_sales ADD COLUMN customer TEXT`, () => {});

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

  // ══════════════════════════════════════════════════════════════════════════
  // POS — ITEMS / CATALOG
  // ══════════════════════════════════════════════════════════════════════════
  db.run(`
    CREATE TABLE IF NOT EXISTS pos_items (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      category_id INTEGER REFERENCES pos_categories(id) ON DELETE SET NULL,
      price       REAL    NOT NULL DEFAULT 0,
      cost        REAL    DEFAULT 0,
      unit        TEXT    DEFAULT 'pcs',
      barcode     TEXT,
      notes       TEXT,
      track_stock INTEGER DEFAULT 1,
      stock_qty   REAL    DEFAULT 0,
      stock_min   REAL    DEFAULT 0,
      is_deleted  INTEGER DEFAULT 0,
      deleted_at  TEXT,
      created_at  TEXT    DEFAULT CURRENT_TIMESTAMP,
      updated_at  TEXT    DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_pos_items_cat ON pos_items(category_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_pos_items_name ON pos_items(name)`);

  // ══════════════════════════════════════════════════════════════════════════
  // POS — SALES
  // ══════════════════════════════════════════════════════════════════════════
  db.run(`
    CREATE TABLE IF NOT EXISTS pos_sales (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_number TEXT    UNIQUE,
      subtotal    REAL    NOT NULL DEFAULT 0,
      discount    REAL    DEFAULT 0,
      total       REAL    NOT NULL DEFAULT 0,
      method      TEXT    DEFAULT 'CASH',
      status      TEXT    DEFAULT 'PAID',
      customer    TEXT,
      note        TEXT,
      actor       TEXT,
      is_deleted  INTEGER DEFAULT 0,
      created_at  TEXT    DEFAULT CURRENT_TIMESTAMP,
      updated_at  TEXT    DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_pos_sales_date ON pos_sales(created_at)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_pos_sales_status ON pos_sales(status)`);

  // ══════════════════════════════════════════════════════════════════════════
  // POS — SALE LINE ITEMS
  // ══════════════════════════════════════════════════════════════════════════
  db.run(`
    CREATE TABLE IF NOT EXISTS pos_sale_items (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id     INTEGER NOT NULL REFERENCES pos_sales(id),
      item_id     INTEGER REFERENCES pos_items(id) ON DELETE SET NULL,
      item_name   TEXT    NOT NULL,
      unit_price  REAL    NOT NULL DEFAULT 0,
      qty         REAL    NOT NULL DEFAULT 1,
      line_total  REAL    NOT NULL DEFAULT 0
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_pos_sale_items_sale ON pos_sale_items(sale_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_pos_sale_items_item ON pos_sale_items(item_id)`);

  // ══════════════════════════════════════════════════════════════════════════
  // POS — DRAWER TRANSACTIONS (completely separate from ISP drawer)
  // ══════════════════════════════════════════════════════════════════════════
  db.run(`
    CREATE TABLE IF NOT EXISTS pos_drawer_transactions (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      type       TEXT    NOT NULL,   -- IN | OUT
      amount     REAL    NOT NULL,
      reason     TEXT,               -- SALE | REFUND | EXPENSE | MANUAL
      ref_type   TEXT,               -- pos_sale | manual
      ref_id     INTEGER,
      method     TEXT    DEFAULT 'CASH',
      actor      TEXT,
      note       TEXT,
      created_at TEXT    DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_pos_drawer_date ON pos_drawer_transactions(created_at)`);


    // Default settings
  db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('pos_enabled', '1')`);

  console.log("✅ Database initialized");
});