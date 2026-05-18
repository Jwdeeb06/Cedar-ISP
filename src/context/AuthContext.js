// src/context/AuthContext.js
import { createContext, useContext } from "react";

export const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

// Check if current employee has a specific permission
export function useCan(permission) {
  const auth = useAuth();
  if (!auth?.employee) return false;
  const perms = auth.employee.permissions || {};
  if (perms.all === true) return true; // admin
  return Boolean(perms[permission]);
}

// All available permissions with labels
export const PERMISSIONS = [
  // Dashboard
  { key:"dashboard",       label:"Dashboard",              group:"Overview" },
  // Users
  { key:"users_view",      label:"View Users",             group:"Users" },
  { key:"users_add",       label:"Add Users",              group:"Users" },
  { key:"users_edit",      label:"Edit Users",             group:"Users" },
  { key:"users_delete",    label:"Delete Users",           group:"Users" },
  // Payments
  { key:"payments_view",   label:"View Payments",          group:"Billing" },
  { key:"payments_create", label:"Create & Pay Invoices",  group:"Billing" },
  // Drawer
  { key:"drawer_view",     label:"View Cash Drawer",       group:"Billing" },
  { key:"drawer_add",      label:"Add Drawer Transactions",group:"Billing" },
  // Services
  { key:"services_view",   label:"View Services",          group:"Network" },
  { key:"services_edit",   label:"Edit Services",          group:"Network" },
  // Other
  { key:"whatsapp",        label:"WhatsApp Blast",         group:"Other" },
  { key:"reports",         label:"Print Reports",          group:"Other" },
  { key:"map",             label:"Network Map",            group:"Other" },
  { key:"archive",         label:"Archive",                group:"Other" },
  { key:"activity",        label:"Activity Log",           group:"Other" },
  { key:"settings",        label:"Settings",               group:"Other" },
];