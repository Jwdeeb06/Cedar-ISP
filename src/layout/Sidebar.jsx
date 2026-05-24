import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  Box, Button, Collapse, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, Drawer, IconButton, List,
  ListItemButton, ListItemIcon, ListItemText, TextField,
  Tooltip, Typography,
} from "@mui/material";

import DashboardIcon       from "@mui/icons-material/Dashboard";
import GroupIcon           from "@mui/icons-material/Group";
import PaymentsIcon        from "@mui/icons-material/Payments";
import ChevronRightIcon    from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon      from "@mui/icons-material/ExpandMore";
import PrintIcon           from "@mui/icons-material/Print";
import SettingsIcon        from "@mui/icons-material/Settings";
import BusinessIcon        from "@mui/icons-material/Business";
import AddIcon             from "@mui/icons-material/Add";
import RouterIcon          from "@mui/icons-material/Router";
import PointOfSaleIcon     from "@mui/icons-material/PointOfSale";
import MapIcon             from "@mui/icons-material/Map";
import HistoryIcon         from "@mui/icons-material/History";
import ReceiptLongIcon     from "@mui/icons-material/ReceiptLong";
import WhatsAppIcon        from "@mui/icons-material/WhatsApp";
import InventoryIcon       from "@mui/icons-material/Inventory";
import StorefrontIcon      from "@mui/icons-material/Storefront";
import LocalMallIcon       from "@mui/icons-material/LocalMall";
import SellIcon            from "@mui/icons-material/Sell";
import RestartAltIcon      from "@mui/icons-material/RestartAlt";
import LogoutIcon          from "@mui/icons-material/Logout";
import BadgeIcon           from "@mui/icons-material/Badge";
import LockResetIcon       from "@mui/icons-material/LockReset";
import BarChartIcon        from "@mui/icons-material/BarChart";
import PeopleIcon          from "@mui/icons-material/People";
import CardGiftcardIcon    from "@mui/icons-material/CardGiftcard";
import { useAuth }         from "../context/AuthContext";

const ACCENT   = "#1976d2";
const SEL_BG   = "rgba(25,118,210,0.09)";
const HOVER_BG = "rgba(0,0,0,0.04)";

function SectionLabel({ children }) {
  return (
    <Typography sx={{ px:2, pt:1.75, pb:0.5, display:"block", fontWeight:900,
      fontSize:10, letterSpacing:1.3, opacity:0.38, textTransform:"uppercase" }}>
      {children}
    </Typography>
  );
}

function NavItem({ icon, label, to, selected, indent = false }) {
  return (
    <ListItemButton component={Link} to={to} selected={selected} sx={{
      mx:1, mb:0.25, borderRadius:1.5, px:indent?2:1.5, py:0.7,
      borderLeft: selected ? `3px solid ${ACCENT}` : "3px solid transparent",
      bgcolor: selected ? SEL_BG : "transparent",
      "&:hover": { bgcolor: selected ? SEL_BG : HOVER_BG },
      transition:"all 0.12s",
    }}>
      <ListItemIcon sx={{ minWidth:34, color:selected?ACCENT:"grey.500", "& svg":{ fontSize:indent?17:19 } }}>
        {icon}
      </ListItemIcon>
      <ListItemText primary={label} primaryTypographyProps={{
        fontSize: indent?12.5:13.5, fontWeight:selected?800:500,
        color: selected?ACCENT:"text.primary",
      }} />
    </ListItemButton>
  );
}

