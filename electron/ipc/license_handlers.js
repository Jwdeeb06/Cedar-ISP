// electron/ipc/license_handlers.js
const { checkLicense, readCache } = require("../license/licenseClient");

function registerLicenseHandlers(ipcMain, db, app) {

  ipcMain.handle("check-license", async (event, { username, password }) => {
    try {
      const result = await checkLicense(app, username, password);
      return result;
    } catch (e) {
      return { ok: false, code: e.code, message: e.message, expires_at: e.expires_at };
    }
  });

  ipcMain.handle("get-cached-license", async () => {
    try {
      const cache = readCache(app);
      return cache ? { ...cache, ok: true } : { ok: false };
    } catch {
      return { ok: false };
    }
  });

}

module.exports = { registerLicenseHandlers };