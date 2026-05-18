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

// ── helpers ───────────────────────────────────────────────────────────────────
const money = (n) => (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtD  = (s) => s ? dayjs(s).format("DD/MM/YYYY") : "—";
const fmtDT = (s) => s ? bFormat(s, "DD/MM/YYYY HH:mm") : "—";

function isOverdue(r) {
  if (r.status === "PAID") return false;
  if (!r.user_expiry_date) return false;
  const exp = new Date(r.user_expiry_date);
  if (isNaN(exp)) return false;
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate()) >
         new Date(exp.getFullYear(), exp.getMonth(), exp.getDate());
}

// ── Print via Electron IPC (full preview, multi-page safe) ───────────────────
function doPrint(html, title) {
  window.api.printHtml({ html, title });
}

// ── Build full report HTML ─────────────────────────────────────────────────────
function buildReportHTML({ rows, title, subtitle, settings }) {
  const isp = settings || {};
  const now = dayjs().format("DD/MM/YYYY HH:mm");
  const paid    = rows.filter(r => r.status === "PAID");
  const unpaid  = rows.filter(r => r.status !== "PAID");
  const paidAmt  = paid.reduce((a, r) => a + Number(r.amount || 0), 0);
  const unpaidAmt = unpaid.reduce((a, r) => a + Number(r.amount || 0), 0);
  const totalAmt  = rows.reduce((a, r) => a + Number(r.amount || 0), 0);
  const rate = rows.length ? Math.round((paid.length / rows.length) * 100) : 0;

  const rowsHtml = rows.map((r, i) => {
    const overdue = isOverdue(r);
    const isPaid  = r.status === "PAID";
    const type    = Number(r.affects_expiry) === 0 ? "STATIC" : "SUB";
    const rowBg   = isPaid ? "#f1f8f2" : overdue ? "#fdf3f3" : i % 2 === 0 ? "#fff" : "#fafafa";
    const sLabel  = isPaid ? "PAID" : overdue ? "OVERDUE" : "UNPAID";
    const sColor  = isPaid ? "#1a5928" : overdue ? "#b71c1c" : "#7b1528";
    const sBg     = isPaid ? "#d4edda" : overdue ? "#ffccbc" : "#f8d7da";
    return `<tr style="background:${rowBg};border-bottom:1px solid #eee;">
      <td style="padding:4px 6px;font-size:8pt;opacity:0.4;font-family:monospace;">${i + 1}</td>
      <td style="padding:4px 6px;font-size:8pt;font-family:monospace;">${r.invoice_number || ""}</td>
      <td style="padding:4px 6px;font-weight:600;">${r.user_name || ""}</td>
      <td style="padding:4px 6px;font-size:9pt;opacity:0.8;">${r.user_mobile || "—"}</td>
      <td style="padding:4px 6px;font-size:9pt;">${r.user_service || "—"}</td>
      <td style="padding:4px 6px;font-size:9pt;">${r.month || "—"}</td>
      <td style="padding:4px 6px;"><span style="display:inline-block;padding:1px 5px;border-radius:3px;font-size:7.5pt;font-weight:700;background:${type==="SUB"?"#e3f2fd":"#fff3e0"};color:${type==="SUB"?"#0d47a1":"#bf360c"};">${type}</span></td>
      <td style="padding:4px 6px;"><span style="display:inline-block;padding:1px 5px;border-radius:3px;font-size:7.5pt;font-weight:800;background:${sBg};color:${sColor};">${sLabel}</span></td>
      <td style="padding:4px 6px;font-size:8.5pt;font-family:monospace;">${fmtD(r.paid_at)}</td>
      <td style="padding:4px 6px;text-align:right;font-weight:800;font-family:monospace;">$${money(r.amount)}</td>
    </tr>`;
  }).join("");

  return `<!doctype html><html><head><meta charset="utf-8"/><title>${title}</title>
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  @page{size:A4 landscape;margin:12mm 10mm 16mm 10mm;}
  body{font-family:Arial,sans-serif;font-size:10pt;color:#111;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  table{width:100%;border-collapse:collapse;}
  thead tr{background:#111;color:#fff;}
  thead th{padding:5px 6px;text-align:left;font-size:7.5pt;font-weight:700;letter-spacing:.3px;white-space:nowrap;}
  thead th.r{text-align:right;}
  tbody tr{border-bottom:1px solid #eee;break-inside:avoid;}
  tfoot tr{background:#f4f4f4;border-top:2.5px solid #111;}
  tfoot td{padding:6px;font-weight:900;font-size:9pt;}
</style>
</head><body>
<div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #111;padding-bottom:10px;margin-bottom:12px;">
  <div>
    <div style="font-size:18pt;font-weight:900;">${isp.isp_name || "ISP Company"}</div>
    <div style="font-size:8pt;color:#555;margin-top:2px;">${isp.isp_number ? "Reg: " + isp.isp_number + "  ·  " : ""}${isp.isp_phone || ""}${isp.isp_address ? "  ·  " + isp.isp_address : ""}</div>
  </div>
  <div style="text-align:right;">
    <div style="font-size:13pt;font-weight:800;">${title}</div>
    ${subtitle ? `<div style="font-size:8.5pt;color:#555;margin-top:2px;">${subtitle}</div>` : ""}
    <div style="font-size:8pt;color:#666;margin-top:2px;">Printed: ${now}</div>
    <div style="font-size:8pt;color:#666;">Total rows: <b>${rows.length}</b></div>
  </div>
</div>

<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:14px;">
  ${[
    {l:"Paid Total",    v:"$"+money(paidAmt),  bg:"#f1f8f2", bc:"#2e7d32"},
    {l:"Unpaid Total",  v:"$"+money(unpaidAmt),bg:"#fdf3f3", bc:"#c62828"},
    {l:"Grand Total",   v:"$"+money(totalAmt), bg:"#f0f4ff", bc:"#1565c0"},
    {l:"Collection",    v:rate+"%",            bg:"#f8f2ff", bc:"#6a1b9a"},
    {l:"Invoices",      v:paid.length+"/"+rows.length, bg:"#f7f7f7", bc:"#777"},
  ].map(c=>`<div style="border:1.5px solid ${c.bc};border-radius:6px;padding:8px 10px;background:${c.bg};">
    <div style="font-size:7pt;font-weight:700;opacity:.65;text-transform:uppercase;letter-spacing:.4px;">${c.l}</div>
    <div style="font-size:13pt;font-weight:900;margin-top:2px;">${c.v}</div>
  </div>`).join("")}
</div>

<table>
  <thead><tr>
    <th>#</th><th>Invoice #</th><th>User</th><th>Mobile</th>
    <th>Service</th><th>Month</th><th>Type</th><th>Status</th>
    <th>Paid Date</th><th class="r">Amount</th>
  </tr></thead>
  <tbody>${rowsHtml}</tbody>
  <tfoot><tr>
    <td colspan="8" style="padding:6px;">
      Paid: <b>$${money(paidAmt)}</b> &nbsp;·&nbsp;
      Unpaid: <b>$${money(unpaidAmt)}</b> &nbsp;·&nbsp;
      Rows: <b>${rows.length}</b>
    </td>
    <td style="text-align:right;padding:6px;">TOTAL</td>
    <td style="text-align:right;font-family:monospace;font-size:12pt;padding:6px;">$${money(totalAmt)}</td>
  </tr></tfoot>
</table>

<div style="margin-top:12px;padding-top:8px;border-top:1px solid #ddd;display:flex;justify-content:space-between;font-size:8pt;color:#666;">
  <span>Generated by ISP Management System · ${dayjs().format("YYYY-MM-DD HH:mm:ss")}</span>
  <span>${isp.isp_name || ""}${isp.isp_phone ? " · " + isp.isp_phone : ""}</span>
</div>
</body></html>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// MODES
const MODES = [
  { key: "month",    label: "By Month",       desc: "All invoices for a selected month" },
  { key: "paid",     label: "Paid by Day",     desc: "Invoices paid on a specific date" },
  { key: "user",     label: "By User",         desc: "All invoices for a specific user (all months)" },
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

  // ── fetch based on mode ──────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      let filters = { status: "ALL" };

      if (mode === "month") {
        filters.month = month.format("YYYY-MM");
        if (showStatus !== "ALL") filters.status = showStatus;
      } else if (mode === "paid") {
        filters.paidOn = paidDay.format("YYYY-MM-DD");
        filters.status = "PAID";
      } else if (mode === "user") {
        if (!selectedUser) { setRows([]); setLoading(false); return; }
        filters.user_id = selectedUser.id;
      } else if (mode === "range") {
        // fetch each month in range
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
        setLoading(false);
        return;
      } else if (mode === "overdue") {
        // all unpaid invoices — filter overdue client-side
        filters.status = "UNPAID";
      }

      const data = await window.api.listInvoices(filters);
      let result = data || [];

      if (mode === "overdue") {
        result = result.filter(isOverdue);
      }

      setRows(result);
    } catch(e) {
      setMsg("Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [mode, month, monthFrom, monthTo, paidDay, showStatus, selectedUser]);

  useEffect(() => { load(); }, [load]);

  // ── display rows (sorted) ───────────────────────────────────────────────────
  const displayRows = useMemo(() => {
    let r = [...rows];
    if (sortBy === "name")   r.sort((a, b) => (a.user_name || "").localeCompare(b.user_name || ""));
    if (sortBy === "amount") r.sort((a, b) => Number(b.amount) - Number(a.amount));
    if (sortBy === "status") r.sort((a, b) => a.status.localeCompare(b.status));
    if (sortBy === "month")  r.sort((a, b) => (b.month || "").localeCompare(a.month || ""));
    return r;
  }, [rows, sortBy]);

  // ── summary ─────────────────────────────────────────────────────────────────
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

  // ── print title builder ──────────────────────────────────────────────────────
  const printTitle = useMemo(() => {
    if (mode === "month")   return `Invoices Report — ${month.format("MMMM YYYY")}`;
    if (mode === "paid")    return `Paid on ${paidDay.format("DD/MM/YYYY")}`;
    if (mode === "user")    return `Invoices — ${selectedUser?.name || "User"}`;
    if (mode === "range")   return `Invoices ${monthFrom.format("MMM YYYY")} → ${monthTo.format("MMM YYYY")}`;
    if (mode === "overdue") return "Overdue Invoices";
    return "Invoices Report";
  }, [mode, month, paidDay, showStatus, selectedUser, monthFrom, monthTo]);

  const handlePrint = () => {
    if (!displayRows.length) return;
    const html = buildReportHTML({ rows: displayRows, title: printTitle, subtitle: null, settings });
    doPrint(html, printTitle);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ pb: 4 }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3, border: "1px solid", borderColor: "grey.200",
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
          <Box>
            <Typography variant="h5" fontWeight={900}>Print Invoices</Typography>
            <Typography variant="body2" sx={{ opacity: 0.65 }}>
              Choose a report type and filters, then print or save as PDF.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
            disabled={displayRows.length === 0 || loading}
            sx={{ fontWeight: 700, px: 3 }}
          >
            Print / Save PDF ({displayRows.length} rows)
          </Button>
        </Paper>

        {/* ── Mode selector ───────────────────────────────────────────────── */}
        <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3, border: "1px solid", borderColor: "grey.200" }}>
          <Typography variant="caption" fontWeight={800} sx={{ opacity: 0.55, display: "block", mb: 1.5 }}>
            REPORT TYPE
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {MODES.map((m) => (
              <Box
                key={m.key}
                onClick={() => setMode(m.key)}
                sx={{
                  px: 2, py: 1.25, borderRadius: 2, cursor: "pointer",
                  border: "1.5px solid",
                  borderColor: mode === m.key ? "primary.main" : "grey.200",
                  bgcolor: mode === m.key ? "primary.50" : "white",
                  transition: "all 0.15s",
                  "&:hover": { borderColor: "primary.light" },
                }}
              >
                <Typography variant="body2" fontWeight={700}
                  color={mode === m.key ? "primary.main" : "text.primary"}>
                  {m.label}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.55 }}>{m.desc}</Typography>
              </Box>
            ))}
          </Box>
        </Paper>

        {/* ── Filters ─────────────────────────────────────────────────────── */}
        <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3, border: "1px solid", borderColor: "grey.200" }}>
          <Typography variant="caption" fontWeight={800} sx={{ opacity: 0.55, display: "block", mb: 1.5 }}>
            FILTERS
          </Typography>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "flex-start" }}>

            {/* Month picker */}
            {mode === "month" && (
              <DatePicker label="Month" views={["year","month"]} openTo="month"
                value={month} onChange={v => v && setMonth(v)}
                slotProps={{ textField: { sx: { width: 180 } } }} />
            )}

            {/* Paid by day */}
            {mode === "paid" && (
              <DatePicker label="Paid Date" value={paidDay} onChange={v => v && setPaidDay(v)}
                slotProps={{ textField: { sx: { width: 200 } } }} />
            )}

            {/* Month range */}
            {mode === "range" && (<>
              <DatePicker label="From Month" views={["year","month"]} openTo="month"
                value={monthFrom} onChange={v => v && setMonthFrom(v)}
                slotProps={{ textField: { sx: { width: 180 } } }} />
              <DatePicker label="To Month" views={["year","month"]} openTo="month"
                value={monthTo} onChange={v => v && setMonthTo(v)}
                slotProps={{ textField: { sx: { width: 180 } } }} />
            </>)}

            {/* User picker */}
            {mode === "user" && (
              <Autocomplete
                options={users}
                value={selectedUser}
                onChange={(_, v) => setSelectedUser(v)}
                getOptionKey={(u) => u.id}
                getOptionLabel={(u) => u ? `${u.name}${u.mobile ? " · " + u.mobile : ""}` : ""}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                sx={{ width: 320 }}
                renderInput={(params) => <TextField {...params} label="Select User" />}
              />
            )}

            {/* Status filter */}
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


            {/* Sort */}
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

        {/* ── Summary strip ───────────────────────────────────────────────── */}
        {displayRows.length > 0 && (
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: 1.5, mb: 2 }}>
            {[
              { label: "Total Rows",     val: summary.total,                        color: "text.primary" },
              { label: "Paid",           val: `${summary.paidCount} · $${money(summary.paidAmt)}`,   color: "success.main" },
              { label: "Unpaid",         val: `${summary.unpaidCount} · $${money(summary.unpaidAmt)}`, color: "error.main" },
              { label: "Grand Total",    val: `$${money(summary.totalAmt)}`,         color: "primary.main" },
              { label: "Collection Rate",val: `${summary.rate}%`,                   color: summary.rate >= 80 ? "success.main" : "warning.main" },
            ].map(s => (
              <Paper key={s.label} elevation={0} sx={{ px: 2, py: 1.5, borderRadius: 2, border: "1px solid", borderColor: "grey.200" }}>
                <Typography variant="caption" sx={{ opacity: 0.6, display: "block" }}>{s.label}</Typography>
                <Typography fontWeight={800} color={s.color}>{s.val}</Typography>
              </Paper>
            ))}
          </Box>
        )}

        {msg && (
          <Typography color="error" sx={{ mb: 2 }}>{msg}</Typography>
        )}

        {/* ── Preview Table ────────────────────────────────────────────────── */}
        <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "grey.200", overflow: "hidden" }}>
          <Box sx={{ px: 2, py: 1.5, bgcolor: "grey.50", borderBottom: "1px solid", borderColor: "grey.200",
            display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="subtitle1" fontWeight={800} sx={{ flexGrow: 1 }}>
              Preview — {printTitle}
            </Typography>
            {loading && <Typography variant="caption" sx={{ opacity: 0.5 }}>Loading…</Typography>}
            <Chip label={`${summary.paidCount} Paid`}   color="success" size="small" sx={{ fontWeight: 700 }} />
            <Chip label={`${summary.unpaidCount} Unpaid`} color="error" size="small" sx={{ fontWeight: 700 }} />
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
                    const sColor  = isPaid ? "success" : overdue ? "error" : "error";
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