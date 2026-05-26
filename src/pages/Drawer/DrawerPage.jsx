import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Box, Button, Chip, Divider, FormControl, IconButton,
  InputLabel, MenuItem, Paper, Select, Stack, Table,
  TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import dayjs from "dayjs";
import { bFormat } from "../../utils/dateUtils";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { drawerApi } from "../../services/drawerApi";

function usd(n) {
  return (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function lbp(n) {
  return (Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

const REASON_OPTIONS = [
  "PAYMENT","SALARY","RENT","EQUIPMENT","UTILITY","REFUND","TRANSFER","EXPENSE","OTHER",
];

const TODAY = dayjs().format("YYYY-MM-DD");

function SummaryStrip({ summary, allTimeBal, label }) {
  const { total_in_usd=0, total_out_usd=0, balance_usd=0,
          total_in_lbp=0, total_out_lbp=0, balance_lbp=0, tx_count=0 } = summary;
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 2, mb: 2 }}>
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
          LBP{lbp(balance_lbp)}
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.55 }}>
          In: LBP{lbp(total_in_lbp)} · Out: LBP{lbp(total_out_lbp)}
        </Typography>
      </Paper>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid", borderColor: "grey.200" }}>
        <Typography variant="caption" fontWeight={800} sx={{ opacity: 0.6 }}>Cash In</Typography>
        <Typography variant="h6" fontWeight={900} color="success.main" sx={{ mt: 0.25 }}>+${usd(total_in_usd)}</Typography>
        <Typography variant="caption" color="info.main" fontWeight={700}>+LBP{lbp(total_in_lbp)}</Typography>
      </Paper>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid", borderColor: "grey.200" }}>
        <Typography variant="caption" fontWeight={800} sx={{ opacity: 0.6 }}>Cash Out</Typography>
        <Typography variant="h6" fontWeight={900} color="error.main" sx={{ mt: 0.25 }}>−${usd(total_out_usd)}</Typography>
        <Typography variant="caption" color="error.light" fontWeight={700}>−LBP{lbp(total_out_lbp)}</Typography>
      </Paper>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid", borderColor: "grey.200" }}>
        <Typography variant="caption" fontWeight={800} sx={{ opacity: 0.6 }}>Transactions</Typography>
        <Typography variant="h5" fontWeight={900} sx={{ mt: 0.25 }}>{tx_count}</Typography>
      </Paper>
    </Box>
  );
}

