// const throwNotAvailable = (method) => async () => {
//   throw new Error(`Electron API not available: ${method}`);
// };

// function pick(method, fallback) {
//   if (
//     typeof window !== "undefined" &&
//     window.api &&
//     typeof window.api[method] === "function"
//   ) {
//     return window.api[method].bind(window.api);
//   }
//   return fallback;
// }

// export const electronApi = {
//   // ======================
//   // USERS
//   // ======================
//   addUser:          pick("addUser",         throwNotAvailable("addUser")),
//   listUsers:        pick("listUsers",        async () => []),
//   deleteUser:       pick("deleteUser",       throwNotAvailable("deleteUser")),
//   userInvoiceCount: pick("userInvoiceCount", async () => 0),
//   updateUser:       pick("updateUser",       throwNotAvailable("updateUser")),
//   countUsers:       pick("countUsers",       async () => ({ ok: true, total: 0 })),

//   listArchivedUsers: pick("listArchivedUsers", async () => []),
//   restoreUser:       pick("restoreUser",       throwNotAvailable("restoreUser")),

//   // ======================
//   // ADDRESSES
//   // ======================
//   listAddresses: pick("listAddresses", async () => []),
//   addAddress:    pick("addAddress",    throwNotAvailable("addAddress")),
//   deleteAddress: pick("deleteAddress", throwNotAvailable("deleteAddress")),

//   // ======================
//   // SERVICES
//   // ======================
//   listServices: pick("listServices", async () => []),

//   // ======================
//   // INVOICES / PAYMENTS
//   // ======================
//   createInvoice:            pick("createInvoice",            throwNotAvailable("createInvoice")),
//   listInvoices:             pick("listInvoices",             async () => []),
//   setInvoiceStatus:         pick("setInvoiceStatus",         throwNotAvailable("setInvoiceStatus")),
//   deleteInvoice:            pick("deleteInvoice",            throwNotAvailable("deleteInvoice")),
//   getInvoice:               pick("getInvoice",               throwNotAvailable("getInvoice")),
//   generateMonthPayments:    pick("generateMonthPayments",    throwNotAvailable("generateMonthPayments")),
//   createStaticPayment:      pick("createStaticPayment",      throwNotAvailable("createStaticPayment")),
//   getUserMonthPayments:     pick("getUserMonthPayments",     async () => []),
//   listPaidDays:             pick("listPaidDays",             async () => []),
//   applySubscriptionPayment: pick("applySubscriptionPayment", throwNotAvailable("applySubscriptionPayment")),
//   adjustBalance:            pick("adjustBalance",            throwNotAvailable("adjustBalance")),
//   listUserInvoices:         pick("listUserInvoices",         async () => []),

//   listPayments:  pick("listPayments",  async () => []),
//   deletePayment: pick("deletePayment", throwNotAvailable("deletePayment")),

//   // ======================
//   // DATA (IMPORT / EXPORT)
//   // ======================
//   exportUsers:           pick("exportUsers",           throwNotAvailable("exportUsers")),
//   downloadUsersTemplate: pick("downloadUsersTemplate", throwNotAvailable("downloadUsersTemplate")),
//   importUsers:           pick("importUsers",           throwNotAvailable("importUsers")),

//   // ======================
//   // SETTINGS
//   // ======================
//   getSettings: pick("getSettings", async () => ({})),
//   setSetting:  pick("setSetting",  throwNotAvailable("setSetting")),

//   // ======================
//   // ACTIVITY LOG
//   // ======================
//   listActivityLog:  pick("listActivityLog",  async () => []),
//   listActivityDays: pick("listActivityDays", async () => []),

//   // ======================
//   // CASH DRAWER
//   // ======================
//   drawerAdd:       pick("drawerAdd",       throwNotAvailable("drawerAdd")),
//   drawerList:      pick("drawerList",      async () => []),
//   drawerSummary:   pick("drawerSummary",   async () => ({ total_in: 0, total_out: 0, balance: 0, tx_count: 0 })),
//   drawerBalance:   pick("drawerBalance",   async () => ({ ok: true, balance: 0 })),
//   drawerDailyList: pick("drawerDailyList", async () => []),
//   drawerDelete:    pick("drawerDelete",    throwNotAvailable("drawerDelete")),
// };
const throwNotAvailable = (method) => async () => {
  throw new Error(`Electron API not available: ${method}`);
};

function pick(method, fallback) {
  if (typeof window !== "undefined" && window.api && typeof window.api[method] === "function") {
    return window.api[method].bind(window.api);
  }
  return fallback;
}

