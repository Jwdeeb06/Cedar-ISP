import { electronApi } from "./electronApi";

export const invoicesApi = {
  // List invoices — supports all filters (month, status, type, user_id, search…)
  list:              (filters) => electronApi.listInvoices(filters),
  // All invoices for one user (sidebar panel)
  listByUser:        (userId)  => electronApi.listUserInvoices(userId),
  // Single invoice row
  get:               (id)      => electronApi.getInvoice(id),
  // Invoice + paid_sum + remaining (for pay dialog)
  getDetail:         (id)      => electronApi.getInvoiceDetail(id),
  // Create a manual invoice
  create:            (payload) => electronApi.createInvoice(payload),
  // Toggle PAID / UNPAID (old flow)
  setStatus:         (payload) => electronApi.setInvoiceStatus(payload),
  // Soft delete
  delete:            (payload) => electronApi.deleteInvoice(payload),
  // Generate monthly invoices for all active users
  generateMonth:     (payload) => electronApi.generateMonthPayments(payload),
  // Get all invoices for a user in a specific month
  getUserMonth:      (payload) => electronApi.getUserMonthPayments(payload),
  // Days that have at least one paid invoice (for calendar picker)
  listPaidDays:      (payload) => electronApi.listPaidDays(payload),
  // Pay an invoice — full or partial, USD and/or LBP
  pay:               (payload) => electronApi.payInvoice(payload),
  // All payment rows for one invoice
  listPayments:      (id)      => electronApi.listInvoicePayments(id),
  // Subscription payment (extends expiry, optionally uses wallet balance)
  applySubscription: (payload) => electronApi.applySubscriptionPayment(payload),
  // Manual one-off (static) charge
  createStatic:      (payload) => electronApi.createStaticPayment(payload),
  // Adjust wallet balance
  adjustBalance:     (payload) => electronApi.adjustBalance(payload),
};