import { electronApi } from "./electronApi";

export const posApi = {

  // ── Categories ────────────────────────────────────────────────────────────
  listCategories:    ()  => electronApi.posListCategories(),
  addCategory:       (p) => electronApi.posAddCategory(p),
  deleteCategory:    (id)=> electronApi.posDeleteCategory(id),

  // ── Items ─────────────────────────────────────────────────────────────────
  listItems:         (f) => electronApi.posListItems(f),
  getItem:           (id)=> electronApi.posGetItem(id),
  addItem:           (p) => electronApi.posAddItem(p),
  updateItem:        (p) => electronApi.posUpdateItem(p),
  deleteItem:        (id)=> electronApi.posDeleteItem(id),
  archiveItem:       (id)=> electronApi.posArchiveItem(id),
  restoreItem:       (id)=> electronApi.posRestoreItem(id),
  listArchivedItems: ()  => electronApi.posListArchivedItems(),
  adjustStock:       (p) => electronApi.posAdjustStock(p),

  // ── Sales ─────────────────────────────────────────────────────────────────
  createSale:        (p) => electronApi.posCreateSale(p),
  listSales:         (f) => electronApi.posListSales(f),
  getSale:           (id)=> electronApi.posGetSale(id),
  refundSale:        (p) => electronApi.posRefundSale(p),

  // ── Drawer ────────────────────────────────────────────────────────────────
  drawerAdd:         (p) => electronApi.posDrawerAdd(p),
  drawerList:        (f) => electronApi.posDrawerList(f),
  drawerSummary:     (f) => electronApi.posDrawerSummary(f),
  drawerBalance:     ()  => electronApi.posDrawerBalance(),
  drawerDailyList:   (f) => electronApi.posDrawerDailyList(f),

  // ── Reports ───────────────────────────────────────────────────────────────
  salesSummary:      (f) => electronApi.posSalesSummary(f),
  topItems:          (f) => electronApi.posTopItems(f),
};