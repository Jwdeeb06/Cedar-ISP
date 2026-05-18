import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box, Button, Chip, FormControl, IconButton, InputLabel,
  MenuItem, Paper, Select, Table, TableBody, TableCell,
  TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import { bFormat } from "../../utils/dateUtils";

const money = (n) => (Number(n) || 0).toLocaleString(undefined, {
  minimumFractionDigits: 2, maximumFractionDigits: 2 });

const REASON_OPTIONS = ["EXPENSE", "SALARY", "RENT", "EQUIPMENT", "PETTY_CASH",
  "TRANSFER", "REFUND", "SUPPLIER", "OTHER"];

function BalanceStrip({ balance, totalIn, totalOut, txCount, label }) {
  const positive = Number(balance) >= 0;
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
      gap: 2, mb: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "2px solid",
        borderColor: positive ? "success.main" : "error.main",
        bgcolor: positive ? "success.50" : "error.50" }}>
        <Typography variant="caption" sx={{ fontWeight: 800, opacity: 0.7 }}>{label}</Typography>
        <Typography variant="h4" fontWeight={900}
          sx={{ color: positive ? "success.dark" : "error.dark", mt: 0.25 }}>
          {money(balance)}
        </Typography>
      </Paper>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid", borderColor: "grey.200" }}>
        <Typography variant="caption" sx={{ fontWeight: 800, opacity: 0.6 }}>Cash In (Sales)</Typography>
        <Typography variant="h5" fontWeight={900} sx={{ color: "success.main", mt: 0.25 }}>
          + {money(totalIn)}
        </Typography>
      </Paper>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid", borderColor: "grey.200" }}>
        <Typography variant="caption" sx={{ fontWeight: 800, opacity: 0.6 }}>Cash Out</Typography>
        <Typography variant="h5" fontWeight={900} sx={{ color: "error.main", mt: 0.25 }}>
          − {money(totalOut)}
        </Typography>
      </Paper>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid", borderColor: "grey.200" }}>
        <Typography variant="caption" sx={{ fontWeight: 800, opacity: 0.6 }}>Transactions</Typography>
        <Typography variant="h5" fontWeight={900} sx={{ mt: 0.25 }}>{txCount}</Typography>
      </Paper>
    </Box>
  );
}

function DailyCards({ rows, selectedDay, onSelectDay }) {
  if (!rows.length) return null;
  return (
    <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3,
      border: "1px solid", borderColor: "grey.200" }}>
      <Typography variant="caption" fontWeight={800} sx={{ opacity: 0.6, display: "block", mb: 1 }}>
        Daily Breakdown (click to filter)
      </Typography>
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        {rows.map(d => {
          const net = Number(d.total_in) - Number(d.total_out);
          const active = selectedDay === d.day;
          const pos = net >= 0;
          return (
            <Paper key={d.day} elevation={0}
              onClick={() => onSelectDay(active ? "" : d.day)}
              sx={{ p: 1.5, minWidth: 130, borderRadius: 2, cursor: "pointer",
                border: "1px solid",
                borderColor: active ? (pos ? "success.main" : "error.main") : "grey.200",
                bgcolor: active ? (pos ? "success.50" : "error.50") : "white",
                transition: "all 0.15s",
                "&:hover": { borderColor: pos ? "success.light" : "error.light" },
              }}>
              <Typography variant="caption" fontWeight={800} sx={{ opacity: 0.65 }}>{d.day}</Typography>
              <Typography variant="body1" fontWeight={900}
                sx={{ color: pos ? "success.dark" : "error.dark" }}>
                {pos ? "+" : ""}{money(net)}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.55 }}>
                In: {money(d.total_in)} · Out: {money(d.total_out)}
              </Typography>
            </Paper>
          );
        })}
      </Box>
    </Paper>
  );
}