function RowWithPlus({ icon, label, selected, onClick, onPlus }) {
  return (
    <Box sx={{ mx:1, mb:0.25, borderRadius:1.5, display:"flex", alignItems:"center",
      borderLeft: selected?`3px solid ${ACCENT}`:"3px solid transparent",
      bgcolor: selected?SEL_BG:"transparent",
      "&:hover":{ bgcolor:selected?SEL_BG:HOVER_BG }, transition:"all 0.12s" }}>
      <ListItemButton onClick={onClick} sx={{ borderRadius:1.5, px:1.5, py:0.7, flexGrow:1 }}>
        <ListItemIcon sx={{ minWidth:34, color:selected?ACCENT:"grey.500", "& svg":{ fontSize:19 } }}>
          {icon}
        </ListItemIcon>
        <ListItemText primary={label} primaryTypographyProps={{
          fontSize:13.5, fontWeight:selected?800:500, color:selected?ACCENT:"text.primary" }} />
      </ListItemButton>
      {onPlus && (
        <Tooltip title={`Add ${label}`} placement="right">
          <IconButton size="small" onClick={onPlus} sx={{ mr:0.75, width:24, height:24, opacity:0.4,
            "&:hover":{ opacity:1, bgcolor:"rgba(25,118,210,0.1)", color:ACCENT } }}>
            <AddIcon sx={{ fontSize:16 }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}

function CollapseNav({ icon, label, selected, open, onToggle, children }) {
  return (
    <>
      <ListItemButton onClick={onToggle} sx={{ mx:1, mb:0.25, borderRadius:1.5, px:1.5, py:0.7,
        borderLeft: selected?`3px solid ${ACCENT}`:"3px solid transparent",
        bgcolor: selected?SEL_BG:"transparent",
        "&:hover":{ bgcolor:selected?SEL_BG:HOVER_BG }, transition:"all 0.12s" }}>
        <ListItemIcon sx={{ minWidth:34, color:selected?ACCENT:"grey.500", "& svg":{ fontSize:19 } }}>
          {icon}
        </ListItemIcon>
        <ListItemText primary={label} primaryTypographyProps={{
          fontSize:13.5, fontWeight:selected?800:500, color:selected?ACCENT:"text.primary" }} />
        {open ? <ExpandMoreIcon sx={{ fontSize:17, opacity:0.45 }} /> : <ChevronRightIcon sx={{ fontSize:17, opacity:0.45 }} />}
      </ListItemButton>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <List component="div" disablePadding sx={{ pl:1.5 }}>{children}</List>
      </Collapse>
    </>
  );
}

function NavDivider() {
  return <Divider sx={{ mx:2, my:0.75, opacity:0.3 }} />;
}

export default function Sidebar({ drawerWidth }) {
  const location = useLocation();
  const nav      = useNavigate();
  const p        = location.pathname;
  const is       = (path)   => p === path;
  const sw       = (prefix) => p.startsWith(prefix);

  const isUsersRoute    = useMemo(() => p === "/users" || sw("/users/"), [p]);
  const isPaymentsRoute = useMemo(() => sw("/payments"),                 [p]);
  const isInvoicesRoute = useMemo(() => sw("/invoices"),                 [p]);
  const isSettingsRoute = useMemo(() => sw("/settings"),                 [p]);
  const isServicesRoute = useMemo(() => is("/services"),                 [p]);
  const isDrawerRoute   = useMemo(() => sw("/drawer"),                   [p]);
  const isMapRoute      = useMemo(() => is("/map"),                      [p]);
  const isActivityRoute = useMemo(() => is("/activity"),                 [p]);
  const isWhatsAppRoute = useMemo(() => is("/whatsapp"),                 [p]);
  const isArchiveRoute  = useMemo(() => is("/archive"),                  [p]);
  const isPosRoute      = useMemo(() => p.startsWith("/pos"),            [p]);
  const isPosTerminal   = useMemo(() => p === "/pos",                    [p]);
  const isPosItems      = useMemo(() => is("/pos/items"),                [p]);
  const isPosSales      = useMemo(() => is("/pos/sales"),                [p]);
  const isPosDrawer     = useMemo(() => is("/pos/drawer"),               [p]);
  const isPosDashboard  = useMemo(() => is("/pos/dashboard"),            [p]);
  const isPosCustomers  = useMemo(() => is("/pos/customers"),            [p]);
  const isPosVouchers   = useMemo(() => is("/pos/vouchers"),             [p]);

  const { employee, setEmployee } = useAuth() || {};
  const [changePwOpen, setChangePwOpen] = useState(false);
  const [newPw,        setNewPw]        = useState("");
  const [oldPw,        setOldPw]        = useState("");
  const [pwMsg,        setPwMsg]        = useState("");

  const isAdmin = employee?.role === "admin" || employee?.permissions?.all === true;
  const can = (perm) => {
    if (!employee) return false;
    const perms = employee.permissions || {};
    if (perms.all === true) return true;
    return Boolean(perms[perm]);
  };

  const [invoicesOpen, setInvoicesOpen] = useState(isInvoicesRoute);
  const [drawerOpen,   setDrawerOpen]   = useState(isDrawerRoute);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [posOpen,      setPosOpen]      = useState(isPosRoute);
  const [ispName,      setIspName]      = useState("");
  const [posEnabled,   setPosEnabled]   = useState(true);

  useEffect(() => { if (isInvoicesRoute) setInvoicesOpen(true); }, [isInvoicesRoute]);
  useEffect(() => { if (isDrawerRoute)   setDrawerOpen(true);   }, [isDrawerRoute]);
  useEffect(() => { if (isSettingsRoute) setSettingsOpen(true); }, [isSettingsRoute]);
  useEffect(() => { if (isPosRoute)      setPosOpen(true);      }, [isPosRoute]);

  useEffect(() => {
    window.api.getSettings()
      .then(s => { setIspName(s?.isp_name || ""); setPosEnabled(s?.pos_enabled !== "0"); })
      .catch(() => {});
  }, []);

  return (
    <Drawer variant="permanent" sx={{
      width: drawerWidth, flexShrink: 0,
      [`& .MuiDrawer-paper`]: { width:drawerWidth, bgcolor:"#f8f9fa",
        borderRight:"1px solid rgba(0,0,0,0.07)", display:"flex",
        flexDirection:"column", top:0, height:"100%" },
    }}>

      {/* Header */}
      <Box sx={{ px:2.5, height:64, minHeight:64, flexShrink:0,
        background:`linear-gradient(135deg, ${ACCENT} 0%, #1565c0 100%)`,
        display:"flex", alignItems:"center", gap:1.25,
        WebkitAppRegion:"drag", userSelect:"none" }}>
        <Box onClick={() => window.api.toggleDevTools?.()}
  title="Toggle DevTools"
  sx={{ width:38, height:38, borderRadius:2, overflow:"hidden", flexShrink:0,
    boxShadow:"0 2px 10px rgba(0,0,0,0.3)", WebkitAppRegion:"no-drag",
    cursor:"pointer", transition:"transform 0.15s",
    "&:hover":{ transform:"scale(1.05)" } }}>
          <img src="/icon_256.png" alt="Cedar ISP"
            style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}
            onError={e => { e.target.style.display="none"; }} />
        </Box>
        <Box sx={{ overflow:"hidden", WebkitAppRegion:"no-drag" }}>
          <Typography sx={{ color:"#fff", fontWeight:900, fontSize:15.5, lineHeight:1.2,
            whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
            {ispName || "Cedar ISP"}
          </Typography>
          <Typography sx={{ color:"rgba(255,255,255,0.65)", fontSize:11.5, mt:0.25,
            whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
            {employee?.full_name || "Administrator"}
          </Typography>
        </Box>
      </Box>

      {/* Nav */}
      <Box sx={{ overflowY:"auto", overflowX:"hidden", flexGrow:1, py:0.75 }}>

        {can("dashboard") && <>
          <SectionLabel>Overview</SectionLabel>
          <List disablePadding>
            <NavItem icon={<DashboardIcon />} label="Dashboard" to="/" selected={is("/")} />
          </List>
          <NavDivider />
        </>}

        {(can("payments_view") || can("drawer_view") || can("reports")) && <>
          <SectionLabel>Billing</SectionLabel>
          <List disablePadding>
            {can("payments_view") && (
              <RowWithPlus icon={<PaymentsIcon />} label="Payments"
                selected={isPaymentsRoute} onClick={() => nav("/payments/list")}
                onPlus={can("payments_create") ? () => nav("/payments/create") : null} />
            )}
            {can("drawer_view") && (
              <NavItem icon={<PointOfSaleIcon />} label="Cash Drawer" to="/drawer" selected={isDrawerRoute} />
            )}
            {can("reports") && (
              <CollapseNav icon={<ReceiptLongIcon />} label="Invoices"
                selected={isInvoicesRoute} open={invoicesOpen}
                onToggle={() => setInvoicesOpen(v => !v)}>
                <NavItem icon={<PrintIcon />} label="Print Reports"
                  to="/invoices/print-month" selected={sw("/invoices/print-month")} indent />
              </CollapseNav>
            )}
          </List>
          <NavDivider />
        </>}

        {(can("users_view") || can("whatsapp")) && <>
          <SectionLabel>Subscribers</SectionLabel>
          <List disablePadding>
            {can("users_view") && (
              <RowWithPlus icon={<GroupIcon />} label="Users"
                selected={isUsersRoute} onClick={() => nav("/users/list")}
                onPlus={can("users_add") ? () => nav("/users/create") : null} />
            )}
            {can("whatsapp") && (
              <NavItem icon={<WhatsAppIcon sx={{ color:isWhatsAppRoute?"#25D366":undefined }} />}
                label="Bulk Messaging" to="/whatsapp" selected={isWhatsAppRoute} />
            )}
          </List>
          <NavDivider />
        </>}

        {/* POS — collapsible with all pages */}
        {posEnabled && <>
          <SectionLabel>Point of Sale</SectionLabel>
          <List disablePadding>
            <CollapseNav icon={<StorefrontIcon />} label="POS"
              selected={isPosRoute} open={posOpen}
              onToggle={() => setPosOpen(v => !v)}>
              <NavItem icon={<StorefrontIcon />}  label="Terminal"      to="/pos"            selected={isPosTerminal}  indent />
              <NavItem icon={<SellIcon />}        label="Items & Stock" to="/pos/items"      selected={isPosItems}     indent />
              <NavItem icon={<LocalMallIcon />}   label="Sales"         to="/pos/sales"      selected={isPosSales}     indent />
              <NavItem icon={<PeopleIcon />}      label="Customers"     to="/pos/customers"  selected={isPosCustomers} indent />
              <NavItem icon={<PointOfSaleIcon />} label="POS Drawer"    to="/pos/drawer"     selected={isPosDrawer}    indent />
            </CollapseNav>
          </List>
          <NavDivider />
        </>}

        {(can("services_view") || can("map")) && <>
          <SectionLabel>Network</SectionLabel>
          <List disablePadding>
            {can("services_view") && (
              <NavItem icon={<RouterIcon />} label="Services" to="/services" selected={isServicesRoute} />
            )}
            {can("map") && (
              <NavItem icon={<MapIcon />} label="Map" to="/map" selected={isMapRoute} />
            )}
          </List>
          <NavDivider />
        </>}

        {isAdmin && (
          <CollapseNav icon={<SettingsIcon />} label="System"
            selected={isSettingsRoute || isActivityRoute || isArchiveRoute || is("/employees")}
            open={settingsOpen} onToggle={() => setSettingsOpen(v => !v)}>
            {can("activity") && (
              <NavItem icon={<HistoryIcon />} label="Activity Log" to="/activity" selected={isActivityRoute} indent />
            )}
            {can("archive") && (
              <NavItem icon={<InventoryIcon />} label="Archive" to="/archive" selected={isArchiveRoute} indent />
            )}
            <NavItem icon={<BadgeIcon />} label="Employees" to="/employees" selected={is("/employees")} indent />
            {can("settings") && (
              <NavItem icon={<BusinessIcon />} label="Settings" to="/settings/isp" selected={isSettingsRoute} indent />
            )}
          </CollapseNav>
        )}
      </Box>

      {/* Footer */}
      <Box sx={{ px:1.25, py:1.25, borderTop:"1px solid rgba(0,0,0,0.07)", flexShrink:0 }}>
        <Box sx={{ display:"flex", alignItems:"center", gap:0.75, px:0.75, mb:1 }}>
          <SettingsIcon sx={{ fontSize:11, opacity:0.25 }} />
          <Typography sx={{ fontWeight:700, opacity:0.3, fontSize:10.5, flexGrow:1 }}>
            {ispName || "ISP System"} · v1.0
          </Typography>
        </Box>
        <Box sx={{ display:"flex", alignItems:"center", px:0.75, mb:0.75, gap:1 }}>
          <Typography sx={{ fontSize:11, opacity:0.4, fontWeight:600, flexGrow:1 }}>
            👤 {employee?.full_name} ({employee?.role})
          </Typography>
          <Tooltip title="Change Password" placement="top">
            <IconButton size="small" onClick={() => { setChangePwOpen(true); setPwMsg(""); setNewPw(""); setOldPw(""); }}
              sx={{ opacity:0.4, "&:hover":{ opacity:1 } }}>
              <LockResetIcon sx={{ fontSize:15 }} />
            </IconButton>
          </Tooltip>
        </Box>
        <Box sx={{ display:"flex", gap:0.75 }}>
          <Box onClick={() => window.api.appRestart?.()} sx={{ flex:1, display:"flex", flexDirection:"column",
            alignItems:"center", gap:0.4, py:0.9, borderRadius:1.5, cursor:"pointer",
            bgcolor:"rgba(25,118,210,0.06)", border:"1px solid rgba(25,118,210,0.13)",
            "&:hover":{ bgcolor:"rgba(25,118,210,0.13)", borderColor:ACCENT }, transition:"all 0.12s" }}>
            <RestartAltIcon sx={{ fontSize:18, color:"primary.main" }} />
            <Typography sx={{ fontSize:10, fontWeight:700, color:"primary.main" }}>Restart</Typography>
          </Box>
          <Box onClick={() => setEmployee(null)} sx={{ flex:1, display:"flex", flexDirection:"column",
            alignItems:"center", gap:0.4, py:0.9, borderRadius:1.5, cursor:"pointer",
            bgcolor:"rgba(211,47,47,0.05)", border:"1px solid rgba(211,47,47,0.13)",
            "&:hover":{ bgcolor:"rgba(211,47,47,0.12)", borderColor:"error.main" }, transition:"all 0.12s" }}>
            <LogoutIcon sx={{ fontSize:18, color:"error.main" }} />
            <Typography sx={{ fontSize:10, fontWeight:700, color:"error.main" }}>Logout</Typography>
          </Box>
        </Box>
      </Box>

      {/* Change Password Dialog */}
      <Dialog open={changePwOpen} onClose={() => setChangePwOpen(false)}
        maxWidth="xs" fullWidth PaperProps={{ sx:{ borderRadius:3 } }}>
        <DialogTitle>
          <Typography variant="h6" fontWeight={800}>Change Password</Typography>
          <Typography variant="caption" sx={{ opacity:0.6 }}>{employee?.full_name}</Typography>
        </DialogTitle>
        <Divider />
        <DialogContent>
          <Box sx={{ display:"flex", flexDirection:"column", gap:2, pt:1 }}>
            <TextField size="small" fullWidth label="Current Password" type="password"
              value={oldPw} onChange={e => setOldPw(e.target.value)} />
            <TextField size="small" fullWidth label="New Password" type="password"
              value={newPw} onChange={e => setNewPw(e.target.value)} />
            {pwMsg && <Typography variant="body2" color={pwMsg.startsWith("✅")?"success.main":"error.main"}>{pwMsg}</Typography>}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px:3, pb:2 }}>
          <Button onClick={() => setChangePwOpen(false)}>Cancel</Button>
          <Button variant="contained" sx={{ fontWeight:800 }} onClick={async () => {
            if (!newPw.trim()) return setPwMsg("Enter new password");
            const res = await window.api.changePassword({ id:employee?.id, old_password:oldPw, new_password:newPw });
            if (res?.ok) { setPwMsg("✅ Password changed"); setNewPw(""); setOldPw(""); setTimeout(()=>setChangePwOpen(false),1000); }
            else if (res?.reason === "WRONG_PASSWORD") setPwMsg("Current password is incorrect");
            else setPwMsg("Failed to change password");
          }}>Save</Button>
        </DialogActions>
      </Dialog>
    </Drawer>
  );
}