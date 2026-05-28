import { useEffect, useState } from "react";
import {
  Box, Button, CircularProgress, Divider, IconButton,
  InputAdornment, TextField, Typography,
} from "@mui/material";
import VisibilityIcon    from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import WhatsAppIcon      from "@mui/icons-material/WhatsApp";

function LoginWinControls() {
  return (
    <Box sx={{
      position: "fixed", top: 0, right: 0, zIndex: 9999,
      display: "flex", WebkitAppRegion: "no-drag",
    }}>
      {[
        { label: "–", action: () => window.api.winMinimize?.(), hover: "rgba(255,255,255,0.15)" },
        { label: "□", action: () => window.api.winMaximize?.(), hover: "rgba(255,255,255,0.15)" },
        { label: "✕", action: () => window.api.winClose?.(),    hover: "#e81123" },
      ].map(({ label, action, hover }) => (
        <Box key={label} onClick={action} sx={{
          width: 46, height: 40,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: "rgba(255,255,255,0.8)", fontSize: 13,
          fontFamily: "system-ui", fontWeight: 400,
          "&:hover": { bgcolor: hover, color: "white" },
          transition: "all 0.1s",
        }}>
          {label}
        </Box>
      ))}
    </Box>
  );
}

function LoginDragRegion() {
  return (
    <Box sx={{
      position: "fixed", top: 0, left: 0, right: 138, height: 40,
      WebkitAppRegion: "drag", zIndex: 9998,
    }} />
  );
}

const SUPPORT_NUMBER = "+96181801312";
const SUPPORT_WA     = "https://wa.me/96181801312";

