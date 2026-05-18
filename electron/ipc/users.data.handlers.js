const { dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const XLSX = require("xlsx");

// --- helpers ---
function pick(row, keys, def = "") {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "") return row[k];
  }
  return def;
}
function toStr(v, def = "") {
  if (v === null || v === undefined) return def;
  return String(v).trim();
}
function toNum(v, def = 0) {
  if (v === null || v === undefined || v === "") return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}
function toBool01(v) {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "1" || s === "true" || s === "yes" || s === "y" || s === "blocked") return 1;
  if (s === "0" || s === "false" || s === "no" || s === "n") return 0;
  // if it's empty => 0
  if (!s) return 0;
  // any other value: treat numeric
  const n = Number(s);
  return Number.isFinite(n) ? (n ? 1 : 0) : 0;
}

// Try to normalize expiry to 'YYYY-MM-DD' if it looks like a date.
// If we can't parse safely, keep as string.
function normalizeDate(v) {
  if (!v) return null;

  // excel date number
  if (typeof v === "number") {
    // XLSX can decode dates if cellDates used, but here we do basic conversion:
    // Excel epoch (1899-12-30). This is "good enough" for typical exports.
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(epoch.getTime() + v * 86400000);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  const s = String(v).trim();
  // already iso
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // common formats: dd/mm/yyyy or dd-mm-yyyy
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const dd = String(m[1]).padStart(2, "0");
    const mm = String(m[2]).padStart(2, "0");
    const yyyy = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${yyyy}-${mm}-${dd}`;
  }

  // fallback: keep string
  return s || null;
}

// Resolve a service name to its ID, creating the service if it doesn't exist yet.
function resolveServiceId(db, serviceName) {
  if (!serviceName) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    db.get(`SELECT id FROM services WHERE name = ?`, [serviceName], (err, row) => {
      if (err) return reject(err);
      if (row) return resolve(row.id);
      db.run(`INSERT INTO services (name, price) VALUES (?, 0)`, [serviceName], function (err2) {
        if (err2) return reject(err2);
        resolve(this.lastID);
      });
    });
  });
}

function registerUserDataHandlers(ipcMain, db) {
  // ✅ Export users to Excel (ISP style)
  ipcMain.handle("export-users", async () => {
    const rows = await new Promise((resolve, reject) => {
      const sql = `
        SELECT
          u.id,
          u.username,
          u.name,
          u.pppoe_password,
          u.address,
          u.mobile,
          u.notes,
          u.reseller,
          u.collector,
          u.expiry_date,
          u.created_at,
          s.name AS service,
          u.blocked,
          u.switch_name,
          u.price,
          u.balance,
          u.region,
          u.building,
          u.nationality,
          u.mac_address,
          u.daily_quota,
          u.daily_free_quota,
          u.used_quota
        FROM users u
        LEFT JOIN services s ON s.id = u.service_id
        ORDER BY u.id DESC
      `;
      db.all(sql, [], (err, data) => (err ? reject(err) : resolve(data)));
    });

    const wb = XLSX.utils.book_new();

    const sheetData = rows.map((u) => ({
      "Username": u.username || "",
      "Name": u.name || "",
      "Password": u.pppoe_password || "",
      "Address": u.address || "",
      "Mobile": u.mobile || "",
      "Note": u.notes || "",
      "Reseller": u.reseller || "",
      "Collector": u.collector || "",
      "Expiry": u.expiry_date || "",
      "Date Created": u.created_at || "",
      "Service": u.service || "",
      "Blocked": u.blocked ? 1 : 0,
      "Switch": u.switch_name || "",
      "Price": u.price ?? "",
      "Balance": u.balance ?? "",
      "Region": u.region || "",
      "Building": u.building || "",
      "Nationality": u.nationality || "",
      "Mac Address": u.mac_address || "",
      "Daily Quota": u.daily_quota ?? "",
      "Daily Free Quota": u.daily_free_quota ?? "",
      "Used Quota": u.used_quota ?? "",
    }));

    const headers = [
      "Username",
      "Name",
      "Password",
      "Address",
      "Mobile",
      "Note",
      "Reseller",
      "Collector",
      "Expiry",
      "Date Created",
      "Service",
      "Blocked",
      "Switch",
      "Price",
      "Balance",
      "Region",
      "Building",
      "Nationality",
      "Mac Address",
      "Daily Quota",
      "Daily Free Quota",
      "Used Quota",
    ];

    const ws = XLSX.utils.json_to_sheet(sheetData, { header: headers });
    XLSX.utils.book_append_sheet(wb, ws, "Users");

    const { canceled, filePath } = await dialog.showSaveDialog({
      title: "Export Users",
      defaultPath: path.join(process.cwd(), "users.xlsx"),
      filters: [{ name: "Excel", extensions: ["xlsx"] }],
    });

    if (canceled || !filePath) return { ok: false, canceled: true };

    XLSX.writeFile(wb, filePath);
    return { ok: true, filePath, count: rows.length };
  });

  // ✅ Download template (ISP style headers)
  ipcMain.handle("download-users-template", async () => {
    const wb = XLSX.utils.book_new();

    const headers = [
      "Username",
      "Name",
      "Password",
      "Address",
      "Mobile",
      "Note",
      "Reseller",
      "Collector",
      "Expiry",
      "Service",
      "Blocked",
      "Switch",
      "Price",
      "Balance",
      "Region",
      "Building",
      "Nationality",
      "Mac Address",
      "Daily Quota",
      "Daily Free Quota",
      "Used Quota",
    ];

    const ws = XLSX.utils.json_to_sheet([], { header: headers });
    XLSX.utils.book_append_sheet(wb, ws, "Users");

    const { canceled, filePath } = await dialog.showSaveDialog({
      title: "Save Users Template",
      defaultPath: path.join(process.cwd(), "users-template.xlsx"),
      filters: [{ name: "Excel", extensions: ["xlsx"] }],
    });

    if (canceled || !filePath) return { ok: false, canceled: true };

    XLSX.writeFile(wb, filePath);
    return { ok: true, filePath };
  });

  // ✅ Import users from Excel (accept ISP format + old format)
  ipcMain.handle("import-users", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: "Import Users",
      properties: ["openFile"],
      filters: [{ name: "Excel", extensions: ["xlsx"] }],
    });

    if (canceled || !filePaths || !filePaths[0]) return { ok: false, canceled: true };

    const filePath = filePaths[0];
    const buf = fs.readFileSync(filePath);

    // cellDates helps if the sheet contains real date cells
    const wb = XLSX.read(buf, { type: "buffer", cellDates: true });

    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(ws, { defval: "" });

    let inserted = 0;
    let skipped = 0;
    let updated = 0;

    for (const row of data) {
      // Accept "Name" or "name"
      const name = toStr(pick(row, ["Name", "name"]));
      if (!name) {
        skipped++;
        continue;
      }

      // Accept ISP headers + your old headers
      const username = toStr(pick(row, ["Username", "username"]));
      const pppoe_password = toStr(pick(row, ["Password", "pppoe_password", "password"]));

      const address = toStr(pick(row, ["Address", "address"]));
      const mobile = toStr(pick(row, ["Mobile", "mobile", "phone"])); // ✅ phone -> mobile
      const notes = toStr(pick(row, ["Note", "notes", "note"]));

      const reseller = toStr(pick(row, ["Reseller", "reseller"]));
      const collector = toStr(pick(row, ["Collector", "collector"]));

      const expiry_date = normalizeDate(pick(row, ["Expiry", "expiry_date", "expiry"]));
      const serviceName = toStr(pick(row, ["Service", "service", "package_name"]));

      const blocked = toBool01(pick(row, ["Blocked", "blocked"], 0));
      const switch_name = toStr(pick(row, ["Switch", "switch_name", "switch"]));

      const price = toNum(pick(row, ["Price", "price", "package_price"], 0)); // ✅ old package_price -> price
      const balance = toNum(pick(row, ["Balance", "balance"], 0));

      const region = toStr(pick(row, ["Region", "region"]));
      const building = toStr(pick(row, ["Building", "building"]));
      const nationality = toStr(pick(row, ["Nationality", "nationality"]));
      const mac_address = toStr(pick(row, ["Mac Address", "mac_address", "mac"]));

      const daily_quota = toNum(pick(row, ["Daily Quota", "daily_quota"], 0));
      const daily_free_quota = toNum(pick(row, ["Daily Free Quota", "daily_free_quota"], 0));
      const used_quota = toNum(pick(row, ["Used Quota", "used_quota"], 0));

      const status = blocked ? "INACTIVE" : toStr(pick(row, ["status", "Status"], "INACTIVE")) || "INACTIVE";

      // Resolve service name → service_id (creates service row if new)
      const service_id = await resolveServiceId(db, serviceName);

      // Strategy:
      // - If username exists: upsert by username
      // - else insert new
      if (username) {
        const existing = await new Promise((resolve, reject) => {
          db.get(`SELECT id FROM users WHERE username = ?`, [username], (err, r) =>
            err ? reject(err) : resolve(r)
          );
        });

        if (existing?.id) {
          await new Promise((resolve, reject) => {
            db.run(
              `
              UPDATE users SET
                name = ?,
                pppoe_password = ?,
                address = ?,
                mobile = ?,
                notes = ?,
                reseller = ?,
                collector = ?,
                expiry_date = ?,
                service_id = ?,
                blocked = ?,
                switch_name = ?,
                price = ?,
                balance = ?,
                region = ?,
                building = ?,
                nationality = ?,
                mac_address = ?,
                daily_quota = ?,
                daily_free_quota = ?,
                used_quota = ?,
                status = ?,
                updated_at = CURRENT_TIMESTAMP
              WHERE username = ?
              `,
              [
                name,
                pppoe_password || null,
                address,
                mobile,
                notes,
                reseller || null,
                collector || null,
                expiry_date || null,
                service_id,
                blocked,
                switch_name || null,
                price,
                balance,
                region || null,
                building || null,
                nationality || null,
                mac_address || null,
                daily_quota,
                daily_free_quota,
                used_quota,
                status,
                username,
              ],
              (err) => (err ? reject(err) : resolve())
            );
          });

          updated++;
          continue;
        }
      }

      await new Promise((resolve, reject) => {
        db.run(
          `
          INSERT INTO users (
            username, name, pppoe_password,
            address, mobile, notes,
            reseller, collector,
            expiry_date, service_id, blocked, switch_name,
            price, balance,
            region, building, nationality, mac_address,
            daily_quota, daily_free_quota, used_quota,
            status, role
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            username || null,
            name,
            pppoe_password || null,

            address,
            mobile,
            notes,

            reseller || null,
            collector || null,

            expiry_date || null,
            service_id,
            blocked,
            switch_name || null,

            price,
            balance,

            region || null,
            building || null,
            nationality || null,
            mac_address || null,

            daily_quota,
            daily_free_quota,
            used_quota,

            status,
            "USER",
          ],
          (err) => (err ? reject(err) : resolve())
        );
      });

      inserted++;
    }

    return { ok: true, filePath, inserted, updated, skipped };
  });
  // ── EXPORT MONTHLY BILLING REPORT ─────────────────────────────────────────
  ipcMain.handle("export-billing-report", async (event, { month }) => {
    if (!month) return { ok: false, reason: "MISSING_MONTH" };

    // Show save dialog
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: "Save Billing Report",
      defaultPath: `billing-${month}.xlsx`,
      filters: [{ name: "Excel", extensions: ["xlsx"] }],
    });
    if (canceled || !filePath) return { ok: false, reason: "CANCELLED" };

    return new Promise((resolve, reject) => {
      db.all(
        `SELECT
           u.name        AS "Subscriber Name",
           u.mobile      AS "Mobile",
           u.address     AS "Address",
           s.name        AS "Service Plan",
           u.price       AS "Monthly Price ($)",
           i.invoice_number AS "Invoice #",
           i.amount      AS "Amount ($)",
           i.status      AS "Status",
           i.affects_expiry AS "Type",
           i.paid_at     AS "Paid At",
           u.expiry_date AS "Expiry Date",
           c.name        AS "Company",
           COALESCE(
             (SELECT SUM(p.amount) FROM payments p
              WHERE p.invoice_id = i.id AND COALESCE(p.is_deleted,0)=0), 0
           ) AS "Paid Amount ($)"
         FROM invoices i
         JOIN users u ON u.id = i.user_id
         LEFT JOIN services s ON s.id = u.service_id
         LEFT JOIN companies c ON c.id = COALESCE(s.company_id, u.company_id)
         WHERE i.month = ?
           AND COALESCE(i.is_deleted, 0) = 0
           AND COALESCE(u.is_deleted, 0) = 0
         ORDER BY i.status DESC, u.name ASC`,
        [month],
        (err, rows) => {
          if (err) return reject(err);

          // Format rows
          const data = rows.map(r => ({
            ...r,
            "Type": r["Type"] === 0 ? "STATIC" : "SUBSCRIPTION",
            "Paid At": r["Paid At"]
              ? new Date(r["Paid At"]).toLocaleString("en-GB", { timeZone:"Asia/Beirut" })
              : "—",
          }));

          // Add summary row
          const totalAmount = rows.reduce((a,r) => a + Number(r["Amount ($)"]||0), 0);
          const totalPaid   = rows.reduce((a,r) => a + Number(r["Paid Amount ($)"]||0), 0);
          const paidCount   = rows.filter(r => r.Status === "PAID").length;
          const unpaidCount = rows.filter(r => r.Status !== "PAID").length;

          data.push({});
          data.push({
            "Subscriber Name": "TOTAL",
            "Amount ($)":      totalAmount,
            "Paid Amount ($)": totalPaid,
            "Status":          `${paidCount} paid / ${unpaidCount} unpaid`,
          });

          // Build workbook
          const wb = XLSX.utils.book_new();
          const ws = XLSX.utils.json_to_sheet(data);

          // Column widths
          ws["!cols"] = [
            { wch:25 }, { wch:15 }, { wch:20 }, { wch:20 },
            { wch:15 }, { wch:28 }, { wch:12 }, { wch:10 },
            { wch:14 }, { wch:22 }, { wch:14 }, { wch:15 }, { wch:14 },
          ];

          XLSX.utils.book_append_sheet(wb, ws, `Billing ${month}`);
          XLSX.writeFile(wb, filePath);

          resolve({
            ok: true,
            filePath,
            count: rows.length,
            totalAmount,
            totalPaid,
          });
        }
      );
    });
  });
}

module.exports = { registerUserDataHandlers };