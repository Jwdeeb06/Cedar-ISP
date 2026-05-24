// src/components/UserInfoPanel.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, Drawer, FormControl,
  IconButton, InputLabel, MenuItem, Paper, Select,
  Switch, TextField, Typography,
} from "@mui/material";
import CloseIcon                from "@mui/icons-material/Close";
import ReceiptLongIcon          from "@mui/icons-material/ReceiptLong";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import SaveIcon                 from "@mui/icons-material/Save";
import BlockIcon                from "@mui/icons-material/Block";
import LocationOnIcon           from "@mui/icons-material/LocationOn";
import { usersApi } from "../services/usersApi";
import LocationPicker from "./LocationPicker";

const STATUS_COLOR = { ACTIVE:"success", INACTIVE:"default", SUSPENDED:"error" };

function FieldRow({ label, children }) {
  return (
    <Box>
      <Typography variant="caption" fontWeight={700} sx={{ opacity:0.5, textTransform:"uppercase", letterSpacing:0.5 }}>
        {label}
      </Typography>
      <Box sx={{ mt:0.5 }}>{children}</Box>
    </Box>
  );
}

function Section({ title, children }) {
  return (
    <Box>
      <Typography variant="caption" fontWeight={800}
        sx={{ opacity:0.35, textTransform:"uppercase", letterSpacing:1, fontSize:10 }}>
        {title}
      </Typography>
      <Box sx={{ display:"flex", flexDirection:"column", gap:1.5, mt:1 }}>
        {children}
      </Box>
    </Box>
  );
}

