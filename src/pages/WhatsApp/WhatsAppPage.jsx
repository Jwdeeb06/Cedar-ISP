// src/pages/WhatsApp/WhatsAppPage.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box, Button, Checkbox, Chip, Divider, FormControl,
  IconButton, InputAdornment, InputLabel, MenuItem,
  Paper, Select, Table, TableBody, TableCell,
  TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import WhatsAppIcon     from "@mui/icons-material/WhatsApp";
import SearchIcon       from "@mui/icons-material/Search";
import CloseIcon        from "@mui/icons-material/Close";
import FilterListIcon   from "@mui/icons-material/FilterList";
import SendIcon         from "@mui/icons-material/Send";
import SelectAllIcon    from "@mui/icons-material/SelectAll";
import DeselectIcon     from "@mui/icons-material/Deselect";
import ChevronLeftIcon  from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import dayjs from "dayjs";

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function buildMessage({ user, template, settings, month }) {
  const ispName  = settings?.isp_name  || "ISP";
  const ispPhone = settings?.isp_phone || "";

  return template
    .replace(/\{name\}/g,       user.name       || "")
    .replace(/\{mobile\}/g,     user.mobile      || "")
    .replace(/\{service\}/g,    user.service_name || user.service || "")
    .replace(/\{expiry\}/g,     user.expiry_date  || "")
    .replace(/\{price\}/g,      `$${fmt(user.price)}`)
    .replace(/\{month\}/g,      month)
    .replace(/\{isp\}/g,        ispName)
    .replace(/\{isp_phone\}/g,  ispPhone);
}

function cleanPhone(p) {
  return (p || "").replace(/[^\d+]/g, "");
}

// ── Default message templates ─────────────────────────────────────────────────
const TEMPLATES = [
  {
    key: "payment_reminder",
    label: "Payment Reminder",
    text: `*{isp}*

Dear {name},

Your internet subscription for *{month}* is due.

*Amount:* {price}
*Service:* {service}
*Expiry:* {expiry}

Please pay to avoid service interruption.

{isp} · {isp_phone}`,
  },
  {
    key: "expiry_warning",
    label: "Expiry Warning",
    text: `*{isp}*

Dear {name},

Your subscription expires on *{expiry}*.

Please renew to stay connected.

{isp} · {isp_phone}`,
  },
  {
    key: "service_off",
    label: "Service Disconnected",
    text: `*{isp}*

Dear {name},

Your internet service has been suspended due to non-payment.

To reconnect please pay your subscription of {price}.

{isp} · {isp_phone}`,
  },
  {
    key: "custom",
    label: "Custom Message",
    text: "",
  },
];

