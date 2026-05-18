function registerActivityHandlers(ipcMain, db) {

  // -------- LIST ACTIVITY LOG --------
ipcMain.handle("list-activity-log", async (event, filters) => {

  const search = (filters?.search || "").trim();
  const entity = (filters?.entity || "").trim();   // users / invoices / payments
  const action = (filters?.action || "").trim();   // UPDATE_USER / DELETE_USER / etc
  const day = (filters?.day || "").trim();         // YYYY-MM-DD

  const limit = Number(filters?.limit || 100);
  const offset = Number(filters?.offset || 0);

  return new Promise((resolve, reject) => {

    let sql = `
      SELECT *
      FROM activity_log
      WHERE 1=1
    `;

    const params = [];

    // filter by entity
    if (entity) {
      sql += ` AND entity = ?`;
      params.push(entity);
    }

    // filter by action
    if (action) {
      sql += ` AND action = ?`;
      params.push(action);
    }

    // filter by day
    if (day) {
      sql += ` AND date(created_at) = date(?)`;
      params.push(day);
    }

    // search filter
    if (search) {
      sql += `
        AND (
          message LIKE ?
          OR actor LIKE ?
          OR action LIKE ?
        )
      `;
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    sql += `
      ORDER BY created_at DESC
      LIMIT ?
      OFFSET ?
    `;

    params.push(limit, offset);

    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });

  });

});
ipcMain.handle("list-activity-days", async (event, payload) => {

  const limit = Number(payload?.limit || 60);

  return new Promise((resolve, reject) => {

    const sql = `
      SELECT
        date(created_at) AS day,
        COUNT(*) AS count
      FROM activity_log
      GROUP BY date(created_at)
      ORDER BY day DESC
      LIMIT ?
    `;

    db.all(sql, [limit], (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });

  });

});
}

module.exports = { registerActivityHandlers };