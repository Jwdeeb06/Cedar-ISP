const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");
const { app } = require("electron");

// Use a writable directory (works in EXE)
const dataDir = app.getPath("userData");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "isp.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("SQLite connection error:", err);
  } else {
    console.log("SQLite connected:", dbPath);
  }
});

module.exports = db;
