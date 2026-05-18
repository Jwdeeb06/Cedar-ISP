// src/components/RequirePermission.jsx
import { Navigate } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import { useAuth } from "../context/AuthContext";

export default function RequirePermission({ permission, children }) {
  const { employee } = useAuth() || {};
  if (!employee) return <Navigate to="/" replace />;

  const perms   = employee.permissions || {};
  const isAdmin = perms.all === true || employee.role === "admin";
  const allowed = isAdmin || Boolean(perms[permission]);

  if (!allowed) {
    return (
      <Box sx={{ display:"flex", flexDirection:"column", alignItems:"center",
        justifyContent:"center", height:"60vh", gap:2, opacity:0.6 }}>
        <LockIcon sx={{ fontSize:56, color:"grey.400" }} />
        <Typography variant="h5" fontWeight={800}>Access Denied</Typography>
        <Typography variant="body2" color="text.secondary">
          You don't have permission to view this page.
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Contact your administrator to request access.
        </Typography>
      </Box>
    );
  }

  return children;
}