export default function PosDrawerPage() {
  const [viewMonth,   setViewMonth]   = useState(dayjs());
  const [selectedDay, setSelectedDay] = useState("");
  const [filterType,  setFilterType]  = useState("");
  const [rows,        setRows]        = useState([]);
  const [summary,     setSummary]     = useState({ total_in: 0, total_out: 0, balance: 0, tx_count: 0 });
  const [allTimeBal,  setAllTimeBal]  = useState(0);
  const [dailyRows,   setDailyRows]   = useState([]);

  // form
  const [txType,  setTxType]  = useState("OUT");
  const [amount,  setAmount]  = useState("");
  const [reason,  setReason]  = useState("EXPENSE");
  const [note,    setNote]    = useState("");
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState({ text: "", ok: true });

  const monthStr = viewMonth ? viewMonth.format("YYYY-MM") : "";

  const loadAll = useCallback(async () => {
    const rowFilters = selectedDay
      ? { day: selectedDay, type: filterType }
      : { month: monthStr, type: filterType };
    const sumFilters = selectedDay
      ? { day: selectedDay }
      : { month: monthStr };

    const [txRows, sumData, daily, bal] = await Promise.all([
      window.api.posDrawerList(rowFilters),
      window.api.posDrawerSummary(sumFilters),
      window.api.posDrawerDailyList({ month: monthStr }),
      window.api.posDrawerBalance(),
    ]);
    setRows(txRows || []);
    setSummary(sumData || { total_in: 0, total_out: 0, balance: 0, tx_count: 0 });
    setDailyRows(daily || []);
    setAllTimeBal(Number(bal?.balance || 0));
  }, [monthStr, selectedDay, filterType]);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    if (!msg.text) return;
    const t = setTimeout(() => setMsg({ text: "", ok: true }), 5000);
    return () => clearTimeout(t);
  }, [msg.text]);

  const submit = async () => {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0)
      return setMsg({ text: "Enter a valid amount.", ok: false });
    setSaving(true);
    try {
      const res = await window.api.posDrawerAdd({
        type: txType, amount: amt, reason, note: note.trim() || null, actor: "admin",
      });
      if (!res?.ok) return setMsg({ text: "Failed to save.", ok: false });
      setMsg({ text: `${txType === "IN" ? "Cash In" : "Cash Out"} of $${money(amt)} saved.`, ok: true });
      setAmount(""); setNote("");
      await loadAll();
    } finally { setSaving(false); }
  };

  const periodLabel = useMemo(() =>
    selectedDay ? `Day: ${selectedDay}` : `Month: ${monthStr}`, [selectedDay, monthStr]);

  return (
    <Box>
      {/* Header */}
      <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3,
        border: "1px solid", borderColor: "grey.200",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={900}>POS Cash Drawer</Typography>
          <Typography variant="body2" sx={{ opacity: 0.65 }}>
            Point-of-sale cash — completely separate from ISP drawer
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap" }}>
          <Chip label={`All-time: $${money(allTimeBal)}`}
            color={allTimeBal >= 0 ? "success" : "error"}
            sx={{ fontWeight: 800, fontSize: 13 }} />
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker label="Month" views={["year","month"]} openTo="month"
              value={viewMonth}
              onChange={v => { if (v) { setViewMonth(v); setSelectedDay(""); } }}
              slotProps={{ textField: { size: "small", sx: { width: 180 } } }} />
          </LocalizationProvider>
        </Box>
      </Paper>

      <BalanceStrip balance={summary.balance} totalIn={summary.total_in}
        totalOut={summary.total_out} txCount={rows.length} label={periodLabel} />

      <DailyCards rows={dailyRows} selectedDay={selectedDay} onSelectDay={setSelectedDay} />

      {/* Add transaction */}
      <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3,
        border: "1px solid", borderColor: "grey.200" }}>
        <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>
          Add Manual Transaction
        </Typography>
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "flex-start" }}>
          <Box sx={{ display: "flex", gap: 1 }}>
            {["IN","OUT"].map(t => (
              <Button key={t} variant={txType === t ? "contained" : "outlined"}
                color={t === "IN" ? "success" : "error"}
                onClick={() => setTxType(t)} sx={{ fontWeight: 800, minWidth: 90 }}>
                {t === "IN" ? "＋ Cash In" : "－ Cash Out"}
              </Button>
            ))}
          </Box>
          <TextField label="Amount" value={amount} onChange={e => setAmount(e.target.value)}
            sx={{ width: 160 }} inputProps={{ inputMode: "decimal" }} />
          <FormControl sx={{ minWidth: 160 }}>
            <InputLabel>Reason</InputLabel>
            <Select label="Reason" value={reason} onChange={e => setReason(e.target.value)}>
              {REASON_OPTIONS.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="Note (optional)" value={note}
            onChange={e => setNote(e.target.value)} sx={{ flex: 1, minWidth: 200 }} />
          <Button variant="contained" onClick={submit} disabled={saving || !amount}
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
      <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid",
        borderColor: "grey.200", overflow: "hidden" }}>
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

        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "grey.50" }}>
              <TableCell sx={{ fontWeight: 800 }}>#</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Date / Time</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Reason</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Note</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Actor</TableCell>
              <TableCell sx={{ fontWeight: 800 }} align="right">Amount</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ textAlign: "center", py: 4, opacity: 0.5 }}>
                  No transactions for this period.
                </TableCell>
              </TableRow>
            ) : rows.map((r, idx) => (
              <TableRow key={r.id} hover
                sx={{ bgcolor: r.type === "IN" ? "rgba(46,125,50,0.04)" : "rgba(211,47,47,0.04)",
                  "&:last-child td": { border: 0 } }}>
                <TableCell sx={{ opacity: 0.45, fontFamily: "monospace", fontSize: 11 }}>
                  {idx + 1}
                </TableCell>
                <TableCell sx={{ whiteSpace: "nowrap", fontSize: 12 }}>
                  {r.created_at ? bFormat(r.created_at, "DD/MM/YYYY HH:mm") : "—"}
                </TableCell>
                <TableCell>
                  <Chip label={r.type} size="small"
                    color={r.type === "IN" ? "success" : "error"}
                    sx={{ fontWeight: 800, minWidth: 52 }} />
                </TableCell>
                <TableCell sx={{ fontSize: 12 }}>
                  {r.reason === "SALE" ? (
                    <Chip label="SALE" size="small" color="primary"
                      sx={{ fontWeight: 700, fontSize: 11 }} />
                  ) : r.reason || "—"}
                </TableCell>
                <TableCell sx={{ fontSize: 12, opacity: 0.75, maxWidth: 220 }}>
                  {r.note || "—"}
                </TableCell>
                <TableCell>
                  <Chip label={r.actor || "system"} size="small" variant="outlined"
                    sx={{ fontSize: 11, fontWeight: 600 }} />
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 900, fontFamily: "monospace",
                  color: r.type === "IN" ? "success.dark" : "error.dark", fontSize: 14 }}>
                  {r.type === "IN" ? "+" : "−"}{money(r.amount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {rows.length > 0 && (
          <Box sx={{ px: 2, py: 1, display: "flex", justifyContent: "flex-end",
            gap: 3, bgcolor: "grey.50", borderTop: "1px solid", borderColor: "grey.200" }}>
            <Typography variant="body2" fontWeight={700} color="success.dark">
              In: +{money(summary.total_in)}
            </Typography>
            <Typography variant="body2" fontWeight={700} color="error.dark">
              Out: −{money(summary.total_out)}
            </Typography>
            <Typography variant="body2" fontWeight={900}
              sx={{ color: summary.balance >= 0 ? "success.dark" : "error.dark" }}>
              Net: {money(summary.balance)}
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}