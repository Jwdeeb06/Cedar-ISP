import { useCallback, useEffect, useState } from "react";
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, IconButton, InputAdornment, Paper, Stack, Table, TableBody,
  TableCell, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import AddIcon        from "@mui/icons-material/Add";
import EditIcon       from "@mui/icons-material/Edit";
import SearchIcon     from "@mui/icons-material/Search";
import PersonIcon     from "@mui/icons-material/Person";
import PaymentsIcon   from "@mui/icons-material/Payments";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CloseIcon      from "@mui/icons-material/Close";
import { bFormat } from "../../utils/dateUtils";

const fmt = (n) => (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ll  = (n) => (Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

// ── Add/Edit customer dialog ──────────────────────────────────────────────────
function CustomerDialog({ open, customer, onSave, onClose }) {
  const [form,   setForm]   = useState({ name: "", phone: "", email: "", notes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(customer
      ? { name: customer.name||"", phone: customer.phone||"", email: customer.email||"", notes: customer.notes||"" }
      : { name: "", phone: "", email: "", notes: "" });
  }, [open, customer]);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = customer?.id
        ? await window.api.posUpdateCustomer?.({ id: customer.id, ...form })
        : await window.api.posAddCustomer?.(form);
      if (res?.ok) { onSave(); onClose(); }
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle fontWeight={800}>{customer?.id ? "Edit Customer" : "Add Customer"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField label="Name *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} fullWidth />
          <TextField label="Phone"  value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} fullWidth />
          <TextField label="Email"  value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} fullWidth />
          <TextField label="Notes"  value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} multiline minRows={2} fullWidth />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 2.5, pb: 2.5 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || !form.name.trim()} sx={{ fontWeight: 700 }}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Collect payment dialog ────────────────────────────────────────────────────