export default function UserInfoPanel({ open, onClose, user, onSaved }) {
  const [form,     setForm]     = useState(null);
  const [services, setServices] = useState([]);
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState("");
  const [mapOpen,  setMapOpen]  = useState(false);
  const [tmpLat,   setTmpLat]   = useState(null);
  const [tmpLng,   setTmpLng]   = useState(null);
  const nav = useNavigate();

  useEffect(() => {
    window.api.listServices?.().then(d => setServices(d || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return setForm(null);
    setForm({
      id:             user.id,
      name:           user.name           ?? "",
      username:       user.username       ?? "",
      pppoe_password: user.pppoe_password ?? "",
      mac_address:    user.mac_address    ?? "",
      mobile:         user.mobile         ?? "",
      address:        user.address        ?? "",
      service_id:     user.service_id     ?? "",
      expiry_date:    user.expiry_date    ?? "",
      price:          user.price          ?? 0,
      balance:        user.balance        ?? 0,
      blocked:        user.blocked        ? 1 : 0,
      notes:          user.notes          ?? "",
      lat:            user.lat            ?? null,
      lng:            user.lng            ?? null,
    });
    setMsg("");
  }, [user]);

  if (!form) return null;

  const set = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }));

  const save = async () => {
    if (!form.name.trim()) return setMsg("Name is required");
    setSaving(true);
    try {
      await usersApi.updateUser({
        id:             form.id,
        name:           form.name.trim(),
        username:       form.username       || null,
        pppoe_password: form.pppoe_password || null,
        mac_address:    form.mac_address    || null,
        mobile:         form.mobile         || "",
        address:        form.address        || "",
        service_id:     form.service_id     || null,
        expiry_date:    form.expiry_date    || null,
        price:          Number(form.price)  || 0,
        blocked:        form.blocked ? 1 : 0,
        notes:          form.notes          || "",
        lat:            form.lat            ?? null,
        lng:            form.lng            ?? null,
      });
      setMsg("✅ Saved");
      onSaved?.();
      setTimeout(() => setMsg(""), 2500);
    } catch {
      setMsg("❌ Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const openMap = () => {
    setTmpLat(form.lat);
    setTmpLng(form.lng);
    setMapOpen(true);
  };

  const confirmLocation = () => {
    setForm(p => ({ ...p, lat: tmpLat, lng: tmpLng }));
    setMapOpen(false);
  };

  const expiryDays = form.expiry_date
    ? Math.ceil((new Date(form.expiry_date) - new Date()) / 86400000)
    : null;

  const expiryColor = expiryDays === null ? "default"
    : expiryDays < 0  ? "error"
    : expiryDays <= 7 ? "warning"
    : "success";

  const hasLocation = form.lat != null && form.lng != null;

  return (
    <>
      <Drawer anchor="right" open={open} onClose={onClose}
        PaperProps={{ sx: { width:420, borderRadius:"16px 0 0 16px" } }}>
        <Box sx={{ display:"flex", flexDirection:"column", height:"100%" }}>

          {/* Header */}
          <Box sx={{
            px:2.5, py:2,
            background:"linear-gradient(135deg, #1976d2, #1565c0)",
            display:"flex", alignItems:"flex-start", gap:1.5, flexShrink:0,
          }}>
            <Box sx={{ flexGrow:1 }}>
              <Typography variant="h6" fontWeight={900} color="white" sx={{ lineHeight:1.2 }}>
                {form.name || "User"}
              </Typography>
              <Box sx={{ display:"flex", alignItems:"center", gap:1, mt:0.75, flexWrap:"wrap" }}>
                <Chip label={user?.status ?? "—"}
                  color={STATUS_COLOR[user?.status] ?? "default"}
                  size="small" sx={{ fontWeight:700, height:20, fontSize:11 }} />
                {form.expiry_date && (
                  <Chip
                    label={expiryDays < 0
                      ? `Expired ${Math.abs(expiryDays)}d ago`
                      : expiryDays === 0 ? "Expires today"
                      : `Expires in ${expiryDays}d`}
                    color={expiryColor}
                    size="small" sx={{ fontWeight:700, height:20, fontSize:11 }}
                  />
                )}
                {form.blocked === 1 && (
                  <Chip icon={<BlockIcon sx={{ fontSize:"13px !important" }} />}
                    label="Blocked" color="error" size="small"
                    sx={{ fontWeight:700, height:20, fontSize:11 }} />
                )}
              </Box>
              <Typography sx={{ color:"rgba(255,255,255,0.55)", fontSize:11, mt:0.5 }}>
                ID #{user?.id}{user?.username ? ` · ${user.username}` : ""}
              </Typography>
            </Box>
            <IconButton size="small" onClick={onClose} sx={{ color:"rgba(255,255,255,0.7)", mt:-0.5 }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Quick nav */}
          <Box sx={{ px:2.5, py:1.5, display:"flex", gap:1, bgcolor:"grey.50",
            borderBottom:"1px solid", borderColor:"grey.200", flexShrink:0 }}>
            <Button size="small" variant="outlined" fullWidth
              startIcon={<ReceiptLongIcon />}
              onClick={() => { onClose?.(); nav(`/users/${user.id}/invoices`, { state:{ userName:user.name } }); }}>
              Invoices
            </Button>
            <Button size="small" variant="outlined" fullWidth
              startIcon={<AccountBalanceWalletIcon />}
              onClick={() => { onClose?.(); nav(`/users/${user.id}/wallet`, { state:{ userName:user.name } }); }}>
              Wallet
            </Button>
            <Button size="small" variant="outlined" fullWidth
              startIcon={<LocationOnIcon />}
              onClick={openMap}
              sx={{
                color: hasLocation ? "success.main" : "text.secondary",
                borderColor: hasLocation ? "success.main" : "grey.300",
                fontWeight: 700,
              }}>
              {hasLocation ? "📍 Located" : "Set Location"}
            </Button>
          </Box>

          {/* Form */}
          <Box sx={{ flexGrow:1, overflowY:"auto", px:2.5, py:2, display:"flex", flexDirection:"column", gap:2.5 }}>

            <Section title="Basic Info">
              <TextField size="small" label="Full Name *" fullWidth
                value={form.name} onChange={set("name")} />
              <Box sx={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:1.5 }}>
                <TextField size="small" label="Mobile" fullWidth
                  value={form.mobile} onChange={set("mobile")} />
                <TextField size="small" label="Address" fullWidth
                  value={form.address} onChange={set("address")} />
              </Box>
              <TextField size="small" label="Notes" fullWidth multiline minRows={2}
                value={form.notes} onChange={set("notes")} />
            </Section>

            <Divider />

            <Section title="Connection">
              <Box sx={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:1.5 }}>
                <TextField size="small" label="Username" fullWidth
                  value={form.username} onChange={set("username")} />
                <TextField size="small" label="PPPoE Password" fullWidth
                  value={form.pppoe_password} onChange={set("pppoe_password")} />
              </Box>
              <TextField size="small" label="MAC Address" fullWidth
                value={form.mac_address} onChange={set("mac_address")}
                placeholder="AA:BB:CC:DD:EE:FF" />
            </Section>

            <Divider />

            <Section title="Subscription">
              <FormControl size="small" fullWidth>
                <InputLabel>Service Plan</InputLabel>
                <Select label="Service Plan" value={form.service_id ?? ""}
                  onChange={e => setForm(p => ({ ...p, service_id: e.target.value }))}>
                  <MenuItem value="">— No service —</MenuItem>
                  {services.map(s => (
                    <MenuItem key={s.id} value={s.id}>
                      <Box sx={{ display:"flex", justifyContent:"space-between", width:"100%", gap:2 }}>
                        <span>{s.name}</span>
                        <span style={{ opacity:0.5, fontSize:12, fontFamily:"monospace" }}>${s.price}/mo</span>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:1.5 }}>
                <Box>
                  <TextField size="small" fullWidth label="Expiry Date" type="date"
                    value={form.expiry_date || ""}
                    onChange={set("expiry_date")}
                    InputLabelProps={{ shrink:true }} />
                  <Box sx={{ display:"flex", gap:0.5, mt:0.75, flexWrap:"wrap" }}>
                    {[
                      { l:"+1M", d:()=>{ const b=form.expiry_date||new Date().toISOString().slice(0,10); const dt=new Date(b); dt.setMonth(dt.getMonth()+1); return dt.toISOString().slice(0,10); } },
                      { l:"+3M", d:()=>{ const b=form.expiry_date||new Date().toISOString().slice(0,10); const dt=new Date(b); dt.setMonth(dt.getMonth()+3); return dt.toISOString().slice(0,10); } },
                      { l:"5th", d:()=>{ const n=new Date(); const d=new Date(n.getFullYear(), n.getDate()<=5?n.getMonth():n.getMonth()+1, 5); return d.toISOString().slice(0,10); } },
                    ].map(q=>(
                      <Chip key={q.l} label={q.l} size="small" variant="outlined"
                        sx={{ cursor:"pointer", fontSize:10, height:20 }}
                        onClick={()=>setForm(p=>({ ...p, expiry_date: q.d() }))} />
                    ))}
                  </Box>
                </Box>
                <TextField size="small" label="Price ($/mo)" type="number" fullWidth
                  value={form.price} onChange={set("price")}
                  inputProps={{ min:0, step:0.5 }} />
              </Box>

              <Paper elevation={0} sx={{ px:2, py:1.25, borderRadius:2,
                bgcolor:"grey.50", border:"1px solid", borderColor:"grey.200",
                display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <Box>
                  <Typography variant="caption" fontWeight={700} sx={{ opacity:0.5 }}>WALLET BALANCE</Typography>
                  <Typography fontWeight={900} color={Number(form.balance)>0?"success.main":"text.primary"}>
                    ${(Number(form.balance)||0).toFixed(2)}
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ opacity:0.4 }}>Managed via Wallet page</Typography>
              </Paper>

              <Box sx={{
                px:2, py:1.5, borderRadius:2,
                border:"1.5px solid",
                borderColor: form.blocked ? "error.300" : "grey.200",
                bgcolor: form.blocked ? "error.50" : "transparent",
                display:"flex", alignItems:"center", justifyContent:"space-between",
                transition:"all 0.2s",
              }}>
                <Box>
                  <Typography variant="body2" fontWeight={700}
                    color={form.blocked ? "error.main" : "text.primary"}>
                    {form.blocked ? "User is Blocked (SUSPENDED)" : "User is Active"}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity:0.6 }}>
                    {form.blocked ? "Toggle off to unblock" : "Toggle to suspend"}
                  </Typography>
                </Box>
                <Switch
                  checked={Boolean(form.blocked)}
                  onChange={e => setForm(p => ({ ...p, blocked: e.target.checked ? 1 : 0 }))}
                  color="error"
                />
              </Box>
            </Section>

          </Box>

          {/* Footer */}
          <Box sx={{ px:2.5, py:2, borderTop:"1px solid", borderColor:"grey.200",
            display:"flex", alignItems:"center", gap:1.5, flexShrink:0, bgcolor:"grey.50" }}>
            {msg && (
              <Typography variant="body2" fontWeight={600}
                color={msg.startsWith("✅") ? "success.main" : "error.main"} sx={{ flexGrow:1 }}>
                {msg}
              </Typography>
            )}
            <Box sx={{ flexGrow: msg ? 0 : 1 }} />
            <Button onClick={onClose} sx={{ color:"text.secondary" }}>Cancel</Button>
            <Button variant="contained" startIcon={<SaveIcon />}
              onClick={save} disabled={saving}
              sx={{ fontWeight:800, px:3 }}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </Box>

        </Box>
      </Drawer>

      {/* Location picker dialog */}
      <Dialog open={mapOpen} onClose={() => setMapOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}>
        <DialogTitle sx={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 1 }}>
          <LocationOnIcon color="success" />
          Set Customer Location — {form.name}
        </DialogTitle>
        <DialogContent sx={{ p: 0, height: 480 }}>
          <LocationPicker
            lat={tmpLat}
            lng={tmpLng}
            onChange={(la, ln) => { setTmpLat(la); setTmpLng(ln); }}
            height={480}
          />
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2, gap: 1 }}>
          {(tmpLat != null) && (
            <Button color="error" onClick={() => { setTmpLat(null); setTmpLng(null); }}>
              Clear Location
            </Button>
          )}
          <Box sx={{ flexGrow: 1 }} />
          <Button onClick={() => setMapOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={confirmLocation} sx={{ fontWeight: 800 }}>
            {tmpLat != null ? "Confirm Location" : "Save (no location)"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}