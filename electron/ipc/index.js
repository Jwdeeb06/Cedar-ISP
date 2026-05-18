// electron/ipc/index.js
const { registerUserHandlers }     = require("./users.handlers");
const { registerPaymentHandlers }  = require("./payments_handlers");
const { registerInvoiceHandlers }  = require("./invoices.handlers");
const { registerServiceHandlers }  = require("./services_handlers");
const { registerSettingsHandlers } = require("./settings.handlers");
const { registerDrawerHandlers }   = require("./drawer_handlers");
const { registerWalletHandlers }   = require("./wallet_handlers");
const { registerMapHandlers }      = require("./map_handlers");
const { registerActivityHandlers } = require("./activity.handlers");
const { registerUserDataHandlers } = require("./users.data.handlers");
const { registerArchiveHandlers }  = require("./archive_handlers");
const { registerCompanyHandlers } = require("./company_handlers");
const { registerAuthHandlers } = require("./auth_handlers");

function registerIpcHandlers(ipcMain, db) {
  registerUserHandlers(ipcMain, db);
  registerPaymentHandlers(ipcMain, db);
  registerInvoiceHandlers(ipcMain, db);
  registerServiceHandlers(ipcMain, db);
  registerSettingsHandlers(ipcMain, db);
  registerDrawerHandlers(ipcMain, db);
  registerWalletHandlers(ipcMain, db);
  registerMapHandlers(ipcMain, db);
  registerActivityHandlers(ipcMain, db);
  registerUserDataHandlers(ipcMain, db);
  registerArchiveHandlers(ipcMain, db);
  registerCompanyHandlers(ipcMain, db);
  registerAuthHandlers(ipcMain, db);
}

module.exports = { registerIpcHandlers };