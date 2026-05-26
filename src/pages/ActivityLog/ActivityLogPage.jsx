// src/pages/ActivityLog/ActivityLogPage.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box, Button, Chip, Divider, FormControl, IconButton,
  InputLabel, MenuItem, Paper, Select, Table, TableBody,
  TableCell, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import { bFormat } from "../../utils/dateUtils";
import { activityApi } from "../../services/activityApi";

const TODAY = new Date().toISOString().slice(0, 10);

const ACTION_COLOR = {
  ADD_USER:                "success",
  UPDATE_USER:             "info",
  DELETE_USER:             "error",
  RESTORE_USER:            "warning",
  CREATE_INVOICE:          "success",
  DELETE_INVOICE:          "error",
  SET_INVOICE_STATUS:      "info",
  GENERATE_MONTH_INVOICES: "secondary",
  CREATE_STATIC_PAYMENT:   "success",
  DRAWER_IN:               "success",
  DRAWER_OUT:              "error",
  DRAWER_DELETE:           "error",
  ADD_SERVICE:             "success",
  UPDATE_SERVICE:          "info",
  ADD_COMPANY:             "success",
  LOGIN:                   "default",
  ADD_EMPLOYEE:            "success",
  RESTORE_INVOICE:         "warning",
  PAY_INVOICE:             "success",
};

const ENTITY_LABELS = {
  users:               "Users",
  invoices:            "Invoices",
  payments:            "Payments",
  drawer_transactions: "Drawer",
  services:            "Services",
  companies:           "Companies",
  employees:           "Employees",
  settings:            "Settings",
};

function ActionBadge({ action }) {
  const color = ACTION_COLOR[action] || "default";
  return (
    <Chip label={action.replace(/_/g, " ")} color={color} size="small"
      sx={{ fontWeight: 700, fontSize: 11, letterSpacing: 0.3 }} />
  );
}

