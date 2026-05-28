// electron/license/licenseClient.js
const path  = require("path");
const fs    = require("fs");
const https = require("https");
const http  = require("http");
const os    = require("os");
const crypto = require("crypto");

const LICENSE_SERVER = process.env.LICENSE_SERVER || "https://isp-license-server.cedar-isp-admin.workers.dev";

// ── Machine ID — hashed MAC address ──────────────────────────────────────────
function getMachineId() {
  try {
    const interfaces = os.networkInterfaces();
    // Collect all non-internal MAC addresses, sort for stability
    const macs = [];
    for (const iface of Object.values(interfaces)) {
      for (const addr of iface) {
        if (!addr.internal && addr.mac && addr.mac !== "00:00:00:00:00:00") {
          macs.push(addr.mac);
        }
      }
    }
    if (!macs.length) return null;
    macs.sort();
    // Hash for privacy — server only stores the hash
    return crypto.createHash("sha256").update(macs[0]).digest("hex");
  } catch {
    return null;
  }
}

// ── Credentials cache (saves username + password for auto-login) ──────────────
function getCredsFile(app) {
  return path.join(app.getPath("userData"), "license_creds.json");
}

function saveCreds(app, username, password) {
  try {
    fs.writeFileSync(getCredsFile(app), JSON.stringify({ username, password }, null, 2));
  } catch {}
}

function loadCreds(app) {
  try {
    const file = getCredsFile(app);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch { return null; }
}

function clearCreds(app) {
  try { fs.unlinkSync(getCredsFile(app)); } catch {}
}

// ── HTTP helper ───────────────────────────────────────────────────────────────
function httpPost(url, body) {
  return new Promise((resolve, reject) => {
    const data    = JSON.stringify(body);
    const isHttps = url.startsWith("https");
    const lib     = isHttps ? https : http;
    const options = {
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) },
      timeout: 8000,
    };
    const req = lib.request(url, options, (res) => {
      let raw = "";
      res.on("data", chunk => raw += chunk);
      res.on("end", () => {
        try { resolve(JSON.parse(raw)); }
        catch { reject(new Error("Invalid response")); }
      });
    });
    req.on("timeout", () => { req.destroy(); reject(new Error("TIMEOUT")); });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

// ── Manual license check (from login form) ────────────────────────────────────
async function checkLicense(app, username, password) {
  const machine_id = getMachineId();
  try {
    const res = await httpPost(`${LICENSE_SERVER}/api/auth`, {
      username,
      password,
      machine_id,
    });

    if (res.ok) {
      saveCreds(app, username, password);
      console.log(`[License] ✅ Online check passed — ${res.isp_name} (machine: ${machine_id?.slice(0,8)}…)`);
      return { ...res, from_cache: false };
    }

    const fatalCodes = ["INVALID_CREDENTIALS", "ACCOUNT_DISABLED", "EXPIRED", "WRONG_MACHINE"];
    if (fatalCodes.includes(res.reason)) {
      clearCreds(app);
      throw {
        code:       res.reason,
        message:    res.message || res.reason,
        expires_at: res.expires_at,
      };
    }

    throw { code: "UNKNOWN", message: "License check failed" };

  } catch (e) {
    const fatalCodes = ["INVALID_CREDENTIALS", "ACCOUNT_DISABLED", "EXPIRED", "WRONG_MACHINE"];
    if (e.code && fatalCodes.includes(e.code)) throw e;
    throw {
      code:    "NO_CONNECTION",
      message: "Cannot connect to license server. Check your internet connection.",
    };
  }
}

// ── Auto-check on startup using saved credentials ─────────────────────────────
async function autoCheckLicense(app) {
  const creds = loadCreds(app);
  if (!creds) return null;
  try {
    const res = await checkLicense(app, creds.username, creds.password);
    return res;
  } catch {
    return null; // any failure → show license fields
  }
}

module.exports = { checkLicense, autoCheckLicense };