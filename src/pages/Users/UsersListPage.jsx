// src/pages/Users/UsersListPage.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box, Button, Chip, Drawer, Divider, IconButton,
  Paper, Table, TableBody, TableCell, TableHead,
  TableRow, Typography,
} from "@mui/material";
import TuneIcon         from "@mui/icons-material/Tune";
import ChevronLeftIcon  from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import FileDownloadIcon from "@mui/icons-material/FileDownload";

import { usersApi } from "../../services/usersApi";
import UsersFilters from "../../components/UsersFilters";
import UserInfoPanel from "../../components/UserInfoPanel";
import ConfirmDialog from "../../components/ConfirmDialog";
import "./Users.css";

function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function UsersListPage() {
  const [rows, setRows] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [companies, setCompanies] = useState([]);

  const [msg, setMsg] = useState("");
  const [toolsOpen, setToolsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const searchDebounced = useDebouncedValue(search, 250);
  const [filterService, setFilterService]   = useState("");
  const [filterAddress, setFilterAddress]   = useState("");
  const [filterStatus,  setFilterStatus]    = useState("");
  const [filterCompany, setFilterCompany]   = useState("");
  const [expiryAfter,   setExpiryAfter]     = useState("");
  const [expiryBefore,  setExpiryBefore]    = useState("");
  const [serviceRefreshKey, setServiceRefreshKey] = useState(0);

  // Pagination
  const [limit,  setLimit]  = useState(50);
  const [offset, setOffset] = useState(0);
  const [totalUsers,    setTotalUsers]    = useState(0);
  const [totalFiltered, setTotalFiltered] = useState(0);

  const topRef = useRef(null);

  const [confirm, setConfirm] = useState({ open: false, title: "", message: "", onConfirm: null });
  const askConfirm = ({ title, message, onConfirm }) =>
    setConfirm({ open: true, title, message, onConfirm });

  const scrollToTop = () => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(""), 10000);
    return () => clearTimeout(t);
  }, [msg]);

  useEffect(() => {
    (async () => setAddresses((await usersApi.listAddresses()) || []))();
  }, []);

  useEffect(() => {
    window.api.listCompanies?.().then(d => setCompanies(d || [])).catch(() => {});
  }, []);

  const refreshTotalUsers = useCallback(async () => {
    try {
      const res = await usersApi.listUsers({ limit: 1, offset: 0 });
      setTotalUsers(res?.total ? Number(res.total) : 0);
    } catch { setTotalUsers(0); }
  }, []);

  useEffect(() => { refreshTotalUsers(); }, [refreshTotalUsers]);

  const limitOptions = useMemo(() => {
    const total = Number(totalUsers || 0);
    if (!total) return [50, 100, 150, 200, 250];
    const arr = [];
    for (let n = 50; n <= total; n += 50) arr.push(n);
    if (arr[arr.length - 1] !== total) arr.push(total);
    if (arr[0] !== 50) arr.unshift(50);
    return arr;
  }, [totalUsers]);

  // Reset offset on filter change
  useEffect(() => { setOffset(0); },
    [searchDebounced, filterService, filterAddress, filterStatus,
     expiryAfter, expiryBefore, filterCompany]);

  useEffect(() => { setOffset(0); }, [limit]);

  useEffect(() => { if (offset > 0) scrollToTop(); }, [offset]);

  const loadUsers = useCallback(async () => {
    const res = await usersApi.listUsers({
      search:        searchDebounced || null,
      service:       filterService   || null,
      address:       filterAddress   || null,
      status:        filterStatus    || null,
      expiry_after:  expiryAfter     || null,
      expiry_before: expiryBefore    || null,
      company_id:    filterCompany   || null,
      limit,
      offset,
    });

    if (res && !Array.isArray(res) && res.rows) {
      setRows(res.rows);
      setTotalFiltered(Number(res.total || 0));
    } else {
      const arr = Array.isArray(res) ? res : [];
      setRows(arr);
      setTotalFiltered(arr.length);
    }
  }, [searchDebounced, filterService, filterAddress, filterStatus,
      expiryAfter, expiryBefore, filterCompany, limit, offset]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const disablePrev = offset === 0;
  const disableNext = useMemo(() =>
    offset + rows.length >= totalFiltered,
    [offset, rows.length, totalFiltered]
  );

  const handleDelete = (u) => {
    askConfirm({
      title: "Delete user",
      message: `Delete user ${u.name}?`,
      onConfirm: async () => {
        const res = await usersApi.deleteUser(u.id);
        if (res?.deleted === 1) {
          setMsg(`User ${u.name} deleted.`);
          await loadUsers();
          await refreshTotalUsers();
          return;
        }
        if (res?.reason === "HAS_INVOICES") {
          setMsg(`Cannot delete. This user has ${res.count} invoice(s).`);
          return;
        }
        setMsg("Delete failed.");
      },
    });
  };

  return (
    <Box ref={topRef}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <Box sx={{ display:"flex", alignItems:"center", justifyContent:"space-between", mb:2, flexWrap:"wrap", gap:1.5 }}>
        <Box>
          <Typography variant="h5" fontWeight={900}>Users</Typography>
          <Typography variant="body2" sx={{ opacity:0.55 }}>Manage your ISP subscribers</Typography>
        </Box>
        <Button variant="contained" startIcon={<TuneIcon />}
          onClick={() => setToolsOpen(true)} sx={{ fontWeight:700 }}>
          Import / Export
        </Button>
      </Box>

      {/* ── Message ─────────────────────────────────────────────────────── */}
      {msg && (
        <Paper sx={{ p:1.5, mb:2, borderRadius:2, display:"flex", alignItems:"center",
          justifyContent:"space-between", bgcolor:"info.50", border:"1px solid", borderColor:"info.200" }}>
          <Typography variant="body2" fontWeight={600}>{msg}</Typography>
          <IconButton size="small" onClick={() => setMsg("")}>
            <ChevronRightIcon sx={{ fontSize:16 }} />
          </IconButton>
        </Paper>
      )}

      {/* ── Sticky filters ──────────────────────────────────────────────── */}
      <Paper elevation={2} sx={{ p:2, mb:2, borderRadius:3, border:"1px solid", borderColor:"grey.200",
        position:"sticky", top:64, zIndex:100, bgcolor:"white" }}>
        <UsersFilters
          search={search}               onSearchChange={setSearch}
          totalCount={totalFiltered}
          limit={limit}                 onLimitChange={setLimit}
          limitOptions={limitOptions}
          service={filterService}       onServiceChange={setFilterService}
          serviceRefreshKey={serviceRefreshKey}
          address={filterAddress}       onAddressChange={setFilterAddress}
          addresses={addresses}
          status={filterStatus}         onStatusChange={setFilterStatus}
          expiryAfter={expiryAfter}     onExpiryAfterChange={setExpiryAfter}
          expiryBefore={expiryBefore}   onExpiryBeforeChange={setExpiryBefore}
          company={filterCompany}       onCompanyChange={setFilterCompany}
          companies={companies}
          rightSlot={
            <Box sx={{ display:"flex", alignItems:"center", gap:0.75 }}>
              <Typography variant="caption" sx={{ opacity:0.45 }}>
                {offset + 1}–{Math.min(offset + rows.length, totalFiltered)} of {totalFiltered}
              </Typography>
              <IconButton size="small" disabled={disablePrev}
                onClick={() => { setOffset(o => Math.max(0, o - limit)); scrollToTop(); }}>
                <ChevronLeftIcon />
              </IconButton>
              <IconButton size="small" disabled={disableNext}
                onClick={() => { setOffset(o => o + limit); scrollToTop(); }}>
                <ChevronRightIcon />
              </IconButton>
            </Box>
          }
        />
      </Paper>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <Paper elevation={0} sx={{ borderRadius:3, border:"1px solid", borderColor:"grey.200", overflow:"hidden" }}>
        <Box sx={{ px:2, py:1.5, bgcolor:"grey.50", borderBottom:"1px solid", borderColor:"grey.200",
          display:"flex", alignItems:"center", gap:2 }}>
          <Typography variant="subtitle1" fontWeight={800} sx={{ flexGrow:1 }}>User List</Typography>
          <Chip label={`${rows.length} shown`} size="small" sx={{ fontWeight:700, bgcolor:"grey.200" }} />
        </Box>

        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor:"grey.50" }}>
              <TableCell sx={{ fontWeight:800, width:50 }}>#</TableCell>
              <TableCell sx={{ fontWeight:800 }}>Name</TableCell>
              <TableCell sx={{ fontWeight:800 }}>Mobile</TableCell>
              <TableCell sx={{ fontWeight:800 }}>Address</TableCell>
              <TableCell sx={{ fontWeight:800 }}>Service</TableCell>
              <TableCell sx={{ fontWeight:800 }}>Price</TableCell>
              <TableCell sx={{ fontWeight:800 }}>Status</TableCell>
              <TableCell sx={{ fontWeight:800 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((u, idx) => (
              <TableRow key={u.id} hover sx={{ "&:last-child td":{ border:0 }, cursor:"default" }}>
                <TableCell sx={{ opacity:0.4, fontSize:11, fontFamily:"monospace" }}>{offset + idx + 1}</TableCell>
                <TableCell sx={{ fontWeight:600, cursor:"pointer", color:"primary.main",
                  "&:hover":{ textDecoration:"underline" } }}
                  onClick={() => { setSelectedUser(u); setPanelOpen(true); }}>
                  {u.name}
                </TableCell>
                <TableCell sx={{ opacity:0.8 }}>{u.mobile || "—"}</TableCell>
                <TableCell sx={{ opacity:0.75, fontSize:12 }}>{u.address || "—"}</TableCell>
                <TableCell>
                  {u.service_name || u.service
                    ? <Chip label={u.service_name || u.service} size="small" variant="outlined"
                        sx={{ fontSize:11, fontWeight:600 }} />
                    : <Typography sx={{ opacity:0.35, fontSize:12 }}>—</Typography>}
                </TableCell>
                <TableCell sx={{ fontWeight:700, fontFamily:"monospace" }}>
                  {(() => {
                    const effective = Number(u.price) || Number(u.service_price) || 0;
                    return effective > 0 ? `$${effective}` : "—";
                  })()}
                </TableCell>
                <TableCell>
                  <Chip label={u.status || "—"} size="small"
                    color={u.status==="ACTIVE"?"success":u.status==="SUSPENDED"?"error":"default"}
                    sx={{ fontWeight:700, fontSize:11 }} />
                </TableCell>
                <TableCell>
                  <Button size="small" color="error" variant="outlined"
                    onClick={() => handleDelete(u)} sx={{ fontWeight:700, minWidth:65 }}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} sx={{ py:6, textAlign:"center", opacity:0.4 }}>
                  No users found matching your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <UserInfoPanel open={panelOpen} onClose={() => setPanelOpen(false)}
          user={selectedUser}
          onSaved={async () => { await loadUsers(); setServiceRefreshKey(k => k + 1); }} />

        <ConfirmDialog open={confirm.open} title={confirm.title} message={confirm.message}
          confirmText="Delete" cancelText="Cancel"
          onCancel={() => setConfirm(c => ({ ...c, open: false }))}
          onConfirm={async () => {
            const fn = confirm.onConfirm;
            setConfirm(c => ({ ...c, open: false, onConfirm: null }));
            if (fn) await fn();
          }} />
      </Paper>

      {/* ── Tools drawer ────────────────────────────────────────────────── */}
      <Drawer anchor="right" open={toolsOpen} onClose={() => setToolsOpen(false)}
        PaperProps={{ sx: { width:340, borderRadius:"16px 0 0 16px" } }}>
        <Box sx={{ p:3, display:"flex", flexDirection:"column", gap:2, height:"100%" }}>
          <Box>
            <Typography variant="h6" fontWeight={900}>Data Tools</Typography>
            <Typography variant="body2" sx={{ opacity:0.55 }}>Import, export and manage user data</Typography>
          </Box>
          <Divider />
          <Typography variant="caption" fontWeight={800} sx={{ opacity:0.5, letterSpacing:1 }}>IMPORT</Typography>
          <Button variant="outlined" sx={{ py:1.5, justifyContent:"flex-start", fontWeight:700 }}
            onClick={async () => {
              const res = await usersApi.downloadTemplate();
              if (res?.ok) setMsg(`Template saved: ${res.filePath}`);
            }}>
            📥 Download Template
          </Button>
          <Button variant="outlined" sx={{ py:1.5, justifyContent:"flex-start", fontWeight:700 }}
            onClick={async () => {
              const res = await usersApi.importUsers();
              if (res?.ok) {
                setMsg(`Imported: ${res.inserted}, Updated: ${res.updated ?? 0}, Skipped: ${res.skipped}`);
                await loadUsers(); await refreshTotalUsers();
                setServiceRefreshKey(k => k + 1);
              }
            }}>
            📤 Import Users from Excel
          </Button>
          <Divider />
          <Typography variant="caption" fontWeight={800} sx={{ opacity:0.5, letterSpacing:1 }}>EXPORT</Typography>
          <Button variant="contained" startIcon={<FileDownloadIcon />}
            sx={{ py:1.5, fontWeight:700 }}
            onClick={async () => {
              const res = await usersApi.exportUsers();
              if (res?.ok) setMsg(`Exported ${res.count} users`);
            }}>
            Export to Excel
          </Button>
          <Box sx={{ flexGrow:1 }} />
          <Button variant="text" onClick={() => setToolsOpen(false)} sx={{ color:"text.secondary" }}>Close</Button>
        </Box>
      </Drawer>
    </Box>
  );
}