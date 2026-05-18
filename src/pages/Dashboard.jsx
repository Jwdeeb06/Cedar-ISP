import { useEffect, useMemo, useState } from "react";
import {
  Box, Chip, Divider, Paper, Table, TableBody,
  TableCell, TableHead, TableRow, Typography,
} from "@mui/material";
import dayjs from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { paymentsApi } from "../services/paymentsApi";
import { useAuth } from "../context/AuthContext";
import { usersApi }    from "../services/usersApi";

const money = (n) => (Number(n)||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
const fmt   = (n) => (Number(n)||0).toLocaleString();

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, bg, border, color }) {
  return (
    <Paper elevation={0} sx={{
      px:2.5, py:2, borderRadius:3,
      border:"1.5px solid", borderColor: border,
      bgcolor: bg,
    }}>
      <Typography sx={{ fontSize:11, fontWeight:800, opacity:0.55, textTransform:"uppercase", letterSpacing:0.8 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize:24, fontWeight:900, color, lineHeight:1.2, mt:0.5 }}>
        {value}
      </Typography>
      {sub && <Typography sx={{ fontSize:12, opacity:0.6, mt:0.25 }}>{sub}</Typography>}
    </Paper>
  );
}

export default function Dashboard() {
  const { employee } = useAuth() || {};
  const isAdmin = employee?.permissions?.all === true || employee?.role === "admin";
  const canSeeMoney = isAdmin || Boolean(employee?.permissions?.dashboard);

  const [month,      setMonth]      = useState(dayjs());
  const [rows,       setRows]       = useState([]);
  const [userCounts, setUserCounts] = useState({ total:0, active:0, inactive:0, suspended:0 });
  const [expiringSoon, setExpiringSoon] = useState([]);

  const monthStr = month.format("YYYY-MM");

  // Load invoices for selected month
  useEffect(() => {
    paymentsApi.list({ month: monthStr, status:"ALL", search:"" })
      .then(d => setRows(d || []));
  }, [monthStr]);

  // Load user counts — fixed to handle new { rows, total } shape
  useEffect(() => {
    const load = async () => {
      try {
        const [all, active, inactive, suspended] = await Promise.all([
          usersApi.listUsers({ limit:1, offset:0 }),
          usersApi.listUsers({ limit:1, offset:0, status:"ACTIVE" }),
          usersApi.listUsers({ limit:1, offset:0, status:"INACTIVE" }),
          usersApi.listUsers({ limit:1, offset:0, status:"SUSPENDED" }),
        ]);
        const getTotal = (r) => Array.isArray(r) ? r.length : Number(r?.total || 0);
        setUserCounts({
          total:     getTotal(all),
          active:    getTotal(active),
          inactive:  getTotal(inactive),
          suspended: getTotal(suspended),
        });
      } catch(e) { console.error("Dashboard user counts:", e); }
    };
    load();
  }, []);

  // Load users expiring in next 7 days
  useEffect(() => {
    const today = dayjs().format("YYYY-MM-DD");
    const in7   = dayjs().add(7,"day").format("YYYY-MM-DD");
    usersApi.listUsers({
      expiry_after:  today,
      expiry_before: in7,
      limit: 50, offset: 0,
    }).then(d => {
      const arr = Array.isArray(d) ? d : (d?.rows || []);
      setExpiringSoon(arr);
    }).catch(() => {});
  }, []);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const paid   = rows.filter(r => r.status === "PAID");
    const unpaid = rows.filter(r => r.status !== "PAID");
    const overdue = rows.filter(r =>
      r.status !== "PAID" && r.user_expiry_date &&
      new Date(r.user_expiry_date) < new Date()
    );
    const paidAmt   = paid.reduce((a,r)  => a + Number(r.amount||0), 0);
    const unpaidAmt = unpaid.reduce((a,r) => a + Number(r.amount||0), 0);
    const total     = paidAmt + unpaidAmt;
    const rate      = total > 0 ? Math.round((paidAmt/total)*100) : 0;
    return { paid, unpaid, overdue, paidAmt, unpaidAmt, total, rate,
      paidCount:paid.length, unpaidCount:unpaid.length };
  }, [rows]);

  const pieData = [
    { name:"Paid",   value: stats.paidAmt   },
    { name:"Unpaid", value: stats.unpaidAmt  },
  ];

  const statusBarData = [
    { name:"Active",    value: userCounts.active,    fill:"#2e7d32" },
    { name:"Inactive",  value: userCounts.inactive,  fill:"#9e9e9e" },
    { name:"Suspended", value: userCounts.suspended, fill:"#c62828" },
  ];

  // Revenue by service
  const serviceData = useMemo(() => {
    const map = {};
    rows.forEach(r => {
      const s = r.user_service || "Unknown";
      if (!map[s]) map[s] = { name:s, paid:0, unpaid:0 };
      if (r.status==="PAID") map[s].paid   += Number(r.amount||0);
      else                   map[s].unpaid += Number(r.amount||0);
    });
    return Object.values(map).sort((a,b) => (b.paid+b.unpaid)-(a.paid+a.unpaid)).slice(0,6);
  }, [rows]);

  const topUnpaid = useMemo(() =>
    [...stats.unpaid].sort((a,b)=>Number(b.amount)-Number(a.amount)).slice(0,8),
    [stats.unpaid]
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ pb:4 }}>

        {/* ── Header ────────────────────────────────────────────────────── */}
        <Box sx={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", mb:2.5, flexWrap:"wrap", gap:2 }}>
          <Box>
            <Typography variant="h4" fontWeight={900} sx={{ lineHeight:1.1 }}>Dashboard</Typography>
            <Typography variant="body2" sx={{ opacity:0.55, mt:0.25 }}>
              {monthStr} · Collection rate:{" "}
              <b style={{ color: stats.rate>=80?"#2e7d32":"#c62828" }}>{stats.rate}%</b>
            </Typography>
          </Box>
          <DatePicker label="Month" views={["year","month"]} openTo="month"
            value={month} onChange={v => v && setMonth(v)}
            slotProps={{ textField:{ size:"small", sx:{ width:170 } } }} />
        </Box>

        {/* ── Expiry alert ─────────────────────────────────────────────── */}
        {expiringSoon.length > 0 && (
          <Paper elevation={0} sx={{ p:1.75, mb:2, borderRadius:2,
            bgcolor:"warning.50", border:"1.5px solid", borderColor:"warning.300",
            display:"flex", alignItems:"center", gap:1.5 }}>
            <Typography sx={{ fontSize:20 }}>⚠️</Typography>
            <Box>
              <Typography variant="body2" fontWeight={800} color="warning.dark">
                {expiringSoon.length} subscriber{expiringSoon.length!==1?"s":""} expiring in the next 7 days
              </Typography>
              <Typography variant="caption" color="warning.dark" sx={{ opacity:0.8 }}>
                {expiringSoon.slice(0,5).map(u=>u.name).join(", ")}
                {expiringSoon.length>5 ? ` +${expiringSoon.length-5} more` : ""}
              </Typography>
            </Box>
          </Paper>
        )}

        {/* ── KPI Row ──────────────────────────────────────────────────── */}
        <Box sx={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(175px,1fr))", gap:1.5, mb:2.5 }}>
          <KpiCard label="Paid This Month"    value={`$${money(stats.paidAmt)}`}
            sub={`${stats.paidCount} invoices`}
            bg="#f1f8f2" border="#66bb6a" color="#2e7d32" />
          <KpiCard label="Unpaid This Month"  value={`$${money(stats.unpaidAmt)}`}
            sub={`${stats.unpaidCount} invoices`}
            bg="#fdf3f3" border="#ef9a9a" color="#c62828" />
          <KpiCard label="Total Billed"       value={`$${money(stats.total)}`}
            sub={`${rows.length} invoices`}
            bg="#f0f4ff" border="#90caf9" color="#1565c0" />
          <KpiCard label="Overdue"            value={stats.overdue.length}
            sub="past expiry"
            bg="#fff8e1" border="#ffc107" color="#e65100" />
          <KpiCard label="Active Users"       value={fmt(userCounts.active)}
            sub={`of ${fmt(userCounts.total)}`}
            bg="#f3e5f5" border="#ce93d8" color="#6a1b9a" />
          <KpiCard label="Expiring Soon"      value={expiringSoon.length}
            sub="next 7 days"
            bg="#e8f5e9" border="#a5d6a7" color="#1b5e20" />
        </Box>

        {/* ── Row 1: Donut + User status ───────────────────────────────── */}
        <Box sx={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:2, mb:2 }}>

          {/* Donut */}
          <Paper elevation={0} sx={{ p:2.5, borderRadius:3, border:"1px solid", borderColor:"grey.200" }}>
            <Typography variant="subtitle1" fontWeight={800}>Paid vs Unpaid</Typography>
            <Typography variant="caption" sx={{ opacity:0.55 }}>{monthStr} — amount distribution</Typography>
            <Divider sx={{ my:1.5 }} />
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" innerRadius={65} outerRadius={95}
                  paddingAngle={3}
                  label={({name,value}) => `${name}: $${money(value)}`}
                  labelLine={false}>
                  {pieData.map((_,i)=><Cell key={i} fill={["#2e7d32","#c62828"][i]} />)}
                </Pie>
                <Tooltip formatter={v=>`$${money(v)}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>

          {/* User status */}
          <Paper elevation={0} sx={{ p:2.5, borderRadius:3, border:"1px solid", borderColor:"grey.200" }}>
            <Typography variant="subtitle1" fontWeight={800}>Subscribers</Typography>
            <Typography variant="caption" sx={{ opacity:0.55 }}>{fmt(userCounts.total)} total</Typography>
            <Divider sx={{ my:1.5 }} />
            <Box sx={{ display:"flex", gap:1.5, mb:2 }}>
              {statusBarData.map(s=>(
                <Box key={s.name} sx={{ flex:1, textAlign:"center", p:1.5, borderRadius:2,
                  bgcolor:s.fill+"15", border:`1px solid ${s.fill}40` }}>
                  <Typography fontWeight={900} sx={{ fontSize:22, color:s.fill }}>{fmt(s.value)}</Typography>
                  <Typography variant="caption" fontWeight={700} sx={{ opacity:0.7 }}>{s.name}</Typography>
                </Box>
              ))}
            </Box>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={statusBarData} barSize={36}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize:12 }} />
                <YAxis tick={{ fontSize:11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[4,4,0,0]}>
                  {statusBarData.map((s,i)=><Cell key={i} fill={s.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Box>

        {/* ── Service revenue bar ──────────────────────────────────────── */}
        {serviceData.length > 0 && (
          <Paper elevation={0} sx={{ p:2.5, borderRadius:3, border:"1px solid", borderColor:"grey.200", mb:2 }}>
            <Typography variant="subtitle1" fontWeight={800}>Revenue by Service Plan</Typography>
            <Typography variant="caption" sx={{ opacity:0.55 }}>Paid vs unpaid per plan — {monthStr}</Typography>
            <Divider sx={{ my:1.5 }} />
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={serviceData} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize:11 }} />
                <YAxis tick={{ fontSize:11 }} />
                <Tooltip formatter={v=>`$${money(v)}`} />
                <Legend />
                <Bar dataKey="paid"   name="Paid"   fill="#2e7d32" radius={[3,3,0,0]} />
                <Bar dataKey="unpaid" name="Unpaid" fill="#c62828" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        )}

        {/* ── Bottom: Top unpaid + Overdue ────────────────────────────── */}
        <Box sx={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:2 }}>

          {/* Top unpaid */}
          <Paper elevation={0} sx={{ borderRadius:3, border:"1px solid", borderColor:"grey.200", overflow:"hidden" }}>
            <Box sx={{ px:2.5, py:2, bgcolor:"#fdf3f3", borderBottom:"1px solid #ef9a9a40" }}>
              <Typography fontWeight={800}>Top Unpaid</Typography>
              <Typography variant="caption" sx={{ opacity:0.6 }}>Highest amounts first</Typography>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor:"grey.50" }}>
                  <TableCell sx={{ fontWeight:700 }}>User</TableCell>
                  <TableCell sx={{ fontWeight:700 }}>Service</TableCell>
                  <TableCell sx={{ fontWeight:700 }} align="right">Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {topUnpaid.length ? topUnpaid.map(r=>(
                  <TableRow key={r.id} hover sx={{ "&:last-child td":{border:0} }}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{r.user_name||"—"}</Typography>
                      <Typography variant="caption" sx={{ opacity:0.5 }}>{r.user_mobile||""}</Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize:12, opacity:0.75 }}>{r.user_service||"—"}</TableCell>
                    <TableCell align="right" sx={{ fontWeight:900, fontFamily:"monospace", color:"#c62828" }}>
                      ${money(r.amount)}
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={3} sx={{ py:4, textAlign:"center", opacity:0.4 }}>
                    🎉 All paid!
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>

          {/* Expiring soon */}
          <Paper elevation={0} sx={{ borderRadius:3, border:"1px solid", borderColor:"grey.200", overflow:"hidden" }}>
            <Box sx={{ px:2.5, py:2, bgcolor:"#fff8e1", borderBottom:"1px solid #ffc10740",
              display:"flex", alignItems:"center", gap:1 }}>
              <Box sx={{ flexGrow:1 }}>
                <Typography fontWeight={800}>Expiring Soon</Typography>
                <Typography variant="caption" sx={{ opacity:0.6 }}>Next 7 days</Typography>
              </Box>
              {expiringSoon.length>0 && (
                <Chip label={expiringSoon.length} color="warning" size="small" sx={{ fontWeight:800 }} />
              )}
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor:"grey.50" }}>
                  <TableCell sx={{ fontWeight:700 }}>User</TableCell>
                  <TableCell sx={{ fontWeight:700 }}>Service</TableCell>
                  <TableCell sx={{ fontWeight:700 }}>Expiry</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {expiringSoon.length ? expiringSoon.slice(0,8).map(u=>(
                  <TableRow key={u.id} hover sx={{ "&:last-child td":{border:0} }}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{u.name}</Typography>
                      <Typography variant="caption" sx={{ opacity:0.5 }}>{u.mobile||""}</Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize:12, opacity:0.75 }}>{u.service_name||"—"}</TableCell>
                    <TableCell sx={{ fontFamily:"monospace", fontSize:12,
                      color: dayjs(u.expiry_date).diff(dayjs(),"day") <= 2 ? "#c62828" : "#e65100",
                      fontWeight:700 }}>
                      {u.expiry_date}
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={3} sx={{ py:4, textAlign:"center", opacity:0.4 }}>
                    ✅ No expiries this week
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>

        </Box>
      </Box>
    </LocalizationProvider>
  );
}