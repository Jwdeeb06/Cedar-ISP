import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, FormControl, IconButton, InputAdornment,
  InputLabel, MenuItem, Paper, Select, Table, TableBody,
  TableCell, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import SearchIcon     from "@mui/icons-material/Search";
import ReceiptIcon    from "@mui/icons-material/Receipt";
import UndoIcon       from "@mui/icons-material/Undo";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import dayjs from "dayjs";
import { bFormat } from "../../utils/dateUtils";

const fmt = (n) => (Number(n) || 0).toLocaleString(undefined, {
  minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Sale detail dialog ────────────────────────────────────────────────────────
function SaleDetailDialog({ saleId, onClose, onRefund }) {
  const [sale, setSale] = useState(null);

  useEffect(() => {
    if (!saleId) return;
    window.api.posGetSale(saleId).then(setSale).catch(() => {});
  }, [saleId]);

  if (!sale) return null;

  return (
    <Dialog open maxWidth="sm" fullWidth onClose={onClose}
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <Box sx={{ background: "linear-gradient(135deg,#1565c0,#1976d2)", px: 3, py: 2, color: "white",
        display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Box>
          <Typography variant="overline" sx={{ opacity: 0.7, letterSpacing: 1.5, fontSize: 11 }}>
            SALE RECEIPT
          </Typography>
          <Typography variant="h5" fontWeight={900}>${fmt(sale.total)}</Typography>
          <Typography variant="caption" sx={{ opacity: 0.7, fontFamily: "monospace" }}>
            {sale.sale_number}
          </Typography>
        </Box>
        <Box sx={{ textAlign: "right" }}>
          <Chip label={sale.status || "PAID"}
            size="small"
            sx={{ fontWeight: 800, fontSize: 11,
              bgcolor: sale.status === "REFUNDED" ? "#ef5350" : "#4caf50",
              color: "white" }} />
          <Typography variant="caption" sx={{ display: "block", opacity: 0.7, mt: 0.5 }}>
            {bFormat(sale.created_at, "DD/MM/YYYY HH:mm")}
          </Typography>
        </Box>
      </Box>

      <DialogContent sx={{ p: 2.5 }}>
        {(sale.items || []).map((li, i) => (
          <Box key={i} sx={{ display: "flex", justifyContent: "space-between",
            alignItems: "center", py: 0.5, borderBottom: "1px solid", borderColor: "grey.100" }}>
            <Box>
              <Typography fontSize={13} fontWeight={700}>{li.item_name}</Typography>
              <Typography fontSize={11} color="text.secondary">
                ${fmt(li.unit_price)} × {li.qty}
              </Typography>
            </Box>
            <Typography fontSize={14} fontWeight={800}>${fmt(li.line_total)}</Typography>
          </Box>
        ))}

        <Box sx={{ mt: 1.5 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
            <Typography color="text.secondary" fontSize={13}>Subtotal</Typography>
            <Typography fontSize={13}>${fmt(sale.subtotal)}</Typography>
          </Box>
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
          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
            <Typography fontSize={12} color="text.secondary">Method</Typography>
            <Chip label={sale.method || "CASH"} size="small" sx={{ fontWeight: 700, fontSize: 11 }} />
          </Box>
          {sale.note && (
            <Typography fontSize={12} sx={{ mt: 1, opacity: 0.6, fontStyle: "italic" }}>
              {sale.note}
            </Typography>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose}>Close</Button>
        {sale.status !== "REFUNDED" && (
          <Button variant="outlined" color="error" startIcon={<UndoIcon />}
            onClick={() => onRefund(sale)} sx={{ fontWeight: 800 }}>
            Refund
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ── Refund confirm dialog ─────────────────────────────────────────────────────
function RefundDialog({ sale, onConfirm, onClose }) {
  const [reason, setReason] = useState("Customer request");
  const [loading, setLoading] = useState(false);

  if (!sale) return null;
  return (
    <Dialog open maxWidth="xs" fullWidth onClose={onClose}
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 900, color: "error.main" }}>
        Confirm Refund
      </DialogTitle>
      <DialogContent>
        <Typography sx={{ mb: 2 }}>
          Refund <strong>${fmt(sale.total)}</strong> for sale <strong>{sale.sale_number}</strong>?
          Stock will be restored.
        </Typography>
        <TextField label="Reason" value={reason}
          onChange={e => setReason(e.target.value)} fullWidth />
      </DialogContent>
      <DialogActions sx={{ px: 2.5, pb: 2.5 }}>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button variant="contained" color="error" disabled={loading}
          onClick={async () => {
            setLoading(true);
            await onConfirm(sale.id, reason);
            setLoading(false);
          }}
          sx={{ fontWeight: 800 }}>
          {loading ? "Processing…" : "Confirm Refund"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function PosSalesPage() {
  const [sales,      setSales]      = useState([]);
  const [summary,    setSummary]    = useState({});
  const [topItems,   setTopItems]   = useState([]);
  const [viewMonth,  setViewMonth]  = useState(dayjs());
  const [search,     setSearch]     = useState("");
  const [selSaleId,  setSelSaleId]  = useState(null);
  const [refundSale, setRefundSale] = useState(null);
  const [msg,        setMsg]        = useState({ text: "", ok: true });

  const monthStr = viewMonth ? viewMonth.format("YYYY-MM") : "";

  const load = useCallback(async () => {
    const [sl, sm, ti] = await Promise.all([
      window.api.posListSales({ month: monthStr }),
      window.api.posSalesSummary({ month: monthStr }),
      window.api.posTopItems({ month: monthStr }),
    ]);
    setSales(sl || []);
    setSummary(sm || {});
    setTopItems(ti || []);
  }, [monthStr]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!msg.text) return;
    const t = setTimeout(() => setMsg({ text: "", ok: true }), 5000);
    return () => clearTimeout(t);
  }, [msg.text]);

  const filtered = useMemo(() => {
    if (!search.trim()) return sales;
    const q = search.toLowerCase();
    return sales.filter(s =>
      s.sale_number?.toLowerCase().includes(q) ||
      String(s.total).includes(q)
    );
  }, [sales, search]);

  const handleRefund = async (saleId, reason) => {
    const res = await window.api.posRefundSale({
      sale_id: saleId, reason, actor: "admin",
    });
    if (res?.ok) {
      setMsg({ text: "Refund processed successfully.", ok: true });
      setRefundSale(null);
      setSelSaleId(null);
      await load();
    } else {
      setMsg({ text: res?.reason || "Refund failed.", ok: false });
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5" fontWeight={900}>Sales History</Typography>
          <Typography variant="body2" sx={{ opacity: 0.6 }}>All POS transactions</Typography>
        </Box>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker label="Month" views={["year","month"]} openTo="month"
            value={viewMonth} onChange={v => { if (v) setViewMonth(v); }}
            slotProps={{ textField: { size: "small", sx: { width: 180 } } }} />
        </LocalizationProvider>
      </Box>

      {/* Stats strip */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
        gap: 1.5, mb: 2 }}>
        {[
          { label: "Revenue", val: `$${fmt(summary.revenue)}`, color: "success.main" },
          { label: "Sales", val: summary.sale_count || 0, color: "primary.main" },
          { label: "Avg Sale", val: `$${fmt(summary.avg_sale)}`, color: "info.main" },
          { label: "Discounts", val: `$${fmt(summary.total_discount)}`, color: "warning.main" },
        ].map(s => (
          <Paper key={s.label} elevation={0} sx={{ p: 1.75, borderRadius: 2.5,
            border: "1px solid", borderColor: "grey.200" }}>
            <Typography variant="caption" fontWeight={800} sx={{ opacity: 0.55 }}>
              {s.label}
            </Typography>
            <Typography variant="h6" fontWeight={900} sx={{ color: s.color, mt: 0.25 }}>
              {s.val}
            </Typography>
          </Paper>
        ))}
      </Box>

      <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
        {/* Sales table */}
        <Box sx={{ flexGrow: 1 }}>
          {/* Search */}
          <Box sx={{ mb: 1.5 }}>
            <TextField size="small" placeholder="Search by sale number…"
              value={search} onChange={e => setSearch(e.target.value)}
              sx={{ width: 280 }}
              InputProps={{ startAdornment: <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 17, opacity: 0.4 }} />
              </InputAdornment> }} />
          </Box>

          {msg.text && (
            <Box sx={{ mb: 1.5, px: 2, py: 0.75, borderRadius: 2,
              bgcolor: msg.ok ? "success.50" : "error.50" }}>
              <Typography fontSize={13} fontWeight={600}
                color={msg.ok ? "success.dark" : "error.dark"}>{msg.text}</Typography>
            </Box>
          )}

          <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid",
            borderColor: "grey.200", overflow: "hidden" }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "grey.50" }}>
                  <TableCell sx={{ fontWeight: 800 }}>Sale #</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Date / Time</TableCell>
                  <TableCell sx={{ fontWeight: 800 }} align="center">Items</TableCell>
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
                      No sales this month
                    </TableCell>
                  </TableRow>
                ) : filtered.map(s => (
                  <TableRow key={s.id} hover
                    sx={{ opacity: s.status === "REFUNDED" ? 0.55 : 1,
                      "&:last-child td": { border: 0 } }}>
                    <TableCell sx={{ fontFamily: "monospace", fontSize: 11, opacity: 0.7 }}>
                      {s.sale_number}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, whiteSpace: "nowrap" }}>
                      {bFormat(s.created_at, "DD/MM/YYYY HH:mm")}
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={s.item_count} size="small"
                        sx={{ fontWeight: 700, fontSize: 11, height: 20,
                          "& .MuiChip-label": { px: 0.75 } }} />
                    </TableCell>
                    <TableCell>
                      <Chip label={s.method || "CASH"} size="small" variant="outlined"
                        sx={{ fontWeight: 700, fontSize: 11 }} />
                    </TableCell>
                    <TableCell>
                      <Chip label={s.status || "PAID"} size="small"
                        color={s.status === "REFUNDED" ? "error" : "success"}
                        sx={{ fontWeight: 700, fontSize: 11 }} />
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 900, fontFamily: "monospace",
                      color: s.status === "REFUNDED" ? "error.main" : "success.dark" }}>
                      ${fmt(s.total)}
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center" }}>
                        <IconButton size="small" onClick={() => setSelSaleId(s.id)}>
                          <ReceiptIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                        {s.status !== "REFUNDED" && (
                          <IconButton size="small" color="error"
                            onClick={() => setRefundSale(s)}>
                            <UndoIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Box>

        {/* Top items sidebar */}
        {topItems.length > 0 && (
          <Paper elevation={0} sx={{ width: 240, flexShrink: 0, borderRadius: 3,
            border: "1px solid", borderColor: "grey.200", p: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
              <TrendingUpIcon sx={{ fontSize: 18, color: "primary.main" }} />
              <Typography fontWeight={900} fontSize={14}>Top Items</Typography>
            </Box>
            {topItems.map((it, i) => (
              <Box key={i} sx={{ mb: 1.25 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography fontSize={12} fontWeight={700} noWrap sx={{ maxWidth: 140 }}>
                    {it.item_name}
                  </Typography>
                  <Typography fontSize={12} fontWeight={700} color="primary.main">
                    ${fmt(it.total_revenue)}
                  </Typography>
                </Box>
                <Typography fontSize={11} color="text.secondary">
                  {Number(it.total_qty)} sold
                </Typography>
                <Box sx={{ height: 3, borderRadius: 2, bgcolor: "grey.100", mt: 0.5 }}>
                  <Box sx={{ height: "100%", borderRadius: 2, bgcolor: "primary.main",
                    width: `${Math.min(100, (it.total_revenue / topItems[0].total_revenue) * 100)}%` }} />
                </Box>
              </Box>
            ))}
          </Paper>
        )}
      </Box>

      {/* Dialogs */}
      {selSaleId && (
        <SaleDetailDialog
          saleId={selSaleId}
          onClose={() => setSelSaleId(null)}
          onRefund={(sale) => { setRefundSale(sale); setSelSaleId(null); }}
        />
      )}
      {refundSale && (
        <RefundDialog
          sale={refundSale}
          onConfirm={handleRefund}
          onClose={() => setRefundSale(null)}
        />
      )}
    </Box>
  );
}