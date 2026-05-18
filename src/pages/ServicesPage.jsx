// src/pages/ServicesPage.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, FormControl, IconButton, InputAdornment,
  InputLabel, MenuItem, Paper, Select, Tab, Tabs, TextField,
  Typography,
} from "@mui/material";
import AddIcon          from "@mui/icons-material/Add";
import EditIcon         from "@mui/icons-material/Edit";
import DeleteIcon       from "@mui/icons-material/Delete";
import BusinessIcon     from "@mui/icons-material/Business";
import RouterIcon       from "@mui/icons-material/Router";
import TrendingUpIcon   from "@mui/icons-material/TrendingUp";
import CloseIcon        from "@mui/icons-material/Close";
import dayjs from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import ConfirmDialog from "../components/ConfirmDialog";

const fmt = (n) => (Number(n)||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});

// ── Service dialog ────────────────────────────────────────────────────────────
function ServiceDialog({ open, onClose, onSaved, initial, companies }) {
  const isEdit = Boolean(initial?.id);
  const [form, setForm] = useState({ name:"", price:"", cost:"", speed:"", notes:"", company_id:"" });
  const [err,  setErr]  = useState("");

  useEffect(() => {
    if (open) {
      setForm(initial
        ? { name: initial.name||"", price: initial.price??"", cost: initial.cost??"",
            speed: initial.speed||"", notes: initial.notes||"",
            company_id: initial.company_id ?? "" }
        : { name:"", price:"", cost:"", speed:"", notes:"", company_id:"" }
      );
      setErr("");
    }
  }, [open, initial]);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    if (!form.name.trim()) return setErr("Name is required");
    const payload = {
      ...(isEdit ? { id: initial.id } : {}),
      name:       form.name.trim(),
      price:      Number(form.price) || 0,
      cost:       Number(form.cost)  || 0,
      speed:      form.speed.trim()  || null,
      notes:      form.notes.trim()  || null,
      company_id: form.company_id    || null,
    };
    const res = isEdit
      ? await window.api.updateService(payload)
      : await window.api.addService(payload);
    if (!res?.ok) return setErr(res?.reason === "DUPLICATE_NAME" ? "Name already exists" : "Failed to save");
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <Typography variant="h6" fontWeight={800}>{isEdit ? "Edit Service" : "New Service Plan"}</Typography>
        <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Box sx={{ display:"flex", flexDirection:"column", gap:2, pt:1 }}>
          <TextField size="small" label="Plan Name *" fullWidth value={form.name} onChange={set("name")} />
          <Box sx={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:2 }}>
            <TextField size="small" label="Sell Price ($/mo) *" type="number" fullWidth
              value={form.price} onChange={set("price")} inputProps={{ min:0, step:0.5 }}
              InputProps={{ startAdornment:<InputAdornment position="start">$</InputAdornment> }}
              helperText="What you charge the subscriber" />
            <TextField size="small" label="Cost Price ($/mo)" type="number" fullWidth
              value={form.cost} onChange={set("cost")} inputProps={{ min:0, step:0.5 }}
              InputProps={{ startAdornment:<InputAdornment position="start">$</InputAdornment> }}
              helperText="What you pay the provider" />
          </Box>
          <Box sx={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:2 }}>
            <TextField size="small" label="Speed" fullWidth value={form.speed} onChange={set("speed")}
              placeholder="e.g. Up to 10Mbps" />
            <FormControl size="small" fullWidth>
              <InputLabel>Provider Company</InputLabel>
              <Select label="Provider Company" value={form.company_id ?? ""}
                onChange={e => setForm(p => ({ ...p, company_id: e.target.value }))}>
                <MenuItem value="">— None —</MenuItem>
                {companies.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
          <TextField size="small" label="Notes" fullWidth multiline minRows={2}
            value={form.notes} onChange={set("notes")} />
          {err && <Typography color="error" variant="body2">{err}</Typography>}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px:3, pb:2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} sx={{ fontWeight:800 }}>
          {isEdit ? "Save Changes" : "Create Plan"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Company dialog ────────────────────────────────────────────────────────────
function CompanyDialog({ open, onClose, onSaved, initial }) {
  const isEdit = Boolean(initial?.id);
  const [form, setForm] = useState({ name:"", contact:"", phone:"", notes:"" });
  const [err,  setErr]  = useState("");

  useEffect(() => {
    if (open) {
      setForm(initial
        ? { name:initial.name||"", contact:initial.contact||"", phone:initial.phone||"", notes:initial.notes||"" }
        : { name:"", contact:"", phone:"", notes:"" }
      );
      setErr("");
    }
  }, [open, initial]);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    if (!form.name.trim()) return setErr("Name is required");
    const res = isEdit
      ? await window.api.updateCompany({ id:initial.id, ...form })
      : await window.api.addCompany(form);
    if (!res?.ok) return setErr(res?.reason === "DUPLICATE" ? "Name already exists" : "Failed to save");
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <Typography variant="h6" fontWeight={800}>{isEdit ? "Edit Company" : "New Provider Company"}</Typography>
        <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Box sx={{ display:"flex", flexDirection:"column", gap:2, pt:1 }}>
          <TextField size="small" label="Company Name *" fullWidth value={form.name} onChange={set("name")} />
          <Box sx={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:2 }}>
            <TextField size="small" label="Contact Person" fullWidth value={form.contact} onChange={set("contact")} />
            <TextField size="small" label="Phone" fullWidth value={form.phone} onChange={set("phone")} />
          </Box>
          <TextField size="small" label="Notes" fullWidth multiline minRows={2} value={form.notes} onChange={set("notes")} />
          {err && <Typography color="error" variant="body2">{err}</Typography>}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px:3, pb:2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} sx={{ fontWeight:800 }}>
          {isEdit ? "Save" : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function ServicesPage() {
  const [tab,       setTab]       = useState(0);
  const [services,  setServices]  = useState([]);
  const [companies, setCompanies] = useState([]);
  const [profit,    setProfit]    = useState([]);
  const [month,     setMonth]     = useState(dayjs());
  const [msg,       setMsg]       = useState({ text:"", ok:true });

  // dialogs
  const [svcDialog,  setSvcDialog]  = useState({ open:false, item:null });
  const [cmpDialog,  setCmpDialog]  = useState({ open:false, item:null });
  const [confirm,    setConfirm]    = useState({ open:false, title:"", message:"", onConfirm:null });

  const load = async () => {
    const [s, c] = await Promise.all([window.api.listServices(), window.api.listCompanies()]);
    setServices(s || []);
    setCompanies(c || []);
  };

  const loadProfit = async () => {
    const p = await window.api.getProfitReport({ month: month.format("YYYY-MM") });
    setProfit(p || []);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (tab===2) loadProfit(); }, [tab, month]);

  const totals = useMemo(() => ({
    revenue:  profit.reduce((a,r) => a+Number(r.revenue||0), 0),
    cost:     profit.reduce((a,r) => a+Number(r.cost_total||0), 0),
    profit:   profit.reduce((a,r) => a+Number(r.profit||0), 0),
    unpaid:   profit.reduce((a,r) => a+Number(r.unpaid||0), 0),
  }), [profit]);

  const showMsg = (text, ok=true) => { setMsg({text, ok}); setTimeout(()=>setMsg({text:"",ok:true}),4000); };

  return (
    <Box>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <Box sx={{ display:"flex", alignItems:"center", justifyContent:"space-between", mb:2.5, flexWrap:"wrap", gap:2 }}>
        <Box>
          <Typography variant="h4" fontWeight={900} sx={{ lineHeight:1.1 }}>Services & Providers</Typography>
          <Typography variant="body2" sx={{ opacity:0.55, mt:0.25 }}>Manage plans, providers and track profit</Typography>
        </Box>
        <Box sx={{ display:"flex", gap:1 }}>
          {tab===0 && (
            <Button variant="contained" startIcon={<AddIcon />}
              onClick={() => setSvcDialog({ open:true, item:null })} sx={{ fontWeight:700 }}>
              New Service
            </Button>
          )}
          {tab===1 && (
            <Button variant="contained" startIcon={<AddIcon />}
              onClick={() => setCmpDialog({ open:true, item:null })} sx={{ fontWeight:700 }}>
              New Company
            </Button>
          )}
        </Box>
      </Box>

      {/* ── Message ─────────────────────────────────────────────────────── */}
      {msg.text && (
        <Paper sx={{ p:1.5, mb:2, borderRadius:2,
          bgcolor: msg.ok?"success.50":"error.50",
          border:"1px solid", borderColor: msg.ok?"success.200":"error.200",
          display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <Typography variant="body2" fontWeight={600}>{msg.text}</Typography>
          <IconButton size="small" onClick={()=>setMsg({text:"",ok:true})}><CloseIcon fontSize="small"/></IconButton>
        </Paper>
      )}

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <Paper elevation={0} sx={{ borderRadius:3, border:"1px solid", borderColor:"grey.200", overflow:"hidden" }}>
        <Tabs value={tab} onChange={(_,v)=>setTab(v)}
          sx={{ borderBottom:"1px solid", borderColor:"grey.200", bgcolor:"grey.50", px:1 }}>
          <Tab label={
            <Box sx={{ display:"flex", alignItems:"center", gap:1 }}>
              <RouterIcon sx={{ fontSize:17 }} /><span>Service Plans</span>
              <Chip label={services.length} size="small" sx={{ height:18, fontSize:10 }} />
            </Box>
          } />
          <Tab label={
            <Box sx={{ display:"flex", alignItems:"center", gap:1 }}>
              <BusinessIcon sx={{ fontSize:17 }} /><span>Providers</span>
              <Chip label={companies.length} size="small" sx={{ height:18, fontSize:10 }} />
            </Box>
          } />
          <Tab label={
            <Box sx={{ display:"flex", alignItems:"center", gap:1 }}>
              <TrendingUpIcon sx={{ fontSize:17 }} /><span>Profit Report</span>
            </Box>
          } />
        </Tabs>

        {/* ── Services tab ─────────────────────────────────────────────── */}
        {tab===0 && (
          <Box sx={{ p:2.5 }}>
            <Box sx={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:2 }}>
              {services.map(s => (
                <Paper key={s.id} elevation={0} sx={{
                  p:2.5, borderRadius:2,
                  border:"1px solid", borderColor:"grey.200",
                  "&:hover":{ borderColor:"primary.300", boxShadow:"0 2px 8px rgba(0,0,0,0.06)" },
                  transition:"all 0.15s",
                }}>
                  <Box sx={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", mb:1 }}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={800}>{s.name}</Typography>
                      {s.company_name && (
                        <Chip label={s.company_name} size="small" variant="outlined"
                          sx={{ fontSize:10, height:18, mt:0.25 }} />
                      )}
                    </Box>
                    <Box sx={{ display:"flex", gap:0.5 }}>
                      <IconButton size="small" onClick={()=>setSvcDialog({open:true,item:s})}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error"
                        onClick={()=>setConfirm({ open:true,
                          title:"Delete Service",
                          message:`Delete "${s.name}"? Users on this plan will lose their service link.`,
                          onConfirm: async () => {
                            const res = await window.api.deleteService(s.id);
                            if (res?.ok) { showMsg(`"${s.name}" deleted`); load(); }
                            else showMsg(`Cannot delete: ${res?.count||""} user(s) on this plan`, false);
                          }
                        })}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>

                  <Box sx={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:1 }}>
                    <Box sx={{ p:1, borderRadius:1.5, bgcolor:"success.50", border:"1px solid", borderColor:"success.200" }}>
                      <Typography variant="caption" fontWeight={700} color="success.dark" sx={{ opacity:0.7 }}>SELL PRICE</Typography>
                      <Typography fontWeight={900} color="success.dark">${fmt(s.price)}/mo</Typography>
                    </Box>
                    <Box sx={{ p:1, borderRadius:1.5, bgcolor:"error.50", border:"1px solid", borderColor:"error.200" }}>
                      <Typography variant="caption" fontWeight={700} color="error.dark" sx={{ opacity:0.7 }}>COST PRICE</Typography>
                      <Typography fontWeight={900} color="error.dark">${fmt(s.cost)}/mo</Typography>
                    </Box>
                  </Box>

                  <Box sx={{ mt:1, p:1, borderRadius:1.5, bgcolor:"primary.50", border:"1px solid", borderColor:"primary.200" }}>
                    <Typography variant="caption" fontWeight={700} color="primary.dark" sx={{ opacity:0.7 }}>PROFIT PER USER</Typography>
                    <Typography fontWeight={900} color="primary.dark">
                      ${fmt(Number(s.price||0) - Number(s.cost||0))}/mo
                    </Typography>
                  </Box>

                  {s.speed && (
                    <Typography variant="caption" sx={{ opacity:0.5, display:"block", mt:1 }}>⚡ {s.speed}</Typography>
                  )}
                </Paper>
              ))}
            </Box>
            {services.length === 0 && (
              <Box sx={{ py:6, textAlign:"center", opacity:0.4 }}>
                <RouterIcon sx={{ fontSize:48 }} />
                <Typography>No service plans yet</Typography>
              </Box>
            )}
          </Box>
        )}

        {/* ── Companies tab ────────────────────────────────────────────── */}
        {tab===1 && (
          <Box sx={{ p:2.5 }}>
            <Box sx={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:2 }}>
              {companies.map(c => (
                <Paper key={c.id} elevation={0} sx={{
                  p:2.5, borderRadius:2,
                  border:"1px solid", borderColor:"grey.200",
                  "&:hover":{ borderColor:"primary.300" }, transition:"all 0.15s",
                }}>
                  <Box sx={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={800}>{c.name}</Typography>
                      {c.contact && <Typography variant="caption" sx={{ opacity:0.6 }}>👤 {c.contact}</Typography>}
                      {c.phone   && <Typography variant="caption" sx={{ opacity:0.6, display:"block" }}>📞 {c.phone}</Typography>}
                    </Box>
                    <Box sx={{ display:"flex", gap:0.5 }}>
                      <Chip label={`${c.service_count} plans`} size="small" sx={{ fontSize:10 }} />
                      <IconButton size="small" onClick={()=>setCmpDialog({open:true,item:c})}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error"
                        onClick={()=>setConfirm({ open:true,
                          title:"Delete Company",
                          message:`Delete "${c.name}"? Service plans linked to this company will be unlinked.`,
                          onConfirm: async () => {
                            const res = await window.api.deleteCompany(c.id);
                            if (res?.ok) { showMsg(`"${c.name}" deleted`); load(); }
                            else showMsg(`Cannot delete: ${res?.count||""} service(s) linked`, false);
                          }
                        })}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                  {c.notes && <Typography variant="caption" sx={{ opacity:0.55, mt:1, display:"block" }}>{c.notes}</Typography>}
                </Paper>
              ))}
            </Box>
            {companies.length === 0 && (
              <Box sx={{ py:6, textAlign:"center", opacity:0.4 }}>
                <BusinessIcon sx={{ fontSize:48 }} />
                <Typography>No provider companies yet</Typography>
              </Box>
            )}
          </Box>
        )}

        {/* ── Profit tab ───────────────────────────────────────────────── */}
        {tab===2 && (
          <Box sx={{ p:2.5 }}>
            <Box sx={{ display:"flex", alignItems:"center", gap:2, mb:2.5, flexWrap:"wrap" }}>
              <Typography variant="subtitle1" fontWeight={800} sx={{ flexGrow:1 }}>
                Profit Report — {month.format("MMMM YYYY")}
              </Typography>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker label="Month" views={["year","month"]} openTo="month"
                  value={month} onChange={v=>v&&setMonth(v)}
                  slotProps={{ textField:{ size:"small", sx:{ width:160 } } }} />
              </LocalizationProvider>
              <Button size="small" variant="outlined" onClick={loadProfit}>Refresh</Button>
            </Box>

            {/* Summary cards */}
            <Box sx={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:1.5, mb:2.5 }}>
              {[
                { label:"Total Revenue", val:`$${fmt(totals.revenue)}`, bg:"#f1f8f2", border:"#66bb6a", color:"#2e7d32" },
                { label:"Total Cost",    val:`$${fmt(totals.cost)}`,    bg:"#fdf3f3", border:"#ef9a9a", color:"#c62828" },
                { label:"Net Profit",    val:`$${fmt(totals.profit)}`,  bg:"#f0f4ff", border:"#90caf9", color: totals.profit>=0?"#1565c0":"#c62828" },
                { label:"Unpaid (risk)", val:`$${fmt(totals.unpaid)}`,  bg:"#fff8e1", border:"#ffc107", color:"#e65100" },
              ].map(s=>(
                <Paper key={s.label} elevation={0} sx={{
                  px:2, py:1.75, borderRadius:2,
                  border:"1.5px solid", borderColor:s.border, bgcolor:s.bg }}>
                  <Typography sx={{ fontSize:11, fontWeight:800, opacity:0.55, textTransform:"uppercase", letterSpacing:0.5 }}>
                    {s.label}
                  </Typography>
                  <Typography fontWeight={900} color={s.color} sx={{ fontSize:20 }}>{s.val}</Typography>
                </Paper>
              ))}
            </Box>

            {/* Per-service breakdown */}
            <Box sx={{ display:"flex", flexDirection:"column", gap:1.5 }}>
              {profit.map(r=>(
                <Paper key={r.service_id} elevation={0} sx={{
                  p:2, borderRadius:2, border:"1px solid", borderColor:"grey.200",
                }}>
                  <Box sx={{ display:"flex", alignItems:"center", gap:2, mb:1, flexWrap:"wrap" }}>
                    <Typography variant="subtitle2" fontWeight={800} sx={{ flexGrow:1 }}>{r.service_name}</Typography>
                    {r.company_name && (
                      <Chip label={r.company_name} size="small" variant="outlined" sx={{ fontSize:10 }} />
                    )}
                    <Chip label={`${r.user_count} users`} size="small" sx={{ fontSize:10 }} />
                  </Box>
                  <Box sx={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:1 }}>
                    {[
                      { label:"Sell",    val:`$${fmt(r.sell_price)}/user`,  color:"text.primary" },
                      { label:"Cost",    val:`$${fmt(r.cost_price)}/user`,  color:"error.main" },
                      { label:"Revenue", val:`$${fmt(r.revenue)}`,          color:"success.dark" },
                      { label:"Cost Total", val:`$${fmt(r.cost_total)}`,    color:"error.dark" },
                      { label:"Profit",  val:`$${fmt(r.profit)}`,           color: r.profit>=0?"primary.main":"error.main" },
                      { label:"Unpaid",  val:`$${fmt(r.unpaid)}`,           color:"warning.dark" },
                    ].map(f=>(
                      <Box key={f.label} sx={{ px:1.25, py:1, borderRadius:1.5, bgcolor:"grey.50",
                        border:"1px solid", borderColor:"grey.200" }}>
                        <Typography variant="caption" fontWeight={700} sx={{ opacity:0.5, display:"block" }}>{f.label}</Typography>
                        <Typography variant="body2" fontWeight={800} color={f.color}>{f.val}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Paper>
              ))}
              {profit.length===0 && (
                <Box sx={{ py:5, textAlign:"center", opacity:0.4 }}>No data for this month</Box>
              )}
            </Box>
          </Box>
        )}
      </Paper>

      {/* ── Dialogs ──────────────────────────────────────────────────────── */}
      <ServiceDialog open={svcDialog.open} initial={svcDialog.item}
        companies={companies}
        onClose={()=>setSvcDialog({open:false,item:null})}
        onSaved={()=>{ load(); showMsg(svcDialog.item?"Service updated":"Service created"); }} />

      <CompanyDialog open={cmpDialog.open} initial={cmpDialog.item}
        onClose={()=>setCmpDialog({open:false,item:null})}
        onSaved={()=>{ load(); showMsg(cmpDialog.item?"Company updated":"Company created"); }} />

      <ConfirmDialog open={confirm.open} title={confirm.title} message={confirm.message}
        confirmText="Delete" cancelText="Cancel"
        onCancel={()=>setConfirm(c=>({...c,open:false}))}
        onConfirm={async()=>{
          const fn=confirm.onConfirm;
          setConfirm(c=>({...c,open:false,onConfirm:null}));
          if(fn) await fn();
        }} />
    </Box>
  );
}