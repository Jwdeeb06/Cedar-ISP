// src/pages/UserInvoicesPage.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box, Button, Chip, CircularProgress, Divider, FormControl,
  IconButton, InputAdornment, InputLabel, MenuItem, Paper,
  Select, Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Typography,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import { bFormat } from "../utils/dateUtils";
import CloseIcon       from "@mui/icons-material/Close";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";

import PayDialog            from "../components/payments/PayDialog";
import PrintInvoiceButton from "../components/payments/PrintInvoiceButton";
import ConfirmDialog        from "../components/ConfirmDialog";

const fmt = (n) =>
  Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_COLOR = { PAID: "success", PARTIAL: "warning", UNPAID: "error" };

export default function UserInvoicesPage({ userId, userName }) {
  const [invoices,     setInvoices]     = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [msg,          setMsg]          = useState({ text: "", ok: true });

  // filters
  const [filterMonth,  setFilterMonth]  = useState(null);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [search,       setSearch]       = useState("");

  // pay dialog
  const [payInvoice,   setPayInvoice]   = useState(null);

  // unpay confirm
  const [confirm, setConfirm] = useState({ open: false, invoiceId: null, invoiceNum: "" });

  // ── load ────────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await window.api.listInvoices({
        user_id: userId,
        month:  filterMonth ? filterMonth.format("YYYY-MM") : null,
        status: filterStatus === "ALL" ? null : filterStatus,
        search: search || null,
      });
      setInvoices(data || []);
    } finally {
      setLoading(false);
    }
  }, [userId, filterMonth, filterStatus, search]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!msg.text) return;
    const t = setTimeout(() => setMsg({ text: "", ok: true }), 6000);
    return () => clearTimeout(t);
  }, [msg.text]);

  // ── pay ─────────────────────────────────────────────────────────────────────
  const openPay = async (inv) => {
    const detail = await window.api.getInvoiceDetail(inv.id);
    if (detail) setPayInvoice(detail);
    else setMsg({ text: "Could not load invoice detail.", ok: false });
  };

  // ── unpay ───────────────────────────────────────────────────────────────────
  const doUnpay = async (invoiceId) => {
    const res = await window.api.setInvoiceStatus({ id: invoiceId, status: "UNPAID" });
    if (res?.ok) {
      setMsg({ text: "Invoice marked as unpaid.", ok: true });
      load();
    } else {
      setMsg({ text: "Failed to unpay invoice.", ok: false });
    }
  };

  // ── stats ───────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const paid    = invoices.filter((r) => r.status === "PAID");
    const unpaid  = invoices.filter((r) => r.status === "UNPAID");
    const partial = invoices.filter((r) => r.status === "PARTIAL");
    const sum     = (arr) => arr.reduce((a, r) => a + (Number(r.amount) || 0), 0);
    return {
      totalAmt:     sum(invoices),
      paidAmt:      sum(paid),
      unpaidAmt:    sum(unpaid),
      paidCount:    paid.length,
      unpaidCount:  unpaid.length,
      partialCount: partial.length,
    };
  }, [invoices]);

  const clearFilters = () => { setFilterMonth(null); setFilterStatus("ALL"); setSearch(""); };
  const canClear = Boolean(filterMonth || filterStatus !== "ALL" || search);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3, border: "1px solid", borderColor: "grey.200",
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <ReceiptLongIcon sx={{ opacity: 0.5 }} />
            <Box>
              <Typography variant="h5" fontWeight={900}>
                {userName ? `${userName} — Invoices` : "Invoices"}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.6 }}>
                {invoices.length} invoice(s)
              </Typography>
            </Box>
          </Box>

        </Paper>

        {/* ── Stats ───────────────────────────────────────────────────────── */}
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 1.5, mb: 2 }}>
          {[
            { label: "Total Billed",    val: `$${fmt(stats.totalAmt)}`,  color: "text.primary" },
            { label: "Paid",            val: `$${fmt(stats.paidAmt)}`,   color: "success.main" },
            { label: "Unpaid",          val: `$${fmt(stats.unpaidAmt)}`, color: "error.main" },
            { label: "Paid invoices",   val: stats.paidCount,    color: "success.main" },
            { label: "Unpaid invoices", val: stats.unpaidCount,  color: "error.main" },
            { label: "Partial",         val: stats.partialCount, color: "warning.main" },
          ].map((s) => (
            <Paper key={s.label} elevation={0} sx={{ px: 2, py: 1.5, borderRadius: 2, border: "1px solid", borderColor: "grey.200" }}>
              <Typography variant="caption" sx={{ opacity: 0.6, display: "block" }}>{s.label}</Typography>
              <Typography fontWeight={800} color={s.color}>{s.val}</Typography>
            </Paper>
          ))}
        </Box>

        {/* ── Message ─────────────────────────────────────────────────────── */}
        {msg.text && (
          <Paper elevation={0} sx={{ p: 1.5, mb: 2, borderRadius: 2,
            bgcolor: msg.ok ? "success.50" : "error.50",
            border: "1px solid", borderColor: msg.ok ? "success.200" : "error.200",
            display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="body2" fontWeight={600}>{msg.text}</Typography>
            <IconButton size="small" onClick={() => setMsg({ text: "", ok: true })}>✕</IconButton>
          </Paper>
        )}

        {/* ── Filters ─────────────────────────────────────────────────────── */}
        <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3, border: "1px solid", borderColor: "grey.200" }}>
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
            <DatePicker
              label="Month"
              views={["year", "month"]}
              openTo="month"
              value={filterMonth}
              onChange={(v) => setFilterMonth(v)}
              slotProps={{ textField: { size: "small", sx: { width: 150 } }, actionBar: { actions: ["clear"] } }}
            />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select value={filterStatus} label="Status" onChange={(e) => setFilterStatus(e.target.value)}>
                <MenuItem value="ALL">All</MenuItem>
                <MenuItem value="UNPAID">Unpaid</MenuItem>
                <MenuItem value="PARTIAL">Partial</MenuItem>
                <MenuItem value="PAID">Paid</MenuItem>
              </Select>
            </FormControl>
            <TextField
              size="small" label="Search" value={search}
              onChange={(e) => setSearch(e.target.value)} sx={{ minWidth: 200 }}
              InputProps={{ endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearch("")}><CloseIcon fontSize="small" /></IconButton>
                </InputAdornment>
              ) : null }}
            />
            <Button size="small" variant="outlined" onClick={clearFilters} disabled={!canClear}>Clear</Button>
          </Box>
        </Paper>

        {/* ── Table ───────────────────────────────────────────────────────── */}
        <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "grey.200", overflow: "hidden" }}>
          <Box sx={{ px: 2, py: 1.5, bgcolor: "grey.50", borderBottom: "1px solid", borderColor: "grey.200",
            display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
            <Typography variant="subtitle1" fontWeight={800} sx={{ flexGrow: 1 }}>Invoice List</Typography>
            <Chip label={`${stats.paidCount} Paid`}      color="success" size="small" sx={{ fontWeight: 700 }} />
            <Chip label={`${stats.partialCount} Partial`} color="warning" size="small" sx={{ fontWeight: 700 }} />
            <Chip label={`${stats.unpaidCount} Unpaid`}  color="error"   size="small" sx={{ fontWeight: 700 }} />
            <Divider orientation="vertical" flexItem />
            <Typography variant="body2" fontWeight={700}>
              Paid: <strong>${fmt(stats.paidAmt)}</strong> / ${fmt(stats.totalAmt)}
            </Typography>
          </Box>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>
          ) : invoices.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 6, opacity: 0.5 }}>
              <ReceiptLongIcon sx={{ fontSize: 40, mb: 1 }} />
              <Typography>No invoices found.</Typography>
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "grey.50" }}>
                  <TableCell sx={{ fontWeight: 800 }}>Invoice #</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Month</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Amount</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Paid At</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id} hover sx={{
                    bgcolor: inv.status === "PAID" ? "rgba(46,125,50,0.04)" : "inherit",
                    "&:last-child td": { border: 0 },
                  }}>
                    <TableCell sx={{ fontFamily: "monospace", fontSize: 11 }}>{inv.invoice_number}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{inv.month}</TableCell>
                    <TableCell>
                      <Chip label={Number(inv.affects_expiry) === 0 ? "STATIC" : "SUB"} size="small"
                        sx={{ fontSize: 10, fontWeight: 700,
                          bgcolor: Number(inv.affects_expiry) === 0 ? "#fff3e0" : "#e3f2fd",
                          color:   Number(inv.affects_expiry) === 0 ? "#bf360c" : "#0d47a1" }} />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, fontFamily: "monospace" }}>${fmt(inv.amount)}</TableCell>
                    <TableCell>
                      <Chip label={inv.status} color={STATUS_COLOR[inv.status] || "default"}
                        size="small" sx={{ fontWeight: 700 }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, opacity: 0.7 }}>
                      {inv.paid_at ? bFormat(inv.paid_at, "DD/MM/YYYY HH:mm") : "—"}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        {inv.status !== "PAID" && (
                          <Button size="small" variant="contained" color="success"
                            onClick={() => openPay(inv)} sx={{ fontWeight: 700, minWidth: 55 }}>
                            Pay
                          </Button>
                        )}
                        {inv.status === "PAID" && (
                          <Button size="small" variant="outlined" color="error"
                            onClick={() => setConfirm({ open: true, invoiceId: inv.id, invoiceNum: inv.invoice_number })}
                            sx={{ fontWeight: 700, minWidth: 70 }}>
                            Unpay
                          </Button>
                        )}
                        <PrintInvoiceButton invoice={inv} />
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>

        {/* ── Pay Dialog ──────────────────────────────────────────────────── */}
        <PayDialog
          open={Boolean(payInvoice)}
          onClose={() => setPayInvoice(null)}
          invoice={payInvoice}
          onPaid={(res) => {
            setMsg({ text: `Payment recorded. Invoice is now ${res.invoice_status}.`, ok: true });
            setPayInvoice(null);
            load();
          }}
        />

        {/* ── Unpay Confirm ───────────────────────────────────────────────── */}
        <ConfirmDialog
          open={confirm.open}
          title="Mark as Unpaid"
          message={`Mark invoice ${confirm.invoiceNum} as UNPAID? This will reverse the payment and affect the user's status.`}
          confirmText="Yes, Unpay"
          cancelText="Cancel"
          onCancel={() => setConfirm({ open: false, invoiceId: null, invoiceNum: "" })}
          onConfirm={async () => {
            const id = confirm.invoiceId;
            setConfirm({ open: false, invoiceId: null, invoiceNum: "" });
            await doUnpay(id);
          }}
        />

      </Box>
    </LocalizationProvider>
  );
}