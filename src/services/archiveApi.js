// src/services/archiveApi.js

export const archiveApi = {
  // ── Users ────────────────────────────────────────────────────────────────
  listUsers:      (filters) => window.api.archiveListUsers(filters),
  restoreUser:    (id)      => window.api.archiveRestoreUser(id),

  // ── Invoices ─────────────────────────────────────────────────────────────
  listInvoices:   (filters) => window.api.archiveListInvoices(filters),
  restoreInvoice: (id)      => window.api.archiveRestoreInvoice(id),
};