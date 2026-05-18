// src/components/LocationPicker.jsx
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { Box, Chip, Paper, Typography } from "@mui/material";
import LocationOnIcon  from "@mui/icons-material/LocationOn";
import LocationOffIcon from "@mui/icons-material/LocationOff";

// Fix webpack icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const selectedIcon = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
    <filter id="s"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.4"/></filter>
    <ellipse cx="14" cy="34" rx="5" ry="2" fill="rgba(0,0,0,0.2)"/>
    <path d="M14 0C8.477 0 4 4.477 4 10c0 7.5 10 22 10 22S24 17.5 24 10C24 4.477 19.523 0 14 0z"
      fill="#d32f2f" stroke="white" stroke-width="1.5" filter="url(#s)"/>
    <circle cx="14" cy="10" r="4" fill="white"/>
  </svg>`,
  className: "", iconSize: [28,36], iconAnchor: [14,36], popupAnchor: [0,-38],
});

// ── Tile layers (satellite first = default) ───────────────────────────────────
const TILE_LAYERS = [
  {
    key: "satellite",
    label: "Satellite",
    icon: "🛰️",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
  },
  {
    key: "street",
    label: "Street",
    icon: "🗺️",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  {
    key: "terrain",
    label: "Terrain",
    icon: "⛰️",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
  },
];

// Sync map when lat/lng change externally
function MapSync({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat != null && lng != null)
      map.setView([lat, lng], Math.max(map.getZoom(), 15));
  }, [lat, lng, map]);
  return null;
}

function ClickHandler({ readOnly, onChange }) {
  useMapEvents({
    click(e) {
      if (!readOnly && onChange) onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

const FALLBACK_CENTER = [33.8938, 35.5018];
const FALLBACK_ZOOM   = 14;

export default function LocationPicker({
  lat, lng, onChange,
  height   = 320,
  readOnly = false,
}) {
  const [mapLayer,  setMapLayer]  = useState("satellite");
  const [defCenter, setDefCenter] = useState(null); // null = not loaded yet
  const [defZoom,   setDefZoom]   = useState(FALLBACK_ZOOM);

  // Load default center from settings BEFORE rendering map
  useEffect(() => {
    window.api.getSettings().then(s => {
      const la = parseFloat(s?.map_lat);
      const ln = parseFloat(s?.map_lng);
      const z  = parseInt(s?.map_zoom);
      const center = (!isNaN(la) && !isNaN(ln)) ? [la, ln] : FALLBACK_CENTER;
      const zoom   = (!isNaN(z) && z > 0) ? z : FALLBACK_ZOOM;
      setDefCenter(center);
      setDefZoom(zoom);
    }).catch(() => setDefCenter(FALLBACK_CENTER));
  }, []);

  // Don't render map until settings are loaded
  if (!defCenter) return (
    <Box sx={{ height, borderRadius: 2, bgcolor: "grey.100",
      display: "flex", alignItems: "center", justifyContent: "center",
      border: "1px solid", borderColor: "grey.200" }}>
      <Typography variant="caption" sx={{ opacity: 0.5 }}>Loading map…</Typography>
    </Box>
  );

  const hasLocation = lat != null && lng != null;
  const initCenter  = hasLocation ? [lat, lng] : defCenter;
  const initZoom    = hasLocation ? 15 : defZoom;

  const activeTile = TILE_LAYERS.find(t => t.key === mapLayer) || TILE_LAYERS[0];

  return (
    <Box>
      {/* Status chip */}
      <Box sx={{ mb: 0.75, display: "flex", alignItems: "center", gap: 1 }}>
        {hasLocation ? (
          <Chip icon={<LocationOnIcon />}
            label={`${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`}
            color="success" size="small"
            sx={{ fontWeight: 700, fontFamily: "monospace" }} />
        ) : (
          <Chip icon={<LocationOffIcon />} label="No location set"
            variant="outlined" size="small"
            sx={{ fontWeight: 600, opacity: 0.7 }} />
        )}
        {!readOnly && (
          <Typography variant="caption" sx={{ opacity: 0.55 }}>
            {hasLocation ? "Click map to move pin" : "Click map to set location"}
          </Typography>
        )}
      </Box>

      {/* Map wrapper */}
      <Box sx={{
        height, borderRadius: 2, overflow: "hidden", position: "relative",
        border: "1px solid", borderColor: readOnly ? "grey.200" : "primary.200",
        cursor: readOnly ? "default" : "crosshair",
        boxShadow: readOnly ? 0 : "0 0 0 2px rgba(25,118,210,0.15)",
      }}>

        {/* Layer switcher overlay */}
        <Box sx={{
          position: "absolute", bottom: 10, left: 8, zIndex: 1000,
          display: "flex", gap: 0.5,
        }}>
          {TILE_LAYERS.map(t => (
            <Paper
              key={t.key}
              elevation={mapLayer === t.key ? 4 : 1}
              onClick={() => setMapLayer(t.key)}
              sx={{
                px: 1, py: 0.4, borderRadius: 1.5, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 0.4,
                border: "2px solid",
                borderColor: mapLayer === t.key ? "primary.main" : "transparent",
                bgcolor: mapLayer === t.key ? "primary.50" : "white",
                userSelect: "none",
                "&:hover": { borderColor: "primary.light" },
                transition: "all 0.15s",
              }}
            >
              <Typography sx={{ fontSize: 12 }}>{t.icon}</Typography>
              <Typography sx={{ fontSize: 10.5, fontWeight: mapLayer === t.key ? 800 : 500 }}>
                {t.label}
              </Typography>
            </Paper>
          ))}
        </Box>

        <MapContainer
          center={initCenter}
          zoom={initZoom}
          style={{ height: "100%", width: "100%" }}
          zoomControl={true}
        >
          <TileLayer key={mapLayer} url={activeTile.url} attribution={activeTile.attribution} />
          <MapSync lat={lat} lng={lng} />
          <ClickHandler readOnly={readOnly} onChange={onChange} />
          {hasLocation && <Marker position={[lat, lng]} icon={selectedIcon} />}
        </MapContainer>
      </Box>
    </Box>
  );
}