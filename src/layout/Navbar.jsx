import { useLocation, useNavigate } from "react-router-dom";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

const ROUTE_LABELS = {
  "/": "Dashboard",
  "/users/list": "Users",
  "/users/create": "Add User",
  "/payments/list": "Payments",
  "/payments/create": "New Payment",
  "/services": "Services & Providers",
  "/drawer": "Cash Drawer",
  "/map": "Network Map",
  "/activity": "Activity Log",
  "/invoices/print-month": "Print Reports",
  "/settings/isp": "Settings",
  "/employees": "Employees",
  "/whatsapp": "Bulk Messaging",
  "/archive": "Archive",
  "/pos": "POS Terminal",
  "/pos/items": "Items & Stock",
  "/pos/sales": "Sales History",
  "/pos/drawer": "POS Drawer",
};

function getLabel(path) {
  if (ROUTE_LABELS[path]) return ROUTE_LABELS[path];
  if (path.startsWith("/users/") && path.includes("/wallet")) return "Wallet";
  if (path.startsWith("/users/") && path.includes("/invoices")) return "User Invoices";
  if (path.startsWith("/drawer/company/")) return "Company Drawer";
  return path.replace(/^\//, "").replace(/\//g, " › ").replace(/-/g, " ");
}

export default function Navbar({ drawerWidth, title = "Cedar ISP" }) {
  const location = useLocation();
  const navigate = useNavigate();
  const label = getLabel(location.pathname);

  return (
    <Box
      component="header"
      sx={{
        position: "fixed",
        top: 0,
        left: drawerWidth,
        right: 0,
        height: 63,
        zIndex: 100, // low — below sidepanels and drawers

        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 1.5,
        pr: "180px",

        bgcolor: "#f9fafb",
        WebkitAppRegion: "drag",
        userSelect: "none",
        borderBottom: "none",
        boxShadow: "none",
      }}
    >
      <Box sx={{ display: "flex", gap: 0.25, mr: 0.75, WebkitAppRegion: "no-drag" }}>
        <Tooltip title="Back">
          <IconButton size="small" onClick={() => navigate(-1)}
            sx={{ width: 28, height: 28, borderRadius: 1.5, color: "text.secondary",
              "&:hover": { bgcolor: "rgba(0,0,0,0.06)" } }}>
            <ArrowBackIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Forward">
          <IconButton size="small" onClick={() => navigate(1)}
            sx={{ width: 28, height: 28, borderRadius: 1.5, color: "text.secondary",
              "&:hover": { bgcolor: "rgba(0,0,0,0.06)" } }}>
            <ArrowForwardIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Box>

      <Typography sx={{ fontSize: 15, fontWeight: 800, color: "text.primary", whiteSpace: "nowrap" }}>
        {label}
      </Typography>

      <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: "text.secondary",
        opacity: 0.65, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {title}
      </Typography>
    </Box>
  );
}