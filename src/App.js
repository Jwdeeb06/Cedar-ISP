import { useEffect, useState } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { useParams, useLocation } from "react-router-dom";
import { Box, CircularProgress, Typography } from "@mui/material";
import { AuthContext } from "./context/AuthContext";
import AppLayout from "./layout/AppLayout";
import LoginPage     from "./pages/LoginPage";
import LicenseGate   from "./pages/LicenseGate";

import Dashboard          from "./pages/Dashboard";
import UsersListPage      from "./pages/Users/UsersListPage";
import UsersAddPage       from "./pages/Users/UsersAddPage";
import PaymentsCreatePage from "./pages/Payments/PaymentsCreatePage";
import PaymentsListPage   from "./pages/Payments/PaymentsListPage";
import InvoicePrint       from "./pages/InvoicesMonthPrint";
import IspSettings        from "./pages/IspSettings";
import ServicesPage       from "./pages/ServicesPage";
import UserInvoicesPage   from "./pages/UserInvoicesPage";
import WalletPage         from "./pages/WalletPage";
import DrawerPage         from "./pages/Drawer/DrawerPage";
import PosPage            from "./pages/Pos/PosPage";
import PosItemsPage       from "./pages/Pos/PosItemsPage";
import PosSalesPage       from "./pages/Pos/PosSalesPage";
import PosDrawerPage      from "./pages/Pos/PosDrawerPage";
import MapPage            from "./pages/Map/NetworkMapPage";
import ActivityPage       from "./pages/ActivityLog/ActivityLogPage";
import WhatsAppPage       from "./pages/WhatsApp/WhatsAppPage";
import ArchivePage        from "./pages/archive/ArchivePage";
import EmployeesPage      from "./pages/Employees/EmployeesPage";
import RequirePermission  from "./components/RequirePermission";
import { setCurrentEmployee } from "./services/activityApi";

// Find the first page the employee has access to
function getHomePage(employee) {
  const perms = employee?.permissions || {};
  const isAdmin = perms.all === true || employee?.role === "admin";
  if (isAdmin)                   return "/";
  if (perms.dashboard)           return "/";
  if (perms.payments_view)       return "/payments/list";
  if (perms.users_view)          return "/users/list";
  if (perms.drawer_view)         return "/drawer";
  if (perms.services_view)       return "/services";
  if (perms.map)                 return "/map";
  if (perms.whatsapp)            return "/whatsapp";
  if (perms.reports)             return "/invoices/print-month";
  if (perms.activity)            return "/activity";
  if (perms.archive)             return "/archive";
  if (perms.settings)            return "/settings/isp";
  return "/no-access";
}

export default function App() {
  const [license,  setLicense]  = useState(null);  // null=checking
  const [employee, setEmployee] = useState(null);
  const [checking, setChecking] = useState(true);

  // On startup — check for cached license
  useEffect(() => {
    (async () => {
      try {
        const cached = await window.api.getCachedLicense?.();
        if (cached?.ok) {
          setLicense(cached);
        } else {
          setLicense(false);
        }
      } catch {
        setLicense(false);
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  // 1. Checking cache — show spinner
  if (checking) {
    return (
      <Box sx={{ width:"100vw", height:"100vh", display:"flex",
        flexDirection:"column", alignItems:"center", justifyContent:"center",
        background:"linear-gradient(135deg, #1a237e, #1565c0)", gap:2 }}>
        <CircularProgress sx={{ color:"white" }} />
        <Typography color="white" fontWeight={600} sx={{ opacity:0.8 }}>Starting…</Typography>
      </Box>
    );
  }

  // 2. No license — show license gate
  if (!license) {
    return <LicenseGate onActivated={(lic) => setLicense(lic)} />;
  }

  // 3. Licensed but no employee — show login
  if (!employee) {
    return <LoginPage onLogin={(emp) => {
      setCurrentEmployee(emp);
      window.api.setActor?.(emp.username);
      setEmployee(emp);
    }} />;
  }

  const homePage = getHomePage(employee);

  return (
    <AuthContext.Provider value={{ employee, setEmployee }}>
      <HashRouter>
        <Routes>
          <Route element={<AppLayout initialHome={homePage} />}>
            <Route index element={<HomeRedirect home={homePage} />} />

            {/* Users */}
            <Route path="users/list"             element={<RequirePermission permission="users_view"><UsersListPage /></RequirePermission>} />
            <Route path="users/create"           element={<RequirePermission permission="users_add"><UsersAddPage /></RequirePermission>} />
            <Route path="users/:userId/invoices" element={<UserInvoicesRoute />} />
            <Route path="users/:userId/wallet"   element={<WalletRoute />} />

            {/* Payments */}
            <Route path="payments/list"          element={<RequirePermission permission="payments_view"><PaymentsListPage /></RequirePermission>} />
            <Route path="payments/create"        element={<RequirePermission permission="payments_create"><PaymentsCreatePage /></RequirePermission>} />

            {/* Services */}
            <Route path="services"               element={<RequirePermission permission="services_view"><ServicesPage /></RequirePermission>} />

            {/* Drawer */}
            <Route path="drawer"                 element={<RequirePermission permission="drawer_view"><DrawerPage /></RequirePermission>} />
            <Route path="drawer/company/:companyId" element={<RequirePermission permission="drawer_view"><DrawerPage /></RequirePermission>} />

            {/* POS */}
            <Route path="pos"                    element={<PosPage />} />
            <Route path="pos/items"              element={<PosItemsPage />} />
            <Route path="pos/sales"              element={<PosSalesPage />} />
            <Route path="pos/drawer"             element={<PosDrawerPage />} />

            {/* Map */}
            <Route path="map"                    element={<RequirePermission permission="map"><MapPage /></RequirePermission>} />

            {/* Activity */}
            <Route path="activity"               element={<RequirePermission permission="activity"><ActivityPage /></RequirePermission>} />

            {/* Reports */}
            <Route path="invoices/print-month"   element={<RequirePermission permission="reports"><InvoicePrint /></RequirePermission>} />

            {/* Settings */}
            <Route path="settings/isp"           element={<RequirePermission permission="settings"><IspSettings /></RequirePermission>} />

            {/* Employees management */}
            <Route path="employees"              element={<EmployeesPage />} />

            {/* WhatsApp */}
            <Route path="whatsapp"               element={<RequirePermission permission="whatsapp"><WhatsAppPage /></RequirePermission>} />

            {/* Archive */}
            <Route path="archive"                element={<RequirePermission permission="archive"><ArchivePage /></RequirePermission>} />

            {/* No access fallback */}
            <Route path="no-access" element={
              <Box sx={{ display:"flex", flexDirection:"column", alignItems:"center",
                justifyContent:"center", height:"60vh", gap:2 }}>
                <Typography variant="h4">🔒</Typography>
                <Typography variant="h5" fontWeight={800}>No Access</Typography>
                <Typography sx={{ opacity:0.6 }}>
                  You don't have permission to access any pages. Contact your administrator.
                </Typography>
              </Box>
            } />

          </Route>
        </Routes>
      </HashRouter>
    </AuthContext.Provider>
  );
}

function UserInvoicesRoute() {
  const { userId } = useParams();
  const { state }  = useLocation();
  return <UserInvoicesPage userId={Number(userId)} userName={state?.userName} />;
}

function WalletRoute() {
  const { userId } = useParams();
  const { state }  = useLocation();
  return <WalletPage userId={Number(userId)} userName={state?.userName} />;
}

function HomeRedirect({ home }) {
  if (home === "/") return <Dashboard />;
  return <Navigate to={home} replace />;
}