// src/pages/IspSettings.jsx
import { useEffect, useState } from "react";
import {
  Box, Button, Chip, Divider, IconButton, Switch, Tab, Tabs,
  InputAdornment, Paper, TextField, Typography,
} from "@mui/material";
import AddIcon              from "@mui/icons-material/Add";
import CloseIcon            from "@mui/icons-material/Close";
import SaveIcon             from "@mui/icons-material/Save";
import StorefrontIcon       from "@mui/icons-material/Storefront";
import BusinessIcon         from "@mui/icons-material/Business";
import CurrencyExchangeIcon from "@mui/icons-material/CurrencyExchange";
import PaymentIcon          from "@mui/icons-material/Payment";
import MapIcon              from "@mui/icons-material/Map";
import StorageIcon          from "@mui/icons-material/Storage";
import FileDownloadIcon     from "@mui/icons-material/FileDownload";
import FileUploadIcon       from "@mui/icons-material/FileUpload";
import WarningAmberIcon     from "@mui/icons-material/WarningAmber";
import LocationPicker       from "../components/LocationPicker";

function Section({ icon, title, subtitle, children, borderColor }) {
  return (
    <Paper elevation={0} sx={{
      borderRadius: 3, border: "1.5px solid", borderColor: borderColor || "grey.200", overflow: "hidden",
    }}>
      <Box sx={{
        px: 2.5, py: 2, bgcolor: borderColor ? `${borderColor}15` : "grey.50",
        borderBottom: "1px solid", borderColor: borderColor || "grey.200",
        display: "flex", alignItems: "center", gap: 1.5,
      }}>
        <Box sx={{
          width: 34, height: 34, borderRadius: 2, bgcolor: "white",
          border: "1px solid", borderColor: borderColor || "grey.300",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: borderColor || "primary.main", flexShrink: 0,
        }}>{icon}</Box>
        <Box>
          <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.2 }}>{title}</Typography>
          {subtitle && <Typography variant="caption" sx={{ opacity: 0.55 }}>{subtitle}</Typography>}
        </Box>
      </Box>
      <Box sx={{ px: 2.5, py: 2 }}>{children}</Box>
    </Paper>
  );
}

function FieldRow({ label, hint, children }) {
  return (
    <Box sx={{
      py: 1.5, borderBottom: "1px solid", borderColor: "grey.100",
      "&:last-child": { borderBottom: "none", pb: 0 },
      "&:first-of-type": { pt: 0 },
    }}>
      <Typography variant="body2" fontWeight={700} sx={{ mb: 0.25 }}>{label}</Typography>
      {hint && <Typography variant="caption" sx={{ opacity: 0.5, display: "block", mb: 0.75 }}>{hint}</Typography>}
      {children}
    </Box>
  );
}

