const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs   = require("fs");

require("./database/schema");
const db = require("./database/db");
const { registerIpcHandlers }     = require("./ipc/index.js");
const { registerLicenseHandlers } = require("./ipc/license_handlers");

// ── Logger — defined first so all code below can safely call log() ────────────
function log(...args) {
  try {
    const file = path.join(app.getPath("userData"), "main.log");
    fs.appendFileSync(file, `[${new Date().toISOString()}] ${args.join(" ")}\n`);
  } catch {}
}

ipcMain.on("log", (event, msg) => { log("PRELOAD:", String(msg)); });

// ── Register all IPC handlers ─────────────────────────────────────────────────
registerIpcHandlers(ipcMain, db);
registerLicenseHandlers(ipcMain, db, app);

// ── App controls ──────────────────────────────────────────────────────────────
ipcMain.handle("app-restart", () => { app.relaunch(); app.exit(0); });
ipcMain.handle("app-quit",    () => { app.quit(); });

// ── List auto-backups ─────────────────────────────────────────────────────────
ipcMain.handle("list-backups", () => {
  try {
    const backupDir = path.join(app.getPath("userData"), "backups");
    if (!fs.existsSync(backupDir)) return { ok: true, files: [], dir: backupDir };
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith("isp-") && f.endsWith(".db"))
      .sort().reverse()
      .map(f => ({
        name: f,
        path: path.join(backupDir, f),
        date: f.replace("isp-", "").replace(".db", ""),
        size: Math.round(fs.statSync(path.join(backupDir, f)).size / 1024),
      }));
    return { ok: true, files, dir: backupDir };
  } catch(e) {
    return { ok: false, error: String(e) };
  }
});

// ── Database Backup ───────────────────────────────────────────────────────────
ipcMain.handle("db-backup", async () => {
  try {
    const { dialog } = require("electron");
    const dataDir = app.getPath("userData");
    const dbPath  = path.join(dataDir, "isp.db");

    const timestamp   = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const defaultName = `isp-backup-${timestamp}.db`;

    const { filePath, canceled } = await dialog.showSaveDialog({
      title: "Save Database Backup", defaultPath: defaultName,
      filters: [{ name: "SQLite Database", extensions: ["db"] }],
    });

    if (canceled || !filePath) return { ok: false, reason: "CANCELLED" };
    fs.copyFileSync(dbPath, filePath);
    log("DB backup saved to:", filePath);
    return { ok: true, filePath };
  } catch (e) {
    log("db-backup error:", String(e));
    return { ok: false, error: String(e) };
  }
});

// ── Database Restore ──────────────────────────────────────────────────────────
ipcMain.handle("db-restore", async (event, backupName) => {
  try {
    const { dialog } = require("electron");
    const dataDir   = app.getPath("userData");
    const dbPath    = path.join(dataDir, "isp.db");
    const backupDir = path.join(dataDir, "backups");

    let srcPath;

    if (backupName) {
      srcPath = path.join(backupDir, backupName);
      if (!fs.existsSync(srcPath))
        return { ok: false, reason: "FILE_NOT_FOUND", message: `Backup file not found: ${backupName}` };
    } else {
      const { filePaths, canceled } = await dialog.showOpenDialog({
        title: "Select Backup File to Restore",
        defaultPath: backupDir,
        filters: [{ name: "SQLite Database", extensions: ["db"] }],
        properties: ["openFile"],
      });
      if (canceled || !filePaths?.length) return { ok: false, reason: "CANCELLED" };
      srcPath = filePaths[0];
    }

    // Validate it's a real SQLite file
    const header = Buffer.alloc(16);
    const fd     = fs.openSync(srcPath, "r");
    fs.readSync(fd, header, 0, 16, 0);
    fs.closeSync(fd);
    if (!header.slice(0, 15).toString("ascii").startsWith("SQLite format 3"))
      return { ok: false, reason: "INVALID_FILE", message: "Not a valid SQLite database." };

    const backupPath = dbPath + ".pre-restore-" + Date.now();
    fs.copyFileSync(dbPath, backupPath);

    await new Promise((resolve) => db.close(() => resolve()));
    fs.copyFileSync(srcPath, dbPath);
    log("DB restored from:", srcPath);

    app.relaunch();
    app.exit(0);
    return { ok: true };
  } catch (e) {
    log("db-restore error:", String(e));
    return { ok: false, error: String(e) };
  }
});

// ── Print HTML → PDF ──────────────────────────────────────────────────────────
ipcMain.handle("print-html", async (event, { html, title }) => {
  try {
    const tmpDir   = app.getPath("temp");
    const ts       = Date.now();
    const htmlFile = path.join(tmpDir, `isp_print_${ts}.html`);
    const pdfFile  = path.join(tmpDir, `isp_print_${ts}.pdf`);

    fs.writeFileSync(htmlFile, html, "utf-8");

    const is80mm = html.includes("80mm");
    const isA5   = html.includes("A5");

    const pageSize  = isA5 ? "A5" : "A4";
    const winWidth  = is80mm ? 320  : 1400;
    const winHeight = is80mm ? 1200 : 1000;

    const printWin = new BrowserWindow({
      show: false, width: winWidth, height: winHeight,
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    });

    await new Promise((resolve, reject) => {
      printWin.webContents.once("did-finish-load", resolve);
      printWin.webContents.once("did-fail-load",   reject);
      printWin.loadFile(htmlFile);
    });

    await new Promise(resolve => setTimeout(resolve, 800));

    const pdfData = await printWin.webContents.printToPDF({
      printBackground: true,
      landscape:       false,
      pageSize,
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
    });

    printWin.destroy();
    fs.unlinkSync(htmlFile);
    fs.writeFileSync(pdfFile, pdfData);

    const { shell } = require("electron");
    await shell.openPath(pdfFile);
    setTimeout(() => { try { fs.unlinkSync(pdfFile); } catch {} }, 60000);

    return { ok: true };
  } catch (e) {
    log("print-html error:", String(e));
    return { ok: false, error: String(e) };
  }
});

