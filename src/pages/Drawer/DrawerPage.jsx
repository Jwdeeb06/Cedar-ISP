import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import { bFormat } from "../../utils/dateUtils";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { drawerApi } from "../../services/drawerApi";

// ── helpers ──────────────────────────────────────────────────────────────────
function money(n) {
  const x = Number(n) || 0;
  return x.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const REASON_OPTIONS = [
  "PAYMENT",
  "SALARY",
  "RENT",
  "EQUIPMENT",
  "UTILITY",
  "REFUND",
  "TRANSFER",
  "EXPENSE",
  "OTHER",
];

// ── Balance strip ─────────────────────────────────────────────────────────────
function BalanceStrip({ balance, totalIn, totalOut, txCount, label }) {
  const positive = Number(balance) >= 0;

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 2,
        mb: 2,
      }}
    >
      {/* Main balance */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 3,
          border: "2px solid",
          borderColor: positive ? "success.main" : "error.main",
          bgcolor: positive ? "success.50" : "error.50",
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 800, opacity: 0.7 }}>
          {label || "Balance"}
        </Typography>
        <Typography
          variant="h4"
          sx={{ fontWeight: 900, color: positive ? "success.dark" : "error.dark", mt: 0.25 }}
        >
          {money(balance)}
        </Typography>
      </Paper>

      {/* IN */}
      <Paper
        elevation={0}
        sx={{ p: 2, borderRadius: 3, border: "1px solid", borderColor: "grey.200" }}
      >
        <Typography variant="caption" sx={{ fontWeight: 800, opacity: 0.6 }}>
          Cash In
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 900, color: "success.main", mt: 0.25 }}>
          + {money(totalIn)}
        </Typography>
      </Paper>

      {/* OUT */}
      <Paper
        elevation={0}
        sx={{ p: 2, borderRadius: 3, border: "1px solid", borderColor: "grey.200" }}
      >
        <Typography variant="caption" sx={{ fontWeight: 800, opacity: 0.6 }}>
          Cash Out
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 900, color: "error.main", mt: 0.25 }}>
          − {money(totalOut)}
        </Typography>
      </Paper>

      {/* Count */}
      <Paper
        elevation={0}
        sx={{ p: 2, borderRadius: 3, border: "1px solid", borderColor: "grey.200" }}
      >
        <Typography variant="caption" sx={{ fontWeight: 800, opacity: 0.6 }}>
          Transactions
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.25 }}>
          {txCount}
        </Typography>
      </Paper>
    </Box>
  );
}

