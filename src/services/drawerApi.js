import { electronApi } from "./electronApi";

export const drawerApi = {
  add:       (payload) => electronApi.drawerAdd(payload),
  list:      (filters) => electronApi.drawerList(filters),
  summary:   (filters) => electronApi.drawerSummary(filters),
  balance:   ()        => electronApi.drawerBalance(),
  dailyList: (filters) => electronApi.drawerDailyList(filters),
  delete:    (payload) => electronApi.drawerDelete(payload),
};