function useDebouncedValue(value, delay = 280) {
  const [deb, setDeb] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDeb(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return deb;
}

// ── Daily breakdown table — same style as DrawerPage ─────────────────────────
function DailyTable({ days, selectedDay, onSelectDay }) {
  const [open, setOpen] = useState(true); // open by default
  const [expanded, setExpanded] = useState(false);
  if (!days.length) return null;

  const PREVIEW = 7;
  const visible = expanded ? days : days.slice(0, PREVIEW);
  const hasMore = days.length > PREVIEW;

  return (
    <Paper elevation={0} sx={{ mb: 2, borderRadius: 3, border: "1px solid", borderColor: "grey.200", overflow: "hidden" }}>
      <Box onClick={() => setOpen(o => !o)} sx={{
        px: 2, py: 1.5, bgcolor: "grey.50",
        borderBottom: open ? "1px solid" : "none", borderColor: "grey.200",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        cursor: "pointer", userSelect: "none", "&:hover": { bgcolor: "grey.100" },
      }}>
        <Typography variant="caption" fontWeight={800}
          sx={{ opacity: 0.65, textTransform: "uppercase", letterSpacing: 1 }}>
          Daily Breakdown — {days.length} days with activity
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {open && hasMore && (
            <Button size="small" onClick={e => { e.stopPropagation(); setExpanded(x => !x); }}
              sx={{ fontSize: 11, fontWeight: 700, py: 0.25, minWidth: 0 }}>
              {expanded ? "Less ▲" : `All ${days.length} ▼`}
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
              <TableCell sx={{ fontWeight: 800 }} align="right">Actions recorded</TableCell>
              <TableCell sx={{ fontWeight: 800 }} align="center">Filter</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visible.map(d => {
              const active = selectedDay === d.day;
              const isToday = d.day === TODAY;
              return (
                <TableRow key={d.day} hover onClick={() => onSelectDay(active ? "" : d.day)}
                  sx={{ cursor: "pointer",
                    bgcolor: active ? "primary.50" : "inherit",
                    "&:last-child td": { border: 0 } }}>
                  <TableCell sx={{ fontWeight: active ? 900 : 600, fontFamily: "monospace", fontSize: 12 }}>
                    {d.day}
                    {isToday && (
                      <Chip label="Today" size="small" color="success"
                        sx={{ ml: 1, fontWeight: 700, fontSize: 10, height: 18 }} />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Chip label={`${d.count} actions`} size="small"
                      color={active ? "primary" : "default"}
                      variant={active ? "filled" : "outlined"}
                      sx={{ fontWeight: 700, fontSize: 11 }} />
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={active ? "✓ Active" : "Click to filter"}
                      size="small"
                      color={active ? "primary" : "default"}
                      variant={active ? "filled" : "outlined"}
                      sx={{ fontWeight: 700, fontSize: 10, cursor: "pointer" }}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Paper>
  );
}

export default function ActivityLogPage() {
  const [rows,    setRows]    = useState([]);
  const [days,    setDays]    = useState([]);
  const [actors,  setActors]  = useState([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const searchDeb           = useDebouncedValue(search);
  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("");
  const [actor,  setActor]  = useState("");
  const [day,    setDay]    = useState(TODAY); // default to today
  const [limit,  setLimit]  = useState(100);
  const [offset, setOffset] = useState(0);

  const loadDays = useCallback(async () => {
    const data = await activityApi.listDays({ limit: 60 });
    setDays(data || []);
  }, []);

  const loadActors = useCallback(async () => {
    try {
      const data = await window.api.listActivityActors?.();
      setActors(data || []);
    } catch {}
  }, []);

  useEffect(() => { loadDays(); loadActors(); }, [loadDays, loadActors]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await activityApi.list({
        search: searchDeb || undefined,
        entity: entity    || undefined,
        action: action    || undefined,
        actor:  actor     || undefined,
        day:    day       || undefined,
        limit,
        offset,
      });
      setRows(data || []);
    } finally {
      setLoading(false);
    }
  }, [searchDeb, entity, action, actor, day, limit, offset]);

  useEffect(() => { setOffset(0); }, [searchDeb, entity, action, actor, day]);
  useEffect(() => { load(); }, [load]);

  const disableNext  = rows.length < limit;
  const knownActions = useMemo(() => Object.keys(ACTION_COLOR), []);

  const clearFilters = () => {
    setSearch(""); setEntity(""); setAction("");
    setActor(""); setDay(TODAY); setOffset(0);
  };

  const canClear = Boolean(search || entity || action || actor || day !== TODAY);

  return (
    <Box>
      {/* ── Header ───────────────────────────────────────────────── */}
      <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3, border: "1px solid", borderColor: "grey.200",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={900}>Activity Log</Typography>
          <Typography variant="body2" sx={{ opacity: 0.65 }}>
            Every action performed in the system is recorded here.
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          {day && (
            <Chip
              label={day === TODAY ? "Today" : `Day: ${day}`}
              color={day === TODAY ? "success" : "primary"}
              onDelete={() => setDay("")}
              sx={{ fontWeight: 700 }}
            />
          )}
          <Chip label={`${rows.length} rows`} variant="outlined" sx={{ fontWeight: 700 }} />
        </Box>
      </Paper>

      {/* ── Daily breakdown table ─────────────────────────────────── */}
      <DailyTable days={days} selectedDay={day} onSelectDay={setDay} />

      {/* ── Filters ──────────────────────────────────────────────── */}
      <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3, border: "1px solid", borderColor: "grey.200" }}>
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>

          <TextField size="small" label="Search" placeholder="message / actor / action…"
            value={search} onChange={e => setSearch(e.target.value)} sx={{ minWidth: 260 }}
            InputProps={{ endAdornment: search
              ? <IconButton size="small" onClick={() => setSearch("")}>✕</IconButton>
              : null }} />

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Employee</InputLabel>
            <Select label="Employee" value={actor} onChange={e => setActor(e.target.value)}>
              <MenuItem value="">All Employees</MenuItem>
              {actors.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Entity</InputLabel>
            <Select label="Entity" value={entity} onChange={e => setEntity(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              {Object.entries(ENTITY_LABELS).map(([k, v]) => (
                <MenuItem key={k} value={k}>{v}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Action</InputLabel>
            <Select label="Action" value={action} onChange={e => setAction(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              {knownActions.map(a => (
                <MenuItem key={a} value={a}>{a.replace(/_/g, " ")}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Rows</InputLabel>
            <Select label="Rows" value={limit} onChange={e => setLimit(Number(e.target.value))}>
              {[50, 100, 200, 500].map(n => <MenuItem key={n} value={n}>{n}</MenuItem>)}
            </Select>
          </FormControl>

          {canClear && (
            <Button size="small" color="error" variant="outlined"
              onClick={clearFilters} sx={{ fontWeight: 700, height: 40 }}>
              Clear
            </Button>
          )}

          <Box sx={{ flexGrow: 1 }} />

          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Box component="span"
              onClick={() => offset > 0 && setOffset(o => Math.max(0, o - limit))}
              sx={{ cursor: offset > 0 ? "pointer" : "default",
                color: offset > 0 ? "primary.main" : "grey.400",
                fontWeight: 700, fontSize: 13, userSelect: "none", px: 1 }}>
              ← Prev
            </Box>
            <Typography variant="caption" sx={{ opacity: 0.6 }}>
              {offset + 1}–{offset + rows.length}
            </Typography>
            <Box component="span"
              onClick={() => !disableNext && setOffset(o => o + limit)}
              sx={{ cursor: !disableNext ? "pointer" : "default",
                color: !disableNext ? "primary.main" : "grey.400",
                fontWeight: 700, fontSize: 13, userSelect: "none", px: 1 }}>
              Next →
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* ── Table ────────────────────────────────────────────────── */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "grey.200", overflow: "hidden" }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "grey.50" }}>
              <TableCell sx={{ fontWeight: 800 }}>#</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Time</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Employee</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Action</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Entity</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>ID</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Message</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ textAlign: "center", py: 4, opacity: 0.5 }}>Loading…</TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ textAlign: "center", py: 4, opacity: 0.5 }}>
                  No activity{day === TODAY ? " today" : day ? ` on ${day}` : ""}.
                </TableCell>
              </TableRow>
            ) : rows.map((r, idx) => (
              <TableRow key={r.id} hover sx={{ "&:last-child td": { border: 0 }, opacity: loading ? 0.4 : 1 }}>
                <TableCell sx={{ opacity: 0.45, fontFamily: "monospace", fontSize: 11 }}>
                  {offset + idx + 1}
                </TableCell>
                <TableCell sx={{ whiteSpace: "nowrap", fontSize: 12, opacity: 0.8 }}>
                  {r.created_at ? bFormat(r.created_at, "DD/MM/YY HH:mm") : "—"}
                </TableCell>
                <TableCell>
                  <Chip label={r.actor || "system"} size="small" variant="outlined"
                    color={r.actor && r.actor !== "system" ? "primary" : "default"}
                    sx={{ fontWeight: 600, fontSize: 11 }} />
                </TableCell>
                <TableCell><ActionBadge action={r.action} /></TableCell>
                <TableCell sx={{ fontSize: 12 }}>{ENTITY_LABELS[r.entity] || r.entity}</TableCell>
                <TableCell sx={{ fontFamily: "monospace", fontSize: 12, opacity: 0.7 }}>
                  {r.entity_id ?? "—"}
                </TableCell>
                <TableCell sx={{ fontSize: 12, maxWidth: 340 }}>{r.message || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {rows.length > 0 && (
          <>
            <Divider />
            <Box sx={{ px: 2, py: 1, display: "flex", justifyContent: "flex-end" }}>
              <Typography variant="caption" sx={{ opacity: 0.55 }}>
                Showing {offset + 1}–{offset + rows.length}
              </Typography>
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
}