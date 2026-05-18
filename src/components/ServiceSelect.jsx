// src/components/ServiceSelect.jsx
import { useEffect, useState } from "react";
import {
  FormControl, InputLabel, MenuItem, Select,
} from "@mui/material";

export default function ServiceSelect({
  value       = "",
  onChange,
  refreshKey  = 0,
  size        = "small",
  label       = "Service",
  allowAdd    = false,   // show "+ Add service" option (for forms, not filters)
}) {
  const [services, setServices] = useState([]);

  useEffect(() => {
    window.api.listServices()
      .then(d => setServices(Array.isArray(d) ? d : []))
      .catch(() => setServices([]));
  }, [refreshKey]);

  return (
    <FormControl size={size} fullWidth>
      <InputLabel>{label}</InputLabel>
      <Select
        label={label}
        value={value ?? ""}
        onChange={e => onChange?.(e.target.value)}
      >
        <MenuItem value="">All Services</MenuItem>
        {services.map(s => (
          <MenuItem key={s.id} value={s.name}>{s.name}</MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}