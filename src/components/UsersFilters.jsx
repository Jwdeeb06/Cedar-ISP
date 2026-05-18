// src/components/UsersFilters.jsx
import { useMemo } from "react";
import {
  Box, Button, Chip, Divider, FormControl, IconButton,
  InputAdornment, InputLabel, MenuItem, Select,
  TextField, Typography,
} from "@mui/material";
import SearchIcon       from "@mui/icons-material/Search";
import CloseIcon        from "@mui/icons-material/Close";
import FilterListIcon   from "@mui/icons-material/FilterList";
import ServiceSelect    from "./ServiceSelect";

export default function UsersFilters({
  search,
  onSearchChange,

  service,
  onServiceChange,
  serviceRefreshKey = 0,

  address,
  onAddressChange,
  addresses = [],

  status,
  onStatusChange,

  // expiry
  expiryAfter,
  onExpiryAfterChange,
  expiryBefore,
  onExpiryBeforeChange,

  company,
  onCompanyChange,
  companies = [],

  // totals + paging size
  totalCount = 0,
  limit = 50,
  onLimitChange,
  limitOptions = [50, 100, 150, 200, 250],

  rightSlot,
}) {
  const canClear = useMemo(() => {
    return Boolean(search || service || address || status || expiryAfter || expiryBefore);
  }, [search, service, address, status, expiryAfter, expiryBefore, company]);

  const clearAll = () => {
    onSearchChange?.("");
    onServiceChange?.("");
    onAddressChange?.("");
    onStatusChange?.("");
    onExpiryAfterChange?.("");
    onExpiryBeforeChange?.("");
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <Typography variant="caption" sx={{ fontWeight: 800, opacity: 0.7 }}>
          Filters
        </Typography>

        <Box sx={{ flexGrow: 1 }} />

        <Typography variant="body2" sx={{ fontWeight: 800 }}>
          Total: {totalCount}
        </Typography>

        <FormControl size="small" sx={{ minWidth: 110 }}>
          <InputLabel>Rows</InputLabel>
          <Select
            label="Rows"
            value={limit}
            onChange={(e) => onLimitChange?.(Number(e.target.value))}
          >
            {limitOptions.map((n) => (
              <MenuItem key={n} value={n}>
                {n}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          size="small"
          variant="outlined"
          onClick={clearAll}
          disabled={!canClear}
        >
          Clear
        </Button>

        {rightSlot ? <Box sx={{ display: "flex", gap: 1 }}>{rightSlot}</Box> : null}
      </Box>

      <Divider sx={{ my: 0.5 }} />

      {/* One-line filters (wrap if small screen) */}
      <Box
        sx={{
          display: "flex",
          gap: 1,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {/* Search */}
        <TextField
          size="small"
          label="Search"
          placeholder="name / mobile / username"
          value={search ?? ""}
          onChange={(e) => onSearchChange?.(e.target.value)}
          sx={{ minWidth: 240 }}
          InputProps={{
            endAdornment: search ? (
              <IconButton size="small" onClick={() => onSearchChange?.("")}>
                ✕
              </IconButton>
            ) : null,
          }}
        />

        {/* Service */}
        <Box sx={{ minWidth: 180 }}>
          <ServiceSelect
            size="small"
            value={service ?? ""}
            onChange={(v) => onServiceChange?.(v)}
            refreshKey={serviceRefreshKey}
          />
        </Box>

        {/* Address */}
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Address</InputLabel>
          <Select
            label="Address"
            value={address ?? ""}
            onChange={(e) => onAddressChange?.(e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            {addresses.map((a) => (
              <MenuItem key={a} value={a}>
                {a}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Status */}
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select
            label="Status"
            value={status ?? ""}
            onChange={(e) => onStatusChange?.(e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="ACTIVE">ACTIVE</MenuItem>
            <MenuItem value="INACTIVE">INACTIVE</MenuItem>
            <MenuItem value="SUSPENDED">SUSPENDED</MenuItem>
          </Select>
        </FormControl>

        {/* Company */}
        <FormControl size="small">
          <InputLabel>Company</InputLabel>
          <Select label="Company" value={company ?? ""} onChange={e => onCompanyChange?.(e.target.value)}>
            <MenuItem value="">All Companies</MenuItem>
            {companies.map(co => <MenuItem key={co.id} value={co.id}>{co.name}</MenuItem>)}
          </Select>
        </FormControl>

        {/* Expiry After */}
        <TextField
          size="small"
          label="Expiry After"
          type="date"
          value={expiryAfter ?? ""}
          onChange={(e) => onExpiryAfterChange?.(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 170 }}
        />

        {/* Expiry Before */}
        <TextField
          size="small"
          label="Expiry Before"
          type="date"
          value={expiryBefore ?? ""}
          onChange={(e) => onExpiryBeforeChange?.(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 170 }}
        />
      </Box>
    </Box>
  );
}