export const electronApi = {
  // ── USERS ──────────────────────────────────────────────────────────────────
  addUser:           pick("addUser",           throwNotAvailable("addUser")),
  listUsers:         pick("listUsers",         async () => []),
  updateUser:        pick("updateUser",        throwNotAvailable("updateUser")),
  deleteUser:        pick("deleteUser",        throwNotAvailable("deleteUser")),
  restoreUser:       pick("restoreUser",       throwNotAvailable("restoreUser")),
  listArchivedUsers: pick("listArchivedUsers", async () => []),
  userInvoiceCount:  pick("userInvoiceCount",  async () => 0),
  countUsers:        pick("countUsers",        async () => ({ ok: true, total: 0 })),

  // ── ADDRESSES ──────────────────────────────────────────────────────────────
  listAddresses: pick("listAddresses", async () => []),
  addAddress:    pick("addAddress",    throwNotAvailable("addAddress")),
  deleteAddress: pick("deleteAddress", throwNotAvailable("deleteAddress")),

  // ── SERVICES ───────────────────────────────────────────────────────────────
  listServices:  pick("listServices",  async () => []),
  addService:    pick("addService",    throwNotAvailable("addService")),
  updateService: pick("updateService", throwNotAvailable("updateService")),
  deleteService: pick("deleteService", throwNotAvailable("deleteService")),

  // ── INVOICES ───────────────────────────────────────────────────────────────
  createInvoice:         pick("createInvoice",         throwNotAvailable("createInvoice")),
  listInvoices:          pick("listInvoices",           async () => []),
  listUserInvoices:      pick("listUserInvoices",       async () => []),
  getInvoice:            pick("getInvoice",             throwNotAvailable("getInvoice")),
  getInvoiceDetail:      pick("getInvoiceDetail",       async () => null),
  setInvoiceStatus:      pick("setInvoiceStatus",       throwNotAvailable("setInvoiceStatus")),
  deleteInvoice:         pick("deleteInvoice",          throwNotAvailable("deleteInvoice")),
  generateMonthPayments: pick("generateMonthPayments",  throwNotAvailable("generateMonthPayments")),
  getUserMonthPayments:  pick("getUserMonthPayments",   async () => []),
  listPaidDays:          pick("listPaidDays",           async () => []),

  // ── PAYMENTS ───────────────────────────────────────────────────────────────
  payInvoice:               pick("payInvoice",               throwNotAvailable("payInvoice")),
  listInvoicePayments:      pick("listInvoicePayments",       async () => []),
  listPayments:             pick("listPayments",              async () => []),
  deletePayment:            pick("deletePayment",             throwNotAvailable("deletePayment")),
  applySubscriptionPayment: pick("applySubscriptionPayment",  throwNotAvailable("applySubscriptionPayment")),
  adjustBalance:            pick("adjustBalance",             throwNotAvailable("adjustBalance")),
  createStaticPayment:      pick("createStaticPayment",       throwNotAvailable("createStaticPayment")),
  addPaymentCredit:         pick("addPaymentCredit",          throwNotAvailable("addPaymentCredit")),

  // ── LBP RATE ───────────────────────────────────────────────────────────────
  getLbpRate: pick("getLbpRate", async () => ({ ok: true, rate: 0 })),

  // ── WALLET ─────────────────────────────────────────────────────────────────
  walletBalance: pick("walletBalance", async () => ({ ok: false, balance: 0 })),
  walletList:    pick("walletList",    async () => []),
  walletCredit:  pick("walletCredit",  throwNotAvailable("walletCredit")),
  walletDebit:   pick("walletDebit",   throwNotAvailable("walletDebit")),
  walletSummary: pick("walletSummary", async () => null),

  // ── CASH DRAWER ────────────────────────────────────────────────────────────
  drawerAdd:       pick("drawerAdd",       throwNotAvailable("drawerAdd")),
  drawerList:      pick("drawerList",      async () => []),
  drawerSummary:   pick("drawerSummary",   async () => ({ total_in: 0, total_out: 0, balance: 0, tx_count: 0 })),
  drawerBalance:   pick("drawerBalance",   async () => ({ ok: true, balance: 0 })),
  drawerDailyList: pick("drawerDailyList", async () => []),
  drawerDelete:    pick("drawerDelete",    throwNotAvailable("drawerDelete")),
  drawerActors:    pick("drawerActors",    async () => []),

  // ── IMPORT / EXPORT ────────────────────────────────────────────────────────
  exportUsers:           pick("exportUsers",           throwNotAvailable("exportUsers")),
  downloadUsersTemplate: pick("downloadUsersTemplate", throwNotAvailable("downloadUsersTemplate")),
  importUsers:           pick("importUsers",           throwNotAvailable("importUsers")),

  // ── SETTINGS ───────────────────────────────────────────────────────────────
  getSettings: pick("getSettings", async () => ({})),
  setSetting:  pick("setSetting",  throwNotAvailable("setSetting")),

  // ── COMPANIES & PROFIT ────────────────────────────────────────────────────
  listCompanies:   pick("listCompanies",   async () => []),
  addCompany:      pick("addCompany",      async () => ({ ok: false })),
  updateCompany:   pick("updateCompany",   async () => ({ ok: false })),
  deleteCompany:   pick("deleteCompany",   async () => ({ ok: false })),
  getProfitReport: pick("getProfitReport", async () => []),

  // ── ACTIVITY LOG ───────────────────────────────────────────────────────────
  listActivityLog:  pick("listActivityLog",  async () => []),
  listActivityDays: pick("listActivityDays", async () => []),

  // ── POS — CATEGORIES ──────────────────────────────────────────────────────
  posListCategories:    pick("posListCategories",    async () => []),
  posAddCategory:       pick("posAddCategory",       throwNotAvailable("posAddCategory")),
  posDeleteCategory:    pick("posDeleteCategory",    throwNotAvailable("posDeleteCategory")),

  // ── POS — ITEMS ───────────────────────────────────────────────────────────
  posListItems:         pick("posListItems",         async () => []),
  posGetItem:           pick("posGetItem",           async () => null),
  posAddItem:           pick("posAddItem",           throwNotAvailable("posAddItem")),
  posUpdateItem:        pick("posUpdateItem",        throwNotAvailable("posUpdateItem")),
  posDeleteItem:        pick("posDeleteItem",        throwNotAvailable("posDeleteItem")),
  posArchiveItem:       pick("posArchiveItem",       throwNotAvailable("posArchiveItem")),
  posRestoreItem:       pick("posRestoreItem",       throwNotAvailable("posRestoreItem")),
  posListArchivedItems: pick("posListArchivedItems", async () => []),
  posAdjustStock:       pick("posAdjustStock",       throwNotAvailable("posAdjustStock")),

  // ── POS — SALES ───────────────────────────────────────────────────────────
  posCreateSale:        pick("posCreateSale",        throwNotAvailable("posCreateSale")),
  posListSales:         pick("posListSales",         async () => []),
  posGetSale:           pick("posGetSale",           async () => null),
  posRefundSale:        pick("posRefundSale",        throwNotAvailable("posRefundSale")),

  // ── POS — DRAWER ──────────────────────────────────────────────────────────
  posDrawerAdd:         pick("posDrawerAdd",         throwNotAvailable("posDrawerAdd")),
  posDrawerList:        pick("posDrawerList",        async () => []),
  posDrawerSummary:     pick("posDrawerSummary",     async () => ({ total_in:0, total_out:0, balance:0, tx_count:0 })),
  posDrawerBalance:     pick("posDrawerBalance",     async () => ({ ok:true, balance:0 })),
  posDrawerDailyList:   pick("posDrawerDailyList",   async () => []),

  // ── POS — REPORTS ─────────────────────────────────────────────────────────
  posSalesSummary:      pick("posSalesSummary",      async () => ({})),
  posTopItems:          pick("posTopItems",          async () => []),

  // ── MAP ────────────────────────────────────────────────────────────────────
  mapGetUsers:           pick("mapGetUsers",           async () => []),
  mapUpdateUserLocation: pick("mapUpdateUserLocation", throwNotAvailable("mapUpdateUserLocation")),
  mapListStations:       pick("mapListStations",       async () => []),
  mapAddStation:         pick("mapAddStation",         throwNotAvailable("mapAddStation")),
  mapUpdateStation:      pick("mapUpdateStation",      throwNotAvailable("mapUpdateStation")),
  mapDeleteStation:      pick("mapDeleteStation",      throwNotAvailable("mapDeleteStation")),
  mapListFiberBoxes:     pick("mapListFiberBoxes",     async () => []),
  mapAddFiberBox:        pick("mapAddFiberBox",        throwNotAvailable("mapAddFiberBox")),
  mapUpdateFiberBox:     pick("mapUpdateFiberBox",     throwNotAvailable("mapUpdateFiberBox")),
  mapDeleteFiberBox:     pick("mapDeleteFiberBox",     throwNotAvailable("mapDeleteFiberBox")),
};