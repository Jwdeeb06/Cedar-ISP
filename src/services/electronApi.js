// Lazy proxy — always reads from window.api at call time, never at import time
function api(method) {
  return (...args) => {
    if (typeof window !== "undefined" && window.api && typeof window.api[method] === "function") {
      return window.api[method](...args);
    }
    console.warn(`[electronApi] window.api.${method} not available`);
    return Promise.resolve(undefined);
  };
}

export const electronApi = {
  // ── USERS ──────────────────────────────────────────────────────────────────
  addUser:           api("addUser"),
  listUsers:         api("listUsers"),
  updateUser:        api("updateUser"),
  deleteUser:        api("deleteUser"),
  restoreUser:       api("restoreUser"),
  listArchivedUsers: api("listArchivedUsers"),
  userInvoiceCount:  api("userInvoiceCount"),
  countUsers:        api("countUsers"),

  // ── ADDRESSES ──────────────────────────────────────────────────────────────
  listAddresses: api("listAddresses"),
  addAddress:    api("addAddress"),
  deleteAddress: api("deleteAddress"),

  // ── SERVICES ───────────────────────────────────────────────────────────────
  listServices:  api("listServices"),
  addService:    api("addService"),
  updateService: api("updateService"),
  deleteService: api("deleteService"),

  // ── INVOICES ───────────────────────────────────────────────────────────────
  createInvoice:         api("createInvoice"),
  listInvoices:          api("listInvoices"),
  listUserInvoices:      api("listUserInvoices"),
  getInvoice:            api("getInvoice"),
  getInvoiceDetail:      api("getInvoiceDetail"),
  setInvoiceStatus:      api("setInvoiceStatus"),
  deleteInvoice:         api("deleteInvoice"),
  generateMonthPayments: api("generateMonthPayments"),
  getUserMonthPayments:  api("getUserMonthPayments"),
  listPaidDays:          api("listPaidDays"),

  // ── PAYMENTS ───────────────────────────────────────────────────────────────
  payInvoice:               api("payInvoice"),
  listInvoicePayments:      api("listInvoicePayments"),
  listPayments:             api("listPayments"),
  deletePayment:            api("deletePayment"),
  applySubscriptionPayment: api("applySubscriptionPayment"),
  adjustBalance:            api("adjustBalance"),
  createStaticPayment:      api("createStaticPayment"),
  addPaymentCredit:         api("addPaymentCredit"),

  // ── LBP RATE ───────────────────────────────────────────────────────────────
  getLbpRate: api("getLbpRate"),

  // ── WALLET ─────────────────────────────────────────────────────────────────
  walletBalance: api("walletBalance"),
  walletList:    api("walletList"),
  walletCredit:  api("walletCredit"),
  walletDebit:   api("walletDebit"),
  walletSummary: api("walletSummary"),

  // ── CASH DRAWER ────────────────────────────────────────────────────────────
  drawerAdd:       api("drawerAdd"),
  drawerList:      api("drawerList"),
  drawerSummary:   api("drawerSummary"),
  drawerBalance:   api("drawerBalance"),
  drawerDailyList: api("drawerDailyList"),
  drawerDelete:    api("drawerDelete"),
  drawerActors:    api("drawerActors"),

  // ── IMPORT / EXPORT ────────────────────────────────────────────────────────
  exportUsers:           api("exportUsers"),
  downloadUsersTemplate: api("downloadUsersTemplate"),
  importUsers:           api("importUsers"),

  // ── SETTINGS ───────────────────────────────────────────────────────────────
  getSettings: api("getSettings"),
  setSetting:  api("setSetting"),

  // ── COMPANIES & PROFIT ────────────────────────────────────────────────────
  listCompanies:   api("listCompanies"),
  addCompany:      api("addCompany"),
  updateCompany:   api("updateCompany"),
  deleteCompany:   api("deleteCompany"),
  getProfitReport: api("getProfitReport"),

  // ── ACTIVITY LOG ───────────────────────────────────────────────────────────
  listActivityLog:  api("listActivityLog"),
  listActivityDays: api("listActivityDays"),

  // ── POS — CATEGORIES ──────────────────────────────────────────────────────
  posListCategories:    api("posListCategories"),
  posAddCategory:       api("posAddCategory"),
  posDeleteCategory:    api("posDeleteCategory"),

  // ── POS — ITEMS ───────────────────────────────────────────────────────────
  posListItems:         api("posListItems"),
  posGetItem:           api("posGetItem"),
  posAddItem:           api("posAddItem"),
  posUpdateItem:        api("posUpdateItem"),
  posDeleteItem:        api("posDeleteItem"),
  posArchiveItem:       api("posArchiveItem"),
  posRestoreItem:       api("posRestoreItem"),
  posListArchivedItems: api("posListArchivedItems"),
  posAdjustStock:       api("posAdjustStock"),

  // ── POS — SALES ───────────────────────────────────────────────────────────
  posCreateSale: api("posCreateSale"),
  posListSales:  api("posListSales"),
  posGetSale:    api("posGetSale"),
  posRefundSale: api("posRefundSale"),

  // ── POS — DRAWER ──────────────────────────────────────────────────────────
  posDrawerAdd:       api("posDrawerAdd"),
  posDrawerList:      api("posDrawerList"),
  posDrawerSummary:   api("posDrawerSummary"),
  posDrawerBalance:   api("posDrawerBalance"),
  posDrawerDailyList: api("posDrawerDailyList"),

  // ── POS — REPORTS ─────────────────────────────────────────────────────────
  posSalesSummary: api("posSalesSummary"),
  posTopItems:     api("posTopItems"),

  // ── MAP ────────────────────────────────────────────────────────────────────
  mapGetUsers:           api("mapGetUsers"),
  mapUpdateUserLocation: api("mapUpdateUserLocation"),
  mapListStations:       api("mapListStations"),
  mapAddStation:         api("mapAddStation"),
  mapUpdateStation:      api("mapUpdateStation"),
  mapDeleteStation:      api("mapDeleteStation"),
  mapListFiberBoxes:     api("mapListFiberBoxes"),
  mapAddFiberBox:        api("mapAddFiberBox"),
  mapUpdateFiberBox:     api("mapUpdateFiberBox"),
  mapDeleteFiberBox:     api("mapDeleteFiberBox"),
};