// ── Create main window ────────────────────────────────────────────────────────
function createWindow() {
  const { Menu } = require("electron");
  Menu.setApplicationMenu(null);

  const isDev       = !app.isPackaged;
  const appPath     = app.getAppPath();
  const preloadPath = path.join(appPath, "electron", "preload.js");
  const indexPath   = path.join(appPath, "build", "index.html");

  log("=== APP START ===");
  log("isDev=",       String(isDev));
  log("isPackaged=",  String(app.isPackaged));
  log("appPath=",     appPath);
  log("userData=",    app.getPath("userData"));
  log("preloadPath=", preloadPath, "exists=", String(fs.existsSync(preloadPath)));
  log("indexPath=",   indexPath,   "exists=", String(fs.existsSync(indexPath)));

  const iconPath = path.join(appPath, "assets", "icon.png");

  const win = new BrowserWindow({
    width:    1200,
    height:   800,
    minWidth: 900,
    minHeight:600,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,

    // FIX 4: removed titleBarOverlay — only works with titleBarStyle "hidden",
    // not with "default". Using OS default window frame throughout.
    titleBarStyle: "default",

    webPreferences: {
      preload:          preloadPath,
      contextIsolation: true,
      nodeIntegration:  false,
    },
  });

  // FIX 3: window control handlers removed — using OS default window frame.
  // preload.js no longer exposes winMinimize/winMaximize/winClose either.

  // ── DevTools toggle ─────────────────────────────────────────────────────
  ipcMain.handle("toggle-devtools", () => {
    if (win.webContents.isDevToolsOpened()) {
      win.webContents.closeDevTools();
      return { ok: true, open: false };
    } else {
      win.webContents.openDevTools({ mode: "detach" });
      return { ok: true, open: true };
    }
  });

  win.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
    log("did-fail-load", String(errorCode), errorDescription, validatedURL);
  });
  win.webContents.on("render-process-gone", (event, details) => {
    log("render-process-gone", JSON.stringify(details));
  });
  win.webContents.on("console-message", (event, level, message, line) => {
    log("renderer-console", `L${line}`, message);
  });

  if (isDev) {
    win.loadURL("http://localhost:3000");
  } else {
    win.loadFile(indexPath);
    win.webContents.on("will-navigate", (event, url) => {
      if (url.startsWith("file://") && !url.endsWith("index.html")) {
        event.preventDefault();
        win.loadFile(indexPath);
      }
    });
  }
}

// ── App ready ─────────────────────────────────────────────────────────────────
app.whenReady().then(() => {

  // FIX 2: single SQL UPDATE replaces N+1 startup queries
  // Sets SUSPENDED for blocked users, ACTIVE for those with a paid invoice
  // this month, INACTIVE for everyone else — all in 2 queries.
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  db.run(`UPDATE users SET status = 'SUSPENDED' WHERE blocked = 1 AND COALESCE(is_deleted,0)=0`);

  db.run(`
    UPDATE users SET status = CASE
      WHEN EXISTS (
        SELECT 1 FROM invoices
        WHERE invoices.user_id = users.id
          AND invoices.month = ?
          AND invoices.status = 'PAID'
          AND COALESCE(invoices.affects_expiry, 1) = 1
          AND COALESCE(invoices.is_deleted, 0) = 0
      ) THEN 'ACTIVE'
      ELSE 'INACTIVE'
    END
    WHERE blocked = 0 AND COALESCE(is_deleted, 0) = 0
  `, [currentMonth], (err) => {
    if (err) console.error("Status recalc error:", err);
    else console.log("User statuses recalculated on startup");
  });

  // FIX 1: daily backup now runs inside app.whenReady() — safe to call app.getPath()
  try {
    const dataDir   = app.getPath("userData");
    const dbPath    = path.join(dataDir, "isp.db");
    const backupDir = path.join(dataDir, "backups");

    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    const today      = new Date().toISOString().slice(0, 10);
    const backupFile = path.join(backupDir, `isp-${today}.db`);

    if (!fs.existsSync(backupFile)) {
      fs.copyFileSync(dbPath, backupFile);
      console.log(`[Auto-Backup] Saved: ${backupFile}`);
    } else {
      console.log(`[Auto-Backup] Already backed up today: ${today}`);
    }

    // Keep last 7 backups
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith("isp-") && f.endsWith(".db"))
      .sort().reverse();
    files.slice(7).forEach(f => {
      try { fs.unlinkSync(path.join(backupDir, f)); }
      catch (e) { console.error(`[Auto-Backup] Failed to prune: ${f}`, e); }
    });
  } catch (e) {
    console.error("[Auto-Backup] Failed:", e);
  }

  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});