import { electronApi } from "./electronApi";

export const paymentsApi = {
  list: (filters) => electronApi.listInvoices(filters),
  setStatus: (payload) => electronApi.setInvoiceStatus(payload),
  delete: (id) => electronApi.deleteInvoice(id),
  generateMonth: (payload) => electronApi.generateMonthPayments(payload),
  getInvoice: (id) => electronApi.getInvoice(id),

  // NEW
  applySubscriptionPayment: (payload) => electronApi.applySubscriptionPayment(payload),
  adjustBalance: (payload) => electronApi.adjustBalance(payload),
  listUserInvoices: (userId) => electronApi.listUserInvoices(userId),
  createStaticPayment: (payload) => electronApi.createStaticPayment(payload),
  getUserMonthPayments: (payload) =>electronApi.getUserMonthPayments(payload),
  listPaidDays: (payload) => electronApi.listPaidDays(payload),

};
