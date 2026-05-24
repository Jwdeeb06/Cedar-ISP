import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box, Button, Chip, Divider, FormControl, IconButton, InputLabel,
  MenuItem, Paper, Select, Table, TableBody, TableCell,
  TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import { bFormat } from "../../utils/dateUtils";

const usd = (n) => (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ll  = (n) => `L.L${(Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const REASON_OPTIONS = ["EXPENSE","SALARY","RENT","EQUIPMENT","PETTY_CASH","TRANSFER","REFUND","SUPPLIER","OTHER"];

function SummaryStrip({ summary, label }) {
  const { total_in_usd=0, total_out_usd=0, balance_usd=0,
          total_in_lbp=0, total_out_lbp=0, balance_lbp=0, tx_count=0 } = summary;
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 2, mb: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "2px solid",
        borderColor: balance_usd >= 0 ? "success.main" : "error.main",
        bgcolor: balance_usd >= 0 ? "success.50" : "error.50" }}>
        <Typography variant="caption" fontWeight={800} sx={{ opacity: 0.7 }}>{label} · USD</Typography>
        <Typography variant="h4" fontWeight={900}
          sx={{ color: balance_usd >= 0 ? "success.dark" : "error.dark", mt: 0.25 }}>
          ${usd(balance_usd)}
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.55 }}>
          In: ${usd(total_in_usd)} · Out: ${usd(total_out_usd)}
        </Typography>
      </Paper>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "2px solid",
        borderColor: balance_lbp >= 0 ? "info.main" : "error.main",
        bgcolor: balance_lbp >= 0 ? "rgba(2,136,209,0.06)" : "error.50" }}>
        <Typography variant="caption" fontWeight={800} sx={{ opacity: 0.7 }}>{label} · LBP</Typography>
        <Typography variant="h4" fontWeight={900}
          sx={{ color: balance_lbp >= 0 ? "info.dark" : "error.dark", mt: 0.25 }}>
          {ll(balance_lbp)}
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.55 }}>
          In: {ll(total_in_lbp)} · Out: {ll(total_out_lbp)}
        </Typography>
      </Paper>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid", borderColor: "grey.200" }}>
        <Typography variant="caption" fontWeight={800} sx={{ opacity: 0.6 }}>Cash In</Typography>
        <Typography variant="h6" fontWeight={900} color="success.main" sx={{ mt: 0.25 }}>+${usd(total_in_usd)}</Typography>
        <Typography variant="caption" color="info.main" fontWeight={700}>+{ll(total_in_lbp)}</Typography>
      </Paper>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid", borderColor: "grey.200" }}>
        <Typography variant="caption" fontWeight={800} sx={{ opacity: 0.6 }}>Cash Out</Typography>
        <Typography variant="h6" fontWeight={900} color="error.main" sx={{ mt: 0.25 }}>−${usd(total_out_usd)}</Typography>
        <Typography variant="caption" color="error.light" fontWeight={700}>−{ll(total_out_lbp)}</Typography>
      </Paper>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid", borderColor: "grey.200" }}>
        <Typography variant="caption" fontWeight={800} sx={{ opacity: 0.6 }}>Transactions</Typography>
        <Typography variant="h5" fontWeight={900} sx={{ mt: 0.25 }}>{tx_count}</Typography>
      </Paper>
    </Box>
  );
}

function DailyTable({ rows, selectedDay, onSelectDay }) {
  const [open, setOpen] = useState(false);
  if (!rows.length) return null;
  return (
    <Paper elevation={0} sx={{ mb: 2, borderRadius: 3, border: "1px solid", borderColor: "grey.200", overflow: "hidden" }}>
      <Box onClick={() => setOpen(o => !o)} sx={{
        px: 2, py: 1.5, bgcolor: "grey.50",
        borderBottom: open ? "1px solid" : "none", borderColor: "grey.200",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        cursor: "pointer", "&:hover": { bgcolor: "grey.100" },
      }}>
        <Typography variant="caption" fontWeight={800} sx={{ opacity: 0.65, textTransform: "uppercase", letterSpacing: 1 }}>
          Daily Breakdown — {rows.length} days
        </Typography>
        <Typography sx={{ fontSize: 16, opacity: 0.5 }}>{open ? "▲" : "▼"}</Typography>
      </Box>
      {open && (
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "grey.50" }}>
              <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 800 }} align="right">In USD</TableCell>
              <TableCell sx={{ fontWeight: 800 }} align="right">Out USD</TableCell>
              <TableCell sx={{ fontWeight: 800 }} align="right">Net USD</TableCell>
              <TableCell sx={{ fontWeight: 800 }} align="right">In L.L</TableCell>
              <TableCell sx={{ fontWeight: 800 }} align="right">Out L.L</TableCell>
              <TableCell sx={{ fontWeight: 800 }} align="right">Tx</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(d => {
              const netUsd = Number(d.total_in_usd) - Number(d.total_out_usd);
              const active = selectedDay === d.day;
              return (
                <TableRow key={d.day} hover onClick={() => onSelectDay(active ? "" : d.day)}
                  sx={{ cursor: "pointer",
                    bgcolor: active ? (netUsd >= 0 ? "rgba(46,125,50,0.08)" : "rgba(211,47,47,0.08)") : "inherit",
                    "&:last-child td": { border: 0 } }}>
                  <TableCell sx={{ fontWeight: active ? 900 : 600, fontFamily: "monospace", fontSize: 12 }}>{d.day}</TableCell>
                  <TableCell align="right" sx={{ color: "success.dark", fontWeight: 700, fontSize: 12 }}>
                    {d.total_in_usd > 0 ? `+$${usd(d.total_in_usd)}` : "—"}
                  </TableCell>
                  <TableCell align="right" sx={{ color: "error.main", fontWeight: 700, fontSize: 12 }}>
                    {d.total_out_usd > 0 ? `−$${usd(d.total_out_usd)}` : "—"}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 900, fontSize: 13, color: netUsd >= 0 ? "success.dark" : "error.dark" }}>
                    {netUsd >= 0 ? "+" : ""}${usd(netUsd)}
                  </TableCell>
                  <TableCell align="right" sx={{ color: "info.dark", fontWeight: 700, fontSize: 12 }}>
                    {d.total_in_lbp > 0 ? `+${ll(d.total_in_lbp)}` : "—"}
                  </TableCell>
                  <TableCell align="right" sx={{ color: "error.light", fontWeight: 700, fontSize: 12 }}>
                    {d.total_out_lbp > 0 ? `−${ll(d.total_out_lbp)}` : "—"}
                  </TableCell>
                  <TableCell align="right" sx={{ opacity: 0.55, fontSize: 12 }}>{d.tx_count}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Paper>
  );
}

export default function PosDrawerPage() {
  const [viewMonth,   setViewMonth]   = useState(dayjs());
  const [selectedDay, setSelectedDay] = useState("");
  const [filterType,  setFilterType]  = useState("");
  const [rows,        setRows]        = useState([]);
  const [summary,     setSummary]     = useState({
    total_in_usd: 0, total_out_usd: 0, balance_usd: 0,
    total_in_lbp: 0, total_out_lbp: 0, balance_lbp: 0, tx_count: 0,
  });
  const [allTimeBal,  setAllTimeBal]  = useState({ balance_usd: 0, balance_lbp: 0 });
  const [dailyRows,   setDailyRows]   = useState([]);

  const [txType,     setTxType]     = useState("OUT");
  const [amountUsd,  setAmountUsd]  = useState("");
  const [amountLbp,  setAmountLbp]  = useState("");
  const [reason,     setReason]     = useState("EXPENSE");
  const [note,       setNote]       = useState("");
  const [saving,     setSaving]     = useState(false);
  const [msg,        setMsg]        = useState({ text: "", ok: true });

  const monthStr = viewMonth ? viewMonth.format("YYYY-MM") : "";

  const loadAll = useCallback(async () => {
    const rowFilters = selectedDay ? { day: selectedDay, type: filterType } : { month: monthStr, type: filterType };
    const sumFilters = selectedDay ? { day: selectedDay } : { month: monthStr };

    const [txRows, sumData, daily, bal] = await Promise.all([
      window.api.posDrawerList(rowFilters),
      window.api.posDrawerSummary(sumFilters),
      window.api.posDrawerDailyList({ month: monthStr }),
      window.api.posDrawerBalance(),
    ]);
    setRows(txRows || []);
    setSummary(sumData || { total_in_usd:0, total_out_usd:0, balance_usd:0, total_in_lbp:0, total_out_lbp:0, balance_lbp:0, tx_count:0 });
    setDailyRows(daily || []);
    setAllTimeBal({ balance_usd: Number(bal?.balance_usd || 0), balance_lbp: Number(bal?.balance_lbp || 0) });
  }, [monthStr, selectedDay, filterType]);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => {
    if (!msg.text) return;
    const t = setTimeout(() => setMsg({ text: "", ok: true }), 5000);
    return () => clearTimeout(t);
  }, [msg.text]);

  const submit = async () => {
    const aUsd = Number(amountUsd) || 0;
    const aLbp = Number(amountLbp) || 0;
    if (aUsd === 0 && aLbp === 0)
      return setMsg({ text: "Enter at least one amount (USD or L.L).", ok: false });
    setSaving(true);
    try {
      const res = await window.api.posDrawerAdd({
        type: txType, amount_usd: aUsd, amount_lbp: aLbp,
        reason, note: note.trim() || null, actor: "admin",
      });
      if (!res?.ok) return setMsg({ text: "Failed to save.", ok: false });
      setMsg({ text: `${txType === "IN" ? "Cash In" : "Cash Out"} saved.`, ok: true });
      setAmountUsd(""); setAmountLbp(""); setNote("");
      await loadAll();
    } finally { setSaving(false); }
  };

  const periodLabel = useMemo(() =>
    selectedDay ? `Day: ${selectedDay}` : `Month: ${monthStr}`, [selectedDay, monthStr]);

  return (
    <Box>
      {/* Header */}
      <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3, border: "1px solid", borderColor: "grey.200",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={900}>POS Cash Drawer</Typography>
          <Typography variant="body2" sx={{ opacity: 0.65 }}>Point-of-sale cash — separate from ISP drawer</Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap" }}>
          <Chip label={`All-time USD: $${usd(allTimeBal.balance_usd)}`}
            color={allTimeBal.balance_usd >= 0 ? "success" : "error"}
            sx={{ fontWeight: 800, fontSize: 12 }} />
          <Chip label={`All-time L.L: ${ll(allTimeBal.balance_lbp)}`}
            color={allTimeBal.balance_lbp >= 0 ? "info" : "error"}
            sx={{ fontWeight: 800, fontSize: 12 }} />
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker label="Month" views={["year","month"]} openTo="month" value={viewMonth}
              onChange={v => { if (v) { setViewMonth(v); setSelectedDay(""); } }}
              slotProps={{ textField: { size: "small", sx: { width: 180 } } }} />
          </LocalizationProvider>
        </Box>
      </Paper>

      <SummaryStrip summary={summary} label={periodLabel} />
      <DailyTable rows={dailyRows} selectedDay={selectedDay} onSelectDay={setSelectedDay} />

      {/* Add transaction */}
      <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3, border: "1px solid", borderColor: "grey.200" }}>
        <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>Add Manual Transaction</Typography>
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "flex-start" }}>
          <Box sx={{ display: "flex", gap: 1 }}>
            {["IN","OUT"].map(t => (
              <Button key={t} variant={txType === t ? "contained" : "outlined"}
                color={t === "IN" ? "success" : "error"}
                onClick={() => setTxType(t)} sx={{ fontWeight: 800, minWidth: 100, height: 56 }}>
                {t === "IN" ? "+ CASH IN" : "− CASH OUT"}
              </Button>
            ))}
          </Box>
          <TextField label="Amount USD" value={amountUsd} onChange={e => setAmountUsd(e.target.value)}
            sx={{ width: 150 }} inputProps={{ inputMode: "decimal" }}
            InputProps={{ startAdornment: <Typography sx={{ mr: 0.5, fontWeight: 700, color: "text.secondary" }}>$</Typography> }} />
          <TextField label="Amount L.L" value={amountLbp} onChange={e => setAmountLbp(e.target.value)}
            sx={{ width: 170 }} inputProps={{ inputMode: "decimal" }}
            InputProps={{ startAdornment: <Typography sx={{ mr: 0.5, fontWeight: 700, color: "text.secondary" }}>L.L</Typography> }} />
          <FormControl sx={{ minWidth: 160 }}>
            <InputLabel>Reason</InputLabel>
            <Select label="Reason" value={reason} onChange={e => setReason(e.target.value)}>
              {REASON_OPTIONS.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="Note (optional)" value={note} onChange={e => setNote(e.target.value)}
            sx={{ flex: 1, minWidth: 200 }} />
          <Button variant="contained" onClick={submit} disabled={saving || (!amountUsd && !amountLbp)}
            sx={{ height: 56, px: 3, fontWeight: 800,
              bgcolor: txType === "IN" ? "success.main" : "error.main",
              "&:hover": { bgcolor: txType === "IN" ? "success.dark" : "error.dark" } }}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </Box>
        {msg.text && (
          <Box sx={{ mt: 1.5, px: 2, py: 1, borderRadius: 2,
            bgcolor: msg.ok ? "success.50" : "error.50",
            display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="body2" fontWeight={600}>{msg.text}</Typography>
            <IconButton size="small" onClick={() => setMsg({ text: "", ok: true })}>✕</IconButton>
          </Box>
        )}
      </Paper>

      {/* Transactions table */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "grey.200", overflow: "hidden" }}>
        <Box sx={{ px: 2, py: 1.5, display: "flex", alignItems: "center", gap: 1.5,
          flexWrap: "wrap", bgcolor: "grey.50", borderBottom: "1px solid", borderColor: "grey.200" }}>
          <Typography variant="subtitle1" fontWeight={800} sx={{ flexGrow: 1 }}>
            Transactions · {periodLabel}
          </Typography>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Type</InputLabel>
            <Select label="Type" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="IN">Cash In</MenuItem>
              <MenuItem value="OUT">Cash Out</MenuItem>
            </Select>
          </FormControl>
          {selectedDay && (
            <Chip label={`Day: ${selectedDay}`} onDelete={() => setSelectedDay("")}
              color="primary" size="small" sx={{ fontWeight: 700 }} />
          )}
        </Box>

        <Table size="small" sx={{ minWidth: 700 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: "grey.50" }}>
              <TableCell sx={{ fontWeight: 800 }}>#</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Date / Time</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Reason</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Note</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Actor</TableCell>
              <TableCell sx={{ fontWeight: 800 }} align="right">USD</TableCell>
              <TableCell sx={{ fontWeight: 800 }} align="right">L.L</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} sx={{ textAlign: "center", py: 4, opacity: 0.5 }}>
                  No transactions for this period.
                </TableCell>
              </TableRow>
            ) : rows.map((r, idx) => (
              <TableRow key={r.id} hover
                sx={{ bgcolor: r.type === "IN" ? "rgba(46,125,50,0.04)" : "rgba(211,47,47,0.04)",
                  "&:last-child td": { border: 0 } }}>
                <TableCell sx={{ opacity: 0.45, fontFamily: "monospace", fontSize: 11 }}>{idx + 1}</TableCell>
                <TableCell sx={{ whiteSpace: "nowrap", fontSize: 12 }}>
                  {r.created_at ? bFormat(r.created_at, "DD/MM/YYYY HH:mm") : "—"}
                </TableCell>
                <TableCell>
                  <Chip label={r.type} size="small" color={r.type === "IN" ? "success" : "error"}
                    sx={{ fontWeight: 800, minWidth: 52 }} />
                </TableCell>
                <TableCell sx={{ fontSize: 12 }}>
                  {r.reason === "SALE" ? (
                    <Chip label="SALE" size="small" color="primary" sx={{ fontWeight: 700, fontSize: 11 }} />
                  ) : r.reason || "—"}
                </TableCell>
                <TableCell sx={{ fontSize: 12, opacity: 0.75, maxWidth: 220 }}>{r.note || "—"}</TableCell>
                <TableCell>
                  <Chip label={r.actor || "system"} size="small" variant="outlined"
                    sx={{ fontSize: 11, fontWeight: 600 }} />
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 900, fontFamily: "monospace", fontSize: 13,
                  color: r.type === "IN" ? "success.dark" : "error.dark" }}>
                  {Number(r.amount_usd) > 0 ? `${r.type === "IN" ? "+" : "−"}$${usd(r.amount_usd)}` : "—"}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontFamily: "monospace", fontSize: 13,
                  color: r.type === "IN" ? "info.dark" : "error.light" }}>
                  {Number(r.amount_lbp) > 0 ? `${r.type === "IN" ? "+" : "−"}${ll(r.amount_lbp)}` : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {rows.length > 0 && (
          <>
            <Divider />
            <Box sx={{ px: 2, py: 1, display: "flex", justifyContent: "flex-end", gap: 3, bgcolor: "grey.50" }}>
              <Typography variant="body2" fontWeight={700} color="success.dark">USD In: +${usd(summary.total_in_usd)}</Typography>
              <Typography variant="body2" fontWeight={700} color="error.dark">USD Out: −${usd(summary.total_out_usd)}</Typography>
              <Typography variant="body2" fontWeight={900} color={summary.balance_usd >= 0 ? "success.dark" : "error.dark"}>
                USD Net: ${usd(summary.balance_usd)}
              </Typography>
              <Divider orientation="vertical" flexItem />
              <Typography variant="body2" fontWeight={700} color="info.dark">L.L In: +{ll(summary.total_in_lbp)}</Typography>
              <Typography variant="body2" fontWeight={700} color="error.light">L.L Out: −{ll(summary.total_out_lbp)}</Typography>
              <Typography variant="body2" fontWeight={900} color={summary.balance_lbp >= 0 ? "info.dark" : "error.dark"}>
                L.L Net: {ll(summary.balance_lbp)}
              </Typography>
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
}