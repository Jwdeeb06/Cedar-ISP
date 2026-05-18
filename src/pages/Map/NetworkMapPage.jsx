// src/pages/Map/NetworkMapPage.jsx
// npm install leaflet react-leaflet
// Add to public/index.html: <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

import { useCallback, useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, FormControl, IconButton, InputLabel, MenuItem, Paper,
  Select, Stack, TextField, Tooltip, Typography,
} from "@mui/material";
import StraightenIcon    from "@mui/icons-material/Straighten";
import RouterIcon        from "@mui/icons-material/Router";
import CableIcon         from "@mui/icons-material/Cable";
import PeopleAltIcon     from "@mui/icons-material/PeopleAlt";
import LayersIcon        from "@mui/icons-material/Layers";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon          from "@mui/icons-material/Edit";
import UndoIcon          from "@mui/icons-material/Undo";
import ClearIcon         from "@mui/icons-material/Clear";
import CheckIcon         from "@mui/icons-material/Check";
import { mapApi } from "../../services/mapApi";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function svgIcon(color, symbol, size = 32) {
  const id = `ic${color.replace(/[^a-z0-9]/gi,"")}${size}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size+8}" viewBox="0 0 ${size} ${size+8}">
    <filter id="${id}"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.35"/></filter>
    <circle cx="${size/2}" cy="${size/2}" r="${size/2-2}" fill="${color}" stroke="white" stroke-width="2.5" filter="url(#${id})"/>
    <text x="${size/2}" y="${size/2+5}" text-anchor="middle" font-size="${size*0.38}" fill="white" font-family="Arial" font-weight="bold">${symbol}</text>
    <line x1="${size/2}" y1="${size-2}" x2="${size/2}" y2="${size+8}" stroke="${color}" stroke-width="2.5"/>
  </svg>`;
  return L.divIcon({ html: svg, className: "", iconSize:[size,size+8], iconAnchor:[size/2,size+8], popupAnchor:[0,-(size+4)] });
}

function measurePtIcon(i, isLast) {
  const color = i === 0 ? "#4a148c" : isLast ? "#880e4f" : "#7b1fa2";
  const label = i < 26 ? String.fromCharCode(65+i) : String.fromCharCode(65+Math.floor(i/26)-1)+String.fromCharCode(65+(i%26));
  return svgIcon(color, label, 26);
}

const ICONS = {
  ACTIVE:    svgIcon("#2e7d32","●"),
  INACTIVE:  svgIcon("#9e9e9e","●"),
  SUSPENDED: svgIcon("#c62828","✕"),
  STATION:   svgIcon("#1565c0","📡",36),
  FIBER:     svgIcon("#e65100","◈",30),
};

function haversine([lat1,lng1],[lat2,lng2]) {
  const R=6371000, toRad=d=>d*Math.PI/180;
  const dLat=toRad(lat2-lat1), dLng=toRad(lng2-lng1);
  const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function fmtDist(m) { return m>=1000?`${(m/1000).toFixed(3)} km`:`${Math.round(m)} m`; }

function MapClickHandler({ mode, onMapClick }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng) });
  return null;
}

function StatusChip({ status }) {
  const c={ACTIVE:"success",INACTIVE:"default",SUSPENDED:"error"};
  return <Chip label={status} color={c[status]||"default"} size="small" sx={{fontWeight:700}}/>;
}


// ── Fly to center after settings load ────────────────────────────────────────
function FlyToCenter({ center, zoom, trigger }) {
  const map = useMap();
  useEffect(() => {
    if (trigger) map.flyTo(center, zoom, { animate: false });
  }, [trigger]);
  return null;
}

