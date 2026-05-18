import { electronApi } from "./electronApi";

export const walletApi = {
  balance: (userId)  => electronApi.walletBalance(userId),
  list:    (filters) => electronApi.walletList(filters),
  credit:  (payload) => electronApi.walletCredit(payload),
  debit:   (payload) => electronApi.walletDebit(payload),
  summary: (userId)  => electronApi.walletSummary(userId),
};