// ══════════════════════════════════════════════════════════════════════════════
export default function WhatsAppPage() {
  const [users,     setUsers]     = useState([]);
  const [settings,  setSettings]  = useState({});
  const [loading,   setLoading]   = useState(false);
  const [total,     setTotal]     = useState(0);
  const [offset,    setOffset]    = useState(0);
  const [limit,     setLimit]     = useState(100);

  // filters
  const [search,      setSearch]      = useState("");
  const [filterStatus, setFilterStatus] = useState("INACTIVE");
  const [filterService, setFilterService] = useState("");
  const [expiryBefore, setExpiryBefore] = useState("");
  const [phoneFilter, setPhoneFilter] = useState('with'); // 'with' | 'without'

  // selection
  const [selected, setSelected] = useState(new Set());

  // message
  const [templateKey, setTemplateKey] = useState("payment_reminder");
  const [msgText,     setMsgText]     = useState(TEMPLATES[0].text);
  const [month,       setMonth]       = useState(dayjs().format("MMMM YYYY"));

  // send state
  const [sending,    setSending]    = useState(false);
  const [sentCount,  setSentCount]  = useState(0);
  const [sentList,   setSentList]   = useState([]); // [{name, phone, ok}]
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    window.api.getSettings().then(setSettings).catch(() => {});
  }, []);

  // ── load users (paginated) ────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await window.api.listUsers({
        status:        filterStatus  || null,
        service:       filterService || null,
        search:        search        || null,
        expiry_before: expiryBefore  || null,
        // phone filter: 'with' = has phone, 'without' = no phone
        mobile_empty:  phoneFilter === 'without' ? 1 : null,
        mobile_required: phoneFilter === 'with' ? 1 : null,
        limit,
        offset,
      });
      const rows = Array.isArray(data) ? data : (data?.rows || []);
      const tot  = Array.isArray(data) ? rows.length : Number(data?.total || 0);
      setUsers(rows);
      setTotal(tot);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterService, search, expiryBefore, phoneFilter, limit, offset]);

  useEffect(() => { load(); }, [load]);

  // Reset to page 0 when filters change
  useEffect(() => {
    setOffset(0);
    setSelected(new Set());
  }, [filterStatus, filterService, search, expiryBefore, phoneFilter, limit]);

  // ── template change ────────────────────────────────────────────────────────
  const handleTemplateChange = (key) => {
    setTemplateKey(key);
    const t = TEMPLATES.find(t => t.key === key);
    if (t && key !== "custom") setMsgText(t.text);
  };

  // ── selection ──────────────────────────────────────────────────────────────
  // Server already filters by phone mode — displayUsers = users as-is
  const displayUsers = users;
  const withPhone = useMemo(() => users.filter(u => u.mobile),  [users]);
  const noPhone   = useMemo(() => users.filter(u => !u.mobile), [users]);

  const toggle = (id) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const selectAll   = () => setSelected(new Set(withPhone.map(u => u.id)));
  const deselectAll = () => setSelected(new Set());

  const selectedUsers = useMemo(() =>
    withPhone.filter(u => selected.has(u.id)), [withPhone, selected]);

  // ── send ───────────────────────────────────────────────────────────────────
  const sendAll = async () => {
    if (!selectedUsers.length || !msgText.trim()) return;
    setSending(true);
    setSentList([]);
    setSentCount(0);
    setShowReport(false);

    const results = [];
    for (const user of selectedUsers) {
      const message = buildMessage({ user, template: msgText, settings, month });
      const phone   = cleanPhone(user.mobile);
      const encoded = encodeURIComponent(message);
      const url     = `https://wa.me/${phone}?text=${encoded}`;

      // Open each in browser — WhatsApp Web
      window.open(url, "_blank", "noopener,noreferrer");

      results.push({ name: user.name, phone: user.mobile, ok: true });
      setSentCount(results.length);

      // Small delay between opens so browser doesn't block
      await new Promise(r => setTimeout(r, 600));
    }

    setSentList(results);
    setSending(false);
    setShowReport(true);
  };

  const previewMessage = selectedUsers[0]
    ? buildMessage({ user: selectedUsers[0], template: msgText, settings, month })
    : buildMessage({
        user: { name: "Ahmad", mobile: "70123456", service_name: "Up to 8M", expiry_date: "2026-05-05", price: 30 },
        template: msgText, settings, month,
      });

  return (
    <Box sx={{ pb: 4 }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ width: 44, height: 44, borderRadius: 2.5, bgcolor: "#25D366",
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <WhatsAppIcon sx={{ color: "white", fontSize: 26 }} />
          </Box>
          <Box>
            <Typography variant="h4" fontWeight={900} sx={{ lineHeight: 1.1 }}>WhatsApp Blast</Typography>
            <Typography variant="body2" sx={{ opacity: 0.55 }}>
              Send bulk messages to subscribers
            </Typography>
          </Box>
        </Box>

        <Button
          variant="contained"
          startIcon={<SendIcon />}
          disabled={selected.size === 0 || !msgText.trim() || sending || phoneFilter === 'without'}
          onClick={sendAll}
          sx={{
            fontWeight: 800, px: 3, height: 48,
            bgcolor: "#25D366", "&:hover": { bgcolor: "#128C7E" },
          }}
        >
          {sending
            ? `Sending ${sentCount}/${selected.size}…`
            : `Send to ${selected.size} user${selected.size !== 1 ? "s" : ""}`}
        </Button>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 2.5, alignItems: "start" }}>

        {/* ══ LEFT: User list ═══════════════════════════════════════════════ */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>

          {/* Filters */}
          <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid", borderColor: "grey.200" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
              <FilterListIcon sx={{ opacity: 0.45, fontSize: 18 }} />
              <Typography variant="subtitle2" fontWeight={800} sx={{ opacity: 0.7 }}>Filters</Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
              <TextField size="small" label="Search" placeholder="Name, mobile…"
                value={search} onChange={e => setSearch(e.target.value)} sx={{ width: 200 }}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 17, opacity: 0.4 }} /></InputAdornment>,
                  endAdornment: search ? <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearch("")}><CloseIcon sx={{ fontSize: 14 }} /></IconButton>
                  </InputAdornment> : null,
                }}
              />

              <FormControl size="small" sx={{ width: 140 }}>
                <InputLabel>Status</InputLabel>
                <Select label="Status" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="ACTIVE">Active</MenuItem>
                  <MenuItem value="INACTIVE">Inactive</MenuItem>
                  <MenuItem value="SUSPENDED">Suspended</MenuItem>
                </Select>
              </FormControl>

              <TextField size="small" label="Service" value={filterService}
                onChange={e => setFilterService(e.target.value)} sx={{ width: 150 }}
                InputProps={{ endAdornment: filterService
                  ? <InputAdornment position="end"><IconButton size="small" onClick={() => setFilterService("")}><CloseIcon sx={{ fontSize: 14 }} /></IconButton></InputAdornment>
                  : null }}
              />

              <TextField size="small" label="Expiry Before" type="date"
                value={expiryBefore} onChange={e => setExpiryBefore(e.target.value)}
                InputLabelProps={{ shrink: true }} sx={{ width: 165 }}
                InputProps={{ endAdornment: expiryBefore
                  ? <InputAdornment position="end"><IconButton size="small" onClick={() => setExpiryBefore("")}><CloseIcon sx={{ fontSize: 14 }} /></IconButton></InputAdornment>
                  : null }}
              />

              {/* Phone filter toggle */}
              <Box sx={{ display:"flex", height:40, borderRadius:1, overflow:"hidden",
                border:"1px solid", borderColor:"grey.300" }}>
                <Box onClick={() => setPhoneFilter('with')} sx={{
                  px:1.5, display:"flex", alignItems:"center", cursor:"pointer",
                  fontWeight: phoneFilter==='with' ? 800 : 500,
                  fontSize: 13,
                  bgcolor: phoneFilter==='with' ? "primary.main" : "white",
                  color:   phoneFilter==='with' ? "white" : "text.primary",
                  borderRight:"1px solid", borderColor:"grey.300",
                  transition:"all 0.12s",
                }}>
                  📞 With Phone
                </Box>
                <Box onClick={() => setPhoneFilter('without')} sx={{
                  px:1.5, display:"flex", alignItems:"center", cursor:"pointer",
                  fontWeight: phoneFilter==='without' ? 800 : 500,
                  fontSize: 13,
                  bgcolor: phoneFilter==='without' ? "warning.main" : "white",
                  color:   phoneFilter==='without' ? "white" : "text.primary",
                  transition:"all 0.12s",
                }}>
                  🚫 No Phone
                </Box>
              </Box>

              <Button size="small" variant="outlined" onClick={() => {
                setSearch(""); setFilterStatus("INACTIVE"); setFilterService("");
                setExpiryBefore(""); setPhoneFilter("with");
              }} sx={{ height: 40 }}>
                Clear
              </Button>
            </Box>
          </Paper>

          {/* User table */}
          <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "grey.200", overflow: "hidden" }}>
            {/* Table header bar */}
            <Box sx={{ px: 2, py: 1.25, bgcolor: "grey.50", borderBottom: "1px solid", borderColor: "grey.200",
              display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
              <Checkbox
                indeterminate={selected.size > 0 && selected.size < withPhone.length}
                checked={withPhone.length > 0 && selected.size === withPhone.length}
                onChange={e => e.target.checked ? selectAll() : deselectAll()}
                size="small"
              />
              <Typography variant="subtitle2" fontWeight={800} sx={{ flexGrow: 1 }}>
                {loading ? "Loading…" : `${total} ${phoneFilter === 'without' ? 'users without phone' : 'users with phone'}`}
              </Typography>
              <Chip label={`${selected.size} selected`} size="small"
                color={selected.size > 0 ? "primary" : "default"}
                sx={{ fontWeight: 700 }} />
              <Button size="small" startIcon={<SelectAllIcon />}
                onClick={selectAll} disabled={withPhone.length === 0}
                sx={{ fontSize: 12 }}>
                All
              </Button>
              <Button size="small" startIcon={<DeselectIcon />}
                onClick={deselectAll} disabled={selected.size === 0}
                sx={{ fontSize: 12 }}>
                None
              </Button>

              {/* Rows per page + pagination */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: "auto" }}>
                <FormControl size="small" sx={{ minWidth: 80 }}>
                  <Select value={limit} onChange={e => setLimit(Number(e.target.value))}>
                    {[50, 100, 150, 200].map(n => <MenuItem key={n} value={n}>{n}</MenuItem>)}
                  </Select>
                </FormControl>
                <Typography variant="caption" sx={{ opacity: 0.55, whiteSpace: "nowrap" }}>
                  {offset + 1}–{Math.min(offset + displayUsers.length, total)} of {total}
                </Typography>
                <IconButton size="small" disabled={offset === 0}
                  onClick={() => setOffset(o => Math.max(0, o - limit))}>
                  <ChevronLeftIcon />
                </IconButton>
                <IconButton size="small" disabled={offset + limit >= total}
                  onClick={() => setOffset(o => o + limit)}>
                  <ChevronRightIcon />
                </IconButton>
              </Box>
            </Box>

            {/* Info banner for no-phone mode */}
            {phoneFilter === 'without' && (
              <Box sx={{ px: 2, py: 1, bgcolor: "warning.50", borderBottom: "1px solid", borderColor: "warning.200" }}>
                <Typography variant="caption" color="warning.dark" fontWeight={600}>
                  ⚠️ Showing users without a phone number — these cannot receive WhatsApp messages
                </Typography>
              </Box>
            )}

            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "grey.50" }}>
                  <TableCell padding="checkbox" />
                  <TableCell sx={{ fontWeight: 800 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Mobile</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Service</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Expiry</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ py: 4, textAlign: "center", opacity: 0.4 }}>
                      No users match the filters
                    </TableCell>
                  </TableRow>
                )}
                {displayUsers.map(u => {
                  const hasMobile = Boolean(u.mobile);
                  const isSelected = selected.has(u.id);
                  const isExpiringSoon = u.expiry_date &&
                    dayjs(u.expiry_date).diff(dayjs(), "day") <= 7 &&
                    dayjs(u.expiry_date).diff(dayjs(), "day") >= 0;

                  return (
                    <TableRow key={u.id} hover
                      onClick={() => hasMobile && toggle(u.id)}
                      sx={{
                        cursor: hasMobile ? "pointer" : "default",
                        opacity: hasMobile ? 1 : 0.4,
                        bgcolor: isSelected ? "primary.50" : "inherit",
                        "&:last-child td": { border: 0 },
                      }}>
                      <TableCell padding="checkbox">
                        <Checkbox size="small" checked={isSelected}
                          disabled={!hasMobile}
                          onChange={() => toggle(u.id)}
                          onClick={e => e.stopPropagation()}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{u.name}</TableCell>
                      <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>
                        {u.mobile || <span style={{ opacity: 0.4 }}>—</span>}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, opacity: 0.75 }}>
                        {u.service_name || u.service || "—"}
                      </TableCell>
                      <TableCell>
                        {u.expiry_date ? (
                          <Chip
                            label={u.expiry_date}
                            size="small"
                            color={isExpiringSoon ? "warning" : "default"}
                            sx={{ fontSize: 10, fontWeight: isExpiringSoon ? 700 : 400 }}
                          />
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <Chip label={u.status} size="small"
                          color={u.status === "ACTIVE" ? "success" : u.status === "SUSPENDED" ? "error" : "default"}
                          sx={{ fontWeight: 700, fontSize: 10 }} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Paper>
        </Box>

        {/* ══ RIGHT: Message composer ════════════════════════════════════════ */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>

          {/* Template picker */}
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid", borderColor: "grey.200" }}>
            <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5 }}>Message Template</Typography>
            <FormControl size="small" fullWidth sx={{ mb: 2 }}>
              <InputLabel>Template</InputLabel>
              <Select label="Template" value={templateKey}
                onChange={e => handleTemplateChange(e.target.value)}>
                {TEMPLATES.map(t => (
                  <MenuItem key={t.key} value={t.key}>{t.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth multiline minRows={8} maxRows={14}
              label="Message"
              value={msgText}
              onChange={e => { setMsgText(e.target.value); setTemplateKey("custom"); }}
              sx={{ fontFamily: "monospace" }}
              inputProps={{ style: { fontFamily: "monospace", fontSize: 13 } }}
            />

            <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 2, bgcolor: "grey.50",
              border: "1px solid", borderColor: "grey.200" }}>
              <Typography variant="caption" fontWeight={700} sx={{ opacity: 0.55, display: "block", mb: 0.5 }}>
                AVAILABLE VARIABLES
              </Typography>
              {["{name}", "{mobile}", "{service}", "{expiry}", "{price}", "{month}", "{isp}", "{isp_phone}"].map(v => (
                <Chip key={v} label={v} size="small" variant="outlined"
                  onClick={() => setMsgText(p => p + v)}
                  sx={{ mr: 0.5, mb: 0.5, fontSize: 11, cursor: "pointer" }} />
              ))}
            </Box>

            <TextField size="small" fullWidth label="Month label in message"
              value={month} onChange={e => setMonth(e.target.value)}
              sx={{ mt: 1.5 }}
              helperText="Used for {month} variable" />
          </Paper>

          {/* Preview */}
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3,
            border: "1.5px solid", borderColor: "#25D366", bgcolor: "#f0fff4" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
              <WhatsAppIcon sx={{ color: "#25D366", fontSize: 18 }} />
              <Typography variant="subtitle2" fontWeight={800}>
                Preview {selectedUsers[0] ? `(${selectedUsers[0].name})` : "(sample)"}
              </Typography>
            </Box>
            <Box sx={{
              p: 1.5, borderRadius: 2, bgcolor: "white",
              border: "1px solid #c8e6c9", whiteSpace: "pre-wrap",
              fontFamily: "sans-serif", fontSize: 13, lineHeight: 1.7,
              maxHeight: 280, overflowY: "auto",
            }}>
              {previewMessage}
            </Box>
          </Paper>

          {/* Send report */}
          {showReport && (
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3,
              border: "1px solid", borderColor: "success.300", bgcolor: "success.50" }}>
              <Typography variant="subtitle2" fontWeight={800} color="success.dark" sx={{ mb: 1 }}>
                ✅ Sent to {sentList.length} user{sentList.length !== 1 ? "s" : ""}
              </Typography>
              <Box sx={{ maxHeight: 180, overflowY: "auto" }}>
                {sentList.map((s, i) => (
                  <Box key={i} sx={{ display: "flex", justifyContent: "space-between",
                    py: 0.5, borderBottom: "1px solid", borderColor: "success.100" }}>
                    <Typography variant="caption" fontWeight={600}>{s.name}</Typography>
                    <Typography variant="caption" sx={{ fontFamily: "monospace", opacity: 0.7 }}>{s.phone}</Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          )}

        </Box>
        {/* ══ END RIGHT ════════════════════════════════════════════════════ */}

      </Box>
    </Box>
  );
}