import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Chip, Paper, Typography, IconButton } from "@mui/material";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import dayjs from "dayjs";
import { paymentsApi } from "../../services/paymentsApi";
import PaymentsFiltersBar from "../../components/payments/PaymentsFiltersBar";
import PaymentsTable from "../../components/payments/PaymentsTable";

const money = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function PaymentsListPage() {
  const topRef = useRef(null);

  const [rows,   setRows]   = useState([]);
  const [msg,    setMsg]    = useState("");

  const [filterMonth,  setFilterMonth]  = useState(dayjs());
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterType,   setFilterType]   = useState("ALL");
  const [paidOn,       setPaidOn]       = useState("");
  const [service,      setService]      = useState("");
  const [address,      setAddress]      = useState("");
  const [region,       setRegion]       = useState("");
  const [search,       setSearch]       = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [paidDays,     setPaidDays]     = useState([]);

  const monthStr = filterMonth ? filterMonth.format("YYYY-MM") : "";

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const load = async () => {
    const inv = await paymentsApi.list({
      month: monthStr, status: filterStatus, type: filterType,
      paidOn, service, address, region, search: searchDebounced,
    });
    setRows(inv || []);
  };

  useEffect(() => { load(); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [monthStr, filterStatus, filterType, paidOn, service, address, region, searchDebounced]);

  useEffect(() => {
    (async () => {
      const pd = await paymentsApi.listPaidDays({ month: monthStr });
      setPaidDays(pd || []);
    })();
  }, [monthStr]);

  useEffect(() => {
    if (paidOn && !paidDays.some(d => d.day === paidOn)) setPaidOn("");
  }, [paidDays, paidOn]);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(""), 10000);
    return () => clearTimeout(t);
  }, [msg]);

  const totals = useMemo(() => {
    const paid   = rows.filter(r => r.status === "PAID");
    const unpaid = rows.filter(r => r.status !== "PAID");
    return {
      total:      rows.length,
      paidCount:  paid.length,
      unpaidCount:unpaid.length,
      totalAmt:   rows.reduce((s, r) => s + (Number(r.amount) || 0), 0),
      paidAmt:    paid.reduce((s, r) => s + (Number(r.amount) || 0), 0),
    };
  }, [rows]);

  const handleExport = async () => {
    const res = await window.api.exportBillingReport({ month: monthStr });
    if (res?.ok) setMsg(`✅ Exported ${res.count} invoices`);
    else if (res?.reason !== "CANCELLED") setMsg("Export failed");
  };

  return (
    <Box ref={topRef}>

      {/* ── Sticky filter bar ──────────────────────────────────────────────── */}
      <Paper elevation={2} sx={{
        p: 2, mb: 2, borderRadius: 3,
        border: "1px solid", borderColor: "grey.200",
        position: "sticky", top: 64, zIndex: 100, bgcolor: "white",
      }}>
        <PaymentsFiltersBar
          filterMonth={filterMonth}   setFilterMonth={setFilterMonth}
          filterStatus={filterStatus} setFilterStatus={setFilterStatus}
          filterType={filterType}     setFilterType={setFilterType}
          paidOn={paidOn}             setPaidOn={setPaidOn}
          paidDays={paidDays}
          service={service}           setService={setService}
          address={address}           setAddress={setAddress}
          region={region}             setRegion={setRegion}
          search={search}             setSearch={setSearch}
          onGenerated={async (text) => {
            setMsg(text);
            await load();
            const pd = await paymentsApi.listPaidDays({ month: monthStr });
            setPaidDays(pd || []);
          }}
        />
      </Paper>

      {/* ── Message ─────────────────────────────────────────────────────────── */}
      {msg && (
        <Paper sx={{ p: 1.5, mb: 2, borderRadius: 2, display: "flex", alignItems: "center",
          justifyContent: "space-between", bgcolor: "info.50",
          border: "1px solid", borderColor: "info.200" }}>
          <Typography variant="body2" fontWeight={600}>{msg}</Typography>
          <IconButton size="small" onClick={() => setMsg("")}>✕</IconButton>
        </Paper>
      )}

      {/* ── Totals strip ────────────────────────────────────────────────────── */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 1.5, mb: 2 }}>
        {[
          { label: "Total Invoices", val: totals.total, sub: null,
            bg: "grey.50", border: "grey.300", color: "text.primary" },
          { label: "Paid", val: totals.paidCount, sub: `$${money(totals.paidAmt)}`,
            bg: "#f1f8f2", border: "#66bb6a", color: "#2e7d32" },
          { label: "Unpaid", val: totals.unpaidCount, sub: `$${money(totals.totalAmt - totals.paidAmt)}`,
            bg: "#fdf3f3", border: "#ef9a9a", color: "#c62828" },
          { label: "Grand Total", val: `$${money(totals.totalAmt)}`, sub: null,
            bg: "#f0f4ff", border: "#90caf9", color: "#1565c0" },
          { label: "Collection Rate",
            val: totals.total ? `${Math.round((totals.paidCount / totals.total) * 100)}%` : "—",
            sub: `${totals.paidCount} of ${totals.total}`,
            bg: "#f8f2ff", border: "#ce93d8", color: "#6a1b9a" },
        ].map(s => (
          <Paper key={s.label} elevation={0} sx={{
            px: 2, py: 1.75, borderRadius: 2,
            border: "1.5px solid", borderColor: s.border, bgcolor: s.bg,
          }}>
            <Typography variant="caption" sx={{
              display: "block", fontWeight: 800, opacity: 0.6,
              fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.5, mb: 0.5,
            }}>{s.label}</Typography>
            <Typography fontWeight={900} color={s.color} sx={{ fontSize: 20, lineHeight: 1.1 }}>
              {s.val}
            </Typography>
            {s.sub && (
              <Typography variant="caption" sx={{ opacity: 0.6, fontWeight: 600 }}>{s.sub}</Typography>
            )}
          </Paper>
        ))}
      </Box>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "grey.200", overflow: "hidden" }}>
        <Box sx={{ px: 2, py: 1.5, bgcolor: "grey.50", borderBottom: "1px solid", borderColor: "grey.200",
          display: "flex", alignItems: "center", gap: 2 }}>
          <Typography variant="subtitle1" fontWeight={800} sx={{ flexGrow: 1 }}>
            Payments List — {monthStr}
          </Typography>
          <Chip label={`${totals.paidCount} Paid`}    color="success" size="small" sx={{ fontWeight: 700 }} />
          <Chip label={`${totals.unpaidCount} Unpaid`} color="error"   size="small" sx={{ fontWeight: 700 }} />
          <Button size="small" variant="outlined" startIcon={<FileDownloadIcon />}
            onClick={handleExport} sx={{ fontWeight: 700, ml: 1 }}>
            Export Excel
          </Button>
        </Box>

        <PaymentsTable rows={rows} readOnly />
      </Paper>
    </Box>
  );
}