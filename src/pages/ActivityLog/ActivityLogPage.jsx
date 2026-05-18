import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
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
import { bFormat } from "../../utils/dateUtils";
import { activityApi } from "../../services/activityApi";

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
  const label = action.replace(/_/g, " ");
  return (
    <Chip label={label} color={color} size="small"
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

export default function ActivityLogPage() {
  const [rows,    setRows]    = useState([]);
  const [days,    setDays]    = useState([]);
  const [actors,  setActors]  = useState([]);   // ← NEW: unique employee names
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const searchDeb           = useDebouncedValue(search);
  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("");
  const [actor,  setActor]  = useState("");     // ← NEW: employee filter
  const [day,    setDay]    = useState("");
  const [limit,  setLimit]  = useState(100);
  const [offset, setOffset] = useState(0);

  const loadDays = useCallback(async () => {
    const data = await activityApi.listDays({ limit: 60 });
    setDays(data || []);
  }, []);

  // ← NEW: load unique actors
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
        actor:  actor     || undefined,   // ← NEW
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
    setActor(""); setDay(""); setOffset(0);
  };

  const canClear = Boolean(search || entity || action || actor || day);

  return (
    <Box>
      {/* ── Header ───────────────────────────────────────────────── */}
      <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3,
        border: "1px solid", borderColor: "grey.200",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 900 }}>Activity Log</Typography>
          <Typography variant="body2" sx={{ opacity: 0.65 }}>
            Every action performed in the system is recorded here.
          </Typography>
        </Box>
        <Chip label={`${rows.length} rows`} variant="outlined" sx={{ fontWeight: 700 }} />
      </Paper>

      {/* ── Day chips ────────────────────────────────────────────── */}
      {days.length > 0 && (
        <Paper elevation={0} sx={{ p: 1.5, mb: 2, borderRadius: 3,
          border: "1px solid", borderColor: "grey.200" }}>
          <Typography variant="caption" sx={{ fontWeight: 800, opacity: 0.6, mr: 1 }}>
            Quick day filter:
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 0.5 }}>
            {days.map((d) => (
              <Chip key={d.day} label={`${d.day} (${d.count})`} size="small"
                variant={day === d.day ? "filled" : "outlined"}
                color={day === d.day ? "primary" : "default"}
                onClick={() => setDay((prev) => (prev === d.day ? "" : d.day))}
                sx={{ cursor: "pointer", fontWeight: 600, fontSize: 11 }} />
            ))}
          </Box>
        </Paper>
      )}

      {/* ── Filters ──────────────────────────────────────────────── */}
      <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3,
        border: "1px solid", borderColor: "grey.200" }}>
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>

          <TextField size="small" label="Search"
            placeholder="message / actor / action…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 260 }}
            InputProps={{ endAdornment: search
              ? <IconButton size="small" onClick={() => setSearch("")}>✕</IconButton>
              : null }} />

          {/* ← NEW: Employee filter */}
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Employee</InputLabel>
            <Select label="Employee" value={actor}
              onChange={(e) => setActor(e.target.value)}>
              <MenuItem value="">All Employees</MenuItem>
              {actors.map((a) => (
                <MenuItem key={a} value={a}>{a}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Entity</InputLabel>
            <Select label="Entity" value={entity}
              onChange={(e) => setEntity(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              {Object.entries(ENTITY_LABELS).map(([k, v]) => (
                <MenuItem key={k} value={k}>{v}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Action</InputLabel>
            <Select label="Action" value={action}
              onChange={(e) => setAction(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              {knownActions.map((a) => (
                <MenuItem key={a} value={a}>{a.replace(/_/g, " ")}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Rows</InputLabel>
            <Select label="Rows" value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}>
              {[50, 100, 200, 500].map((n) => (
                <MenuItem key={n} value={n}>{n}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box component="span" onClick={clearFilters} sx={{
            cursor: canClear ? "pointer" : "default",
            color:  canClear ? "error.main" : "grey.400",
            fontWeight: 700, fontSize: 13, userSelect: "none", px: 1,
          }}>Clear</Box>

          <Box sx={{ flexGrow: 1 }} />

          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Box component="span"
              onClick={() => offset > 0 && setOffset((o) => Math.max(0, o - limit))}
              sx={{ cursor: offset > 0 ? "pointer" : "default",
                color: offset > 0 ? "primary.main" : "grey.400",
                fontWeight: 700, fontSize: 13, userSelect: "none", px: 1 }}>
              ← Prev
            </Box>
            <Typography variant="caption" sx={{ opacity: 0.6 }}>
              {offset + 1}–{offset + rows.length}
            </Typography>
            <Box component="span"
              onClick={() => !disableNext && setOffset((o) => o + limit)}
              sx={{ cursor: !disableNext ? "pointer" : "default",
                color: !disableNext ? "primary.main" : "grey.400",
                fontWeight: 700, fontSize: 13, userSelect: "none", px: 1 }}>
              Next →
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* ── Table ────────────────────────────────────────────────── */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid",
        borderColor: "grey.200", overflow: "hidden" }}>
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
                <TableCell colSpan={7} sx={{ textAlign: "center", py: 4, opacity: 0.5 }}>
                  Loading…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ textAlign: "center", py: 4, opacity: 0.5 }}>
                  No activity found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r, idx) => (
                <TableRow key={r.id} hover sx={{ "&:last-child td": { border: 0 },
                  opacity: loading ? 0.4 : 1 }}>
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
                  <TableCell sx={{ fontSize: 12 }}>
                    {ENTITY_LABELS[r.entity] || r.entity}
                  </TableCell>
                  <TableCell sx={{ fontFamily: "monospace", fontSize: 12, opacity: 0.7 }}>
                    {r.entity_id ?? "—"}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12, maxWidth: 340 }}>
                    {r.message || "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
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