function DailyTable({ dailyRows, selectedDay, onSelectDay }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  if (!dailyRows.length) return null;

  const PREVIEW = 5;
  const visible = expanded ? dailyRows : dailyRows.slice(0, PREVIEW);
  const hasMore = dailyRows.length > PREVIEW;

  return (
    <Paper elevation={0} sx={{ mb: 2, borderRadius: 3, border: "1px solid", borderColor: "grey.200", overflow: "hidden" }}>
      <Box onClick={() => setOpen(o => !o)} sx={{
        px: 2, py: 1.5, bgcolor: "grey.50",
        borderBottom: open ? "1px solid" : "none", borderColor: "grey.200",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        cursor: "pointer", userSelect: "none", "&:hover": { bgcolor: "grey.100" },
      }}>
        <Typography variant="caption" fontWeight={800} sx={{ opacity: 0.65, textTransform: "uppercase", letterSpacing: 1 }}>
          Daily Breakdown — {dailyRows.length} days
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {open && hasMore && (
            <Button size="small" onClick={e => { e.stopPropagation(); setExpanded(x => !x); }}
              sx={{ fontSize: 11, fontWeight: 700, py: 0.25, minWidth: 0 }}>
              {expanded ? "Less ▲" : `All ${dailyRows.length} ▼`}
            </Button>
          )}
          <Typography sx={{ fontSize: 16, opacity: 0.5, lineHeight: 1 }}>{open ? "▲" : "▼"}</Typography>
        </Box>
      </Box>
      {open && (
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "grey.50" }}>
              <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 800 }} align="right">In USD</TableCell>
              <TableCell sx={{ fontWeight: 800 }} align="right">Out USD</TableCell>
              <TableCell sx={{ fontWeight: 800 }} align="right">Net USD</TableCell>
              <TableCell sx={{ fontWeight: 800 }} align="right">In LBP</TableCell>
              <TableCell sx={{ fontWeight: 800 }} align="right">Out LBP</TableCell>
              <TableCell sx={{ fontWeight: 800 }} align="right">Tx</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visible.map(d => {
              const netUsd = Number(d.total_in_usd) - Number(d.total_out_usd);
              const active = selectedDay === d.day;
              return (
                <TableRow key={d.day} hover onClick={() => onSelectDay(active ? TODAY : d.day)}
                  sx={{ cursor: "pointer",
                    bgcolor: active ? (netUsd >= 0 ? "rgba(46,125,50,0.08)" : "rgba(211,47,47,0.08)") : "inherit",
                    "&:last-child td": { border: 0 } }}>
                  <TableCell sx={{ fontWeight: active ? 900 : 600, fontFamily: "monospace", fontSize: 12 }}>
                    {d.day}{d.day === TODAY ? " · Today" : ""}
                  </TableCell>
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
                    {d.total_in_lbp > 0 ? `+LBP${lbp(d.total_in_lbp)}` : "—"}
                  </TableCell>
                  <TableCell align="right" sx={{ color: "error.light", fontWeight: 700, fontSize: 12 }}>
                    {d.total_out_lbp > 0 ? `−LBP${lbp(d.total_out_lbp)}` : "—"}
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

export default function DrawerPage() {
  const { companyId: routeCompanyId } = useParams();

  const [viewMonth,    setViewMonth]    = useState(dayjs());
  const [companies,    setCompanies]    = useState([]);
  const [companyId,    setCompanyId]    = useState(routeCompanyId || "");
  const [selectedDay,  setSelectedDay]  = useState(TODAY); // ← default today
  const [filterType,   setFilterType]   = useState("");
  const [filterReason, setFilterReason] = useState("");
  const [filterActor,  setFilterActor]  = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [dateFrom,     setDateFrom]     = useState("");
  const [dateTo,       setDateTo]       = useState("");
  const [actors,       setActors]       = useState([]);

  const [rows,       setRows]       = useState([]);
  const [summary,    setSummary]    = useState({
    total_in_usd: 0, total_out_usd: 0, balance_usd: 0,
    total_in_lbp: 0, total_out_lbp: 0, balance_lbp: 0, tx_count: 0,
  });
  const [allTimeBal, setAllTimeBal] = useState({ balance_usd: 0, balance_lbp: 0 });
  const [dailyRows,  setDailyRows]  = useState([]);

  const [txType,       setTxType]       = useState("IN");
  const [amountUsd,    setAmountUsd]    = useState("");
  const [amountLbp,    setAmountLbp]    = useState("");
  const [reason,       setReason]       = useState("PAYMENT");
  const [customReason, setCustomReason] = useState("");
  const [note,         setNote]         = useState("");
  const [saving,       setSaving]       = useState(false);
  const [msg,          setMsg]          = useState({ text: "", ok: true });

  const monthStr = viewMonth ? viewMonth.format("YYYY-MM") : "";

  const loadAll = useCallback(async () => {
    const company = companyId || null;

    // Priority: dateFrom+dateTo > selectedDay > month
    const baseTime = dateFrom && dateTo
      ? { dateFrom, dateTo }
      : selectedDay ? { day: selectedDay } : { month: monthStr };

    const rowFilters = {
      ...baseTime,
      type:       filterType   || undefined,
      reason:     filterReason || undefined,
      actor:      filterActor  || undefined,
      search:     filterSearch || undefined,
      company_id: company,
    };
    const sumFilters = { ...baseTime, company_id: company };

    const [txRows, sumData, daily, bal, actorList] = await Promise.all([
      drawerApi.list(rowFilters),
      drawerApi.summary(sumFilters),
      drawerApi.dailyList({ month: monthStr }),
      drawerApi.balance(company ? { company_id: company } : {}),
      window.api.drawerActors?.({ company_id: company }).catch(() => []) || Promise.resolve([]),
    ]);

    setRows(txRows || []);
    setSummary(sumData || { total_in_usd:0, total_out_usd:0, balance_usd:0, total_in_lbp:0, total_out_lbp:0, balance_lbp:0, tx_count:0 });
    setDailyRows(daily || []);
    setAllTimeBal({ balance_usd: Number(bal?.balance_usd || 0), balance_lbp: Number(bal?.balance_lbp || 0) });
    setActors(actorList || []);
  }, [monthStr, selectedDay, filterType, filterReason, filterActor, filterSearch, dateFrom, dateTo, companyId]);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => { setCompanyId(routeCompanyId || ""); }, [routeCompanyId]);
  useEffect(() => {
    window.api.listCompanies?.().then(d => setCompanies(d || [])).catch(() => {});
  }, []);
  useEffect(() => {
    if (!msg.text) return;
    const t = setTimeout(() => setMsg({ text: "", ok: true }), 6000);
    return () => clearTimeout(t);
  }, [msg.text]);

  const submit = async () => {
    const aUsd = Number(amountUsd) || 0;
    const aLbp = Number(amountLbp) || 0;
    if (aUsd === 0 && aLbp === 0)
      return setMsg({ text: "Enter at least one amount (USD or LBP).", ok: false });

    const finalReason = reason === "OTHER" ? (customReason.trim() || "OTHER") : reason;
    setSaving(true);
    try {
      const res = await drawerApi.add({
        type: txType, amount_usd: aUsd, amount_lbp: aLbp,
        reason: finalReason, note: note.trim() || null,
        actor: "admin", company_id: companyId || null,
      });
      if (!res?.ok) return setMsg({ text: "Failed to save transaction.", ok: false });
      setMsg({ text: `${txType === "IN" ? "Cash In" : "Cash Out"} saved — USD ${usd(aUsd)} / LBP ${lbp(aLbp)}`, ok: true });
      setAmountUsd(""); setAmountLbp(""); setNote("");
      await loadAll();
    } finally { setSaving(false); }
  };

  const periodLabel = useMemo(() =>
    selectedDay
      ? `${selectedDay === TODAY ? "Today" : selectedDay}`
      : (dateFrom && dateTo ? `${dateFrom} → ${dateTo}` : `Month: ${monthStr}`),
    [selectedDay, dateFrom, dateTo, monthStr]
  );

  const clearFilters = () => {
    setFilterType(""); setFilterReason(""); setFilterActor("");
    setFilterSearch(""); setDateFrom(""); setDateTo("");
    setSelectedDay(TODAY); // ← reset to today, not blank
    if (!routeCompanyId) setCompanyId("");
  };

  const hasActiveFilters = filterType || filterReason || filterActor || filterSearch
    || dateFrom || dateTo || selectedDay !== TODAY || (!routeCompanyId && companyId);

  return (
    <Box>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3, border: "1px solid", borderColor: "grey.200",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={900}>Cash Drawer</Typography>
          <Typography variant="body2" sx={{ opacity: 0.65 }}>Track all cash in and out of the drawer.</Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap" }}>
          <Chip label={`All-time USD: ${usd(allTimeBal.balance_usd)} $`}
            color={allTimeBal.balance_usd >= 0 ? "success" : "error"} sx={{ fontWeight: 800, fontSize: 12 }} />
          <Chip label={`All-time LBP: ${lbp(allTimeBal.balance_lbp)} L.L`}
            color={allTimeBal.balance_lbp >= 0 ? "info" : "error"} sx={{ fontWeight: 800, fontSize: 12 }} />
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker label="Month" views={["year","month"]} openTo="month" value={viewMonth}
              onChange={v => { if (v) { setViewMonth(v); setSelectedDay(""); } }}
              slotProps={{ textField: { sx: { width: 180 } } }} />
          </LocalizationProvider>
        </Box>
      </Paper>

      {/* ── Summary strip ───────────────────────────────────────────────── */}
      <SummaryStrip summary={summary} allTimeBal={allTimeBal} label={periodLabel} />

      {/* ── Daily table ─────────────────────────────────────────────────── */}
      <DailyTable dailyRows={dailyRows} selectedDay={selectedDay} onSelectDay={setSelectedDay} />

      {/* ── Add transaction form ─────────────────────────────────────────── */}
      <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3, border: "1px solid", borderColor: "grey.200" }}>
        <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>Add Transaction</Typography>
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "flex-start" }}>
          <Box sx={{ display: "flex", gap: 1 }}>
            {["IN","OUT"].map(t => (
              <Button key={t} variant={txType === t ? "contained" : "outlined"}
                color={t === "IN" ? "success" : "error"} onClick={() => setTxType(t)}
                sx={{ fontWeight: 800, minWidth: 100, height: 56 }}>
                {t === "IN" ? "+ CASH IN" : "− CASH OUT"}
              </Button>
            ))}
          </Box>
          <TextField label="Amount USD" value={amountUsd} onChange={e => setAmountUsd(e.target.value)}
            sx={{ width: 150 }} inputProps={{ inputMode: "decimal" }}
            InputProps={{ startAdornment: <Typography sx={{ mr: 0.5, fontWeight: 700, color: "text.secondary" }}>$</Typography> }} />
          <TextField label="Amount LBP" value={amountLbp} onChange={e => setAmountLbp(e.target.value)}
            sx={{ width: 170 }} inputProps={{ inputMode: "decimal" }}
            InputProps={{ startAdornment: <Typography sx={{ mr: 0.5, fontWeight: 700, color: "text.secondary" }}>LBP</Typography> }} />
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Reason</InputLabel>
            <Select label="Reason" value={reason} onChange={e => setReason(e.target.value)}>
              {REASON_OPTIONS.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </Select>
          </FormControl>
          {reason === "OTHER" && (
            <TextField label="Custom reason" value={customReason}
              onChange={e => setCustomReason(e.target.value)} sx={{ minWidth: 180 }} />
          )}
          <TextField label="Note (optional)" value={note}
            onChange={e => setNote(e.target.value)} sx={{ flex: 1, minWidth: 200 }} />
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

      {/* ── Transactions table ───────────────────────────────────────────── */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "grey.200", overflow: "hidden" }}>
        <Box sx={{ px: 2, py: 1.5, display: "flex", alignItems: "center",
          gap: 1.5, flexWrap: "wrap", bgcolor: "grey.50",
          borderBottom: "1px solid", borderColor: "grey.200" }}>
          <Typography variant="subtitle1" fontWeight={800} sx={{ flexGrow: 1 }}>
            Transactions · {periodLabel}
          </Typography>

          {!routeCompanyId && companies.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Company</InputLabel>
              <Select label="Company" value={companyId} onChange={e => setCompanyId(e.target.value)}>
                <MenuItem value="">All Companies</MenuItem>
                {companies.map(c => <MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>)}
              </Select>
            </FormControl>
          )}

          <TextField size="small" placeholder="Search note / reason…"
            value={filterSearch} onChange={e => setFilterSearch(e.target.value)} sx={{ width: 190 }} />

          <FormControl size="small" sx={{ minWidth: 110 }}>
            <InputLabel>Type</InputLabel>
            <Select label="Type" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="IN">Cash In</MenuItem>
              <MenuItem value="OUT">Cash Out</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Reason</InputLabel>
            <Select label="Reason" value={filterReason} onChange={e => setFilterReason(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              {REASON_OPTIONS.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              <MenuItem value="INVOICE_DELETED">INVOICE_DELETED</MenuItem>
            </Select>
          </FormControl>

          {actors.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Actor</InputLabel>
              <Select label="Actor" value={filterActor} onChange={e => setFilterActor(e.target.value)}>
                <MenuItem value="">All</MenuItem>
                {actors.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
              </Select>
            </FormControl>
          )}

          <TextField size="small" type="date" label="From"
            InputLabelProps={{ shrink: true }} sx={{ width: 145 }}
            value={dateFrom} onChange={e => { setDateFrom(e.target.value); setSelectedDay(""); }} />
          <TextField size="small" type="date" label="To"
            InputLabelProps={{ shrink: true }} sx={{ width: 145 }}
            value={dateTo} onChange={e => { setDateTo(e.target.value); setSelectedDay(""); }} />

          {/* Today button — quick jump back to today */}
          <Button size="small" variant={selectedDay === TODAY ? "contained" : "outlined"}
            color="primary" onClick={() => { setSelectedDay(TODAY); setDateFrom(""); setDateTo(""); }}
            sx={{ fontWeight: 700, height: 40 }}>
            Today
          </Button>

          {hasActiveFilters && (
            <Button size="small" color="error" variant="outlined"
              onClick={clearFilters} sx={{ fontWeight: 700, height: 40 }}>
              Clear
            </Button>
          )}

          {selectedDay && (
            <Chip label={selectedDay === TODAY ? "Today" : `Day: ${selectedDay}`}
              onDelete={() => setSelectedDay("")}
              color="primary" size="small" sx={{ fontWeight: 700 }} />
          )}
        </Box>

        <Table size="small" sx={{ minWidth: 750 }}>
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
              <TableRow key={r.id} hover sx={{
                bgcolor: r.type === "IN" ? "rgba(46,125,50,0.04)" : "rgba(211,47,47,0.04)",
                "&:last-child td": { border: 0 } }}>
                <TableCell sx={{ opacity: 0.45, fontFamily: "monospace", fontSize: 11 }}>{idx + 1}</TableCell>
                <TableCell sx={{ whiteSpace: "nowrap", fontSize: 12 }}>
                  {r.created_at ? bFormat(r.created_at, "DD/MM/YYYY HH:mm") : "—"}
                </TableCell>
                <TableCell>
                  <Chip label={r.type} size="small" color={r.type === "IN" ? "success" : "error"}
                    sx={{ fontWeight: 800, minWidth: 52 }} />
                </TableCell>
                <TableCell sx={{ fontSize: 12 }}>{r.reason || "—"}</TableCell>
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
                  {Number(r.amount_lbp) > 0 ? `${r.type === "IN" ? "+" : "−"}LBP${lbp(r.amount_lbp)}` : "—"}
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
              <Typography variant="body2" fontWeight={700} color="info.dark">L.L In: +LBP{lbp(summary.total_in_lbp)}</Typography>
              <Typography variant="body2" fontWeight={700} color="error.light">L.L Out: −LBP{lbp(summary.total_out_lbp)}</Typography>
              <Typography variant="body2" fontWeight={900} color={summary.balance_lbp >= 0 ? "info.dark" : "error.dark"}>
                L.L Net: LBP{lbp(summary.balance_lbp)}
              </Typography>
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
}