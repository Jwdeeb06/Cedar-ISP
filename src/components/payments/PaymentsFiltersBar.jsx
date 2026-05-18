import { useEffect, useState } from "react";
import {
  Box, Button, Chip, IconButton, InputAdornment,
  MenuItem, TextField, Typography,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import SearchIcon     from "@mui/icons-material/Search";
import CloseIcon      from "@mui/icons-material/Close";
import FilterListIcon from "@mui/icons-material/FilterList";
import GenerateMonthDialog from "./GenerateMonthDialog";
import { servicesApi } from "../../services/servicesApi";

export default function PaymentsFiltersBar({
  filterMonth,  setFilterMonth,
  filterStatus, setFilterStatus,
  filterType,   setFilterType,
  paidOn,       setPaidOn,
  paidDays,
  service,      setService,
  // address/region props kept in signature for backward compat,
  // but no longer rendered. Safe to remove from parent later.
  address,      setAddress,
  region,       setRegion,
  search,       setSearch,
  onGenerated,
}) {
  const [genOpen, setGenOpen] = useState(false);
  const [serviceOptions, setServiceOptions] = useState([]);

  // Load service list once for the dropdown
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const rows = await servicesApi.list();
        if (alive) setServiceOptions(Array.isArray(rows) ? rows : []);
      } catch {
        if (alive) setServiceOptions([]);
      }
    })();
    return () => { alive = false; };
  }, []);

  const clearAll = () => {
    setFilterStatus("ALL"); setFilterType("ALL"); setPaidOn("");
    setService(""); setSearch("");
    // also clear region/address state if parent still tracks them
    setAddress?.(""); setRegion?.("");
  };

  const activeCount = [
    filterStatus !== "ALL", filterType !== "ALL", paidOn,
    service, search,
  ].filter(Boolean).length;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>

        {/* Filter icon + label */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mr: 0.5 }}>
          <FilterListIcon sx={{ opacity: 0.45, fontSize: 20 }} />
          <Typography variant="subtitle2" fontWeight={800} sx={{ opacity: 0.7 }}>Filters</Typography>
          {activeCount > 0 && (
            <Chip label={activeCount} size="small" color="primary"
              sx={{ height: 18, fontSize: 10, fontWeight: 800, "& .MuiChip-label": { px: 0.75 } }} />
          )}
        </Box>

        {/* Search */}
        <TextField size="small" label="Search" placeholder="Name, phone, invoice…"
          value={search} onChange={e => setSearch(e.target.value)} sx={{ width: 200 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, opacity: 0.4 }} /></InputAdornment>,
            endAdornment: search ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearch("")} edge="end">
                  <CloseIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />

        {/* Month */}
        <DatePicker label="Month" views={["year","month"]} openTo="month"
          value={filterMonth} onChange={v => setFilterMonth(v)}
          slotProps={{ textField: { size: "small", sx: { width: 150 } } }}
        />

        {/* Paid On */}
        <TextField select size="small" label="Paid On"
          value={paidOn || ""} onChange={e => setPaidOn(e.target.value)}
          sx={{ width: 175 }}
          InputProps={{
            endAdornment: paidOn ? (
              <InputAdornment position="end" sx={{ mr: 2 }}>
                <IconButton size="small" onClick={() => setPaidOn("")} edge="end">
                  <CloseIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </InputAdornment>
            ) : undefined,
          }}
        >
          <MenuItem value="">All Days</MenuItem>
          {(paidDays || []).map(d => (
            <MenuItem key={d.day} value={d.day}>{d.day} ({d.count})</MenuItem>
          ))}
        </TextField>

        {/* Status */}
        <TextField select size="small" label="Status"
          value={filterStatus} onChange={e => setFilterStatus(e.target.value)} sx={{ width: 115 }}>
          <MenuItem value="ALL">All</MenuItem>
          <MenuItem value="UNPAID">Unpaid</MenuItem>
          <MenuItem value="PAID">Paid</MenuItem>
        </TextField>

        {/* Type */}
        <TextField select size="small" label="Type"
          value={filterType} onChange={e => setFilterType(e.target.value)} sx={{ width: 140 }}>
          <MenuItem value="ALL">All</MenuItem>
          <MenuItem value="SUBSCRIPTION">Subscription</MenuItem>
          <MenuItem value="STATIC">Static</MenuItem>
        </TextField>

        {/* Service — dropdown of existing services */}
        <TextField select size="small" label="Service"
          value={service || ""} onChange={e => setService(e.target.value)}
          sx={{ width: 170 }}>
          <MenuItem value="">All Services</MenuItem>
          {serviceOptions.map(s => (
            <MenuItem key={s.id} value={s.name}>{s.name}</MenuItem>
          ))}
        </TextField>

        {/* Clear All */}
        <Button size="small" variant="outlined" color="error" onClick={clearAll}
          disabled={activeCount === 0}
          sx={{ height: 40, fontWeight: 700, whiteSpace: "nowrap" }}>
          Clear All
        </Button>

        <Box sx={{ flexGrow: 1 }} />

        {/* Generate Month — right side */}
        <Button size="small" variant="contained" onClick={() => setGenOpen(true)}
          sx={{ fontWeight: 700, height: 40, whiteSpace: "nowrap" }}>
          Generate Month
        </Button>

      </Box>

      <GenerateMonthDialog
        open={genOpen}
        onOpen={() => setGenOpen(true)}
        onClose={() => setGenOpen(false)}
        onGenerated={text => { setGenOpen(false); onGenerated?.(text); }}
      />
    </LocalizationProvider>
  );
}