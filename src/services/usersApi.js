import { electronApi } from "./electronApi";

export const usersApi = {
  addUser: (user) => electronApi.addUser(user),
  listUsers: (args) => electronApi.listUsers(args),
  deleteUser: (id) => electronApi.deleteUser(id),
  userInvoiceCount: (id) => electronApi.userInvoiceCount(id),
  updateUser: (user) => electronApi.updateUser(user),
  exportUsers: () => electronApi.exportUsers(),
  downloadTemplate: () => electronApi.downloadUsersTemplate(),
  importUsers: () => electronApi.importUsers(),
  listAddresses: () => electronApi.listAddresses(),
  addAddress: (address) => electronApi.addAddress(address),
  deleteAddress: (address) => electronApi.deleteAddress(address),
  countUsers: () => electronApi.countUsers(),

};