// ── Tile layers ───────────────────────────────────────────────────────────────
const TILE_LAYERS = {
  street: {
    label: "Street",
    icon: "🗺️",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  satellite: {
    label: "Satellite",
    icon: "🛰️",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
  },
  terrain: {
    label: "Terrain",
    icon: "⛰️",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
  },
  topo: {
    label: "Topo",
    icon: "🗻",
    url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
};

export default function NetworkMapPage() {
  const [users, setUsers]           = useState([]);
  const [stations, setStations]     = useState([]);
  const [fiberBoxes, setFiberBoxes] = useState([]);
  const [services, setServices]     = useState([]);
  const [showUsers, setShowUsers]       = useState(true);
  const [showStations, setShowStations] = useState(true);
  const [showFibers, setShowFibers]     = useState(true);
  const [showRadius, setShowRadius]     = useState(true);
  const [filterStatus, setFilterStatus]   = useState("ALL");
  const [filterService, setFilterService] = useState("");
  const [mode, setMode]                   = useState(null);
  const [measurePts, setMeasurePts]       = useState([]);
  const [addStationDialog, setAddStationDialog] = useState({open:false,lat:null,lng:null});
  const [addFiberDialog, setAddFiberDialog]     = useState({open:false,lat:null,lng:null});
  const [stationForm, setStationForm] = useState({name:"",type:"OLT",capacity:"",coverage_m:"500",notes:""});
  const [fiberForm, setFiberForm]     = useState({name:"",type:"SPLICE",port_count:"",station_id:"",notes:""});
  const [editStation, setEditStation] = useState(null);
  const [editFiber, setEditFiber]     = useState(null);
  const [defaultCenter, setDefaultCenter] = useState([33.8938, 35.5018]);
  const [defaultZoom,   setDefaultZoom]   = useState(13);
  const [mapLayer,      setMapLayer]      = useState("satellite");
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const loadAll = useCallback(async () => {
    const [u, s, f, settings] = await Promise.all([
      mapApi.getUsers(), mapApi.listStations(), mapApi.listFiberBoxes(),
      window.api.getSettings(),
    ]);
    setUsers(u||[]); setStations(s||[]); setFiberBoxes(f||[]);
    setServices([...new Set((u||[]).map(x=>x.service).filter(Boolean))].sort());

    // Load default map center from settings
    const lat  = parseFloat(settings?.map_lat);
    const lng  = parseFloat(settings?.map_lng);
    const zoom = parseInt(settings?.map_zoom);
    if (!isNaN(lat) && !isNaN(lng)) setDefaultCenter([lat, lng]);
    if (!isNaN(zoom) && zoom > 0)   setDefaultZoom(zoom);
    setSettingsLoaded(true);
  }, []);
  useEffect(()=>{loadAll();},[loadAll]);

  const filteredUsers = useMemo(()=>users.filter(u=>{
    if(filterStatus!=="ALL"&&u.status!==filterStatus)return false;
    if(filterService&&u.service!==filterService)return false;
    return true;
  }),[users,filterStatus,filterService]);

  const segmentDistances = useMemo(()=>{
    const s=[];
    for(let i=1;i<measurePts.length;i++) s.push(haversine(measurePts[i-1],measurePts[i]));
    return s;
  },[measurePts]);

  const totalDist = useMemo(()=>segmentDistances.reduce((a,b)=>a+b,0),[segmentDistances]);

  const handleMapClick = (latlng) => {
    if(mode==="ADD_STATION"){setAddStationDialog({open:true,lat:latlng.lat,lng:latlng.lng});setMode(null);}
    else if(mode==="ADD_FIBER"){setAddFiberDialog({open:true,lat:latlng.lat,lng:latlng.lng});setMode(null);}
    else if(mode==="MEASURE"){setMeasurePts(prev=>[...prev,[latlng.lat,latlng.lng]]);}
  };

  const ptLabel = (i) => i<26?String.fromCharCode(65+i):`${i+1}`;
  const stats = useMemo(()=>({
    total:filteredUsers.length,
    active:filteredUsers.filter(u=>u.status==="ACTIVE").length,
    inactive:filteredUsers.filter(u=>u.status==="INACTIVE").length,
    suspended:filteredUsers.filter(u=>u.status==="SUSPENDED").length,
  }),[filteredUsers]);

  const isMeasuring = mode==="MEASURE";

  return (
    <Box sx={{display:"flex",flexDirection:"column",height:"calc(100vh - 80px)",gap:1}}>

      {/* Toolbar */}
      <Paper elevation={0} sx={{p:1.5,borderRadius:3,border:"1px solid",borderColor:"grey.200",display:"flex",gap:1,flexWrap:"wrap",alignItems:"center"}}>
        <Box sx={{mr:1}}>
          <Typography variant="h6" sx={{fontWeight:900,lineHeight:1}}>Network Map</Typography>
          <Typography variant="caption" sx={{opacity:0.55}}>{stats.total} users · {stations.length} stations · {fiberBoxes.length} fiber boxes</Typography>
        </Box>
        <Divider orientation="vertical" flexItem />
        {[
          {label:`Users (${stats.total})`,color:"primary",icon:<PeopleAltIcon/>,val:showUsers,set:setShowUsers},
          {label:`Stations (${stations.length})`,color:"info",icon:<RouterIcon/>,val:showStations,set:setShowStations},
          {label:`Fiber (${fiberBoxes.length})`,color:"warning",icon:<CableIcon/>,val:showFibers,set:setShowFibers},
          {label:"Radius",color:"secondary",icon:<LayersIcon/>,val:showRadius,set:setShowRadius},
        ].map(({label,color,icon,val,set})=>(
          <Chip key={label} icon={icon} label={label} onClick={()=>set(v=>!v)}
            color={val?color:"default"} variant={val?"filled":"outlined"} sx={{fontWeight:700}}/>
        ))}
        <Divider orientation="vertical" flexItem />
        <FormControl size="small" sx={{minWidth:130}}>
          <InputLabel>Status</InputLabel>
          <Select label="Status" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
            <MenuItem value="ALL">All</MenuItem><MenuItem value="ACTIVE">Active</MenuItem>
            <MenuItem value="INACTIVE">Inactive</MenuItem><MenuItem value="SUSPENDED">Suspended</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{minWidth:150}}>
          <InputLabel>Service</InputLabel>
          <Select label="Service" value={filterService} onChange={e=>setFilterService(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {services.map(s=><MenuItem key={s} value={s}>{s}</MenuItem>)}
          </Select>
        </FormControl>
        <Divider orientation="vertical" flexItem />
        <Button size="small" variant={mode==="ADD_STATION"?"contained":"outlined"} color="info"
          startIcon={<RouterIcon/>} onClick={()=>setMode(m=>m==="ADD_STATION"?null:"ADD_STATION")}>Add Station</Button>
        <Button size="small" variant={mode==="ADD_FIBER"?"contained":"outlined"} color="warning"
          startIcon={<CableIcon/>} onClick={()=>setMode(m=>m==="ADD_FIBER"?null:"ADD_FIBER")}>Add Fiber Box</Button>

        {/* Measure controls */}
        {!isMeasuring ? (
          <Button size="small" variant={measurePts.length>0?"contained":"outlined"} color="secondary"
            startIcon={<StraightenIcon/>} onClick={()=>{setMeasurePts([]);setMode("MEASURE");}}>
            {measurePts.length>0?"Continue":"Measure"}
          </Button>
        ) : (
          <Box sx={{display:"flex",gap:0.75,alignItems:"center",px:1,py:0.5,borderRadius:2,bgcolor:"secondary.50",border:"1px solid",borderColor:"secondary.200"}}>
            <Typography variant="caption" sx={{fontWeight:800,color:"secondary.dark"}}>
              Next: {ptLabel(measurePts.length)}
            </Typography>
            <Tooltip title="Undo last point"><span>
              <IconButton size="small" onClick={()=>setMeasurePts(p=>p.slice(0,-1))} disabled={measurePts.length===0}>
                <UndoIcon fontSize="small"/>
              </IconButton>
            </span></Tooltip>
            <Button size="small" variant="contained" color="secondary" startIcon={<CheckIcon/>} onClick={()=>setMode(null)}>Done</Button>
            <Button size="small" variant="outlined" color="error" startIcon={<ClearIcon/>} onClick={()=>{setMeasurePts([]);setMode(null);}}>Clear</Button>
          </Box>
        )}

        {/* Distance display */}
        {measurePts.length>=2 && (
          <Paper elevation={0} sx={{px:1.5,py:0.6,borderRadius:2,border:"1px solid",borderColor:"secondary.200",bgcolor:"secondary.50",display:"flex",alignItems:"center",gap:1.5,flexWrap:"wrap",maxWidth:"100%"}}>
            <Typography variant="body2" sx={{fontWeight:900,color:"secondary.dark",whiteSpace:"nowrap"}}>
              📏 Total: {fmtDist(totalDist)}
            </Typography>
            <Divider orientation="vertical" flexItem />
            <Typography variant="caption" sx={{opacity:0.7,fontFamily:"monospace",flexWrap:"wrap"}}>
              {segmentDistances.map((d,i)=>`${ptLabel(i)}→${ptLabel(i+1)}: ${fmtDist(d)}`).join("  ·  ")}
            </Typography>
            {!isMeasuring && (
              <IconButton size="small" onClick={()=>setMeasurePts([])}><ClearIcon fontSize="small"/></IconButton>
            )}
          </Paper>
        )}

        <Box sx={{flexGrow:1}}/>
        <Box sx={{display:"flex",gap:1.5,alignItems:"center",opacity:0.7}}>
          {[{color:"#2e7d32",label:`Active (${stats.active})`},{color:"#9e9e9e",label:`Inactive (${stats.inactive})`},{color:"#c62828",label:`Suspended (${stats.suspended})`}]
            .map(l=>(
              <Box key={l.label} sx={{display:"flex",alignItems:"center",gap:0.4}}>
                <Box sx={{width:10,height:10,borderRadius:"50%",bgcolor:l.color}}/>
                <Typography variant="caption" sx={{fontWeight:600}}>{l.label}</Typography>
              </Box>
          ))}
        </Box>
      </Paper>

      {/* Mode hint */}
      {mode && (
        <Paper sx={{px:2,py:0.75,bgcolor:"secondary.50",borderRadius:2,border:"1px solid",borderColor:"secondary.200"}}>
          <Typography variant="body2" sx={{fontWeight:700,color:"secondary.dark"}}>
            {mode==="ADD_STATION" && "🖱️ Click the map to place a Station"}
            {mode==="ADD_FIBER"   && "🖱️ Click the map to place a Fiber Box"}
            {mode==="MEASURE"     && (measurePts.length===0
              ? "📍 Click to set point A — you can add unlimited points"
              : `📍 Click to add point ${ptLabel(measurePts.length)} — press Done when finished`)}
          </Typography>
        </Paper>
      )}

      {/* Map */}
      <Box sx={{flex:1,borderRadius:3,overflow:"hidden",border:"1px solid",borderColor:"grey.200",position:"relative"}}>

        {/* Layer switcher overlay */}
        <Box sx={{
          position:"absolute", bottom:24, left:12, zIndex:1000,
          display:"flex", gap:0.75,
        }}>
          {Object.entries(TILE_LAYERS).map(([key, layer]) => (
            <Paper
              key={key}
              elevation={mapLayer === key ? 4 : 1}
              onClick={() => setMapLayer(key)}
              sx={{
                px:1.25, py:0.6, borderRadius:2, cursor:"pointer",
                display:"flex", alignItems:"center", gap:0.5,
                border: "2px solid",
                borderColor: mapLayer === key ? "primary.main" : "transparent",
                bgcolor: mapLayer === key ? "primary.50" : "white",
                userSelect:"none",
                "&:hover": { borderColor:"primary.light" },
                transition:"all 0.15s",
              }}
            >
              <Typography sx={{fontSize:14}}>{layer.icon}</Typography>
              <Typography sx={{fontSize:11,fontWeight: mapLayer === key ? 800 : 500}}>
                {layer.label}
              </Typography>
            </Paper>
          ))}
        </Box>

        <MapContainer center={defaultCenter} zoom={defaultZoom} style={{height:"100%",width:"100%",cursor:isMeasuring?"crosshair":"grab"}}>
          <TileLayer
            key={mapLayer}
            url={TILE_LAYERS[mapLayer].url}
            attribution={TILE_LAYERS[mapLayer].attribution}
          />
          <FlyToCenter center={defaultCenter} zoom={defaultZoom} trigger={settingsLoaded} />
          <MapClickHandler mode={mode} onMapClick={handleMapClick}/>

          {measurePts.length>=2 && <Polyline positions={measurePts} pathOptions={{color:"#7b1fa2",weight:2.5,dashArray:"8 4"}}/>}
          {measurePts.map((pt,i)=>(
            <Marker key={`mpt-${i}`} position={pt} icon={measurePtIcon(i,i===measurePts.length-1)}>
              <Popup>
                <Typography variant="body2" sx={{fontWeight:800}}>Point {ptLabel(i)}</Typography>
                <Typography variant="caption" sx={{fontFamily:"monospace",opacity:0.65}} display="block">{pt[0].toFixed(5)}, {pt[1].toFixed(5)}</Typography>
                {i>0 && <Typography variant="caption" display="block">Segment {ptLabel(i-1)}→{ptLabel(i)}: <b>{fmtDist(segmentDistances[i-1])}</b></Typography>}
                {measurePts.length>1 && <Typography variant="caption" display="block" sx={{fontWeight:900,color:"secondary.dark",mt:0.5}}>Total so far: {fmtDist(segmentDistances.slice(0,i).reduce((a,b)=>a+b,0))}</Typography>}
              </Popup>
            </Marker>
          ))}

          {showStations && stations.map(s=>(
            <Box key={`st-${s.id}`} component="span">
              {showRadius && <Circle center={[s.lat,s.lng]} radius={s.coverage_m||500} pathOptions={{color:"#1565c0",fillColor:"#1565c0",fillOpacity:0.06,weight:1.5,dashArray:"6 3"}}/>}
              <Marker position={[s.lat,s.lng]} icon={ICONS.STATION}>
                <Popup maxWidth={280}>
                  <Box sx={{minWidth:220}}>
                    <Typography variant="subtitle2" sx={{fontWeight:900}}>📡 {s.name}</Typography>
                    <Divider sx={{my:0.5}}/>
                    <Typography variant="body2">Type: <b>{s.type}</b></Typography>
                    <Typography variant="body2">Capacity: <b>{s.capacity||"—"}</b></Typography>
                    <Typography variant="body2">Coverage: <b>{s.coverage_m}m</b></Typography>
                    {s.notes && <Typography variant="body2" sx={{opacity:0.7,mt:0.5}}>{s.notes}</Typography>}
                    <Box sx={{display:"flex",gap:1,mt:1}}>
                      <Button size="small" startIcon={<EditIcon/>} onClick={()=>setEditStation({...s})}>Edit</Button>
                      <Button size="small" color="error" startIcon={<DeleteOutlineIcon/>} onClick={async()=>{await mapApi.deleteStation(s.id);loadAll();}}>Delete</Button>
                    </Box>
                  </Box>
                </Popup>
              </Marker>
            </Box>
          ))}

          {showFibers && fiberBoxes.map(f=>(
            <Marker key={`fb-${f.id}`} position={[f.lat,f.lng]} icon={ICONS.FIBER}>
              <Popup maxWidth={260}>
                <Box sx={{minWidth:200}}>
                  <Typography variant="subtitle2" sx={{fontWeight:900}}>◈ {f.name}</Typography>
                  <Divider sx={{my:0.5}}/>
                  <Typography variant="body2">Type: <b>{f.type}</b></Typography>
                  <Typography variant="body2">Ports: <b>{f.port_count||"—"}</b></Typography>
                  {f.station_name && <Typography variant="body2">Station: <b>{f.station_name}</b></Typography>}
                  {f.notes && <Typography variant="body2" sx={{opacity:0.7,mt:0.5}}>{f.notes}</Typography>}
                  <Box sx={{display:"flex",gap:1,mt:1}}>
                    <Button size="small" startIcon={<EditIcon/>} onClick={()=>setEditFiber({...f})}>Edit</Button>
                    <Button size="small" color="error" startIcon={<DeleteOutlineIcon/>} onClick={async()=>{await mapApi.deleteFiberBox(f.id);loadAll();}}>Delete</Button>
                  </Box>
                </Box>
              </Popup>
            </Marker>
          ))}

          {showUsers && filteredUsers.map(u=>(
            <Marker key={`u-${u.id}`} position={[u.lat,u.lng]} icon={ICONS[u.status]||ICONS.INACTIVE}>
              <Popup maxWidth={300}>
                <Box sx={{minWidth:240}}>
                  <Box sx={{display:"flex",alignItems:"center",gap:1,mb:0.5}}>
                    <Typography variant="subtitle2" sx={{fontWeight:900,flexGrow:1}}>{u.name}</Typography>
                    <StatusChip status={u.status}/>
                  </Box>
                  <Divider sx={{my:0.5}}/>
                  <Stack spacing={0.25}>
                    {u.username    && <Typography variant="body2">User: <b>{u.username}</b></Typography>}
                    {u.mobile      && <Typography variant="body2">Mobile: <b>{u.mobile}</b></Typography>}
                    {u.service     && <Typography variant="body2">Service: <b>{u.service}</b></Typography>}
                    {u.expiry_date && <Typography variant="body2">Expiry: <b>{u.expiry_date}</b></Typography>}
                    <Typography variant="body2">Balance: <b>{u.balance??0}</b></Typography>
                    <Typography variant="body2" sx={{opacity:0.6,fontSize:11,fontFamily:"monospace"}}>{u.lat?.toFixed(5)}, {u.lng?.toFixed(5)}</Typography>
                  </Stack>
                </Box>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </Box>

      {/* Add Station */}
      <Dialog open={addStationDialog.open} onClose={()=>setAddStationDialog({open:false,lat:null,lng:null})} maxWidth="sm" fullWidth>
        <DialogTitle>Add Station</DialogTitle>
        <DialogContent><Stack spacing={2} sx={{mt:1}}>
          <Typography variant="body2" sx={{opacity:0.6}}>{addStationDialog.lat?.toFixed(5)}, {addStationDialog.lng?.toFixed(5)}</Typography>
          <TextField label="Name *" value={stationForm.name} onChange={e=>setStationForm(p=>({...p,name:e.target.value}))} fullWidth/>
          <FormControl fullWidth><InputLabel>Type</InputLabel>
            <Select label="Type" value={stationForm.type} onChange={e=>setStationForm(p=>({...p,type:e.target.value}))}>
              <MenuItem value="OLT">OLT</MenuItem><MenuItem value="HUB">HUB</MenuItem><MenuItem value="POP">POP</MenuItem>
            </Select></FormControl>
          <TextField label="Capacity (ports)" value={stationForm.capacity} onChange={e=>setStationForm(p=>({...p,capacity:e.target.value}))} fullWidth/>
          <TextField label="Coverage radius (m)" value={stationForm.coverage_m} onChange={e=>setStationForm(p=>({...p,coverage_m:e.target.value}))} fullWidth/>
          <TextField label="Notes" multiline minRows={2} value={stationForm.notes} onChange={e=>setStationForm(p=>({...p,notes:e.target.value}))} fullWidth/>
        </Stack></DialogContent>
        <DialogActions>
          <Button onClick={()=>setAddStationDialog({open:false,lat:null,lng:null})}>Cancel</Button>
          <Button variant="contained" onClick={async()=>{const p={name:stationForm.name.trim(),lat:addStationDialog.lat,lng:addStationDialog.lng,type:stationForm.type,capacity:Number(stationForm.capacity)||0,coverage_m:Number(stationForm.coverage_m)||500,notes:stationForm.notes};if(!p.name)return;await mapApi.addStation(p);setAddStationDialog({open:false,lat:null,lng:null});setStationForm({name:"",type:"OLT",capacity:"",coverage_m:"500",notes:""});await loadAll();}} disabled={!stationForm.name.trim()}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Station */}
      <Dialog open={Boolean(editStation)} onClose={()=>setEditStation(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Station</DialogTitle>
        <DialogContent>{editStation&&<Stack spacing={2} sx={{mt:1}}>
          <TextField label="Name" value={editStation.name} onChange={e=>setEditStation(p=>({...p,name:e.target.value}))} fullWidth/>
          <FormControl fullWidth><InputLabel>Type</InputLabel>
            <Select label="Type" value={editStation.type} onChange={e=>setEditStation(p=>({...p,type:e.target.value}))}>
              <MenuItem value="OLT">OLT</MenuItem><MenuItem value="HUB">HUB</MenuItem><MenuItem value="POP">POP</MenuItem>
            </Select></FormControl>
          <TextField label="Capacity" value={editStation.capacity} onChange={e=>setEditStation(p=>({...p,capacity:e.target.value}))} fullWidth/>
          <TextField label="Coverage radius (m)" value={editStation.coverage_m} onChange={e=>setEditStation(p=>({...p,coverage_m:e.target.value}))} fullWidth/>
          <TextField label="Notes" multiline minRows={2} value={editStation.notes||""} onChange={e=>setEditStation(p=>({...p,notes:e.target.value}))} fullWidth/>
        </Stack>}</DialogContent>
        <DialogActions>
          <Button onClick={()=>setEditStation(null)}>Cancel</Button>
          <Button variant="contained" onClick={async()=>{await mapApi.updateStation(editStation);setEditStation(null);loadAll();}}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Add Fiber Box */}
      <Dialog open={addFiberDialog.open} onClose={()=>setAddFiberDialog({open:false,lat:null,lng:null})} maxWidth="sm" fullWidth>
        <DialogTitle>Add Fiber Box</DialogTitle>
        <DialogContent><Stack spacing={2} sx={{mt:1}}>
          <Typography variant="body2" sx={{opacity:0.6}}>{addFiberDialog.lat?.toFixed(5)}, {addFiberDialog.lng?.toFixed(5)}</Typography>
          <TextField label="Name *" value={fiberForm.name} onChange={e=>setFiberForm(p=>({...p,name:e.target.value}))} fullWidth/>
          <FormControl fullWidth><InputLabel>Type</InputLabel>
            <Select label="Type" value={fiberForm.type} onChange={e=>setFiberForm(p=>({...p,type:e.target.value}))}>
              <MenuItem value="SPLICE">Splice Box</MenuItem><MenuItem value="DISTRIBUTION">Distribution Box</MenuItem><MenuItem value="CLOSURE">Closure</MenuItem>
            </Select></FormControl>
          <TextField label="Port count" value={fiberForm.port_count} onChange={e=>setFiberForm(p=>({...p,port_count:e.target.value}))} fullWidth/>
          <FormControl fullWidth><InputLabel>Parent Station</InputLabel>
            <Select label="Parent Station" value={fiberForm.station_id} onChange={e=>setFiberForm(p=>({...p,station_id:e.target.value}))}>
              <MenuItem value="">None</MenuItem>
              {stations.map(s=><MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
            </Select></FormControl>
          <TextField label="Notes" multiline minRows={2} value={fiberForm.notes} onChange={e=>setFiberForm(p=>({...p,notes:e.target.value}))} fullWidth/>
        </Stack></DialogContent>
        <DialogActions>
          <Button onClick={()=>setAddFiberDialog({open:false,lat:null,lng:null})}>Cancel</Button>
          <Button variant="contained" onClick={async()=>{const p={name:fiberForm.name.trim(),lat:addFiberDialog.lat,lng:addFiberDialog.lng,type:fiberForm.type,port_count:Number(fiberForm.port_count)||0,station_id:fiberForm.station_id?Number(fiberForm.station_id):null,notes:fiberForm.notes};if(!p.name)return;await mapApi.addFiberBox(p);setAddFiberDialog({open:false,lat:null,lng:null});setFiberForm({name:"",type:"SPLICE",port_count:"",station_id:"",notes:""});await loadAll();}} disabled={!fiberForm.name.trim()}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Fiber Box */}
      <Dialog open={Boolean(editFiber)} onClose={()=>setEditFiber(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Fiber Box</DialogTitle>
        <DialogContent>{editFiber&&<Stack spacing={2} sx={{mt:1}}>
          <TextField label="Name" value={editFiber.name} onChange={e=>setEditFiber(p=>({...p,name:e.target.value}))} fullWidth/>
          <FormControl fullWidth><InputLabel>Type</InputLabel>
            <Select label="Type" value={editFiber.type} onChange={e=>setEditFiber(p=>({...p,type:e.target.value}))}>
              <MenuItem value="SPLICE">Splice Box</MenuItem><MenuItem value="DISTRIBUTION">Distribution Box</MenuItem><MenuItem value="CLOSURE">Closure</MenuItem>
            </Select></FormControl>
          <TextField label="Port count" value={editFiber.port_count} onChange={e=>setEditFiber(p=>({...p,port_count:e.target.value}))} fullWidth/>
          <FormControl fullWidth><InputLabel>Parent Station</InputLabel>
            <Select label="Parent Station" value={editFiber.station_id||""} onChange={e=>setEditFiber(p=>({...p,station_id:e.target.value}))}>
              <MenuItem value="">None</MenuItem>
              {stations.map(s=><MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
            </Select></FormControl>
          <TextField label="Notes" multiline minRows={2} value={editFiber.notes||""} onChange={e=>setEditFiber(p=>({...p,notes:e.target.value}))} fullWidth/>
        </Stack>}</DialogContent>
        <DialogActions>
          <Button onClick={()=>setEditFiber(null)}>Cancel</Button>
          <Button variant="contained" onClick={async()=>{await mapApi.updateFiberBox(editFiber);setEditFiber(null);loadAll();}}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}