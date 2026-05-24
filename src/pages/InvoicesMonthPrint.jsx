// src/pages/InvoicesMonthPrint.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Autocomplete, Box, Button, Chip, Divider, FormControl,
  InputLabel, MenuItem, Paper, Select, TextField, Typography,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import dayjs from "dayjs";
import { bFormat } from "../utils/dateUtils";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { buildReportHTML } from "../utils/InvoicePrintUtil";

const money  = (n) => (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const moneyLL = (n) => (Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
const fmtD   = (s) => s ? dayjs(s).format("DD/MM/YYYY") : "—";
const fmtDT  = (s) => s ? bFormat(s, "DD/MM/YYYY HH:mm") : "—";

function isOverdue(r) {
  if (r.status === "PAID") return false;
  if (!r.user_expiry_date) return false;
  const exp = new Date(r.user_expiry_date);
  if (isNaN(exp)) return false;
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate()) >
         new Date(exp.getFullYear(), exp.getMonth(), exp.getDate());
}

function doPrint(html, title) {
  window.api.printHtml({ html, title });
}

const MODES = [
  { key: "month",    label: "By Month",       desc: "All invoices for a selected month" },
  { key: "paid",     label: "Paid by Day",     desc: "Invoices paid on a specific date" },
  { key: "user",     label: "By User",         desc: "All invoices for a specific user" },
  { key: "range",    label: "Month Range",     desc: "All invoices between two months" },
  { key: "overdue",  label: "Overdue",         desc: "Unpaid invoices past expiry date" },
];

export default function InvoicesMonthPrint() {
  const [mode,        setMode]        = useState("month");
  const [rows,        setRows]        = useState([]);
  const [settings,    setSettings]    = useState({});
  const [users,       setUsers]       = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [msg,         setMsg]         = useState("");
  const [drawerSum,   setDrawerSum]   = useState(null);

  // filters
  const [month,       setMonth]       = useState(dayjs());
  const [monthFrom,   setMonthFrom]   = useState(dayjs().subtract(1, "month"));
  const [monthTo,     setMonthTo]     = useState(dayjs());
  const [paidDay,     setPaidDay]     = useState(dayjs());
  const [showStatus,  setShowStatus]  = useState("ALL");
  const [sortBy,      setSortBy]      = useState("name");
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    window.api.getSettings().then(setSettings).catch(() => {});
    window.api.listUsers({ limit: 9999 }).then(d => setUsers(Array.isArray(d) ? d : (d?.rows || []))).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg("");
    setDrawerSum(null);
    try {
      let filters = { status: "ALL" };
      let drawerFilters = {};

      if (mode === "month") {
        filters.month = month.format("YYYY-MM");
        if (showStatus !== "ALL") filters.status = showStatus;
        drawerFilters = { month: month.format("YYYY-MM") };
      } else if (mode === "paid") {
        filters.paidOn = paidDay.format("YYYY-MM-DD");
        filters.status = "PAID";
        drawerFilters = { day: paidDay.format("YYYY-MM-DD") };
      } else if (mode === "user") {
        if (!selectedUser) { setRows([]); setLoading(false); return; }
        filters.user_id = selectedUser.id;
      } else if (mode === "range") {
        const from = monthFrom.startOf("month");
        const to   = monthTo.startOf("month");
        const allRows = [];
        let cur = from;
        while (cur.isBefore(to) || cur.isSame(to, "month")) {
          const d = await window.api.listInvoices({ month: cur.format("YYYY-MM"), status: showStatus !== "ALL" ? showStatus : undefined });
          allRows.push(...(d || []));
          cur = cur.add(1, "month");
        }
        allRows.sort((a, b) => (a.user_name || "").localeCompare(b.user_name || ""));
        setRows(allRows);
        drawerFilters = {
          dateFrom: monthFrom.startOf("month").format("YYYY-MM-DD"),
          dateTo:   monthTo.endOf("month").format("YYYY-MM-DD"),
        };
        try {
          const ds = await window.api.drawerSummary(drawerFilters);
          setDrawerSum({ ...ds, lbp_rate: Number(settings?.lbp_rate || 0) });
        } catch {}
        setLoading(false);
        return;
      } else if (mode === "overdue") {
        filters.status = "UNPAID";
      }

      const data = await window.api.listInvoices(filters);
      let result = data || [];
      if (mode === "overdue") result = result.filter(isOverdue);
      setRows(result);

      // Fetch drawer summary for the period
      if (Object.keys(drawerFilters).length > 0) {
        try {
          const ds = await window.api.drawerSummary(drawerFilters);
          setDrawerSum({ ...ds, lbp_rate: Number(settings?.lbp_rate || 0) });
        } catch { setDrawerSum(null); }
      }

    } catch(e) {
      setMsg("Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [mode, month, monthFrom, monthTo, paidDay, showStatus, selectedUser, settings]);

  useEffect(() => { load(); }, [load]);

  const displayRows = useMemo(() => {
    let r = [...rows];
    if (sortBy === "name")   r.sort((a, b) => (a.user_name || "").localeCompare(b.user_name || ""));
    if (sortBy === "amount") r.sort((a, b) => Number(b.amount) - Number(a.amount));
    if (sortBy === "status") r.sort((a, b) => a.status.localeCompare(b.status));
    if (sortBy === "month")  r.sort((a, b) => (b.month || "").localeCompare(a.month || ""));
    return r;
  }, [rows, sortBy]);

  const summary = useMemo(() => {
    const paid   = displayRows.filter(r => r.status === "PAID");
    const unpaid = displayRows.filter(r => r.status !== "PAID");
    return {
      total:        displayRows.length,
      paidCount:    paid.length,
      unpaidCount:  unpaid.length,
      paidAmt:      paid.reduce((a, r) => a + Number(r.amount || 0), 0),
      unpaidAmt:    unpaid.reduce((a, r) => a + Number(r.amount || 0), 0),
      totalAmt:     displayRows.reduce((a, r) => a + Number(r.amount || 0), 0),
      rate:         displayRows.length ? Math.round((paid.length / displayRows.length) * 100) : 0,
    };
  }, [displayRows]);

  const printTitle = useMemo(() => {
    if (mode === "month")   return `Invoices Report — ${month.format("MMMM YYYY")}`;
    if (mode === "paid")    return `Paid on ${paidDay.format("DD/MM/YYYY")}`;
    if (mode === "user")    return `Invoices — ${selectedUser?.name || "User"}`;
    if (mode === "range")   return `Invoices ${monthFrom.format("MMM YYYY")} → ${monthTo.format("MMM YYYY")}`;
    if (mode === "overdue") return "Overdue Invoices";
    return "Invoices Report";
  }, [mode, month, paidDay, selectedUser, monthFrom, monthTo]);

  const handlePrint = () => {
    if (!displayRows.length) return;
    const html = buildReportHTML({ rows: displayRows, title: printTitle, subtitle: null, settings, drawerSummary: drawerSum });
    doPrint(html, printTitle);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ pb: 4 }}>

        {/* Header */}
        <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3, border: "1px solid", borderColor: "grey.200",
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
          <Box>
            <Typography variant="h5" fontWeight={900}>Print Invoices</Typography>
            <Typography variant="body2" sx={{ opacity: 0.65 }}>
              Choose a report type and filters, then print or save as PDF.
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrint}
            disabled={displayRows.length === 0 || loading} sx={{ fontWeight: 700, px: 3 }}>
            Print / Save PDF ({displayRows.length} rows)
          </Button>
        </Paper>

        {/* Mode selector */}
        <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3, border: "1px solid", borderColor: "grey.200" }}>
          <Typography variant="caption" fontWeight={800} sx={{ opacity: 0.55, display: "block", mb: 1.5 }}>REPORT TYPE</Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {MODES.map((m) => (
              <Box key={m.key} onClick={() => setMode(m.key)} sx={{
                px: 2, py: 1.25, borderRadius: 2, cursor: "pointer", border: "1.5px solid",
                borderColor: mode === m.key ? "primary.main" : "grey.200",
                bgcolor: mode === m.key ? "primary.50" : "white", transition: "all 0.15s",
                "&:hover": { borderColor: "primary.light" },
              }}>
                <Typography variant="body2" fontWeight={700} color={mode === m.key ? "primary.main" : "text.primary"}>{m.label}</Typography>
                <Typography variant="caption" sx={{ opacity: 0.55 }}>{m.desc}</Typography>
              </Box>
            ))}
          </Box>
        </Paper>

        {/* Filters */}
        <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3, border: "1px solid", borderColor: "grey.200" }}>
          <Typography variant="caption" fontWeight={800} sx={{ opacity: 0.55, display: "block", mb: 1.5 }}>FILTERS</Typography>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "flex-start" }}>
            {mode === "month" && (
              <DatePicker label="Month" views={["year","month"]} openTo="month"
                value={month} onChange={v => v && setMonth(v)}
                slotProps={{ textField: { sx: { width: 180 } } }} />
            )}
            {mode === "paid" && (
              <DatePicker label="Paid Date" value={paidDay} onChange={v => v && setPaidDay(v)}
                slotProps={{ textField: { sx: { width: 200 } } }} />
            )}
            {mode === "range" && (<>
              <DatePicker label="From Month" views={["year","month"]} openTo="month"
                value={monthFrom} onChange={v => v && setMonthFrom(v)}
                slotProps={{ textField: { sx: { width: 180 } } }} />
              <DatePicker label="To Month" views={["year","month"]} openTo="month"
                value={monthTo} onChange={v => v && setMonthTo(v)}
                slotProps={{ textField: { sx: { width: 180 } } }} />
            </>)}
            {mode === "user" && (
              <Autocomplete options={users} value={selectedUser} onChange={(_, v) => setSelectedUser(v)}
                getOptionKey={(u) => u.id}
                getOptionLabel={(u) => u ? `${u.name}${u.mobile ? " · "+u.mobile : ""}` : ""}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                sx={{ width: 320 }}
                renderInput={(params) => <TextField {...params} label="Select User" />} />
            )}
            {(mode === "month" || mode === "range") && (
              <FormControl sx={{ minWidth: 140 }}>
                <InputLabel>Status</InputLabel>
                <Select label="Status" value={showStatus} onChange={e => setShowStatus(e.target.value)}>
                  <MenuItem value="ALL">All</MenuItem>
                  <MenuItem value="PAID">Paid only</MenuItem>
                  <MenuItem value="UNPAID">Unpaid only</MenuItem>
                </Select>
              </FormControl>
            )}
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Sort by</InputLabel>
              <Select label="Sort by" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <MenuItem value="name">Name (A→Z)</MenuItem>
                <MenuItem value="amount">Amount (High→Low)</MenuItem>
                <MenuItem value="status">Status</MenuItem>
                <MenuItem value="month">Month</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Paper>

        {/* Summary strip */}
        {displayRows.length > 0 && (
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: 1.5, mb: 2 }}>
            {[
              { label: "Total Rows",     val: summary.total,                                        color: "text.primary" },
              { label: "Paid",           val: `${summary.paidCount} · $${money(summary.paidAmt)}`,  color: "success.main" },
              { label: "Unpaid",         val: `${summary.unpaidCount} · $${money(summary.unpaidAmt)}`, color: "error.main" },
              { label: "Grand Total",    val: `$${money(summary.totalAmt)}`,                         color: "primary.main" },
              { label: "Collection",     val: `${summary.rate}%`,                                    color: summary.rate >= 80 ? "success.main" : "warning.main" },
              ...(drawerSum ? [
                { label: "Cash USD",     val: `$${money(drawerSum.total_in_usd || 0)}`,              color: "info.main" },
                { label: "Cash L.L",     val: `L.L${moneyLL(drawerSum.total_in_lbp || 0)}`,          color: "info.dark" },
              ] : []),
            ].map(s => (
              <Paper key={s.label} elevation={0} sx={{ px: 2, py: 1.5, borderRadius: 2, border: "1px solid", borderColor: "grey.200" }}>
                <Typography variant="caption" sx={{ opacity: 0.6, display: "block" }}>{s.label}</Typography>
                <Typography fontWeight={800} color={s.color}>{s.val}</Typography>
              </Paper>
            ))}
          </Box>
        )}

        {msg && <Typography color="error" sx={{ mb: 2 }}>{msg}</Typography>}

        {/* Preview Table */}
        <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "grey.200", overflow: "hidden" }}>
          <Box sx={{ px: 2, py: 1.5, bgcolor: "grey.50", borderBottom: "1px solid", borderColor: "grey.200",
            display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="subtitle1" fontWeight={800} sx={{ flexGrow: 1 }}>
              Preview — {printTitle}
            </Typography>
            {loading && <Typography variant="caption" sx={{ opacity: 0.5 }}>Loading…</Typography>}
            <Chip label={`${summary.paidCount} Paid`}   color="success" size="small" sx={{ fontWeight: 700 }} />
            <Chip label={`${summary.unpaidCount} Unpaid`} color="error" size="small" sx={{ fontWeight: 700 }} />
            {drawerSum && (
              <>
                <Chip label={`$${money(drawerSum.total_in_usd||0)} collected`} color="info" size="small" sx={{ fontWeight: 700 }} />
                <Chip label={`L.L${moneyLL(drawerSum.total_in_lbp||0)}`} color="info" variant="outlined" size="small" sx={{ fontWeight: 700 }} />
              </>
            )}
          </Box>

          {displayRows.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 6, opacity: 0.4 }}>
              <Typography>{loading ? "Loading…" : "No invoices match the selected filters."}</Typography>
            </Box>
          ) : (
            <Box sx={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#111", color: "#fff" }}>
                    {["#","Invoice #","User","Mobile","Service","Month","Type","Status","Paid Date","Amount"].map((h, i) => (
                      <th key={h} style={{ padding: "6px 8px", textAlign: i === 9 ? "right" : "left",
                        fontWeight: 700, fontSize: 11, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((r, idx) => {
                    const overdue = isOverdue(r);
                    const isPaid  = r.status === "PAID";
                    const type    = Number(r.affects_expiry) === 0 ? "STATIC" : "SUB";
                    const rowBg   = isPaid ? "rgba(46,125,50,0.05)" : overdue ? "rgba(211,47,47,0.05)" : idx%2===0?"#fff":"#fafafa";
                    const sLabel  = isPaid ? "PAID" : overdue ? "OVERDUE" : "UNPAID";
                    const sColor  = isPaid ? "success" : "error";
                    return (
                      <tr key={r.id} style={{ background: rowBg, borderBottom: "1px solid #eee" }}>
                        <td style={{ padding: "4px 8px", opacity: 0.4, fontFamily: "monospace", fontSize: 11 }}>{idx+1}</td>
                        <td style={{ padding: "4px 8px", fontFamily: "monospace", fontSize: 10 }}>{r.invoice_number}</td>
                        <td style={{ padding: "4px 8px", fontWeight: 600 }}>{r.user_name}</td>
                        <td style={{ padding: "4px 8px", opacity: 0.75, fontSize: 12 }}>{r.user_mobile || "—"}</td>
                        <td style={{ padding: "4px 8px", fontSize: 12 }}>{r.user_service || "—"}</td>
                        <td style={{ padding: "4px 8px", fontWeight: 600 }}>{r.month}</td>
                        <td style={{ padding: "4px 8px" }}>
                          <span style={{ display:"inline-block", padding:"1px 6px", borderRadius:3, fontSize:9,
                            fontWeight:700, background: type==="SUB"?"#e3f2fd":"#fff3e0",
                            color: type==="SUB"?"#0d47a1":"#bf360c" }}>{type}</span>
                        </td>
                        <td style={{ padding: "4px 8px" }}>
                          <Chip label={sLabel} color={sColor} size="small" sx={{ fontWeight: 700, fontSize: 10 }} />
                        </td>
                        <td style={{ padding: "4px 8px", fontSize: 11, opacity: 0.75 }}>{fmtDT(r.paid_at)}</td>
                        <td style={{ padding: "4px 8px", textAlign: "right", fontWeight: 800, fontFamily: "monospace" }}>
                          ${money(r.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: "#f4f4f4", borderTop: "2.5px solid #111" }}>
                    <td colSpan={8} style={{ padding: "6px 8px", fontWeight: 700, fontSize: 12 }}>
                      Paid: <strong>${money(summary.paidAmt)}</strong>
                      &nbsp;·&nbsp; Unpaid: <strong>${money(summary.unpaidAmt)}</strong>
                      {drawerSum && <>&nbsp;·&nbsp; Cash USD: <strong>${money(drawerSum.total_in_usd||0)}</strong>&nbsp;·&nbsp; Cash L.L: <strong>L.L{moneyLL(drawerSum.total_in_lbp||0)}</strong></>}
                      &nbsp;·&nbsp; Rows: <strong>{displayRows.length}</strong>
                    </td>
                    <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 900 }}>TOTAL</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 900, fontFamily: "monospace", fontSize: 14 }}>
                      ${money(summary.totalAmt)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </Box>
          )}
        </Paper>
      </Box>
    </LocalizationProvider>
  );
}