// src/pages/Payments/PaymentsCreatePage.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Autocomplete, Box, Button, Chip, Divider, FormControl,
  FormControlLabel, IconButton, InputAdornment, InputLabel,
  MenuItem, Paper, Select, Switch, Table, TableBody,
  TableCell, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import dayjs from "dayjs";
import { bFormat } from "../../utils/dateUtils";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import AddIcon            from "@mui/icons-material/Add";
import DeleteOutlineIcon  from "@mui/icons-material/DeleteOutline";
import ReceiptIcon        from "@mui/icons-material/Receipt";
import PayDialog          from "../../components/payments/PayDialog";
import RefundDialog       from "../../components/payments/RefundDialog";
import PrintInvoiceButton from "../../components/payments/PrintInvoiceButton";
import ConfirmDialog      from "../../components/ConfirmDialog";
import { usersApi }       from "../../services/usersApi";

const fmt = (n) => (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const STATUS_COLOR = { PAID: "success", PARTIAL: "warning", UNPAID: "error" };

export default function PaymentsCreatePage() {
  const [users,        setUsers]        = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [invoices,     setInvoices]     = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [msg,          setMsg]          = useState({ text: "", ok: true });
  const [payMethods,   setPayMethods]   = useState(["CASH"]);

  // create invoice form
  const [createMonth,   setCreateMonth]   = useState(dayjs());
  const [showCreate,    setShowCreate]    = useState(false);
  const [createAmount,  setCreateAmount]  = useState("");
  const [createNote,    setCreateNote]    = useState("");
  const [affectsExpiry, setAffectsExpiry] = useState(false);
  const [payNow,        setPayNow]        = useState(false);
  const [payMethod,     setPayMethod]     = useState("CASH");
  const [creating,      setCreating]      = useState(false);

  // pay dialog
  const [payInvoice, setPayInvoice] = useState(null);

  // refund dialog (replaces old unpay confirm)
  const [refundInvoice, setRefundInvoice] = useState(null);

  // delete confirm (kept for delete action only)
  const [confirm, setConfirm] = useState({ open: false, invoiceId: null, invoiceNum: "", action: "delete" });

  useEffect(() => {
    window.api.getSettings().then(s => {
      try {
        // payment methods handled inside PayDialog
      } catch {}
    }).catch(() => {});
    usersApi.listUsers({ limit: 9999 }).then(d => setUsers(Array.isArray(d) ? d : (d?.rows || [])));
  }, []);

  const loadInvoices = useCallback(async (user) => {
    if (!user) return setInvoices([]);
    setLoading(true);
    try {
      const data = await window.api.listInvoices({ user_id: user.id, status: "ALL" });
      setInvoices(data || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadInvoices(selectedUser); }, [selectedUser, loadInvoices]);

  useEffect(() => {
    if (!msg.text) return;
    const t = setTimeout(() => setMsg({ text: "", ok: true }), 8000);
    return () => clearTimeout(t);
  }, [msg.text]);

  const openPay = async (inv) => {
    const detail = await window.api.getInvoiceDetail(inv.id);
    if (detail) setPayInvoice(detail);
    else setMsg({ text: "Could not load invoice detail.", ok: false });
  };

  // Opens refund dialog with full invoice detail (includes paid_usd/paid_lbp)
  const openUnpay = async (inv) => {
    const detail = await window.api.getInvoiceDetail(inv.id);
    if (detail) setRefundInvoice(detail);
    else setMsg({ text: "Could not load invoice detail.", ok: false });
  };

  // Called by RefundDialog on confirm — receives { refund_usd, refund_lbp, lbp_rate }
  const doUnpay = async ({ refund_usd, refund_lbp, lbp_rate }) => {
    const res = await window.api.setInvoiceStatus({
      id: refundInvoice.id,
      status: "UNPAID",
      refund_usd,
      refund_lbp,
      lbp_rate,
    });
    setRefundInvoice(null);
    if (res?.ok) { setMsg({ text: "Invoice marked as unpaid.", ok: true }); loadInvoices(selectedUser); }
    else setMsg({ text: "Failed to unpay.", ok: false });
  };

  // ── Create invoice ─────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!selectedUser || !createAmount) return;
    const amount = Number(createAmount);
    if (isNaN(amount) || amount < 0) return;

    setCreating(true);
    try {
      const month = (createMonth || dayjs()).format("YYYY-MM");

      // 1. Create invoice
      const res = await window.api.createInvoice({
        user_id:       selectedUser.id,
        month,
        amount,
        status:        "UNPAID",
        affects_expiry: affectsExpiry ? 1 : 0,
        note:          createNote.trim() || null,
      });

      if (!res?.ok && !res?.id && res?.reason !== "ALREADY_EXISTS") {
        setMsg({ text: `Failed to create invoice: ${res?.reason || "Unknown error"}`, ok: false });
        return;
      }

      const invoiceId = res?.id || res?.existingId;

      // 2. Pay immediately if requested
      if (payNow && invoiceId && amount > 0) {
        await window.api.payInvoice({
          invoice_id: invoiceId,
          usd_amount: amount,
          lbp_amount: 0,
          lbp_rate:   0,
          method:     payMethod,
          note:       createNote.trim() || null,
        });
        setMsg({ text: `Invoice created and paid — $${fmt(amount)}.`, ok: true });
      } else {
        setMsg({ text: `Invoice created — $${fmt(amount)} — ${affectsExpiry ? "affects expiry" : "static charge"}.`, ok: true });
      }

      // Reset form
      setCreateAmount(""); setCreateNote("");
      setAffectsExpiry(false); setPayNow(false);
      setShowCreate(false);
      loadInvoices(selectedUser);
    } finally {
      setCreating(false);
    }
  };

  const stats = useMemo(() => {
    const paid    = invoices.filter(r => r.status === "PAID");
    const unpaid  = invoices.filter(r => r.status === "UNPAID");
    const partial = invoices.filter(r => r.status === "PARTIAL");
    const totalAmt = invoices.reduce((a, r) => a + (Number(r.amount) || 0), 0);
    const paidAmt  = paid.reduce((a, r) => a + (Number(r.amount) || 0), 0);
    return { paid: paid.length, unpaid: unpaid.length, partial: partial.length, totalAmt, paidAmt };
  }, [invoices]);

  return (
    <Box>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3, border: "1px solid", borderColor: "grey.200",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={900}>Create Payment</Typography>
          <Typography variant="body2" sx={{ opacity: 0.65 }}>
            Search a user to view invoices, pay, or create a new charge.
          </Typography>
        </Box>
      </Paper>

      {/* ── User search ──────────────────────────────────────────────────── */}
      <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3, border: "1px solid", borderColor: "grey.200" }}>
        <Autocomplete
          options={users}
          value={selectedUser}
          onChange={(_, v) => { setSelectedUser(v); setShowCreate(false); }}
          getOptionKey={u => u.id}
          getOptionLabel={u => u ? `${u.name}${u.mobile ? "  ·  " + u.mobile : ""}${u.service_name ? "  ·  " + u.service_name : ""}` : ""}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          renderInput={params => <TextField {...params} label="Search User" placeholder="Type name, mobile or username…" />}
        />

        {selectedUser && (
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mt: 2, alignItems: "center" }}>
            <Chip label={selectedUser.status}
              color={selectedUser.status === "ACTIVE" ? "success" : selectedUser.status === "SUSPENDED" ? "error" : "default"}
              sx={{ fontWeight: 700 }} />
            {selectedUser.service_name && <Chip label={selectedUser.service_name} variant="outlined" sx={{ fontWeight: 600 }} />}
            {selectedUser.expiry_date  && <Chip label={`Expiry: ${selectedUser.expiry_date}`} variant="outlined" size="small" />}
            <Chip label={`Balance: $${fmt(selectedUser.balance)}`} variant="outlined" size="small" />
            <Chip label={`Price: $${fmt(selectedUser.price)}`} variant="outlined" size="small" />
          </Box>
        )}
      </Paper>

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

      {/* ── Create new invoice panel ─────────────────────────────────────── */}
      {selectedUser && (
        <Paper elevation={0} sx={{
          mb: 2, borderRadius: 3, overflow: "hidden",
          border: "1.5px solid", borderColor: showCreate ? "primary.300" : "grey.200",
        }}>
          {/* Toggle header */}
          <Box
            onClick={() => setShowCreate(p => !p)}
            sx={{
              px: 2.5, py: 1.75, cursor: "pointer",
              bgcolor: showCreate ? "primary.50" : "grey.50",
              borderBottom: showCreate ? "1px solid" : "none",
              borderColor: "primary.200",
              display: "flex", alignItems: "center", gap: 1.5,
              "&:hover": { bgcolor: showCreate ? "primary.50" : "grey.100" },
              transition: "background 0.15s",
            }}
          >
            <AddIcon sx={{ color: showCreate ? "primary.main" : "grey.600", fontSize: 20 }} />
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="subtitle2" fontWeight={800}
                color={showCreate ? "primary.main" : "text.primary"}>
                Create New Invoice
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.55 }}>
                Static charge or subscription — optionally pay immediately
              </Typography>
            </Box>
            <Chip
              label={showCreate ? "Cancel" : "Open"}
              size="small"
              color={showCreate ? "default" : "primary"}
              sx={{ fontWeight: 700 }}
            />
          </Box>

          {showCreate && (
            <Box sx={{ px: 2.5, py: 2.5 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2.5 }}>

                {/* Left: invoice details */}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>

                  {/* Month */}
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker label="Invoice Month" views={["year","month"]} openTo="month"
                      value={createMonth} onChange={v => v && setCreateMonth(v)}
                      slotProps={{ textField: { size: "small", fullWidth: true } }}
                    />
                  </LocalizationProvider>

                  {/* Amount */}
                  <TextField
                    size="small" fullWidth label="Amount *" type="number"
                    value={createAmount} onChange={e => setCreateAmount(e.target.value)}
                    inputProps={{ min: 0, step: 0.5 }}
                    InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                    helperText={selectedUser.price ? `Service price: $${fmt(selectedUser.price)}` : ""}
                  />

                  {/* Note */}
                  <TextField
                    size="small" fullWidth label="Note (optional)" multiline minRows={2}
                    value={createNote} onChange={e => setCreateNote(e.target.value)}
                    placeholder="e.g. First month prorated, Half month, Station on roof…"
                  />

                  {/* Affects expiry toggle */}
                  <Box sx={{
                    p: 1.75, borderRadius: 2,
                    border: "1.5px solid",
                    borderColor: affectsExpiry ? "primary.300" : "grey.300",
                    bgcolor: affectsExpiry ? "primary.50" : "grey.50",
                    transition: "all 0.2s",
                  }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Box>
                        <Typography variant="body2" fontWeight={700}>
                          {affectsExpiry ? "📅 Subscription Invoice" : "🧾 Static Charge"}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.6 }}>
                          {affectsExpiry
                            ? "When paid → extends user expiry by 1 month"
                            : "When paid → does NOT change expiry date"}
                        </Typography>
                      </Box>
                      <Switch
                        checked={affectsExpiry}
                        onChange={e => setAffectsExpiry(e.target.checked)}
                        color="primary"
                      />
                    </Box>
                    {affectsExpiry && selectedUser.expiry_date && (
                      <Box sx={{ mt: 1, pt: 1, borderTop: "1px solid", borderColor: "primary.200" }}>
                        <Typography variant="caption" color="primary.dark">
                          Current expiry: <strong>{selectedUser.expiry_date}</strong>
                          {" → "}After payment: <strong>
                            {dayjs(selectedUser.expiry_date).add(1, "month").format("YYYY-MM-DD")}
                          </strong>
                        </Typography>
                      </Box>
                    )}
                  </Box>

                </Box>

                {/* Right: pay now option */}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>

                  {/* Pay now toggle */}
                  <Box sx={{
                    p: 1.75, borderRadius: 2,
                    border: "1.5px solid",
                    borderColor: payNow ? "#25D366" : "grey.300",
                    bgcolor: payNow ? "#f0fff4" : "grey.50",
                    transition: "all 0.2s",
                  }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Box>
                        <Typography variant="body2" fontWeight={700}>
                          {payNow ? "💰 Pay Immediately" : "Create Unpaid Invoice"}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.6 }}>
                          {payNow
                            ? "Invoice is created and paid in one step"
                            : "Invoice created as UNPAID — pay later"}
                        </Typography>
                      </Box>
                      <Switch
                        checked={payNow}
                        onChange={e => setPayNow(e.target.checked)}
                        sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: "#25D366" },
                          "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: "#25D366" } }}
                      />
                    </Box>
                  </Box>

                  {/* Payment method — only if paying now */}
                  {payNow && (
                    <FormControl size="small" fullWidth>
                      <InputLabel>Payment Method</InputLabel>
                      <Select label="Payment Method" value={payMethod}
                        onChange={e => setPayMethod(e.target.value)}>
                        {payMethods.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                      </Select>
                    </FormControl>
                  )}

                  {/* Summary box */}
                  <Box sx={{
                    p: 2, borderRadius: 2, bgcolor: "white",
                    border: "1px solid", borderColor: "grey.200",
                    flexGrow: 1,
                  }}>
                    <Typography variant="caption" fontWeight={800} sx={{ opacity: 0.5, letterSpacing: 0.5 }}>
                      SUMMARY
                    </Typography>
                    <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 0.75 }}>
                      {[
                        { label: "User",    val: selectedUser.name },
                        { label: "Month",   val: (createMonth || dayjs()).format("MMMM YYYY") },
                        { label: "Amount",  val: createAmount ? `$${fmt(Number(createAmount))}` : "—" },
                        { label: "Type",    val: affectsExpiry ? "Subscription (extends expiry)" : "Static (no expiry change)" },
                        { label: "Status",  val: payNow ? "Will be PAID immediately" : "Will be UNPAID" },
                        payNow ? { label: "Method", val: payMethod } : null,
                      ].filter(Boolean).map(row => (
                        <Box key={row.label} sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                          <Typography variant="caption" sx={{ opacity: 0.55 }}>{row.label}</Typography>
                          <Typography variant="caption" fontWeight={700} sx={{ textAlign: "right" }}>{row.val}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>

                  {/* Create button */}
                  <Button
                    variant="contained"
                    startIcon={<ReceiptIcon />}
                    onClick={handleCreate}
                    disabled={!createAmount || Number(createAmount) < 0 || creating}
                    sx={{ fontWeight: 800, height: 44 }}
                  >
                    {creating ? "Creating…" : payNow ? "Create & Pay Now" : "Create Invoice"}
                  </Button>

                </Box>
              </Box>
            </Box>
          )}
        </Paper>
      )}

      {/* ── Invoices table ───────────────────────────────────────────────── */}
      {selectedUser && (
        <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "grey.200", overflow: "hidden" }}>
          <Box sx={{ px: 2, py: 1.5, bgcolor: "grey.50", borderBottom: "1px solid", borderColor: "grey.200",
            display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
            <Typography variant="subtitle1" fontWeight={800} sx={{ flexGrow: 1 }}>
              Invoices — {selectedUser.name}
            </Typography>
            <Chip label={`${stats.paid} Paid`}      color="success" size="small" sx={{ fontWeight: 700 }} />
            <Chip label={`${stats.partial} Partial`} color="warning" size="small" sx={{ fontWeight: 700 }} />
            <Chip label={`${stats.unpaid} Unpaid`}  color="error"   size="small" sx={{ fontWeight: 700 }} />
            <Divider orientation="vertical" flexItem />
            <Typography variant="body2" fontWeight={700}>
              Paid: <strong>${fmt(stats.paidAmt)}</strong> / ${fmt(stats.totalAmt)}
            </Typography>
          </Box>

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
              {loading ? (
                <TableRow><TableCell colSpan={7} sx={{ textAlign: "center", py: 4, opacity: 0.5 }}>Loading…</TableCell></TableRow>
              ) : invoices.length === 0 ? (
                <TableRow><TableCell colSpan={7} sx={{ textAlign: "center", py: 4, opacity: 0.5 }}>No invoices yet.</TableCell></TableRow>
              ) : invoices.map(inv => (
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
                    <Chip label={inv.status} color={STATUS_COLOR[inv.status] || "default"} size="small" sx={{ fontWeight: 700 }} />
                  </TableCell>
                  <TableCell sx={{ fontSize: 11, opacity: 0.7 }}>
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
                          onClick={() => openUnpay(inv)}
                          sx={{ fontWeight: 700, minWidth: 65 }}>
                          Unpay
                        </Button>
                      )}
                      <PrintInvoiceButton invoice={inv} />
                      <IconButton size="small" color="error"
                        onClick={() => setConfirm({ open: true, invoiceId: inv.id, invoiceNum: inv.invoice_number, action: "delete" })}
                        title="Delete invoice">
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <PayDialog
        open={Boolean(payInvoice)}
        onClose={() => setPayInvoice(null)}
        invoice={payInvoice}
        onPaid={res => {
          setMsg({ text: `Payment recorded. Invoice is now ${res.invoice_status}.`, ok: true });
          setPayInvoice(null);
          loadInvoices(selectedUser);
        }}
      />

      {/* RefundDialog — shown when marking a PAID invoice as UNPAID */}
      <RefundDialog
        open={Boolean(refundInvoice)}
        onClose={() => setRefundInvoice(null)}
        invoice={refundInvoice}
        onConfirm={doUnpay}
      />

      {/* ConfirmDialog — only used for DELETE now */}
      <ConfirmDialog
        open={confirm.open}
        title="Delete Invoice"
        message={`Permanently delete invoice ${confirm.invoiceNum}? This cannot be undone.`}
        confirmText="Yes, Delete"
        cancelText="Cancel"
        onCancel={() => setConfirm({ open: false, invoiceId: null, invoiceNum: "", action: "delete" })}
        onConfirm={async () => {
          const id = confirm.invoiceId;
          setConfirm({ open: false, invoiceId: null, invoiceNum: "", action: "delete" });
          await window.api.deleteInvoice({ id, actor: "admin", reason: "Manual delete" });
          setMsg({ text: "Invoice deleted.", ok: true });
          loadInvoices(selectedUser);
        }}
      />
    </Box>
  );
}