export default function LoginPage({ onLogin }) {
  // License state
  const [licChecking, setLicChecking] = useState(true);  // auto-checking on mount
  const [licOk,       setLicOk]       = useState(false);
  const [licInfo,     setLicInfo]     = useState(null);
  const [licUser,     setLicUser]     = useState("");
  const [licPass,     setLicPass]     = useState("");
  const [showLicP,    setShowLicP]    = useState(false);
  const [licError,    setLicError]    = useState("");

  // Employee login state
  const [username,  setUsername]  = useState("");
  const [password,  setPassword]  = useState("");
  const [showPass,  setShowPass]  = useState(false);
  const [error,     setError]     = useState("");

  const [loading, setLoading] = useState(false);

  // ── Auto-check saved license on mount ───────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await window.api.autoCheckLicense?.();
        if (res?.ok) {
          setLicInfo(res);
          setLicOk(true);
        }
      } catch {}
      finally { setLicChecking(false); }
    })();
  }, []);

  // ── Manual license submit ────────────────────────────────────────────────
  const submitLicense = async () => {
    if (!licUser.trim() || !licPass) return setLicError("Enter license username and password");
    setLoading(true);
    setLicError("");
    try {
      const res = await window.api.checkLicense({ username: licUser.trim(), password: licPass });
      if (res?.ok) {
        setLicInfo(res);
        setLicOk(true);
      } else {
        handleLicenseError(res);
      }
    } catch (e) {
      handleLicenseError(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLicenseError = (res) => {
    if (res?.code === "EXPIRED")
      setLicError(`License expired on ${res.expires_at}. Contact your provider.`);
    else if (res?.code === "ACCOUNT_DISABLED")
      setLicError("Account disabled. Contact your provider.");
    else if (res?.code === "NO_CONNECTION")
      setLicError("Cannot connect to license server. Check your internet connection.");
    else
      setLicError("Invalid license credentials.");
  };

  // ── Employee login ───────────────────────────────────────────────────────
  const submitLogin = async (e) => {
    e?.preventDefault?.();
    if (!username.trim() || !password) return setError("Please enter username and password");
    setLoading(true);
    setError("");
    try {
      const res = await window.api.authLogin({ username: username.trim(), password });
      if (res?.ok) onLogin(res.employee);
      else setError("Invalid username or password");
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Full-screen spinner while auto-checking license ──────────────────────
  if (licChecking) {
    return (
      <Box sx={{
        width: "100vw", height: "100vh",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "linear-gradient(145deg, #1565c0 0%, #0d47a1 45%, #1a237e 100%)",
        gap: 2,
      }}>
        <LoginDragRegion />
        <LoginWinControls />
        <CircularProgress sx={{ color: "white" }} />
        <Typography color="white" fontWeight={600} sx={{ opacity: 0.8 }}>Checking license…</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{
      width: "100vw", height: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(145deg, #1565c0 0%, #0d47a1 45%, #1a237e 100%)",
      position: "fixed", top: 0, left: 0, overflow: "hidden",
    }}>
      <LoginDragRegion />
      <LoginWinControls />

      {/* Background texture */}
      <Box sx={{
        position: "absolute", inset: 0, opacity: 0.04,
        backgroundImage: `repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)`,
        backgroundSize: "18px 18px",
      }} />

      {/* Glow blobs */}
      <Box sx={{
        position: "absolute", top: -120, left: -120, width: 400, height: 400,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(100,181,246,0.25) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <Box sx={{
        position: "absolute", bottom: -80, right: -80, width: 350, height: 350,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(26,35,126,0.4) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* ── Card ───────────────────────────────────────────────────────────── */}
      <Box sx={{
        width: 400, position: "relative", zIndex: 1,
        bgcolor: "white", borderRadius: 4, overflow: "hidden",
        boxShadow: "0 32px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08)",
      }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <Box sx={{
          px: 4, pt: 4, pb: 3.5, textAlign: "center",
          background: "linear-gradient(145deg, #1976d2 0%, #1565c0 100%)",
        }}>
          <Box sx={{
            width: 72, height: 72, borderRadius: 3, mx: "auto", mb: 2.5,
            overflow: "hidden",
            boxShadow: "0 8px 24px rgba(0,0,0,0.3), 0 0 0 3px rgba(255,255,255,0.2)",
          }}>
            <img
              src="/icon_256.png" alt="Cedar ISP"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              onError={e => { e.target.style.display = "none"; }}
            />
          </Box>
          <Typography sx={{ fontWeight: 900, fontSize: 22, color: "white", letterSpacing: "-0.02em", lineHeight: 1 }}>
            Cedar ISP
          </Typography>
          {licOk && licInfo ? (
            <Typography sx={{ color: "rgba(255,255,255,0.75)", fontSize: 12, mt: 0.75 }}>
              ✅ {licInfo.isp_name} · {licInfo.plan} · {licInfo.days_left}d left
            </Typography>
          ) : (
            <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: 13, mt: 0.75 }}>
              {licOk ? "Sign in to continue" : "Enter your license to continue"}
            </Typography>
          )}
        </Box>

        <Box sx={{ px: 4, py: 3.5, display: "flex", flexDirection: "column", gap: 2 }}>

          {/* ── LICENSE FIELDS (only shown if not yet validated) ─────────── */}
          {!licOk && (
            <>
              <Typography variant="caption" fontWeight={700} color="text.secondary"
                sx={{ textTransform: "uppercase", letterSpacing: 1 }}>
                License
              </Typography>

              <TextField
                label="License Username" size="small" fullWidth autoFocus
                value={licUser}
                onChange={e => { setLicUser(e.target.value); setLicError(""); }}
                onKeyDown={e => e.key === "Enter" && submitLicense()}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              />

              <TextField
                label="License Password" size="small" fullWidth
                type={showLicP ? "text" : "password"}
                value={licPass}
                onChange={e => { setLicPass(e.target.value); setLicError(""); }}
                onKeyDown={e => e.key === "Enter" && submitLicense()}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowLicP(p => !p)} tabIndex={-1}>
                        {showLicP ? <VisibilityOffIcon sx={{ fontSize: 18 }} /> : <VisibilityIcon sx={{ fontSize: 18 }} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              {licError && (
                <Box sx={{
                  px: 2, py: 1.5, borderRadius: 2,
                  bgcolor: "rgba(211,47,47,0.06)", border: "1px solid rgba(211,47,47,0.2)",
                }}>
                  <Typography variant="body2" color="error.main" fontWeight={600} textAlign="center" sx={{ mb: 1 }}>
                    {licError}
                  </Typography>
                  <Box component="a" href={SUPPORT_WA} target="_blank" rel="noreferrer" sx={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    gap: 0.75, color: "#25D366", textDecoration: "none", fontSize: 13, fontWeight: 700,
                    "&:hover": { textDecoration: "underline" },
                  }}>
                    <WhatsAppIcon sx={{ fontSize: 17 }} />
                    Contact Support: {SUPPORT_NUMBER}
                  </Box>
                </Box>
              )}

              <Button
                variant="contained" fullWidth disabled={loading}
                onClick={submitLicense}
                sx={{
                  py: 1.3, fontWeight: 800, fontSize: 14, borderRadius: 2,
                  background: "linear-gradient(135deg, #1976d2, #1565c0)",
                  boxShadow: "0 4px 16px rgba(21,101,192,0.4)",
                  "&:hover": { boxShadow: "0 6px 20px rgba(21,101,192,0.5)" },
                }}
              >
                {loading ? <CircularProgress size={20} color="inherit" /> : "Validate License"}
              </Button>

              {/* Support always visible at bottom */}
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.75 }}>
                <WhatsAppIcon sx={{ fontSize: 14, color: "#25D366" }} />
                <Typography variant="caption" sx={{ color: "#25D366", fontWeight: 600 }}>
                  Support: {SUPPORT_NUMBER}
                </Typography>
              </Box>
            </>
          )}

          {/* ── EMPLOYEE LOGIN (shown after license ok) ──────────────────── */}
          {licOk && (
            <>
              {/* Divider only if we came from license fields (not auto-validated) */}
              <Divider sx={{ mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>SIGN IN</Typography>
              </Divider>

              <TextField
                label="Username" fullWidth autoFocus
                value={username}
                onChange={e => { setUsername(e.target.value); setError(""); }}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              />

              <TextField
                label="Password" fullWidth
                type={showPass ? "text" : "password"}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && submitLogin()}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowPass(p => !p)} tabIndex={-1}
                        sx={{ color: "text.disabled" }}>
                        {showPass ? <VisibilityOffIcon sx={{ fontSize: 18 }} /> : <VisibilityIcon sx={{ fontSize: 18 }} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              {error && (
                <Box sx={{
                  px: 2, py: 1.25, borderRadius: 2,
                  bgcolor: "rgba(211,47,47,0.06)", border: "1px solid rgba(211,47,47,0.2)",
                }}>
                  <Typography variant="body2" color="error.main" fontWeight={600} textAlign="center">
                    {error}
                  </Typography>
                </Box>
              )}

              <Button
                variant="contained" fullWidth disabled={loading}
                onClick={submitLogin}
                sx={{
                  py: 1.4, fontWeight: 800, fontSize: 14, borderRadius: 2, mt: 0.5,
                  background: "linear-gradient(135deg, #1976d2, #1565c0)",
                  boxShadow: "0 4px 16px rgba(21,101,192,0.4)",
                  "&:hover": { boxShadow: "0 6px 20px rgba(21,101,192,0.5)" },
                }}
              >
                {loading ? <CircularProgress size={20} color="inherit" /> : "SIGN IN"}
              </Button>

              <Typography variant="caption" textAlign="center"
                sx={{ opacity: 0.35, fontFamily: "monospace", fontSize: 11 }}>
                Default: admin / admin123
              </Typography>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}