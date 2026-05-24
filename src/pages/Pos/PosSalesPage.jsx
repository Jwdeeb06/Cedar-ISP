import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, IconButton, InputAdornment,
  Paper, Table, TableBody, TableCell, TableHead,
  TableRow, TextField, Typography,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import SearchIcon     from "@mui/icons-material/Search";
import ReceiptIcon    from "@mui/icons-material/Receipt";
import UndoIcon       from "@mui/icons-material/Undo";
import PrintIcon      from "@mui/icons-material/Print";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import BarChartIcon   from "@mui/icons-material/BarChart";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import dayjs from "dayjs";
import { bFormat } from "../../utils/dateUtils";

const fmt = (n) => (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ll  = (n) => (Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, onClick, active }) {
  return (
    <Paper elevation={0} onClick={onClick} sx={{
      p: 2, borderRadius: 3, border: "1.5px solid",
      borderColor: active ? `${color}.main` : "grey.200",
      bgcolor: active ? `${color}.50` : "background.paper",
      cursor: onClick ? "pointer" : "default",
      transition: "all 0.15s",
      "&:hover": onClick ? { borderColor: `${color}.main` } : {},
    }}>
      <Typography variant="caption" fontWeight={700} sx={{ opacity: 0.6, textTransform: "uppercase", letterSpacing: 0.5, display: "block" }}>
        {label}
      </Typography>
      <Typography variant="h6" fontWeight={900} color={`${color}.main`} sx={{ mt: 0.25 }}>{value}</Typography>
      {sub && <Typography variant="caption" sx={{ opacity: 0.55 }}>{sub}</Typography>}
    </Paper>
  );
}

