// src/services/activityApi.js
// Wraps window.api calls to automatically inject the logged-in employee as actor

import { electronApi } from "./electronApi";

let _currentEmployee = null;

export function setCurrentEmployee(emp) {
  _currentEmployee = emp;
}

export function getActor() {
  return _currentEmployee?.username || "system";
}

export const activityApi = {
  list: (filters) => electronApi.listActivityLog(filters),
  listDays: (filters) => electronApi.listActivityDays(filters),
};