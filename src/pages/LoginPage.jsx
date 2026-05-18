import { useState } from "react";
import {
  Box, Button, IconButton, InputAdornment,
  TextField, Typography,
} from "@mui/material";
import VisibilityIcon    from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

// ── Inline window control buttons for login screen ────────────────────────────
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

// ── Drag region at top (so user can drag login window) ────────────────────────
function LoginDragRegion() {
  return (
    <Box sx={{
      position: "fixed", top: 0, left: 0, right: 138, height: 40,
      WebkitAppRegion: "drag", zIndex: 9998,
    }} />
  );
}

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const submit = async (e) => {
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

  return (
    <Box sx={{
      width: "100vw", height: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(145deg, #1565c0 0%, #0d47a1 45%, #1a237e 100%)",
      position: "fixed", top: 0, left: 0, overflow: "hidden",
    }}>

      {/* Frameless window controls */}
      <LoginDragRegion />
      <LoginWinControls />

      {/* Subtle background texture */}
      <Box sx={{
        position: "absolute", inset: 0, opacity: 0.04,
        backgroundImage: `repeating-linear-gradient(
          45deg, #fff 0, #fff 1px, transparent 0, transparent 50%
        )`,
        backgroundSize: "18px 18px",
      }} />

      {/* Glow blobs */}
      <Box sx={{
        position: "absolute", top: -120, left: -120,
        width: 400, height: 400, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(100,181,246,0.25) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <Box sx={{
        position: "absolute", bottom: -80, right: -80,
        width: 350, height: 350, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(26,35,126,0.4) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* ── Card ─────────────────────────────────────────────────────────── */}
      <Box
        component="form"
        onSubmit={submit}
        sx={{
          width: 380, position: "relative", zIndex: 1,
          bgcolor: "white", borderRadius: 4,
          overflow: "hidden",
          boxShadow: "0 32px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08)",
        }}
      >
        {/* ── Header ───────────────────────────────────────────────────── */}
        <Box sx={{
          px: 4, pt: 4, pb: 3.5, textAlign: "center",
          background: "linear-gradient(145deg, #1976d2 0%, #1565c0 100%)",
        }}>
          {/* Cedar ISP icon */}
          <Box sx={{
            width: 72, height: 72, borderRadius: 3, mx: "auto", mb: 2.5,
            overflow: "hidden",
            boxShadow: "0 8px 24px rgba(0,0,0,0.3), 0 0 0 3px rgba(255,255,255,0.2)",
          }}>
            <img
              src="/icon_256.png"
              alt="Cedar ISP"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              onError={e => { e.target.style.display = "none"; }}
            />
          </Box>

          <Typography sx={{
            fontWeight: 900, fontSize: 22, color: "white",
            letterSpacing: "-0.02em", lineHeight: 1,
          }}>
            Cedar ISP
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: 13, mt: 0.75 }}>
            Sign in to continue
          </Typography>
        </Box>

        {/* ── Form ─────────────────────────────────────────────────────── */}
        <Box sx={{ px: 4, py: 3.5, display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label="Username"
            value={username}
            onChange={e => { setUsername(e.target.value); setError(""); }}
            fullWidth autoFocus autoComplete="username"
            sx={{
              "& .MuiOutlinedInput-root": { borderRadius: 2 },
            }}
          />

          <TextField
            label="Password"
            type={showPass ? "text" : "password"}
            value={password}
            onChange={e => { setPassword(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && submit()}
            fullWidth autoComplete="current-password"
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowPass(p => !p)} edge="end"
                    tabIndex={-1} sx={{ color: "text.disabled" }}>
                    {showPass ? <VisibilityOffIcon sx={{ fontSize: 18 }} /> : <VisibilityIcon sx={{ fontSize: 18 }} />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {error && (
            <Box sx={{
              px: 2, py: 1.25, borderRadius: 2,
              bgcolor: "rgba(211,47,47,0.06)",
              border: "1px solid rgba(211,47,47,0.2)",
            }}>
              <Typography variant="body2" color="error.main" fontWeight={600} textAlign="center">
                {error}
              </Typography>
            </Box>
          )}

          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading}
            onClick={submit}
            sx={{
              py: 1.4, fontWeight: 800, fontSize: 14,
              borderRadius: 2, mt: 0.5, letterSpacing: 0.5,
              background: "linear-gradient(135deg, #1976d2, #1565c0)",
              boxShadow: "0 4px 16px rgba(21,101,192,0.4)",
              "&:hover": { boxShadow: "0 6px 20px rgba(21,101,192,0.5)" },
            }}
          >
            {loading ? "Signing in…" : "SIGN IN"}
          </Button>

          <Typography variant="caption" textAlign="center"
            sx={{ opacity: 0.35, fontFamily: "monospace", fontSize: 11 }}>
            Default: admin / admin123
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}