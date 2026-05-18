function registerSettingsHandlers(ipcMain, db) {
  ipcMain.handle("get-settings", async () => {
    return new Promise((resolve, reject) => {
      db.all(`SELECT key, value FROM settings`, [], (err, rows) => {
        if (err) reject(err);
        else {
          const obj = {};
          (rows || []).forEach((r) => (obj[r.key] = r.value));
          resolve(obj);
        }
      });
    });
  });

  ipcMain.handle("set-setting", async (event, { key, value }) => {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO settings(key,value) VALUES(?,?)
         ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
        [key, String(value ?? "")],
        function (err) {
          if (err) reject(err);
          else resolve({ ok: true });
        }
      );
    });
  });
}

module.exports = { registerSettingsHandlers };