function CollectDialog({ invoice, lbpRate, onClose, onCollected }) {
  const [usd,     setUsd]     = useState(String(Number(invoice?.remaining || 0).toFixed(2)));
  const [lbp,     setLbp]     = useState("");
  const [method,  setMethod]  = useState("CASH");
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState("");

  const lbpAsUsd   = lbp && lbpRate > 0 ? Number(lbp) / lbpRate : 0;
  const totalPaying = (Number(usd) || 0) + lbpAsUsd;

  const collect = async () => {
    if (totalPaying <= 0) return setErr("Enter an amount");
    setSaving(true);
    try {
      const res = await window.api.posCollectInvoice?.({
        invoice_id: invoice.id,
        amount_usd: Number(usd) || 0,
        amount_lbp: Number(lbp) || 0,
        lbp_rate:   lbpRate,
        method, actor: "admin",
      });
      if (res?.ok) onCollected(res);
      else setErr(res?.reason || "Failed");
    } finally { setSaving(false); }
  };

  if (!invoice) return null;
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}>
      <Box sx={{ background: "linear-gradient(135deg,#1565c0,#1976d2)", px: 3, py: 2, color: "white",
        display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Box>
          <Typography variant="overline" sx={{ opacity: 0.75, letterSpacing: 1.5, fontSize: 11 }}>COLLECT PAYMENT</Typography>
          <Typography variant="h5" fontWeight={900}>${fmt(invoice.remaining)}</Typography>
          <Typography variant="caption" sx={{ opacity: 0.7, fontFamily: "monospace" }}>{invoice.invoice_number}</Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: "white", opacity: 0.8 }}><CloseIcon fontSize="small" /></IconButton>
      </Box>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: "grey.50", border: "1px solid", borderColor: "grey.200" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
              <Typography fontSize={13} color="text.secondary">Invoice total</Typography>
              <Typography fontWeight={700}>${fmt(invoice.total)}</Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
              <Typography fontSize={13} color="text.secondary">Already paid</Typography>
              <Typography fontWeight={700} color="success.main">${fmt(invoice.paid)}</Typography>
            </Box>
            <Divider sx={{ my: 0.75 }} />
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography fontWeight={800}>Remaining</Typography>
              <Typography fontWeight={900} color="error.main">${fmt(invoice.remaining)}</Typography>
            </Box>
          </Box>

          <TextField label="USD Amount" value={usd} onChange={e => { setUsd(e.target.value); setErr(""); }}
            type="number" fullWidth
            InputProps={{ startAdornment: <Typography sx={{ mr: 0.5, fontWeight: 700, color: "text.secondary" }}>$</Typography> }} />

          <TextField label="L.L Amount" value={lbp} onChange={e => { setLbp(e.target.value); setErr(""); }}
            type="number" fullWidth
            InputProps={{ startAdornment: <Typography sx={{ mr: 0.5, fontWeight: 700, color: "text.secondary" }}>L.L</Typography> }}
            helperText={lbp && lbpRate > 0 ? `L.L${ll(lbp)} = $${fmt(lbpAsUsd)}` : lbpRate > 0 ? `Rate: 1 USD = L.L${ll(lbpRate)}` : "L.L rate not set"} />

          {totalPaying > 0 && (
            <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: totalPaying >= invoice.remaining ? "success.50" : "warning.50",
              border: "1px solid", borderColor: totalPaying >= invoice.remaining ? "success.200" : "warning.200" }}>
              <Typography fontSize={13} fontWeight={700}>
                Collecting: ${fmt(totalPaying)}
                {totalPaying >= invoice.remaining ? " ✅ Full payment" : ` — Remaining: $${fmt(invoice.remaining - totalPaying)}`}
              </Typography>
            </Box>
          )}

          {err && <Typography color="error" fontSize={13} fontWeight={600}>{err}</Typography>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 2.5, pb: 2.5 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" fullWidth onClick={collect} disabled={saving || totalPaying <= 0}
          sx={{ fontWeight: 800, py: 1.25, borderRadius: 2 }}>
          {saving ? "Processing…" : `Collect $${fmt(Math.min(totalPaying, invoice.remaining))}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function PosCustomersPage() {
  const [customers,   setCustomers]   = useState([]);
  const [search,      setSearch]      = useState("");
  const [expanded,    setExpanded]    = useState(null); // customer id with open invoices
  const [invoices,    setInvoices]    = useState({}); // { customerId: [...] }
  const [dialogOpen,  setDialogOpen]  = useState(false);
  const [editTarget,  setEditTarget]  = useState(null);
  const [collectInv,  setCollectInv]  = useState(null);
  const [lbpRate,     setLbpRate]     = useState(0);
  const [msg,         setMsg]         = useState({ text: "", ok: true });

  const load = useCallback(async () => {
    const [data, settings] = await Promise.all([
      window.api.posListCustomers?.({ search }).catch(() => []),
      window.api.getSettings?.().catch(() => ({})),
    ]);
    setCustomers(data || []);
    setLbpRate(Number(settings?.lbp_rate || 0));
  }, [search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!msg.text) return;
    const t = setTimeout(() => setMsg({ text: "", ok: true }), 5000);
    return () => clearTimeout(t);
  }, [msg.text]);

  const loadInvoices = async (customerId) => {
    if (invoices[customerId]) return; // cached
    const data = await window.api.posListInvoices?.({ customer_id: customerId }).catch(() => []);
    setInvoices(prev => ({ ...prev, [customerId]: data || [] }));
  };

  const toggleExpand = async (customerId) => {
    if (expanded === customerId) { setExpanded(null); return; }
    setExpanded(customerId);
    await loadInvoices(customerId);
  };

  const refreshInvoices = async (customerId) => {
    const data = await window.api.posListInvoices?.({ customer_id: customerId }).catch(() => []);
    setInvoices(prev => ({ ...prev, [customerId]: data || [] }));
    await load();
  };

  // Outstanding balance per customer (from invoices)
  const getOutstanding = (customerId) => {
    const list = invoices[customerId] || [];
    return list.filter(i => i.status !== "PAID").reduce((s, i) => s + Number(i.remaining || 0), 0);
  };

  return (
    <Box>
      {/* Header */}
      <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3, border: "1px solid", borderColor: "grey.200",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={900}>Customers</Typography>
          <Typography variant="body2" sx={{ opacity: 0.65 }}>Manage customers, purchase history and pay later invoices</Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
          <TextField size="small" placeholder="Search name or phone…" value={search}
            onChange={e => setSearch(e.target.value)} sx={{ width: 220 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, opacity: 0.4 }} /></InputAdornment> }} />
          <Button variant="contained" startIcon={<AddIcon />}
            onClick={() => { setEditTarget(null); setDialogOpen(true); }} sx={{ fontWeight: 700 }}>
            Add Customer
          </Button>
        </Box>
      </Paper>

      {msg.text && (
        <Box sx={{ mb: 2, px: 2, py: 1, borderRadius: 2, bgcolor: msg.ok ? "success.50" : "error.50" }}>
          <Typography fontSize={13} fontWeight={600} color={msg.ok ? "success.dark" : "error.dark"}>{msg.text}</Typography>
        </Box>
      )}

      {/* Customers table */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "grey.200", overflow: "hidden" }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "grey.50" }}>
              <TableCell sx={{ fontWeight: 800 }}>#</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Phone</TableCell>
              <TableCell sx={{ fontWeight: 800 }} align="right">Visits</TableCell>
              <TableCell sx={{ fontWeight: 800 }} align="right">Total Spent</TableCell>
              <TableCell sx={{ fontWeight: 800 }} align="right">Outstanding</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Last Visit</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {customers.length === 0 ? (
              <TableRow><TableCell colSpan={8} sx={{ textAlign: "center", py: 4, opacity: 0.4 }}>No customers yet</TableCell></TableRow>
            ) : customers.map((c, idx) => (
              <>
                <TableRow key={c.id} hover sx={{ cursor: "pointer", "&:last-child td": { border: expanded === c.id ? "none" : undefined } }}
                  onClick={() => toggleExpand(c.id)}>
                  <TableCell sx={{ opacity: 0.4, fontFamily: "monospace", fontSize: 11 }}>{idx + 1}</TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box sx={{ width: 28, height: 28, borderRadius: "50%", bgcolor: "primary.50",
                        display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <PersonIcon sx={{ fontSize: 16, color: "primary.main" }} />
                      </Box>
                      <Box>
                        <Typography fontWeight={700} fontSize={13}>{c.name}</Typography>
                        {c.email && <Typography fontSize={11} sx={{ opacity: 0.55 }}>{c.email}</Typography>}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{c.phone || "—"}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{c.visit_count || 0}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, fontFamily: "monospace", color: "success.main" }}>
                    ${fmt(c.total_spent)}
                  </TableCell>
                  <TableCell align="right">
                    {expanded === c.id && getOutstanding(c.id) > 0 ? (
                      <Chip label={`$${fmt(getOutstanding(c.id))}`} size="small" color="error" sx={{ fontWeight: 800 }} />
                    ) : (
                      <Typography fontSize={12} sx={{ opacity: 0.4 }}>—</Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ fontSize: 11, opacity: 0.65 }}>
                    {c.last_visit ? bFormat(c.last_visit, "DD/MM/YYYY") : "—"}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", gap: 0.5 }}>
                      <IconButton size="small" onClick={e => { e.stopPropagation(); setEditTarget(c); setDialogOpen(true); }}>
                        <EditIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                      <IconButton size="small" onClick={e => { e.stopPropagation(); toggleExpand(c.id); }}>
                        <ExpandMoreIcon sx={{ fontSize: 16, transform: expanded === c.id ? "rotate(180deg)" : "none", transition: "0.2s" }} />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>

                {/* ── Expanded invoices panel ──────────────────────────── */}
                {expanded === c.id && (
                  <TableRow key={`${c.id}-invoices`}>
                    <TableCell colSpan={8} sx={{ p: 0, bgcolor: "grey.50", borderBottom: "2px solid", borderColor: "grey.200" }}>
                      <Box sx={{ px: 3, py: 2 }}>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                          <Typography fontWeight={800} fontSize={13} color="text.secondary">
                            Pay Later Invoices — {c.name}
                          </Typography>
                        </Box>

                        {!(invoices[c.id]?.length) ? (
                          <Typography fontSize={13} sx={{ opacity: 0.4, py: 1 }}>No pay later invoices</Typography>
                        ) : (
                          <Table size="small" sx={{ bgcolor: "white", borderRadius: 2, overflow: "hidden" }}>
                            <TableHead>
                              <TableRow sx={{ bgcolor: "grey.100" }}>
                                <TableCell sx={{ fontWeight: 800, fontSize: 11 }}>Invoice #</TableCell>
                                <TableCell sx={{ fontWeight: 800, fontSize: 11 }}>Date</TableCell>
                                <TableCell sx={{ fontWeight: 800, fontSize: 11 }} align="right">Total</TableCell>
                                <TableCell sx={{ fontWeight: 800, fontSize: 11 }} align="right">Paid</TableCell>
                                <TableCell sx={{ fontWeight: 800, fontSize: 11 }} align="right">Remaining</TableCell>
                                <TableCell sx={{ fontWeight: 800, fontSize: 11 }}>Status</TableCell>
                                <TableCell />
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {invoices[c.id].map(inv => (
                                <TableRow key={inv.id} sx={{ "&:last-child td": { border: 0 } }}>
                                  <TableCell sx={{ fontFamily: "monospace", fontSize: 11 }}>{inv.invoice_number}</TableCell>
                                  <TableCell sx={{ fontSize: 11 }}>{inv.created_at ? bFormat(inv.created_at, "DD/MM/YYYY") : "—"}</TableCell>
                                  <TableCell align="right" sx={{ fontFamily: "monospace", fontSize: 12 }}>${fmt(inv.total)}</TableCell>
                                  <TableCell align="right" sx={{ fontFamily: "monospace", fontSize: 12, color: "success.main" }}>${fmt(inv.paid)}</TableCell>
                                  <TableCell align="right" sx={{ fontFamily: "monospace", fontWeight: 800, fontSize: 12, color: inv.remaining > 0 ? "error.main" : "success.main" }}>
                                    ${fmt(inv.remaining)}
                                  </TableCell>
                                  <TableCell>
                                    <Chip label={inv.status} size="small"
                                      color={inv.status === "PAID" ? "success" : inv.status === "PARTIAL" ? "warning" : "error"}
                                      sx={{ fontWeight: 700, fontSize: 10 }} />
                                  </TableCell>
                                  <TableCell>
                                    {inv.status !== "PAID" && (
                                      <Button size="small" variant="contained" startIcon={<PaymentsIcon sx={{ fontSize: 14 }} />}
                                        onClick={() => setCollectInv(inv)}
                                        sx={{ fontWeight: 700, fontSize: 11, py: 0.25 }}>
                                        Collect
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <CustomerDialog open={dialogOpen} customer={editTarget} onSave={load} onClose={() => setDialogOpen(false)} />

      {collectInv && (
        <CollectDialog
          invoice={collectInv}
          lbpRate={lbpRate}
          onClose={() => setCollectInv(null)}
          onCollected={async (res) => {
            setCollectInv(null);
            setMsg({ text: `Payment collected — ${res.status === "PAID" ? "Invoice fully paid ✅" : `Remaining: $${fmt(res.remaining)}`}`, ok: true });
            await refreshInvoices(expanded);
          }} />
      )}
    </Box>
  );
}
