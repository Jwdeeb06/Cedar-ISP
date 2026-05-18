// electron/license/licenseClient.js
const path  = require("path");
const fs    = require("fs");
const https = require("https");
const http  = require("http");

const LICENSE_SERVER = process.env.LICENSE_SERVER || "https://isp-license-server.cedar-isp-admin.workers.dev";
const CACHE_DAYS     = 1; // fallback if offline

function getCacheFile(app) {
  return path.join(app.getPath("userData"), "license.json");
}

function saveLicense(app, data) {
  const cache = {
    ...data,
    cached_at:   new Date().toISOString(),
    cache_until: new Date(Date.now() + CACHE_DAYS * 86400000).toISOString(),
  };
  fs.writeFileSync(getCacheFile(app), JSON.stringify(cache, null, 2));
  return cache;
}

function readCache(app) {
  try {
    const file = getCacheFile(app);
    if (!fs.existsSync(file)) return null;
    const cache = JSON.parse(fs.readFileSync(file, "utf8"));
    if (new Date(cache.cache_until) < new Date()) return null;
    return cache;
  } catch { return null; }
}

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

// ALWAYS checks online first — cache only used if no internet
async function checkLicense(app, username, password) {
  try {
    // Always try online first
    const res = await httpPost(`${LICENSE_SERVER}/api/auth`, { username, password });

    if (res.ok) {
      // Save to cache (for offline fallback)
      const cached = saveLicense(app, res);
      console.log(`[License] ✅ Online check passed — ${res.isp_name}`);
      return { ...cached, from_cache: false };
    }

    // Hard failures — invalid creds, disabled, expired
    if (["INVALID_CREDENTIALS","ACCOUNT_DISABLED","EXPIRED"].includes(res.reason)) {
      // Clear cache on hard failure so they can't use cached license
      try { fs.unlinkSync(getCacheFile(app)); } catch {}
      throw { code: res.reason, message: res.message || res.reason, expires_at: res.expires_at };
    }

    throw { code: "UNKNOWN", message: "License check failed" };

  } catch (e) {
    // Re-throw hard failures immediately
    if (e.code && ["INVALID_CREDENTIALS","ACCOUNT_DISABLED","EXPIRED"].includes(e.code)) throw e;

    // Network error — fall back to cache
    console.log(`[License] ⚠️ No internet — trying cache (${e.message})`);
    const cache = readCache(app);
    if (cache) {
      console.log(`[License] 📦 Using cached license until ${cache.cache_until}`);
      return { ...cache, from_cache: true };
    }

    throw {
      code: "NO_CONNECTION",
      message: "Cannot connect to license server.\nPlease connect to the internet to activate.",
    };
  }
}

module.exports = { checkLicense, readCache };