// ── Sale detail dialog ────────────────────────────────────────────────────────
function SaleDetailDialog({ saleId, onClose, onRefund }) {
  const [sale,    setSale]    = useState(null);
  const [invoice, setInvoice] = useState(null);

  useEffect(() => {
    if (!saleId) return;
    window.api.posGetSale(saleId).then(s => {
      setSale(s);
      // Load invoice for partial/unpaid
      if (s?.status === "PARTIAL" || s?.status === "UNPAID") {
        window.api.posListInvoices?.({ sale_id: s.id }).then(invs => {
          if (invs?.length) setInvoice(invs[0]);
        }).catch(() => {});
      }
    }).catch(() => {});
  }, [saleId]);

  if (!sale) return null;
  const status = sale.status || "PAID";
  const headerBg = status === "REFUNDED" ? "#c62828"
    : status === "UNPAID"  ? "#e65100"
    : status === "PARTIAL" ? "#1565c0"
    : "#2e7d32";

  return (
    <Dialog open maxWidth="sm" fullWidth onClose={onClose} PaperProps={{ sx: { borderRadius: 3 } }}>
      <Box sx={{ background: `linear-gradient(135deg,${headerBg},${headerBg}dd)`, px: 3, py: 2, color: "white",
        display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Box>
          <Typography variant="overline" sx={{ opacity: 0.7, letterSpacing: 1.5, fontSize: 11 }}>SALE RECEIPT</Typography>
          <Typography variant="h5" fontWeight={900}>${fmt(sale.total)}</Typography>
          <Typography variant="caption" sx={{ opacity: 0.7, fontFamily: "monospace" }}>{sale.sale_number}</Typography>
        </Box>
        <Box sx={{ textAlign: "right" }}>
          <StatusChip status={status} />
          <Typography variant="caption" sx={{ display: "block", opacity: 0.7, mt: 0.5 }}>
            {bFormat(sale.created_at, "DD/MM/YYYY HH:mm")}
          </Typography>
        </Box>
      </Box>

      <DialogContent sx={{ p: 2.5 }}>
        {/* Items */}
        {(sale.items || []).map((li, i) => (
          <Box key={i} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center",
            py: 0.5, borderBottom: "1px solid", borderColor: "grey.100" }}>
            <Box>
              <Typography fontSize={13} fontWeight={700}>{li.item_name}</Typography>
              <Typography fontSize={11} color="text.secondary">${fmt(li.unit_price)} × {li.qty}</Typography>
            </Box>
            <Typography fontSize={14} fontWeight={800}>${fmt(li.line_total)}</Typography>
          </Box>
        ))}

        {/* Totals */}
        <Box sx={{ mt: 1.5 }}>
          {Number(sale.subtotal) !== Number(sale.total) && (
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
              <Typography color="text.secondary" fontSize={13}>Subtotal</Typography>
              <Typography fontSize={13}>${fmt(sale.subtotal)}</Typography>
            </Box>
          )}
          {Number(sale.discount) > 0 && (
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
              <Typography color="text.secondary" fontSize={13}>Discount</Typography>
              <Typography fontSize={13} color="error.main">−${fmt(sale.discount)}</Typography>
            </Box>
          )}
          <Divider sx={{ my: 0.75 }} />
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography fontWeight={900}>Total</Typography>
            <Typography fontWeight={900} color="primary.main" fontSize={16}>${fmt(sale.total)}</Typography>
          </Box>

          {/* Payment breakdown for PARTIAL / UNPAID */}
          {(status === "PARTIAL" || status === "UNPAID") && invoice && (
            <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 2,
              bgcolor: status === "PARTIAL" ? "info.50" : "warning.50",
              border: "1px solid", borderColor: status === "PARTIAL" ? "info.200" : "warning.200" }}>
              <Typography fontWeight={800} fontSize={12} sx={{ mb: 1, textTransform: "uppercase", letterSpacing: 0.5,
                color: status === "PARTIAL" ? "info.dark" : "warning.dark" }}>
                Payment Breakdown
              </Typography>
              {Number(invoice.paid) > 0 && (
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                  <Typography fontSize={13} color="success.main" fontWeight={700}>✅ Amount Paid</Typography>
                  <Typography fontSize={13} fontWeight={800} color="success.main">${fmt(invoice.paid)}</Typography>
                </Box>
              )}
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                <Typography fontSize={13} color="error.main" fontWeight={700}>⏳ Amount Due</Typography>
                <Typography fontSize={13} fontWeight={800} color="error.main">${fmt(invoice.remaining)}</Typography>
              </Box>
              {invoice.created_at && (
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography fontSize={12} color="text.secondary">Invoice created</Typography>
                  <Typography fontSize={12} color="text.secondary">{bFormat(invoice.created_at, "DD/MM/YYYY HH:mm")}</Typography>
                </Box>
              )}
            </Box>
          )}

          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
            <Typography fontSize={12} color="text.secondary">Method</Typography>
            <Chip label={sale.method || "CASH"} size="small" sx={{ fontWeight: 700, fontSize: 11 }} />
          </Box>
          {sale.customer && sale.customer !== "Walk-in" && (
            <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
              <Typography fontSize={12} color="text.secondary">Customer</Typography>
              <Typography fontSize={12} fontWeight={700}>{sale.customer}</Typography>
            </Box>
          )}
          {sale.note && <Typography fontSize={12} sx={{ mt: 1, opacity: 0.6, fontStyle: "italic" }}>{sale.note}</Typography>}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose}>Close</Button>
        <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => {
          const css = "body{font-family:Arial,sans-serif;font-size:12px;width:72mm;margin:0;padding:4mm;}"
            + "h2{text-align:center;font-size:14px;margin:0 0 8px;}"
            + ".line{display:flex;justify-content:space-between;margin:3px 0;}"
            + ".total{font-weight:bold;font-size:14px;border-top:1px dashed #000;padding-top:4px;margin-top:4px;}"
            + ".center{text-align:center;}.num{font-family:monospace;font-size:10px;opacity:.6;}";
          const items = (sale.items || []).map(li =>
            '<div class="line"><span>' + li.item_name + ' x' + li.qty + '</span><span>$' + Number(li.line_total).toFixed(2) + '</span></div>'
          ).join("");
          const disc = sale.discount > 0
            ? '<div class="line"><span>Discount</span><span>-$' + Number(sale.discount).toFixed(2) + '</span></div>' : "";
          const cust = sale.customer && sale.customer !== "Walk-in"
            ? '<div class="line"><span>Customer</span><span>' + sale.customer + '</span></div>' : "";
          const dt = sale.created_at ? new Date(sale.created_at).toLocaleString() : "";
          const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' + css + '</style></head><body>'
            + '<h2>SALE RECEIPT</h2>'
            + '<div class="center num">' + sale.sale_number + '</div>'
            + '<div class="center" style="margin:4px 0;font-size:11px">' + dt + '</div>'
            + '<hr/>' + items + disc
            + '<div class="line total"><span>TOTAL</span><span>$' + Number(sale.total).toFixed(2) + '</span></div>'
            + '<div class="line"><span>Method</span><span>' + (sale.method || "CASH") + '</span></div>'
            + cust
            + '<div class="center" style="margin-top:8px;font-size:11px">Thank you!</div>'
            + '</body></html>';
          window.api.printHtml?.({ html, title: "Receipt — " + sale.sale_number });
        }} sx={{ fontWeight: 700 }}>Print</Button>
        {status === "PAID" && (
          <Button variant="outlined" color="error" startIcon={<UndoIcon />}
            onClick={() => onRefund(sale)} sx={{ fontWeight: 800 }}>Refund</Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ── Refund dialog ─────────────────────────────────────────────────────────────
function RefundDialog({ sale, onConfirm, onClose }) {
  const [reason,  setReason]  = useState("Customer request");
  const [loading, setLoading] = useState(false);
  if (!sale) return null;
  return (
    <Dialog open maxWidth="xs" fullWidth onClose={onClose} PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 900, color: "error.main" }}>Confirm Refund</DialogTitle>
      <DialogContent>
        <Typography sx={{ mb: 2 }}>
          Refund <strong>${fmt(sale.total)}</strong> for <strong>{sale.sale_number}</strong>? Stock will be restored.
        </Typography>
        <TextField label="Reason" value={reason} onChange={e => setReason(e.target.value)} fullWidth />
      </DialogContent>
      <DialogActions sx={{ px: 2.5, pb: 2.5 }}>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button variant="contained" color="error" disabled={loading}
          onClick={async () => { setLoading(true); await onConfirm(sale.id, reason); setLoading(false); }}
          sx={{ fontWeight: 800 }}>{loading ? "Processing…" : "Confirm Refund"}</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Status chip ───────────────────────────────────────────────────────────────
function StatusChip({ status }) {
  const cfg = {
    PAID:     { color: "success", label: "PAID" },
    PARTIAL:  { color: "info",    label: "PARTIAL" },
    UNPAID:   { color: "warning", label: "UNPAID" },
    REFUNDED: { color: "error",   label: "REFUNDED" },
  }[status] || { color: "default", label: status || "PAID" };
  return <Chip label={cfg.label} size="small" color={cfg.color} sx={{ fontWeight: 700, fontSize: 11 }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
export default function PosSalesPage() {
  const [viewDay,    setViewDay]    = useState(dayjs());
  const [viewMonth,  setViewMonth]  = useState(dayjs());
  const [mode,       setMode]       = useState("day");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | PAID | UNPAID | PARTIAL | REFUNDED
  const [sales,      setSales]      = useState([]);
  const [saleInvoices, setSaleInvoices] = useState({}); // sale_id -> invoice
  const [monthlySummary, setMonthlySummary] = useState({});
  const [daySummary,     setDaySummary]     = useState({});
  const [topItems,   setTopItems]   = useState([]);
  const [drawer,     setDrawer]     = useState({});
  const [search,     setSearch]     = useState("");
  const [selSaleId,  setSelSaleId]  = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);
  const [refundSale, setRefundSale] = useState(null);
  const [msg,        setMsg]        = useState({ text: "", ok: true });
  const [loading,    setLoading]    = useState(false);
  const [profitReport, setProfitReport] = useState({ revenue: 0, cost: 0, profit: 0 });

  const dayStr   = viewDay.format("YYYY-MM-DD");
  const monthStr = viewMonth.format("YYYY-MM");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters = mode === "day" ? { day: dayStr } : { month: monthStr };
      const [sl, sm, dm, ti, dr, pr] = await Promise.all([
        window.api.posListSales(filters),
        window.api.posSalesSummary({ month: monthStr }),
        window.api.posSalesSummary(filters),
        window.api.posTopItems({ month: monthStr }),
        window.api.posDrawerSummary(filters),
        window.api.posProfitReport(filters),
      ]);
      const salesData = sl || [];
      // Fetch pos_invoices for partial/unpaid sales and merge into sale objects
      const partialUnpaid = salesData.filter(s => s.status === "PARTIAL" || s.status === "UNPAID");
      if (partialUnpaid.length > 0) {
        try {
          const invData = await window.api.posListInvoices?.({}).catch(() => []);
          const invMap = {};
          (invData || []).forEach(inv => { invMap[inv.sale_id] = inv; });
          setSaleInvoices(invMap);
          salesData.forEach(s => {
            const inv = invMap[s.id];
            if (inv) { s.inv_paid = inv.paid; s.inv_remaining = inv.remaining; s.inv_id = inv.id; }
          });
        } catch {}
      }
      setSales(salesData);
      setMonthlySummary(sm || {});
      setDaySummary(dm || {});
      setTopItems(ti || []);
      setDrawer(dr || {});
      setProfitReport(pr || { revenue: 0, cost: 0, profit: 0 });
    } finally { setLoading(false); }
  }, [mode, dayStr, monthStr]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!msg.text) return;
    const t = setTimeout(() => setMsg({ text: "", ok: true }), 5000);
    return () => clearTimeout(t);
  }, [msg.text]);

  const filtered = useMemo(() => {
    let r = sales;
    if (statusFilter === "COLLECTED") {
      r = r.filter(s => s.status === "PAID" || !s.status || s.status === "PARTIAL");
    } else if (statusFilter === "DUE") {
      r = r.filter(s => s.status === "UNPAID" || s.status === "PARTIAL");
    } else if (statusFilter !== "ALL") {
      r = r.filter(s => (s.status || "PAID") === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(s => s.sale_number?.toLowerCase().includes(q) || (s.customer || "").toLowerCase().includes(q));
    }
    return r;
  }, [sales, statusFilter, search]);

  // compute totals from ALL sales for summary cards
  const paidSales    = useMemo(() => sales.filter(s => s.status === "PAID" || !s.status), [sales]);
  const unpaidSales  = useMemo(() => sales.filter(s => s.status === "UNPAID"), [sales]);
  const partialSales = useMemo(() => sales.filter(s => s.status === "PARTIAL"), [sales]);

  // Collected = PAID totals + partial PAID portions (from invoices)
  const collectedTotal = useMemo(() => {
    const fromPaid    = paidSales.reduce((a, s) => a + Number(s.total || 0), 0);
    const fromPartial = partialSales.reduce((a, s) => a + Number(s.inv_paid || 0), 0);
    return fromPaid + fromPartial;
  }, [paidSales, partialSales]);

  // Due = UNPAID totals + partial REMAINING portions (from invoices)
  const dueTotal = useMemo(() => {
    const fromUnpaid  = unpaidSales.reduce((a, s) => a + Number(s.total || 0), 0);
    const fromPartial = partialSales.reduce((a, s) => a + Number(s.inv_remaining || 0), 0);
    return fromUnpaid + fromPartial;
  }, [unpaidSales, partialSales]);

  const handleRefund = async (saleId, reason) => {
    const res = await window.api.posRefundSale({ sale_id: saleId, reason, actor: "admin" });
    if (res?.ok) {
      setMsg({ text: "Refund processed.", ok: true });
      setRefundSale(null); setSelSaleId(null);
      await load();
    } else {
      setMsg({ text: res?.reason || "Refund failed.", ok: false });
    }
  };

  const activeSummary = mode === "day" ? daySummary : monthlySummary;
  const profitTotal = Number(profitReport?.profit || 0);
  const subtotalForMargin = Number(profitReport?.revenue || 0);

  return (
    <Box sx={{ pb: 3 }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3, border: "1px solid", borderColor: "grey.200",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={900}>Sales & Analytics</Typography>
          <Typography variant="body2" sx={{ opacity: 0.65 }}>Daily sales + monthly performance</Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
          {/* Mode toggle */}
          <Box sx={{ display: "flex", border: "1px solid", borderColor: "grey.300", borderRadius: 2, overflow: "hidden" }}>
            {["day", "month"].map(m => (
              <Button key={m} size="small" onClick={() => setMode(m)}
                variant={mode === m ? "contained" : "text"}
                sx={{ borderRadius: 0, fontWeight: 700, minWidth: 70, fontSize: 12 }}>
                {m === "day" ? "Day" : "Month"}
              </Button>
            ))}
          </Box>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            {mode === "day" ? (
              <DatePicker label="Day" value={viewDay} onChange={v => v && setViewDay(v)}
                slotProps={{ textField: { size: "small", sx: { width: 160 } } }} />
            ) : (
              <DatePicker label="Month" views={["year","month"]} openTo="month"
                value={viewMonth} onChange={v => v && setViewMonth(v)}
                slotProps={{ textField: { size: "small", sx: { width: 160 } } }} />
            )}
          </LocalizationProvider>
          <Button variant="outlined" onClick={load} disabled={loading} sx={{ fontWeight: 700 }}>
            {loading ? "Loading…" : "Refresh"}
          </Button>
          <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => {
            const title = mode === "day" ? "Sales Summary — " + dayStr : "Sales Summary — " + monthStr;
            const css = "body{font-family:Arial,sans-serif;font-size:13px;margin:0;padding:20px;}"
              + "h1{font-size:20px;margin:0 0 4px;}h2{font-size:14px;color:#666;margin:0 0 20px;font-weight:normal;}"
              + ".cards{display:flex;gap:16px;margin-bottom:24px;flex-wrap:wrap;}"
              + ".card{border:1px solid #e0e0e0;border-radius:8px;padding:16px 20px;min-width:140px;}"
              + ".card-label{font-size:11px;font-weight:700;opacity:0.5;text-transform:uppercase;letter-spacing:0.5px;}"
              + ".card-value{font-size:22px;font-weight:900;margin-top:4px;}"
              + "table{width:100%;border-collapse:collapse;}"
              + "th{background:#f5f5f5;padding:8px 12px;text-align:left;font-size:12px;border-bottom:2px solid #e0e0e0;}"
              + "td{padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:12px;}"
              + ".footer{margin-top:16px;padding-top:12px;border-top:2px solid #e0e0e0;display:flex;gap:24px;justify-content:flex-end;}";
            const rows = filtered.map(s =>
              "<tr>"
              + "<td style='font-family:monospace;font-size:11px'>" + s.sale_number + "</td>"
              + "<td>" + (s.created_at ? new Date(s.created_at).toLocaleString() : "") + "</td>"
              + "<td>" + (s.customer_name || s.customer || "Walk-in") + "</td>"
              + "<td>" + (s.method || "CASH") + "</td>"
              + "<td style='font-weight:700;color:" + (s.status === "PAID" ? "#2e7d32" : s.status === "UNPAID" ? "#e65100" : s.status === "PARTIAL" ? "#1565c0" : "#c62828") + "'>" + (s.status || "PAID") + "</td>"
              + "<td style='text-align:right;font-weight:700'>$" + Number(s.total).toFixed(2) + "</td>"
              + "</tr>"
            ).join("");
            const refundsAmt = filtered.filter(s => s.status === "REFUNDED").reduce((a, s) => a + Number(s.total), 0);
            const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' + css + '</style></head><body>'
              + '<h1>Sales Summary</h1>'
              + '<h2>' + (mode === "day" ? dayStr : monthStr) + '</h2>'
              + '<div class="cards">'
              + '<div class="card"><div class="card-label">Total Sales</div><div class="card-value" style="color:#1565c0">' + (activeSummary.sale_count || 0) + '</div></div>'
              + '<div class="card"><div class="card-label">Collected</div><div class="card-value" style="color:#2e7d32">$' + collectedTotal.toFixed(2) + '</div></div>'
              + '<div class="card"><div class="card-label">Due</div><div class="card-value" style="color:#e65100">$' + dueTotal.toFixed(2) + '</div></div>'
              + '<div class="card"><div class="card-label">Est. Profit</div><div class="card-value" style="color:#7b1fa2">$' + profitTotal.toFixed(2) + '</div></div>'
              + '<div class="card"><div class="card-label">Cash USD</div><div class="card-value" style="color:#6d4c41">$' + Number(drawer.total_in_usd || 0).toFixed(2) + '</div></div>'
              + '</div>'
              + '<table><thead><tr><th>Sale #</th><th>Date / Time</th><th>Customer</th><th>Method</th><th>Status</th><th style="text-align:right">Total</th></tr></thead>'
              + '<tbody>' + rows + '</tbody></table>'
              + '<div class="footer">'
              + '<span><b>Collected:</b> $' + collectedTotal.toFixed(2) + '</span>'
              + '<span><b>Due:</b> $' + dueTotal.toFixed(2) + '</span>'
              + '<span><b>Refunds:</b> $' + refundsAmt.toFixed(2) + '</span>'
              + '</div>'
              + '</body></html>';
            window.api.printHtml?.({ html, title });
          }} sx={{ fontWeight: 700 }}>Print Summary</Button>
        </Box>
      </Paper>

      {/* ── Summary cards — clickable filters ───────────────────────────── */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 1.5, mb: 2 }}>
        <StatCard label={mode === "day" ? "Today Sales" : "Month Sales"}
          value={activeSummary.sale_count || 0} sub={`Avg $${fmt(activeSummary.avg_sale)}`}
          color="primary" onClick={() => setStatusFilter("ALL")} active={statusFilter === "ALL"} />
        <StatCard label="Total Collected" value={`$${fmt(collectedTotal)}`}
          sub={`${paidSales.length} paid · ${partialSales.length} partial`}
          color="success" onClick={() => setStatusFilter(statusFilter === "COLLECTED" ? "ALL" : "COLLECTED")} active={statusFilter === "COLLECTED"} />
        <StatCard label="Total Due" value={`$${fmt(dueTotal)}`}
          sub={`${unpaidSales.length} unpaid · ${partialSales.length} partial`}
          color="warning" onClick={() => setStatusFilter(statusFilter === "DUE" ? "ALL" : "DUE")} active={statusFilter === "DUE"} />
        <StatCard label="Cash USD" value={`$${fmt(drawer.total_in_usd)}`} sub={`L.L${ll(drawer.total_in_lbp)}`}
          color="secondary" />
        <StatCard label="Est. Profit" value={`$${fmt(profitTotal)}`}
          sub={`Margin ${subtotalForMargin > 0 ? ((profitTotal/subtotalForMargin)*100).toFixed(1) : 0}%`}
          color="info" />
      </Box>

      <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>

        {/* ── Sales table ─────────────────────────────────────────────── */}
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Box sx={{ mb: 1.5, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <TextField size="small" placeholder="Search sale # or customer…"
              value={search} onChange={e => setSearch(e.target.value)} sx={{ width: 260 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 17, opacity: 0.4 }} /></InputAdornment> }} />
            <Typography variant="caption" sx={{ opacity: 0.5 }}>
              {filtered.length} {mode === "day" ? `sales on ${dayStr}` : `sales in ${monthStr}`}
              {statusFilter !== "ALL" && ` · ${statusFilter === "COLLECTED" ? "PAID + PARTIAL" : statusFilter === "DUE" ? "UNPAID + PARTIAL" : statusFilter}`}
            </Typography>
          </Box>

          {msg.text && (
            <Box sx={{ mb: 1.5, px: 2, py: 0.75, borderRadius: 2, bgcolor: msg.ok ? "success.50" : "error.50" }}>
              <Typography fontSize={13} fontWeight={600} color={msg.ok ? "success.dark" : "error.dark"}>{msg.text}</Typography>
            </Box>
          )}

          <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "grey.200", overflow: "hidden" }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "grey.50" }}>
                  <TableCell sx={{ fontWeight: 800 }}>Sale #</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Date / Time</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Method</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 800 }} align="right">Total</TableCell>
                  <TableCell sx={{ fontWeight: 800 }} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ textAlign: "center", py: 5, opacity: 0.4 }}>
                      {loading ? "Loading…" : `No sales${statusFilter !== "ALL" ? ` with status ${statusFilter}` : ""}`}
                    </TableCell>
                  </TableRow>
                ) : filtered.map(s => {
                  const status = s.status || "PAID";
                  const rowBg = status === "UNPAID" ? "rgba(237,108,2,0.04)"
                    : status === "PARTIAL" ? "rgba(21,101,192,0.04)"
                    : status === "REFUNDED" ? "rgba(211,47,47,0.04)" : "inherit";
                  return (
                    <TableRow key={s.id} hover sx={{ bgcolor: rowBg, "&:last-child td": { border: 0 } }}>
                      <TableCell sx={{ fontFamily: "monospace", fontSize: 11, opacity: 0.7 }}>{s.sale_number}</TableCell>
                      <TableCell sx={{ fontSize: 12, whiteSpace: "nowrap" }}>{bFormat(s.created_at, "DD/MM/YYYY HH:mm")}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{s.customer_name || s.customer || "Walk-in"}</TableCell>
                      <TableCell>
                        <Chip label={s.method || "CASH"} size="small" variant="outlined" sx={{ fontWeight: 700, fontSize: 11 }} />
                      </TableCell>
                      <TableCell><StatusChip status={status} /></TableCell>
                      <TableCell align="right" sx={{ fontWeight: 900, fontFamily: "monospace",
                        color: status === "REFUNDED" ? "error.main" : status === "PAID" ? "success.dark" : "text.primary" }}>
                        ${fmt(s.total)}
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center" }}>
                          <IconButton size="small" onClick={() => setSelSaleId(s.id)}>
                            <ReceiptIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                          {status === "PAID" && (
                            <IconButton size="small" color="error" onClick={() => setRefundSale(s)}>
                              <UndoIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {filtered.length > 0 && (
              <Box sx={{ px: 2, py: 1, bgcolor: "grey.50", borderTop: "1px solid", borderColor: "grey.200",
                display: "flex", justifyContent: "flex-end", gap: 3 }}>
                <Typography fontSize={12} fontWeight={700} color="success.dark">
                  Collected: ${fmt(filtered.filter(s => s.status === "PAID" || !s.status).reduce((a,s) => a + Number(s.total),0) + filtered.filter(s => s.status === "PARTIAL").reduce((a,s) => a + Number(s.inv_paid||0),0))}
                </Typography>
                <Typography fontSize={12} fontWeight={700} color="warning.main">
                  Due: ${fmt(filtered.filter(s => s.status === "UNPAID").reduce((a,s) => a + Number(s.total),0) + filtered.filter(s => s.status === "PARTIAL").reduce((a,s) => a + Number(s.inv_remaining||0),0))}
                </Typography>
                <Typography fontSize={12} fontWeight={700} color="error.main">
                  Refunds: ${fmt(filtered.filter(s => s.status === "REFUNDED").reduce((a,s) => a + Number(s.total),0))}
                </Typography>
              </Box>
            )}
          </Paper>
        </Box>

        {/* ── Top items sidebar ────────────────────────────────────────── */}
        {topItems.length > 0 && (
          <Box sx={{ width: 220, flexShrink: 0 }}>
            <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "grey.200", p: 2, mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                <TrendingUpIcon sx={{ fontSize: 18, color: "primary.main" }} />
                <Typography fontWeight={900} fontSize={14}>Top Items ({monthStr})</Typography>
              </Box>
              {topItems.slice(0, 6).map((it, i) => (
                <Box key={i} sx={{ mb: 1.25 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography fontSize={12} fontWeight={700} noWrap sx={{ maxWidth: 120 }}>{it.item_name}</Typography>
                    <Typography fontSize={12} fontWeight={700} color="primary.main">${fmt(it.total_revenue)}</Typography>
                  </Box>
                  <Typography fontSize={11} color="text.secondary">{Number(it.total_qty)} sold</Typography>
                  <Box sx={{ height: 3, borderRadius: 2, bgcolor: "grey.100", mt: 0.5 }}>
                    <Box sx={{ height: "100%", borderRadius: 2, bgcolor: "primary.main",
                      width: `${Math.min(100, (it.total_revenue / topItems[0].total_revenue) * 100)}%` }} />
                  </Box>
                </Box>
              ))}
            </Paper>
          </Box>
        )}
      </Box>

      {/* Dialogs */}
      {selSaleId && (
        <SaleDetailDialog saleId={selSaleId} onClose={() => setSelSaleId(null)}
          onRefund={(sale) => { setRefundSale(sale); setSelSaleId(null); }} />
      )}
      {refundSale && (
        <RefundDialog sale={refundSale} onConfirm={handleRefund} onClose={() => setRefundSale(null)} />
      )}
    </Box>
  );
}