// ── Daily summary row cards ───────────────────────────────────────────────────
function DailyCards({ dailyRows, selectedDay, onSelectDay }) {
  if (!dailyRows.length) return null;

  return (
    <Paper
      elevation={0}
      sx={{ p: 2, mb: 2, borderRadius: 3, border: "1px solid", borderColor: "grey.200" }}
    >
      <Typography variant="caption" sx={{ fontWeight: 800, opacity: 0.6, display: "block", mb: 1 }}>
        Daily Breakdown (click to filter)
      </Typography>

      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        {dailyRows.map((d) => {
          const net     = Number(d.total_in) - Number(d.total_out);
          const active  = selectedDay === d.day;
          const pos     = net >= 0;

          return (
            <Paper
              key={d.day}
              elevation={0}
              onClick={() => onSelectDay(active ? "" : d.day)}
              sx={{
                p: 1.5,
                minWidth: 140,
                borderRadius: 2,
                border: "1px solid",
                borderColor: active ? (pos ? "success.main" : "error.main") : "grey.200",
                bgcolor: active ? (pos ? "success.50" : "error.50") : "common.white",
                cursor: "pointer",
                transition: "all 0.15s",
                "&:hover": { borderColor: pos ? "success.light" : "error.light" },
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 800, opacity: 0.65 }}>
                {d.day}
              </Typography>

              <Typography
                variant="body1"
                sx={{ fontWeight: 900, color: pos ? "success.dark" : "error.dark" }}
              >
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

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DrawerPage() {
  // ── view state
  const { companyId: routeCompanyId } = useParams();
  const [viewMonth,   setViewMonth]   = useState(dayjs());
  const [companies,   setCompanies]   = useState([]);
  const [companyId,   setCompanyId]   = useState(routeCompanyId || "");
  const [selectedDay, setSelectedDay]   = useState(""); // YYYY-MM-DD or ""
  const [filterType,   setFilterType]   = useState("");
  const [filterReason, setFilterReason] = useState("");
  const [filterActor,  setFilterActor]  = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [dateFrom,     setDateFrom]     = useState("");
  const [dateTo,       setDateTo]       = useState("");
  const [actors,       setActors]       = useState([]);

  // ── data
  const [rows, setRows]         = useState([]);
  const [summary, setSummary]   = useState({ total_in: 0, total_out: 0, balance: 0, tx_count: 0 });
  const [allTimeBal, setAllTimeBal] = useState(0);
  const [dailyRows, setDailyRows]   = useState([]);

  // ── form
  const [txType, setTxType]     = useState("IN");
  const [amount, setAmount]     = useState("");
  const [reason, setReason]     = useState("PAYMENT");
  const [customReason, setCustomReason] = useState("");
  const [note, setNote]         = useState("");
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState({ text: "", ok: true });

  // (no delete state needed — drawer transactions are permanent)

  const monthStr = viewMonth ? viewMonth.format("YYYY-MM") : "";

  // ── loaders ────────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    const company = companyId || null;

    // Row filters include all active filters
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

    // Summary only uses time + company (not type/reason/actor)
    const sumFilters = { ...baseTime, company_id: company };

    const [txRows, sumData, daily, bal, actorList] = await Promise.all([
      drawerApi.list(rowFilters),
      drawerApi.summary(sumFilters),
      drawerApi.dailyList({ month: monthStr }),
      drawerApi.balance(company ? { company_id: company } : {}),
      (window.api.drawerActors ? window.api.drawerActors({ company_id: company }).catch(() => []) : Promise.resolve([])),
    ]);

    setRows(txRows || []);
    setSummary(sumData || { total_in: 0, total_out: 0, balance: 0, tx_count: 0 });
    setDailyRows(daily || []);
    setAllTimeBal(Number(bal?.balance || 0));
    setActors(actorList || []);
  }, [monthStr, selectedDay, filterType, filterReason, filterActor, filterSearch,
      dateFrom, dateTo, companyId]);

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

  // ── submit ─────────────────────────────────────────────────────────────────
  const submit = async () => {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return setMsg({ text: "Enter a valid amount.", ok: false });
    }

    const finalReason = reason === "OTHER" ? (customReason.trim() || "OTHER") : reason;

    setSaving(true);
    try {
      const res = await drawerApi.add({
        type:       txType,
        amount:     amt,
        reason:     finalReason,
        note:       note.trim() || null,
        actor:      "admin",
        company_id: companyId || null,
      });

      if (!res?.ok) return setMsg({ text: "Failed to save transaction.", ok: false });

      setMsg({ text: `${txType === "IN" ? "Cash In" : "Cash Out"} of ${money(amt)} saved.`, ok: true });
      setAmount("");
      setNote("");
      await loadAll();
    } finally {
      setSaving(false);
    }
  };

  // ── derived label ──────────────────────────────────────────────────────────
  const periodLabel = useMemo(() => {
    if (selectedDay) return `Day: ${selectedDay}`;
    return `Month: ${monthStr}`;
  }, [selectedDay, monthStr]);

  return (
    <Box>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2,
          borderRadius: 3,
          border: "1px solid",
          borderColor: "grey.200",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 900 }}>
            Cash Drawer
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.65 }}>
            Track all cash in and out of the drawer.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap" }}>
          <Chip
            label={`All-time balance: ${money(allTimeBal)}`}
            color={allTimeBal >= 0 ? "success" : "error"}
            sx={{ fontWeight: 800, fontSize: 13 }}
          />

          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Month"
              views={["year", "month"]}
              openTo="month"
              value={viewMonth}
              onChange={(v) => { if (v) { setViewMonth(v); setSelectedDay(""); } }}
              slotProps={{ textField: { sx: { width: 180 } } }}
            />
          </LocalizationProvider>
        </Box>
      </Paper>

      {/* ── Period summary strip ──────────────────────────────────────────── */}
      <BalanceStrip
        balance={summary.balance}
        totalIn={summary.total_in}
        totalOut={summary.total_out}
        txCount={rows.length}
        label={periodLabel}
      />

      {/* ── Daily cards ──────────────────────────────────────────────────── */}
      <DailyCards
        dailyRows={dailyRows}
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
      />

      {/* ── Add transaction form ──────────────────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{ p: 2, mb: 2, borderRadius: 3, border: "1px solid", borderColor: "grey.200" }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>
          Add Transaction
        </Typography>

        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "flex-start" }}>
          {/* Type toggle */}
          <Box sx={{ display: "flex", gap: 1 }}>
            {["IN", "OUT"].map((t) => (
              <Button
                key={t}
                variant={txType === t ? "contained" : "outlined"}
                color={t === "IN" ? "success" : "error"}
                onClick={() => setTxType(t)}
                sx={{ fontWeight: 800, minWidth: 90 }}
              >
                {t === "IN" ? "＋ Cash In" : "－ Cash Out"}
              </Button>
            ))}
          </Box>

          {/* Amount */}
          <TextField
            label="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            sx={{ width: 160 }}
            inputProps={{ inputMode: "decimal" }}
          />

          {/* Reason */}
          <FormControl sx={{ minWidth: 160 }}>
            <InputLabel>Reason</InputLabel>
            <Select
              label="Reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              {REASON_OPTIONS.map((r) => (
                <MenuItem key={r} value={r}>{r}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {reason === "OTHER" && (
            <TextField
              label="Custom reason"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              sx={{ minWidth: 180 }}
            />
          )}

          {/* Note */}
          <TextField
            label="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            sx={{ flex: 1, minWidth: 200 }}
          />

          {/* Submit */}
          <Button
            variant="contained"
            onClick={submit}
            disabled={saving || !amount}
            sx={{
              height: 56,
              px: 3,
              fontWeight: 800,
              bgcolor: txType === "IN" ? "success.main" : "error.main",
              "&:hover": {
                bgcolor: txType === "IN" ? "success.dark" : "error.dark",
              },
            }}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </Box>

        {/* Inline message */}
        {msg.text && (
          <Box
            sx={{
              mt: 1.5,
              px: 2,
              py: 1,
              borderRadius: 2,
              bgcolor: msg.ok ? "success.50" : "error.50",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {msg.text}
            </Typography>
            <IconButton size="small" onClick={() => setMsg({ text: "", ok: true })}>
              ✕
            </IconButton>
          </Box>
        )}
      </Paper>

      {/* ── Transactions table ────────────────────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{ borderRadius: 3, border: "1px solid", borderColor: "grey.200", overflow: "hidden" }}
      >
        {/* Table toolbar */}
        <Box sx={{ px: 2, py: 1.5, display: "flex", alignItems: "center",
          gap: 1.5, flexWrap: "wrap", bgcolor: "grey.50",
          borderBottom: "1px solid", borderColor: "grey.200" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, flexGrow: 1 }}>
            Transactions · {periodLabel}
          </Typography>

          {/* Company filter — only shown on All Combined view */}
          {!routeCompanyId && companies.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Company</InputLabel>
              <Select label="Company" value={companyId}
                onChange={e => setCompanyId(e.target.value)}>
                <MenuItem value="">All Companies</MenuItem>
                {companies.map(c => (
                  <MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Search */}
          <TextField size="small" placeholder="Search note / reason…"
            value={filterSearch} onChange={e => setFilterSearch(e.target.value)}
            sx={{ width: 190 }} />

          {/* Type */}
          <FormControl size="small" sx={{ minWidth: 110 }}>
            <InputLabel>Type</InputLabel>
            <Select label="Type" value={filterType}
              onChange={e => setFilterType(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="IN">Cash In</MenuItem>
              <MenuItem value="OUT">Cash Out</MenuItem>
            </Select>
          </FormControl>

          {/* Reason */}
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Reason</InputLabel>
            <Select label="Reason" value={filterReason}
              onChange={e => setFilterReason(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              {REASON_OPTIONS.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              <MenuItem value="INVOICE_DELETED">INVOICE_DELETED</MenuItem>
            </Select>
          </FormControl>

          {/* Actor */}
          {actors.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Actor</InputLabel>
              <Select label="Actor" value={filterActor}
                onChange={e => setFilterActor(e.target.value)}>
                <MenuItem value="">All</MenuItem>
                {actors.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
              </Select>
            </FormControl>
          )}

          {/* Date range */}
          <TextField size="small" type="date" label="From"
            InputLabelProps={{ shrink: true }} sx={{ width: 145 }}
            value={dateFrom} onChange={e => { setDateFrom(e.target.value); setSelectedDay(""); }} />
          <TextField size="small" type="date" label="To"
            InputLabelProps={{ shrink: true }} sx={{ width: 145 }}
            value={dateTo} onChange={e => { setDateTo(e.target.value); setSelectedDay(""); }} />

          {/* Clear filters */}
          {(filterType || filterReason || filterActor || filterSearch || dateFrom || dateTo || selectedDay || (!routeCompanyId && companyId)) && (
            <Button size="small" color="error" variant="outlined"
              onClick={() => {
                setFilterType(""); setFilterReason(""); setFilterActor("");
                setFilterSearch(""); setDateFrom(""); setDateTo(""); setSelectedDay("");
                if (!routeCompanyId) setCompanyId("");
              }}
              sx={{ fontWeight: 700, height: 40 }}>
              Clear
            </Button>
          )}

          {selectedDay && (
            <Chip label={`Day: ${selectedDay}`} onDelete={() => setSelectedDay("")}
              color="primary" size="small" sx={{ fontWeight: 700 }} />
          )}
        </Box>

        <Table size="small" sx={{ minWidth: 650 }}>
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
                <TableCell colSpan={8} sx={{ textAlign: "center", py: 4, opacity: 0.5 }}>
                  No transactions for this period.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r, idx) => (
                <TableRow
                  key={r.id}
                  hover
                  sx={{
                    bgcolor:
                      r.type === "IN"
                        ? "rgba(46,125,50,0.04)"
                        : "rgba(211,47,47,0.04)",
                    "&:last-child td": { border: 0 },
                  }}
                >
                  <TableCell sx={{ opacity: 0.45, fontFamily: "monospace", fontSize: 11 }}>
                    {idx + 1}
                  </TableCell>

                  <TableCell sx={{ whiteSpace: "nowrap", fontSize: 12 }}>
                    {r.created_at ? bFormat(r.created_at, "DD/MM/YYYY HH:mm") : "—"}
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={r.type}
                      size="small"
                      color={r.type === "IN" ? "success" : "error"}
                      sx={{ fontWeight: 800, minWidth: 52 }}
                    />
                  </TableCell>

                  <TableCell sx={{ fontSize: 12 }}>{r.reason || "—"}</TableCell>

                  <TableCell sx={{ fontSize: 12, opacity: 0.75, maxWidth: 220 }}>
                    {r.note || "—"}
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={r.actor || "system"}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: 11, fontWeight: 600 }}
                    />
                  </TableCell>

                  <TableCell
                    align="right"
                    sx={{
                      fontWeight: 900,
                      fontFamily: "monospace",
                      color: r.type === "IN" ? "success.dark" : "error.dark",
                      fontSize: 14,
                    }}
                  >
                    {r.type === "IN" ? "+" : "−"}{money(r.amount)}
                  </TableCell>

                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {rows.length > 0 && (
          <>
            <Divider />
            <Box
              sx={{
                px: 2,
                py: 1,
                display: "flex",
                justifyContent: "flex-end",
                gap: 3,
                bgcolor: "grey.50",
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 700, color: "success.dark" }}>
                In: +{money(summary.total_in)}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "error.dark" }}>
                Out: −{money(summary.total_out)}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 900,
                  color: summary.balance >= 0 ? "success.dark" : "error.dark",
                }}
              >
                Net: {money(summary.balance)}
              </Typography>
            </Box>
          </>
        )}
      </Paper>

    </Box>
  );
}