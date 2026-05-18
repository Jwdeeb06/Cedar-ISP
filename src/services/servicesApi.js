import { electronApi } from "./electronApi";

export const servicesApi = {
  // ── Services ────────────────────────────────────────────────────────────
  list:   ()        => electronApi.listServices(),
  add:    (payload) => electronApi.addService(payload),
  update: (payload) => electronApi.updateService(payload),
  delete: (id)      => electronApi.deleteService(id),
};

export const companiesApi = {
  // ── Companies (providers) ────────────────────────────────────────────────
  list:         ()  => electronApi.listCompanies(),
  add:          (p) => electronApi.addCompany(p),
  update:       (p) => electronApi.updateCompany(p),
  delete:       (id)=> electronApi.deleteCompany(id),
  profitReport: (p) => electronApi.getProfitReport(p),
};