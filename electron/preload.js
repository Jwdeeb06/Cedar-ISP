const { contextBridge, ipcRenderer } = require("electron");

// Track current logged-in employee for activity logging
let _actor = "system";

function plog(msg) {
  try {
    ipcRenderer.send("log", String(msg));
  } catch {}
}

plog("PRELOAD LOADED");

contextBridge.exposeInMainWorld("api", {
  // ── LICENSE ──────────────────────────────────────────────────────────────────
  checkLicense: (p) => ipcRenderer.invoke("check-license", p),
  getCachedLicense: () => ipcRenderer.invoke("get-cached-license"),

  // ── ACTOR (for activity log) ──────────────────────────────────────────────
  setActor: (username) => {
    _actor = username || "system";
  },
  getActor: () => _actor,

  // ── AUTH ─────────────────────────────────────────────────────────────────
  authLogin: (p) => ipcRenderer.invoke("auth-login", p),
  listEmployees: () => ipcRenderer.invoke("list-employees"),
  addEmployee: (p) => ipcRenderer.invoke("add-employee", p),
  updateEmployee: (p) => ipcRenderer.invoke("update-employee", p),
  changePassword: (p) => ipcRenderer.invoke("change-password", p),
  deleteEmployee: (id) => ipcRenderer.invoke("delete-employee", id),
  autoCheckLicense: () => ipcRenderer.invoke("auto-check-license"),

  // ── USERS ─────────────────────────────────────────────────────────────────
  addUser: (user) => ipcRenderer.invoke("add-user", { ...user, actor: _actor }),
  listUsers: (filters) => ipcRenderer.invoke("list-users", filters),
  updateUser: (user) =>
    ipcRenderer.invoke("update-user", { ...user, actor: _actor }),
  deleteUser: (id) =>
    ipcRenderer.invoke("delete-user", { userId: id, actor: _actor }),
  restoreUser: (id) => ipcRenderer.invoke("restore-user", id),
  listArchivedUsers: (filters) =>
    ipcRenderer.invoke("list-archived-users", filters),
  userInvoiceCount: (id) => ipcRenderer.invoke("user-invoice-count", id),
  countUsers: (f) => ipcRenderer.invoke("count-users", f),

  // ── ADDRESSES ─────────────────────────────────────────────────────────────
  listAddresses: () => ipcRenderer.invoke("list-addresses"),
  addAddress: (address) => ipcRenderer.invoke("add-address", address),
  deleteAddress: (address) => ipcRenderer.invoke("delete-address", address),

  // ── SERVICES ──────────────────────────────────────────────────────────────
  listServices: () => ipcRenderer.invoke("list-services"),
  addService: (payload) => ipcRenderer.invoke("add-service", payload),
  updateService: (payload) => ipcRenderer.invoke("update-service", payload),
  deleteService: (id) => ipcRenderer.invoke("delete-service", id),

  // ── INVOICES ──────────────────────────────────────────────────────────────
  createInvoice: (invoice) =>
    ipcRenderer.invoke("create-invoice", { ...invoice, actor: _actor }),
  listInvoices: (filters) => ipcRenderer.invoke("list-invoices", filters),
  listUserInvoices: (userId) =>
    ipcRenderer.invoke("list-user-invoices", userId),
  getInvoice: (id) => ipcRenderer.invoke("get-invoice", id),
  getInvoiceDetail: (id) => ipcRenderer.invoke("get-invoice-detail", id), // includes paid_sum + remaining
  setInvoiceStatus: (payload) =>
    ipcRenderer.invoke("set-invoice-status", payload),
  deleteInvoice: (id) => ipcRenderer.invoke("delete-invoice", id),
  generateMonthPayments: (payload) =>
    ipcRenderer.invoke("generate-month-payments", payload),
  getUserMonthPayments: (payload) =>
    ipcRenderer.invoke("get-user-month-payments", payload),
  listPaidDays: (payload) => ipcRenderer.invoke("list-paid-days", payload),

  // ── PAYMENTS ──────────────────────────────────────────────────────────────
  // Full/partial payment — USD and/or LBP
  payInvoice: (payload) =>
    ipcRenderer.invoke("pay-invoice", { ...payload, actor: _actor }),
  listInvoicePayments: (id) => ipcRenderer.invoke("list-invoice-payments", id),
  listPayments: (filters) => ipcRenderer.invoke("list-payments", filters),
  deletePayment: (payload) => ipcRenderer.invoke("delete-payment", payload),

  // Subscription / balance shortcuts (existing)
  applySubscriptionPayment: (payload) =>
    ipcRenderer.invoke("apply-subscription-payment", payload),
  adjustBalance: (payload) => ipcRenderer.invoke("adjust-balance", payload),
  createStaticPayment: (payload) =>
    ipcRenderer.invoke("create-static-payment", payload),
  addPaymentCredit: (payload) =>
    ipcRenderer.invoke("add-payment-credit", payload),

  // ── LBP RATE ──────────────────────────────────────────────────────────────
  getLbpRate: () => ipcRenderer.invoke("get-lbp-rate"),

  // ── WALLET ────────────────────────────────────────────────────────────────
  walletBalance: (userId) => ipcRenderer.invoke("wallet-balance", userId),
  walletList: (filters) => ipcRenderer.invoke("wallet-list", filters),
  walletCredit: (payload) => ipcRenderer.invoke("wallet-credit", payload),
  walletDebit: (payload) => ipcRenderer.invoke("wallet-debit", payload),
  walletSummary: (userId) => ipcRenderer.invoke("wallet-summary", userId),

  // ── DRAWER ────────────────────────────────────────────────────────────────
  drawerAdd: (payload) =>
    ipcRenderer.invoke("drawer-add", { ...payload, actor: _actor }),
  drawerActors: (filters) => ipcRenderer.invoke("drawer-actors", filters),
  drawerList: (filters) => ipcRenderer.invoke("drawer-list", filters),
  drawerSummary: (filters) => ipcRenderer.invoke("drawer-summary", filters),
  drawerBalance: () => ipcRenderer.invoke("drawer-balance"),
  drawerDailyList: (filters) =>
    ipcRenderer.invoke("drawer-daily-list", filters),
  drawerDelete: (payload) => ipcRenderer.invoke("drawer-delete", payload),

  // ── IMPORT / EXPORT ───────────────────────────────────────────────────────
  exportUsers: () => ipcRenderer.invoke("export-users"),
  exportBillingReport: (p) => ipcRenderer.invoke("export-billing-report", p),
  downloadUsersTemplate: () => ipcRenderer.invoke("download-users-template"),
  importUsers: () => ipcRenderer.invoke("import-users"),

  // ── SETTINGS ──────────────────────────────────────────────────────────────
  getSettings: () => ipcRenderer.invoke("get-settings"),
  setSetting: (payload) => ipcRenderer.invoke("set-setting", payload),

  // ── ACTIVITY LOG ──────────────────────────────────────────────────────────
  listActivityLog: (filters) =>
    ipcRenderer.invoke("list-activity-log", filters),
  listActivityDays: (payload) =>
    ipcRenderer.invoke("list-activity-days", payload),

  // ── DRAWER MIGRATION ─────────────────────────────────────────────────────
  migrateDrawerCompanies: () => ipcRenderer.invoke("migrate-drawer-companies"),

  // ── COMPANIES & PROFIT ────────────────────────────────────────────────────
  listCompanies: () => ipcRenderer.invoke("list-companies"),
  addCompany: (p) => ipcRenderer.invoke("add-company", p),
  updateCompany: (p) => ipcRenderer.invoke("update-company", p),
  deleteCompany: (id) => ipcRenderer.invoke("delete-company", id),
  getProfitReport: (p) => ipcRenderer.invoke("get-profit-report", p),

  // ── DATABASE BACKUP ───────────────────────────────────────────────────────
  dbBackup: () => ipcRenderer.invoke("db-backup"),
  dbRestore: () => ipcRenderer.invoke("db-restore"),
  listBackups: () => ipcRenderer.invoke("list-backups"),

  // ── APP CONTROLS ──────────────────────────────────────────────────────────
  appRestart: () => ipcRenderer.invoke("app-restart"),
  appQuit: () => ipcRenderer.invoke("app-quit"),
  toggleDevTools: () => ipcRenderer.invoke("toggle-devtools"),

  // ── ARCHIVE ───────────────────────────────────────────────────────────────
  archiveListUsers: (f) => ipcRenderer.invoke("archive-list-users", f),
  archiveRestoreUser: (id) => ipcRenderer.invoke("archive-restore-user", id),
  archiveListInvoices: (f) => ipcRenderer.invoke("archive-list-invoices", f),
  archiveRestoreInvoice: (id) =>
    ipcRenderer.invoke("archive-restore-invoice", id),

  // ── MAP ───────────────────────────────────────────────────────────────────
  mapGetUsers: () => ipcRenderer.invoke("map-get-users"),
  mapUpdateUserLocation: (payload) =>
    ipcRenderer.invoke("map-update-user-location", payload),
  mapListStations: () => ipcRenderer.invoke("map-list-stations"),
  mapAddStation: (payload) => ipcRenderer.invoke("map-add-station", payload),
  mapUpdateStation: (payload) =>
    ipcRenderer.invoke("map-update-station", payload),
  mapDeleteStation: (id) => ipcRenderer.invoke("map-delete-station", id),
  mapListFiberBoxes: () => ipcRenderer.invoke("map-list-fiber-boxes"),
  mapAddFiberBox: (payload) => ipcRenderer.invoke("map-add-fiber-box", payload),
  mapUpdateFiberBox: (payload) =>
    ipcRenderer.invoke("map-update-fiber-box", payload),
  mapDeleteFiberBox: (id) => ipcRenderer.invoke("map-delete-fiber-box", id),

  // ── WINDOW CONTROLS (frameless) ───────────────────────────────────────────
  winMinimize: () => ipcRenderer.send("win-minimize"),
  winMaximize: () => ipcRenderer.send("win-maximize"),
  winClose: () => ipcRenderer.send("win-close"),

  // ── WINDOW CONTROLS (frameless) ───────────────────────────────────────────
  winMinimize: () => ipcRenderer.invoke("win-minimize"),
  winMaximize: () => ipcRenderer.invoke("win-maximize"),
  winClose: () => ipcRenderer.invoke("win-close"),
  winIsMaximized: () => ipcRenderer.invoke("win-is-maximized"),

  // ── PRINT ─────────────────────────────────────────────────────────────────
  printHtml: (payload) => ipcRenderer.invoke("print-html", payload),

  // ── POS — CATEGORIES ──────────────────────────────────────────────────────
  posListCategories: () => ipcRenderer.invoke("pos-list-categories"),
  posAddCategory: (p) => ipcRenderer.invoke("pos-add-category", p),
  posDeleteCategory: (id) => ipcRenderer.invoke("pos-delete-category", id),

  // ── POS — ITEMS ───────────────────────────────────────────────────────────
  posListItems: (f) => ipcRenderer.invoke("pos-list-items", f),
  posGetItem: (id) => ipcRenderer.invoke("pos-get-item", id),
  posAddItem: (p) => ipcRenderer.invoke("pos-add-item", p),
  posUpdateItem: (p) => ipcRenderer.invoke("pos-update-item", p),
  posDeleteItem: (id) => ipcRenderer.invoke("pos-delete-item", id),
  posArchiveItem: (id) => ipcRenderer.invoke("pos-archive-item", id),
  posRestoreItem: (id) => ipcRenderer.invoke("pos-restore-item", id),
  posListArchivedItems: () => ipcRenderer.invoke("pos-list-archived-items"),
  posAdjustStock: (p) => ipcRenderer.invoke("pos-adjust-stock", p),

  // ── POS — SALES ───────────────────────────────────────────────────────────
  posCreateSale: (p) => ipcRenderer.invoke("pos-create-sale", p),
  posListSales: (f) => ipcRenderer.invoke("pos-list-sales", f),
  posGetSale: (id) => ipcRenderer.invoke("pos-get-sale", id),
  posRefundSale: (p) => ipcRenderer.invoke("pos-refund-sale", p),

  // ── POS — DRAWER ──────────────────────────────────────────────────────────
  posDrawerAdd: (p) => ipcRenderer.invoke("pos-drawer-add", p),
  posDrawerList: (f) => ipcRenderer.invoke("pos-drawer-list", f),
  posDrawerSummary: (f) => ipcRenderer.invoke("pos-drawer-summary", f),
  posDrawerBalance: () => ipcRenderer.invoke("pos-drawer-balance"),
  posDrawerDailyList: (f) => ipcRenderer.invoke("pos-drawer-daily-list", f),

  // ── POS — REPORTS ─────────────────────────────────────────────────────────
  posSalesSummary: (f) => ipcRenderer.invoke("pos-sales-summary", f),
  posTopItems: (f) => ipcRenderer.invoke("pos-top-items", f),

  // ── POS — ITEMS ENHANCED ─────────────────────────────────────────────────
  posStockMovements: (f) => ipcRenderer.invoke("pos-stock-movements", f),
  posLowStockCount: () => ipcRenderer.invoke("pos-low-stock-count"),

  // ── POS — HELD CARTS ─────────────────────────────────────────────────────
  posHoldCart: (p) => ipcRenderer.invoke("pos-hold-cart", p),
  posListHeldCarts: () => ipcRenderer.invoke("pos-list-held-carts"),
  posRecallCart: (id) => ipcRenderer.invoke("pos-recall-cart", id),
  posDeleteHeldCart: (id) => ipcRenderer.invoke("pos-delete-held-cart", id),

  // ── POS — CUSTOMERS ──────────────────────────────────────────────────────
  posListCustomers: (f) => ipcRenderer.invoke("pos-list-customers", f),
  posAddCustomer: (p) => ipcRenderer.invoke("pos-add-customer", p),
  posUpdateCustomer: (p) => ipcRenderer.invoke("pos-update-customer", p),
  posGetCustomer: (id) => ipcRenderer.invoke("pos-get-customer", id),
  posCustomerSales: (p) => ipcRenderer.invoke("pos-customer-sales", p),

  // ── POS — SHIFTS ─────────────────────────────────────────────────────────
  posOpenShift: (p) => ipcRenderer.invoke("pos-open-shift", p),
  posGetOpenShift: () => ipcRenderer.invoke("pos-get-open-shift"),
  posCloseShift: (p) => ipcRenderer.invoke("pos-close-shift", p),
  posListShifts: (f) => ipcRenderer.invoke("pos-list-shifts", f),

  // ── POS — VOUCHERS ───────────────────────────────────────────────────────
  posCreateVoucher: (p) => ipcRenderer.invoke("pos-create-voucher", p),
  posCheckVoucher: (c) => ipcRenderer.invoke("pos-check-voucher", c),
  posRedeemVoucher: (p) => ipcRenderer.invoke("pos-redeem-voucher", p),
  posListVouchers: () => ipcRenderer.invoke("pos-list-vouchers"),

  // ── POS — REPORTS ENHANCED ───────────────────────────────────────────────
  posProfitReport: (f) => ipcRenderer.invoke("pos-profit-report", f),
  posSalesByHour: (f) => ipcRenderer.invoke("pos-sales-by-hour", f),
  posEodSummary: (f) => ipcRenderer.invoke("pos-eod-summary", f),

  // ── POS — INVOICES (Pay Later) ───────────────────────────────────────────
  posCreateInvoice: (p) => ipcRenderer.invoke("pos-create-invoice", p),
  posListInvoices: (f) => ipcRenderer.invoke("pos-list-invoices", f),
  posCollectInvoice: (p) => ipcRenderer.invoke("pos-collect-invoice", p),
  posInvoiceSummary: (f) => ipcRenderer.invoke("pos-invoice-summary", f),
});
