// src/pages/Archive/ArchivePage.jsx
import { useCallback, useEffect, useState } from "react";
import {
  Box, Button, Chip, Divider, IconButton, InputAdornment,
  Paper, Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Typography, Tab, Tabs,
} from "@mui/material";
import SearchIcon        from "@mui/icons-material/Search";
import CloseIcon         from "@mui/icons-material/Close";
import RestoreIcon       from "@mui/icons-material/Restore";
import ArchiveIcon       from "@mui/icons-material/Archive";
import PersonIcon        from "@mui/icons-material/Person";
import ReceiptIcon       from "@mui/icons-material/Receipt";
import InfoOutlinedIcon  from "@mui/icons-material/InfoOutlined";
import WarningAmberIcon  from "@mui/icons-material/WarningAmber";
import LockIcon          from "@mui/icons-material/Lock";
import dayjs from "dayjs";
import { bFormat } from "../../utils/dateUtils";
import ConfirmDialog from "../../components/ConfirmDialog";
import { archiveApi }  from "../../services/archiveApi";
const fmt = (n) => (Number(n)||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});

// ── Rules info card ────────────────────────────────────────────────────────
function RulesCard() {
  const rules = [
    { icon:"👤", label:"Users with invoices", rule:"Cannot be deleted — only blocked/suspended. Use Block in the user edit panel.", color:"warning" },
    { icon:"👤", label:"Users without invoices", rule:"Can be archived freely. Restorable at any time.", color:"success" },
    { icon:"🧾", label:"UNPAID invoices", rule:"Can be archived. No financial impact.", color:"success" },
    { icon:"🧾", label:"PAID invoices", rule:"Can be archived — expiry is reversed and drawer OUT is logged automatically.", color:"warning" },
    { icon:"💳", label:"Payment rows", rule:"Never deletable. They are the financial audit trail.", color:"error" },
    { icon:"🏦", label:"Drawer & wallet transactions", rule:"Never deletable. Protected financial ledger.", color:"error" },
  ];
  return (
    <Paper elevation={0} sx={{ p:2.5, mb:2.5, borderRadius:3,
      border:"1px solid", borderColor:"grey.200" }}>
      <Box sx={{ display:"flex", alignItems:"center", gap:1, mb:2 }}>
        <InfoOutlinedIcon sx={{ opacity:0.5, fontSize:20 }} />
        <Typography variant="subtitle2" fontWeight={800}>Deletion Rules</Typography>
      </Box>
      <Box sx={{ display:"flex", flexDirection:"column", gap:1 }}>
        {rules.map((r,i) => (
          <Box key={i} sx={{ display:"flex", alignItems:"flex-start", gap:1.5,
            p:1.25, borderRadius:2,
            bgcolor: r.color==="error" ? "error.50" : r.color==="warning" ? "warning.50" : "success.50",
            border:"1px solid",
            borderColor: r.color==="error" ? "error.200" : r.color==="warning" ? "warning.200" : "success.200",
          }}>
            <Typography sx={{ fontSize:16, flexShrink:0 }}>{r.icon}</Typography>
            <Box>
              <Typography variant="caption" fontWeight={800}
                color={`${r.color}.dark`}>{r.label}</Typography>
              <Typography variant="caption" sx={{ display:"block", opacity:0.75 }}>{r.rule}</Typography>
            </Box>
            {r.color === "error" && (
              <LockIcon sx={{ ml:"auto", fontSize:16, color:"error.main", flexShrink:0, mt:0.25 }} />
            )}
          </Box>
        ))}
      </Box>
    </Paper>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function ArchivePage() {
  const [tab, setTab]               = useState(0);
  const [users, setUsers]           = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [userLoading, setUserLoading] = useState(false);
  const [invoices, setInvoices]     = useState([]);
  const [invSearch, setInvSearch]   = useState("");
  const [invLoading, setInvLoading] = useState(false);
  const [msg, setMsg]               = useState({ text:"", ok:true });
  const [confirm, setConfirm]       = useState({ open:false, title:"", message:"", onConfirm:null });

  const askConfirm = ({ title, message, onConfirm }) =>
    setConfirm({ open:true, title, message, onConfirm });

  useEffect(() => {
    if (!msg.text) return;
    const t = setTimeout(() => setMsg({ text:"", ok:true }), 6000);
    return () => clearTimeout(t);
  }, [msg.text]);

  const loadUsers = useCallback(async () => {
    setUserLoading(true);
    try {
      const data = await archiveApi.listUsers({ search:userSearch, limit:500 });
      setUsers(data || []);
    } finally { setUserLoading(false); }
  }, [userSearch]);

  const loadInvoices = useCallback(async () => {
    setInvLoading(true);
    try {
      const data = await archiveApi.listInvoices({ search:invSearch, limit:500 });
      setInvoices(data || []);
    } finally { setInvLoading(false); }
  }, [invSearch]);

  useEffect(() => { loadUsers();    }, [loadUsers]);
  useEffect(() => { loadInvoices(); }, [loadInvoices]);

  // ── Restore user ──────────────────────────────────────────────────────────
  const restoreUser = (u) => askConfirm({
    title: "Restore User",
    message: `Restore "${u.name}" back to the active user list?\n\nTheir profile, invoices, and history will be accessible again.`,
    onConfirm: async () => {
      const res = await archiveApi.restoreUser(u.id);
      if (res?.ok) {
        setMsg({ text:`✅ User "${u.name}" restored.`, ok:true });
        loadUsers();
      } else {
        setMsg({ text:"Failed to restore user.", ok:false });
      }
    }
  });

  // ── Restore invoice ───────────────────────────────────────────────────────
  const restoreInvoice = (inv) => {
    const wasPaid = inv.status === "PAID";
    askConfirm({
      title: wasPaid ? "⚠️ Restore Paid Invoice" : "Restore Invoice",
      message: wasPaid
        ? `Restore invoice ${inv.invoice_number} for ${inv.user_name}?\n\nThis invoice was PAID ($${fmt(inv.amount)}). Restoring it will make it appear as PAID again, but the drawer IN entry was already reversed when it was deleted.\n\nYou may need to manually check the drawer balance.`
        : `Restore invoice ${inv.invoice_number} for ${inv.user_name}?\n\nIt will reappear as ${inv.status} in the user's invoice list.`,
      onConfirm: async () => {
        const res = await archiveApi.restoreInvoice(inv.id);
        if (res?.ok) {
          setMsg({ text:`✅ Invoice ${inv.invoice_number} restored.`, ok:true });
          loadInvoices();
        } else {
          setMsg({ text:"Failed to restore invoice.", ok:false });
        }
      }
    });
  };

  const hasPaidInvoices = invoices.some(i => i.status === "PAID");

  return (
    <Box sx={{ pb:4 }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <Box sx={{ display:"flex", alignItems:"center", gap:2, mb:3 }}>
        <Box sx={{ width:48, height:48, borderRadius:3,
          background:"linear-gradient(135deg, #424242, #212121)",
          display:"flex", alignItems:"center", justifyContent:"center" }}>
          <ArchiveIcon sx={{ color:"white", fontSize:26 }} />
        </Box>
        <Box>
          <Typography variant="h4" fontWeight={900} sx={{ lineHeight:1.1 }}>Archive</Typography>
          <Typography variant="body2" sx={{ opacity:0.55 }}>
            All soft-deleted records — nothing is permanently lost
          </Typography>
        </Box>
      </Box>

      {/* ── Rules ───────────────────────────────────────────────────────── */}
      <RulesCard />

      {/* ── Message ─────────────────────────────────────────────────────── */}
      {msg.text && (
        <Paper sx={{ p:1.5, mb:2, borderRadius:2,
          bgcolor: msg.ok ? "success.50" : "error.50",
          border:"1px solid", borderColor: msg.ok ? "success.200" : "error.200",
          display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <Typography variant="body2" fontWeight={600}
            color={msg.ok ? "success.dark" : "error.dark"}>{msg.text}</Typography>
          <IconButton size="small" onClick={() => setMsg({ text:"", ok:true })}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Paper>
      )}

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <Paper elevation={0} sx={{ borderRadius:3, border:"1px solid", borderColor:"grey.200", overflow:"hidden" }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}
          sx={{ borderBottom:"1px solid", borderColor:"grey.200", bgcolor:"grey.50", px:1 }}>
          <Tab label={
            <Box sx={{ display:"flex", alignItems:"center", gap:1 }}>
              <PersonIcon sx={{ fontSize:18 }} />
              <span>Users</span>
              {users.length > 0 && (
                <Chip label={users.length} size="small" color="default"
                  sx={{ height:18, fontSize:10, fontWeight:700 }} />
              )}
            </Box>
          } />
          <Tab label={
            <Box sx={{ display:"flex", alignItems:"center", gap:1 }}>
              <ReceiptIcon sx={{ fontSize:18 }} />
              <span>Invoices</span>
              {invoices.length > 0 && (
                <Chip label={invoices.length} size="small"
                  color={hasPaidInvoices ? "warning" : "default"}
                  sx={{ height:18, fontSize:10, fontWeight:700 }} />
              )}
            </Box>
          } />
        </Tabs>

        {/* ── Users tab ───────────────────────────────────────────────────── */}
        {tab === 0 && (
          <Box sx={{ p:2.5 }}>
            <Box sx={{ display:"flex", alignItems:"center", justifyContent:"space-between", mb:2 }}>
              <Box>
                <Typography variant="subtitle1" fontWeight={800}>Archived Users</Typography>
                <Typography variant="caption" sx={{ opacity:0.55 }}>
                  {users.length === 0 ? "No archived users" : `${users.length} user${users.length!==1?"s":""} in archive`}
                </Typography>
              </Box>
              <TextField size="small" placeholder="Search name, mobile…"
                value={userSearch} onChange={e => setUserSearch(e.target.value)}
                sx={{ width:280 }}
                InputProps={{
                  startAdornment:<InputAdornment position="start"><SearchIcon sx={{fontSize:17,opacity:0.4}}/></InputAdornment>,
                  endAdornment: userSearch ? <InputAdornment position="end">
                    <IconButton size="small" onClick={()=>setUserSearch("")}><CloseIcon sx={{fontSize:14}}/></IconButton>
                  </InputAdornment> : null,
                }}
              />
            </Box>

            {users.length === 0 && !userLoading ? (
              <Box sx={{ py:6, textAlign:"center", opacity:0.35 }}>
                <ArchiveIcon sx={{ fontSize:48, mb:1 }} />
                <Typography>No archived users</Typography>
              </Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor:"grey.50" }}>
                    <TableCell sx={{ fontWeight:800 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight:800 }}>Mobile</TableCell>
                    <TableCell sx={{ fontWeight:800 }}>Service</TableCell>
                    <TableCell sx={{ fontWeight:800 }}>Price</TableCell>
                    <TableCell sx={{ fontWeight:800 }}>Archived On</TableCell>
                    <TableCell sx={{ fontWeight:800 }}>Invoices</TableCell>
                    <TableCell sx={{ fontWeight:800 }}>Reason</TableCell>
                    <TableCell sx={{ fontWeight:800 }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {userLoading && (
                    <TableRow><TableCell colSpan={8} sx={{ textAlign:"center", py:4, opacity:0.4 }}>
                      Loading…
                    </TableCell></TableRow>
                  )}
                  {users.map(u => (
                    <TableRow key={u.id} hover sx={{ "&:last-child td":{border:0} }}>
                      <TableCell sx={{ fontWeight:700 }}>{u.name}</TableCell>
                      <TableCell sx={{ fontFamily:"monospace", fontSize:12, opacity:0.7 }}>
                        {u.mobile || "—"}
                      </TableCell>
                      <TableCell sx={{ fontSize:12, opacity:0.7 }}>{u.service_name || "—"}</TableCell>
                      <TableCell sx={{ fontFamily:"monospace", fontWeight:600 }}>
                        {u.price ? `$${fmt(u.price)}` : "—"}
                      </TableCell>
                      <TableCell sx={{ fontSize:11, opacity:0.6 }}>
                        {u.deleted_at ? bFormat(u.deleted_at, "DD/MM/YYYY HH:mm") : "—"}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display:"flex", gap:0.75 }}>
                          {u.active_invoice_count > 0 && (
                            <Chip label={`${u.active_invoice_count} active`} size="small"
                              color="primary" sx={{ fontSize:10, fontWeight:700 }} />
                          )}
                          {u.archived_invoice_count > 0 && (
                            <Chip label={`${u.archived_invoice_count} archived`} size="small"
                              sx={{ fontSize:10, fontWeight:700, bgcolor:"grey.200" }} />
                          )}
                          {!u.active_invoice_count && !u.archived_invoice_count && (
                            <Typography sx={{ opacity:0.35, fontSize:12 }}>none</Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontSize:11, opacity:0.6 }}>
                        {u.delete_reason || "—"}
                      </TableCell>
                      <TableCell>
                        <Button size="small" variant="outlined" color="primary"
                          startIcon={<RestoreIcon />}
                          onClick={() => restoreUser(u)}
                          sx={{ fontWeight:700 }}>
                          Restore
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Box>
        )}

        {/* ── Invoices tab ─────────────────────────────────────────────────── */}
        {tab === 1 && (
          <Box sx={{ p:2.5 }}>
            <Box sx={{ display:"flex", alignItems:"center", justifyContent:"space-between", mb:2 }}>
              <Box>
                <Typography variant="subtitle1" fontWeight={800}>Archived Invoices</Typography>
                <Typography variant="caption" sx={{ opacity:0.55 }}>
                  {invoices.length === 0 ? "No archived invoices" : `${invoices.length} invoice${invoices.length!==1?"s":""} in archive`}
                </Typography>
              </Box>
              <TextField size="small" placeholder="Search user, invoice #, month…"
                value={invSearch} onChange={e => setInvSearch(e.target.value)}
                sx={{ width:320 }}
                InputProps={{
                  startAdornment:<InputAdornment position="start"><SearchIcon sx={{fontSize:17,opacity:0.4}}/></InputAdornment>,
                  endAdornment: invSearch ? <InputAdornment position="end">
                    <IconButton size="small" onClick={()=>setInvSearch("")}><CloseIcon sx={{fontSize:14}}/></IconButton>
                  </InputAdornment> : null,
                }}
              />
            </Box>

            {/* Warning for paid archived invoices */}
            {hasPaidInvoices && (
              <Paper elevation={0} sx={{ p:1.5, mb:2, borderRadius:2,
                bgcolor:"warning.50", border:"1px solid", borderColor:"warning.300",
                display:"flex", gap:1, alignItems:"center" }}>
                <WarningAmberIcon sx={{ color:"warning.dark", fontSize:20, flexShrink:0 }} />
                <Typography variant="caption" color="warning.dark" fontWeight={600}>
                  Some archived invoices were PAID. When they were deleted, expiry was reversed and a drawer OUT was recorded.
                  Restoring them will make them appear as PAID but will NOT re-add the drawer IN entry — check your drawer balance manually.
                </Typography>
              </Paper>
            )}

            {invoices.length === 0 && !invLoading ? (
              <Box sx={{ py:6, textAlign:"center", opacity:0.35 }}>
                <ArchiveIcon sx={{ fontSize:48, mb:1 }} />
                <Typography>No archived invoices</Typography>
              </Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor:"grey.50" }}>
                    <TableCell sx={{ fontWeight:800 }}>Invoice #</TableCell>
                    <TableCell sx={{ fontWeight:800 }}>User</TableCell>
                    <TableCell sx={{ fontWeight:800 }}>Month</TableCell>
                    <TableCell sx={{ fontWeight:800 }}>Amount</TableCell>
                    <TableCell sx={{ fontWeight:800 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight:800 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight:800 }}>Archived On</TableCell>
                    <TableCell sx={{ fontWeight:800 }}>Reason</TableCell>
                    <TableCell sx={{ fontWeight:800 }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invLoading && (
                    <TableRow><TableCell colSpan={9} sx={{ textAlign:"center", py:4, opacity:0.4 }}>
                      Loading…
                    </TableCell></TableRow>
                  )}
                  {invoices.map(inv => (
                    <TableRow key={inv.id} hover sx={{
                      "&:last-child td":{border:0},
                      bgcolor: inv.status==="PAID" ? "warning.50" : "inherit",
                    }}>
                      <TableCell sx={{ fontFamily:"monospace", fontSize:11 }}>
                        {inv.invoice_number}
                      </TableCell>
                      <TableCell sx={{ fontWeight:600 }}>{inv.user_name || "—"}</TableCell>
                      <TableCell sx={{ fontFamily:"monospace", fontSize:12 }}>{inv.month}</TableCell>
                      <TableCell sx={{ fontWeight:700, fontFamily:"monospace" }}>
                        ${fmt(inv.amount)}
                      </TableCell>
                      <TableCell>
                        <Chip label={inv.status} size="small"
                          color={inv.status==="PAID"?"success":inv.status==="PARTIAL"?"warning":"default"}
                          sx={{ fontWeight:700, fontSize:10 }} />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={Number(inv.affects_expiry)===0 ? "STATIC" : "SUB"}
                          size="small"
                          sx={{ fontSize:10, fontWeight:700,
                            bgcolor: Number(inv.affects_expiry)===0 ? "#fff3e0" : "#e3f2fd",
                            color:   Number(inv.affects_expiry)===0 ? "#bf360c" : "#0d47a1" }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize:11, opacity:0.6 }}>
                        {inv.deleted_at ? bFormat(inv.deleted_at, "DD/MM/YYYY HH:mm") : "—"}
                      </TableCell>
                      <TableCell sx={{ fontSize:11, opacity:0.6 }}>
                        {inv.delete_reason || "—"}
                      </TableCell>
                      <TableCell>
                        <Button size="small"
                          variant={inv.status==="PAID" ? "contained" : "outlined"}
                          color={inv.status==="PAID" ? "warning" : "primary"}
                          startIcon={<RestoreIcon />}
                          onClick={() => restoreInvoice(inv)}
                          sx={{ fontWeight:700 }}>
                          Restore
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Box>
        )}
      </Paper>

      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        confirmText="Yes, Restore"
        cancelText="Cancel"
        onCancel={() => setConfirm(c => ({ ...c, open:false }))}
        onConfirm={async () => {
          const fn = confirm.onConfirm;
          setConfirm(c => ({ ...c, open:false, onConfirm:null }));
          if (fn) await fn();
        }}
      />
    </Box>
  );
}