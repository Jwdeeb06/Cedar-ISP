// src/pages/Users/UsersAddPage.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Box, Button, Divider, FormControlLabel,
  IconButton, Paper, Stack, Switch, TextField, Typography,
} from "@mui/material";
import { usersApi }     from "../../services/usersApi";
import ServiceSelect    from "../../components/ServiceSelect";
import LocationPicker   from "../../components/LocationPicker";

export default function UsersAddPage() {
  const [name,       setName]       = useState("");
  const [mobile,     setMobile]     = useState("");
  const [service,    setService]    = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [blocked,    setBlocked]    = useState(false);
  const [lat,        setLat]        = useState(null);
  const [lng,        setLng]        = useState(null);
  const [msg,        setMsg]        = useState("");

  const [serviceRefreshKey, setServiceRefreshKey] = useState(0);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(""), 8000);
    return () => clearTimeout(t);
  }, [msg]);

  const canSubmit = useMemo(() => name.trim().length > 0, [name]);

  const clear = () => {
    setName(""); setMobile(""); setService("");
    setExpiryDate(""); setBlocked(false);
    setLat(null); setLng(null);
    setServiceRefreshKey(k => k + 1);
  };

  const addUser = async () => {
    await usersApi.addUser({
      name:        name.trim(),
      mobile:      mobile.trim(),
      address:     "",
      service:     service || null,
      price:       0,
      balance:     0,
      expiry_date: expiryDate || null,
      blocked:     blocked ? 1 : 0,
      lat:         lat  ?? null,
      lng:         lng  ?? null,
    });
    clear();
    setMsg("User added ✅");
  };

  return (
    <Box sx={{ minHeight: "calc(100vh - 64px)" }}>
      <Paper sx={{ p: 3, borderRadius: 3, maxWidth: 1100, mx: "auto" }}>

        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, mb: 2, flexWrap: "wrap" }}>
          <Box>
            <Typography variant="h5" fontWeight={900}>Add User</Typography>
            <Typography variant="body2" sx={{ opacity: 0.75 }}>Fill the details and press Add.</Typography>
          </Box>
          {msg && (
            <Paper sx={{ px: 1.5, py: 1, bgcolor: "success.light", display: "flex", alignItems: "center", gap: 1, borderRadius: 2 }}>
              <Typography variant="body2" fontWeight={700}>{msg}</Typography>
              <IconButton size="small" onClick={() => setMsg("")}>✕</IconButton>
            </Paper>
          )}
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Two-column layout */}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>

          {/* Left: form fields */}
          <Stack spacing={2.5}>
            <TextField label="Name *" value={name} onChange={e => setName(e.target.value)} fullWidth />
            <TextField label="Mobile" value={mobile} onChange={e => setMobile(e.target.value)} fullWidth />

            <Box>
              <Typography variant="caption" fontWeight={700} sx={{ opacity: 0.7 }}>Service</Typography>
              <Box sx={{ mt: 0.75 }}>
                <ServiceSelect value={service} onChange={setService} refreshKey={serviceRefreshKey} />
              </Box>
            </Box>

            <TextField label="Expiry Date" type="date" value={expiryDate}
              onChange={e => setExpiryDate(e.target.value)} fullWidth
              InputLabelProps={{ shrink: true }} />

            {/* Blocked toggle */}
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between",
              px: 2, py: 1.5, borderRadius: 2,
              bgcolor: blocked ? "error.50" : "grey.50",
              border: "1px solid", borderColor: blocked ? "error.200" : "grey.200",
              transition: "all 0.2s" }}>
              <Box>
                <Typography fontWeight={700} fontSize={14} color={blocked ? "error.main" : "text.primary"}>
                  {blocked ? "🔒 Account Blocked" : "✅ Account Active"}
                </Typography>
                <Typography fontSize={12} sx={{ opacity: 0.6 }}>
                  {blocked ? "User will be created as blocked and cannot access service" : "User will have active access"}
                </Typography>
              </Box>
              <Switch checked={blocked} onChange={e => setBlocked(e.target.checked)}
                color="error" />
            </Box>

            <Box sx={{ display: "flex", gap: 1.5, pt: 1 }}>
              <Button variant="outlined" onClick={clear}>Clear</Button>
              <Button variant="contained" onClick={addUser} disabled={!canSubmit}
                sx={{ fontWeight: 800 }}>Add User</Button>
            </Box>
          </Stack>

          {/* Right: map picker */}
          <Box>
            <Typography variant="caption" fontWeight={700} sx={{ opacity: 0.7, display: "block", mb: 0.75 }}>
              Customer Location (optional)
            </Typography>
            <LocationPicker
              lat={lat} lng={lng}
              onChange={(la, ln) => { setLat(la); setLng(ln); }}
              height={420}
            />
            {lat != null && (
              <Button size="small" variant="text" color="error" sx={{ mt: 0.5 }}
                onClick={() => { setLat(null); setLng(null); }}>
                Clear location
              </Button>
            )}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}