// src/pages/LicenseGate.jsx
import { useState } from "react";
import {
  Box, Button, CircularProgress, IconButton,
  InputAdornment, Paper, TextField, Typography,
} from "@mui/material";
import RouterIcon        from "@mui/icons-material/Router";
import VisibilityIcon    from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import CheckCircleIcon   from "@mui/icons-material/CheckCircle";
import ErrorIcon         from "@mui/icons-material/Error";
import WifiOffIcon       from "@mui/icons-material/WifiOff";

export default function LicenseGate({ onActivated }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState(null);

  const submit = async () => {
    if (!username.trim() || !password) return setError("Enter username and password");
    setLoading(true);
    setError("");
    try {
      const res = await window.api.checkLicense({ username: username.trim(), password });
      if (res?.ok) {
        setSuccess(res);
        setTimeout(() => onActivated(res), 1500);
      } else {
        if (res?.code === "EXPIRED")
          setError(`License expired on ${res.expires_at}. Contact your provider to renew.`);
        else if (res?.code === "ACCOUNT_DISABLED")
          setError("Account disabled. Contact your provider.");
        else if (res?.code === "NO_CONNECTION")
          setError(res.message || "Cannot connect to license server.");
        else
          setError("Invalid username or password.");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      width:"100vw", height:"100vh",
      display:"flex", alignItems:"center", justifyContent:"center",
      background:"linear-gradient(135deg, #1a237e 0%, #0d47a1 60%, #1565c0 100%)",
      position:"fixed", top:0, left:0, zIndex:9999,
    }}>
      {/* subtle grid pattern */}
      <Box sx={{
        position:"absolute", inset:0, opacity:0.04,
        backgroundImage:`repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)`,
        backgroundSize:"20px 20px",
      }} />

      <Paper elevation={24} sx={{ width:420, borderRadius:4, overflow:"hidden", position:"relative" }}>

        {/* Header */}
        <Box sx={{ px:4, py:4, textAlign:"center",
          background:"linear-gradient(135deg, #1565c0, #0d47a1)" }}>
          <Box sx={{ width:64, height:64, borderRadius:3,
            bgcolor:"rgba(255,255,255,0.15)",
            display:"flex", alignItems:"center", justifyContent:"center",
            mx:"auto", mb:2 }}>
            <RouterIcon sx={{ color:"white", fontSize:36 }} />
          </Box>
          <Typography variant="h5" fontWeight={900} color="white">ISP Management</Typography>
          <Typography sx={{ color:"rgba(255,255,255,0.6)", fontSize:13, mt:0.5 }}>
            Enter your license credentials to continue
          </Typography>
        </Box>

        {/* Body */}
        <Box sx={{ px:4, py:4, display:"flex", flexDirection:"column", gap:2.5 }}>
          {success ? (
            <Box sx={{ textAlign:"center", py:2 }}>
              <CheckCircleIcon sx={{ fontSize:56, color:"success.main", mb:1 }} />
              <Typography variant="h6" fontWeight={800} color="success.main">Activated!</Typography>
              <Typography variant="body2" sx={{ opacity:0.7, mt:0.5 }}>
                {success.isp_name} — {success.plan} plan
              </Typography>
              <Typography variant="caption" sx={{ opacity:0.5, display:"block", mt:0.5 }}>
                Expires: {success.expires_at} · {success.days_left} days left
              </Typography>
              {success.from_cache && (
                <Box sx={{ mt:1.5, p:1, borderRadius:2, bgcolor:"warning.50",
                  border:"1px solid", borderColor:"warning.200",
                  display:"flex", alignItems:"center", gap:1, justifyContent:"center" }}>
                  <WifiOffIcon sx={{ fontSize:16, color:"warning.dark" }} />
                  <Typography variant="caption" color="warning.dark" fontWeight={600}>
                    Offline mode — cached license
                  </Typography>
                </Box>
              )}
            </Box>
          ) : (
            <>
              <TextField size="small" label="License Username" fullWidth autoFocus
                value={username}
                onChange={e => { setUsername(e.target.value); setError(""); }}
                onKeyDown={e => e.key==="Enter" && submit()} />

              <TextField size="small" label="License Password" fullWidth
                type={showPass ? "text" : "password"}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(""); }}
                onKeyDown={e => e.key==="Enter" && submit()}
                InputProps={{ endAdornment:
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPass(p=>!p)}>
                      {showPass ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                }} />

              {error && (
                <Box sx={{ p:1.5, borderRadius:2, bgcolor:"error.50",
                  border:"1px solid", borderColor:"error.200",
                  display:"flex", gap:1, alignItems:"flex-start" }}>
                  <ErrorIcon sx={{ color:"error.main", fontSize:18, mt:0.1, flexShrink:0 }} />
                  <Typography variant="body2" color="error.main" fontWeight={600}>
                    {error}
                  </Typography>
                </Box>
              )}

              <Button variant="contained" fullWidth disabled={loading}
                onClick={submit}
                sx={{ py:1.5, fontWeight:800, fontSize:15, borderRadius:2 }}>
                {loading
                  ? <CircularProgress size={22} color="inherit" />
                  : "Activate"}
              </Button>

              <Typography variant="caption" textAlign="center" sx={{ opacity:0.4 }}>
                Contact your provider if you don't have credentials
              </Typography>
            </>
          )}
        </Box>
      </Paper>
    </Box>
  );
}