function AutoBackupStatus({ selectedBackup, setSelectedBackup }) {
  const [backups, setBackups] = useState([]);
  const [dir,     setDir]     = useState("");

  useEffect(() => {
    window.api.listBackups?.().then(res => {
      if (res?.ok) { setBackups(res.files || []); setDir(res.dir || ""); }
    }).catch(() => {});
  }, []);

  const last = backups[0];
  return (
    <Box sx={{ p: 1.75, borderRadius: 2, bgcolor: "grey.50", border: "1px solid", borderColor: "grey.200" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <Typography variant="body2" fontWeight={700}>🕐 Auto-Backup</Typography>
        <Chip label={last ? `Last: ${last.date}` : "None yet"} size="small"
          color={last ? "success" : "warning"} sx={{ fontWeight: 700, fontSize: 10 }} />
      </Box>
      <Typography variant="caption" sx={{ opacity: 0.55, display: "block", mb: 1 }}>
        Daily backups saved automatically on startup. Last 7 days kept.
        {dir && <><br />📁 {dir}</>}
      </Typography>
      {backups.length > 0 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          {backups.slice(0, 7).map(b => (
            <Box key={b.name} onClick={() => setSelectedBackup(b)}
              sx={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                px: 1.5, py: 0.75, borderRadius: 1.5, cursor: "pointer",
                bgcolor: selectedBackup?.name === b.name ? "primary.50" : "white",
                border: "1px solid", borderColor: selectedBackup?.name === b.name ? "primary.main" : "grey.200",
                "&:hover": { borderColor: "primary.light", bgcolor: "primary.50" }, transition: "all 0.1s" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {selectedBackup?.name === b.name && <Typography fontSize={12} color="primary.main">✓</Typography>}
                <Typography variant="caption" fontWeight={700}>{b.date}</Typography>
              </Box>
              <Typography variant="caption" sx={{ opacity: 0.5, fontFamily: "monospace" }}>{b.size} KB</Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

export default function IspSettings() {
  const [form, setForm] = useState({
    isp_name: "", isp_number: "", isp_phone: "", isp_address: "",
    lbp_rate: "", map_lat: "", map_lng: "", map_zoom: "14",
  });
  const [methods,        setMethods]        = useState([]);
  const [newMethod,      setNewMethod]      = useState("");
  const [saving,         setSaving]         = useState(false);
  const [msg,            setMsg]            = useState({ text: "", ok: true });
  const [dbBusy,         setDbBusy]         = useState(false);
  const [dbMsg,          setDbMsg]          = useState({ text: "", ok: true });
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [posEnabled,     setPosEnabled]     = useState(true);
  const [activeTab,      setActiveTab]      = useState(0);

  // mapLat/mapLng: null = no pin set (map still shows at default center)
  const [mapLat, setMapLat] = useState(null);
  const [mapLng, setMapLng] = useState(null);

  useEffect(() => {
    (async () => {
      const data = await window.api.getSettings();
      const lat  = data.map_lat && data.map_lat !== "" ? Number(data.map_lat) : null;
      const lng  = data.map_lng && data.map_lng !== "" ? Number(data.map_lng) : null;
      // Only set if valid numbers, otherwise keep null (no pin, map uses fallback center)
      setMapLat((lat !== null && !isNaN(lat)) ? lat : null);
      setMapLng((lng !== null && !isNaN(lng)) ? lng : null);
      setForm({
        isp_name:    data.isp_name    || "",
        isp_number:  data.isp_number  || "",
        isp_phone:   data.isp_phone   || "",
        isp_address: data.isp_address || "",
        lbp_rate:    data.lbp_rate    || "",
        map_lat:     data.map_lat     || "",
        map_lng:     data.map_lng     || "",
        map_zoom:    data.map_zoom    || "14",
      });
      try {
        const pm = JSON.parse(data.payment_methods || "[]");
        setMethods(Array.isArray(pm) ? pm : []);
      } catch { setMethods([]); }
      setPosEnabled(data.pos_enabled !== "0");
    })();
  }, []);

  const set = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }));

  // When user types lat/lng manually, sync both form text and map pin
  const handleLatChange = (e) => {
    const raw = e.target.value;
    setForm(p => ({ ...p, map_lat: raw }));
    const v = parseFloat(raw);
    setMapLat(raw === "" || isNaN(v) ? null : v);
  };

  const handleLngChange = (e) => {
    const raw = e.target.value;
    setForm(p => ({ ...p, map_lng: raw }));
    const v = parseFloat(raw);
    setMapLng(raw === "" || isNaN(v) ? null : v);
  };

  // When user clicks the map, update pin + text fields
  const handleMapClick = (la, ln) => {
    setMapLat(la);
    setMapLng(ln);
    setForm(p => ({
      ...p,
      map_lat: String(la),
      map_lng: String(ln),
    }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const finalForm = {
        ...form,
        map_lat: mapLat != null ? String(mapLat) : "",
        map_lng: mapLng != null ? String(mapLng) : "",
      };
      for (const [key, value] of Object.entries(finalForm))
        await window.api.setSetting({ key, value });
      await window.api.setSetting({ key: "payment_methods", value: JSON.stringify(methods) });
      await window.api.setSetting({ key: "pos_enabled",     value: posEnabled ? "1" : "0" });
      setMsg({ text: "Settings saved successfully.", ok: true });
    } catch {
      setMsg({ text: "Failed to save.", ok: false });
    } finally {
      setSaving(false);
      setTimeout(() => setMsg({ text: "", ok: true }), 4000);
    }
  };

  const doBackup = async () => {
    setDbBusy(true);
    try {
      const res = await window.api.dbBackup();
      if (res?.ok) setDbMsg({ text: "✅ Backup saved successfully.", ok: true });
      else if (res?.reason !== "CANCELLED") setDbMsg({ text: `Backup failed: ${res?.error || "Unknown"}`, ok: false });
    } finally { setDbBusy(false); setTimeout(() => setDbMsg({ text: "", ok: true }), 8000); }
  };

  const doRestore = async () => {
    setDbBusy(true); setConfirmRestore(false);
    try {
      const res = await window.api.dbRestore(selectedBackup?.name);
      if (!res?.ok && res?.reason === "INVALID_FILE") setDbMsg({ text: `❌ ${res.message}`, ok: false });
      else if (!res?.ok && res?.reason !== "CANCELLED") setDbMsg({ text: `❌ Restore failed: ${res?.error || "Unknown"}`, ok: false });
    } finally { setDbBusy(false); }
  };

  const CONTENT_WIDTH = 680;

  return (
    <Box sx={{ pb: 4 }}>

      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={900} sx={{ lineHeight: 1.1 }}>Settings</Typography>
        <Typography variant="body2" sx={{ opacity: 0.55, mt: 0.5 }}>
          Configure your ISP information, currency and map defaults
        </Typography>
      </Box>

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}
        sx={{ mb: 2.5, borderBottom: "1px solid", borderColor: "grey.200" }}
        variant="scrollable" scrollButtons="auto">
        <Tab label="ISP Info" />
        <Tab label="Billing" />
        <Tab label="Database" />
        <Tab label="Map" />
        <Tab label="Point of Sale" />
      </Tabs>

      {msg.text && (
        <Paper sx={{ p: 1.5, mb: 2.5, borderRadius: 2, bgcolor: msg.ok ? "success.50" : "error.50",
          border: "1px solid", borderColor: msg.ok ? "success.200" : "error.200",
          display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: CONTENT_WIDTH }}>
          <Typography variant="body2" fontWeight={600} color={msg.ok ? "success.dark" : "error.dark"}>{msg.text}</Typography>
          <IconButton size="small" onClick={() => setMsg({ text: "", ok: true })}><CloseIcon fontSize="small" /></IconButton>
        </Paper>
      )}

      {/* ── ISP INFO TAB ── */}
      {activeTab === 0 && (
        <Box sx={{ maxWidth: CONTENT_WIDTH }}>
          <Section icon={<BusinessIcon fontSize="small" />}
            title="ISP Information" subtitle="Displayed on printed invoices and receipts">
            <FieldRow label="Company Name" hint="Your ISP brand name">
              <TextField size="small" fullWidth value={form.isp_name} onChange={set("isp_name")} placeholder="e.g. Click Internet" />
            </FieldRow>
            <FieldRow label="Registration No." hint="Optional business ID">
              <TextField size="small" fullWidth value={form.isp_number} onChange={set("isp_number")} placeholder="e.g. 801-81801312" />
            </FieldRow>
            <FieldRow label="Phone Number" hint="Contact number shown on receipts">
              <TextField size="small" fullWidth value={form.isp_phone} onChange={set("isp_phone")} placeholder="e.g. +961 70 123 456" />
            </FieldRow>
            <FieldRow label="Address" hint="Physical address">
              <TextField size="small" fullWidth multiline minRows={2} value={form.isp_address} onChange={set("isp_address")} placeholder="e.g. Chaqra, South Lebanon" />
            </FieldRow>
          </Section>
        </Box>
      )}

      {/* ── BILLING TAB ── */}
      {activeTab === 1 && (
        <Box sx={{ maxWidth: CONTENT_WIDTH, display: "flex", flexDirection: "column", gap: 2.5 }}>
          <Section icon={<CurrencyExchangeIcon fontSize="small" />}
            title="Currency" subtitle="Used when collecting LBP payments">
            <FieldRow label="LBP Exchange Rate" hint="How many LBP equal 1 USD">
              <TextField size="small" fullWidth type="number"
                value={form.lbp_rate} onChange={set("lbp_rate")}
                inputProps={{ min: 0, step: 1000 }} placeholder="e.g. 90000"
                helperText={form.lbp_rate ? `1 USD = ${Number(form.lbp_rate).toLocaleString()} L£` : "Enter current exchange rate"}
                InputProps={{ startAdornment: <InputAdornment position="start">L£</InputAdornment> }} />
            </FieldRow>
          </Section>

          <Section icon={<PaymentIcon fontSize="small" />}
            title="Payment Methods" subtitle="Shown when collecting payment from a subscriber">
            <FieldRow label="Active Methods" hint="Click × to remove">
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", minHeight: 34, alignItems: "center" }}>
                {methods.length === 0
                  ? <Typography variant="body2" sx={{ opacity: 0.4 }}>No methods yet</Typography>
                  : methods.map(m => (
                    <Chip key={m} label={m}
                      onDelete={() => setMethods(prev => prev.filter(x => x !== m))}
                      deleteIcon={<CloseIcon />} sx={{ fontWeight: 700 }} />
                  ))}
              </Box>
            </FieldRow>
            <FieldRow label="Add Method" hint="Press Enter or click Add">
              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField size="small" sx={{ flex: 1 }} placeholder="e.g. WHISH, OMT, BANK, CASH"
                  value={newMethod} onChange={e => setNewMethod(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      const m = newMethod.trim().toUpperCase();
                      if (m && !methods.includes(m)) { setMethods(p => [...p, m]); setNewMethod(""); }
                    }
                  }} />
                <Button variant="outlined" startIcon={<AddIcon />} disabled={!newMethod.trim()}
                  onClick={() => {
                    const m = newMethod.trim().toUpperCase();
                    if (m && !methods.includes(m)) { setMethods(p => [...p, m]); setNewMethod(""); }
                  }}>Add</Button>
              </Box>
            </FieldRow>
          </Section>
        </Box>
      )}

      {/* ── DATABASE TAB ── */}
      {activeTab === 2 && (
        <Box sx={{ maxWidth: CONTENT_WIDTH }}>
          <Paper elevation={0} sx={{ borderRadius: 3, border: "1.5px solid", borderColor: "warning.300", overflow: "hidden" }}>
            <Box sx={{ px: 2.5, py: 2, bgcolor: "warning.50", borderBottom: "1px solid", borderColor: "warning.200",
              display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box sx={{ width: 34, height: 34, borderRadius: 2, bgcolor: "white", border: "1px solid", borderColor: "warning.400",
                display: "flex", alignItems: "center", justifyContent: "center", color: "warning.dark", flexShrink: 0 }}>
                <StorageIcon fontSize="small" />
              </Box>
              <Box>
                <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.2 }}>Database Backup & Restore</Typography>
                <Typography variant="caption" sx={{ opacity: 0.55 }}>Export or replace the entire database</Typography>
              </Box>
            </Box>
            <Box sx={{ px: 2.5, py: 2, display: "flex", flexDirection: "column", gap: 2 }}>
              {dbMsg.text && (
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: dbMsg.ok ? "success.50" : "error.50",
                  border: "1px solid", borderColor: dbMsg.ok ? "success.200" : "error.200",
                  display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Typography variant="body2" fontWeight={600} color={dbMsg.ok ? "success.dark" : "error.dark"}>{dbMsg.text}</Typography>
                  <IconButton size="small" onClick={() => setDbMsg({ text: "", ok: true })}><CloseIcon fontSize="small" /></IconButton>
                </Box>
              )}
              <Box sx={{ p: 2, borderRadius: 2, border: "1px solid", borderColor: "grey.200", bgcolor: "grey.50" }}>
                <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>Export Backup</Typography>
                <Typography variant="caption" sx={{ opacity: 0.6, display: "block", mb: 1.5 }}>
                  Save a copy of the current database. Do this regularly to protect your data.
                </Typography>
                <Button variant="contained" startIcon={<FileDownloadIcon />} disabled={dbBusy} onClick={doBackup} sx={{ fontWeight: 700 }}>
                  {dbBusy ? "Saving…" : "Export Database"}
                </Button>
              </Box>

              <AutoBackupStatus selectedBackup={selectedBackup} setSelectedBackup={setSelectedBackup} />

              <Box sx={{ p: 2, borderRadius: 2, border: "1.5px solid", borderColor: "error.300", bgcolor: "error.50" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                  <WarningAmberIcon sx={{ color: "error.main", fontSize: 18 }} />
                  <Typography variant="body2" fontWeight={800} color="error.dark">Restore from Backup</Typography>
                </Box>
                {selectedBackup && (
                  <Box sx={{ mb: 1.5, px: 1.5, py: 0.75, borderRadius: 1.5, bgcolor: "primary.50", border: "1px solid", borderColor: "primary.200" }}>
                    <Typography variant="caption" fontWeight={700} color="primary.main">
                      Selected: {selectedBackup.date} ({selectedBackup.size} KB)
                    </Typography>
                  </Box>
                )}
                <Typography variant="caption" sx={{ color: "error.dark", opacity: 0.8, display: "block", mb: 1.5, lineHeight: 1.6 }}>
                  ⚠️ <strong>DANGER:</strong> This permanently replaces ALL current data. <strong>Cannot be undone.</strong> The app will restart automatically.
                  {!selectedBackup && <><br /><em>Select a backup from the list above first.</em></>}
                </Typography>
                {!confirmRestore ? (
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    <Button variant="outlined" color="error" startIcon={<WarningAmberIcon />}
                      disabled={!selectedBackup} onClick={() => setConfirmRestore(true)} sx={{ fontWeight: 700 }}>
                      {selectedBackup ? `Restore ${selectedBackup.date}` : "Select backup above"}
                    </Button>
                    <Button variant="outlined" color="warning"
                      onClick={() => { setSelectedBackup(null); setConfirmRestore(true); }} sx={{ fontWeight: 700 }}>
                      📂 Browse for File…
                    </Button>
                  </Box>
                ) : (
                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: "white", border: "2px solid", borderColor: "error.main" }}>
                    <Typography variant="body2" fontWeight={800} color="error.main" sx={{ mb: 0.75 }}>Are you absolutely sure?</Typography>
                    <Typography variant="caption" sx={{ display: "block", mb: 1.5, opacity: 0.7 }}>
                      The current database will be auto-saved before replacement. The app will restart immediately.
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button variant="contained" color="error" startIcon={<FileUploadIcon />}
                        disabled={dbBusy} onClick={doRestore} sx={{ fontWeight: 800 }}>Yes, Replace & Restart</Button>
                      <Button variant="outlined" onClick={() => setConfirmRestore(false)}>Cancel</Button>
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>
          </Paper>
        </Box>
      )}

      {/* ── MAP TAB ── */}
      {activeTab === 3 && (
        <Box sx={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 3, alignItems: "start" }}>

          {/* Left: coordinate inputs */}
          <Section icon={<MapIcon fontSize="small" />}
            title="Map Default Location" subtitle="Enter coordinates or click the map">
            <FieldRow label="Latitude" hint="North/South (e.g. 33.5731)">
              <TextField size="small" fullWidth type="number"
                value={form.map_lat}
                onChange={handleLatChange}
                inputProps={{ step: "any" }} placeholder="33.5731" />
            </FieldRow>
            <FieldRow label="Longitude" hint="East/West (e.g. 35.3714)">
              <TextField size="small" fullWidth type="number"
                value={form.map_lng}
                onChange={handleLngChange}
                inputProps={{ step: "any" }} placeholder="35.3714" />
            </FieldRow>
            <FieldRow label="Zoom Level" hint="13=City · 15=Village · 17=Street">
              <TextField size="small" sx={{ width: 110 }} type="number"
                value={form.map_zoom} onChange={set("map_zoom")}
                inputProps={{ min: 8, max: 18, step: 1 }} />
            </FieldRow>
            {(mapLat != null || form.map_lat) && (
              <Box sx={{ mt: 1 }}>
                <Button size="small" color="error" onClick={() => {
                  setMapLat(null); setMapLng(null);
                  setForm(p => ({ ...p, map_lat: "", map_lng: "" }));
                }}>Clear pin</Button>
              </Box>
            )}
          </Section>

          {/* Right: live map — always visible, no blocking condition */}
          <Box>
            <Typography variant="caption" fontWeight={700}
              sx={{ opacity: 0.6, display: "block", mb: 0.75, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Click map to set location
            </Typography>
            <Box sx={{ borderRadius: 2, overflow: "hidden", border: "1.5px solid", borderColor: "grey.200" }}>
              <LocationPicker
                lat={mapLat}
                lng={mapLng}
                onChange={handleMapClick}
                height={420}
              />
            </Box>
          </Box>
        </Box>
      )}

      {/* ── POINT OF SALE TAB ── */}
      {activeTab === 4 && (
        <Box sx={{ maxWidth: CONTENT_WIDTH }}>
          <Section icon={<StorefrontIcon fontSize="small" />}
            title="Point of Sale" subtitle="Enable or disable the POS module in the sidebar">
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 1 }}>
              <Box>
                <Typography variant="body2" fontWeight={700}>Enable POS Module</Typography>
                <Typography variant="caption" sx={{ opacity: 0.6 }}>
                  Shows Terminal, Items, Sales and POS Drawer in the sidebar. Requires app restart.
                </Typography>
              </Box>
              <Switch checked={posEnabled} onChange={e => setPosEnabled(e.target.checked)} color="primary" />
            </Box>
          </Section>
        </Box>
      )}

      <Divider sx={{ mt: 3, mb: 2.5 }} />
      <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 2 }}>
        <Button variant="contained" startIcon={<SaveIcon />}
          onClick={save} disabled={saving} sx={{ fontWeight: 800, px: 4, height: 44 }}>
          {saving ? "Saving…" : "Save All Settings"}
        </Button>
      </Box>

    </Box>
  );
}