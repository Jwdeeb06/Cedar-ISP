// src/pages/Employees/EmployeesPage.jsx
import { useEffect, useState } from "react";
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, FormControlLabel, IconButton, Paper,
  Switch, Table, TableBody, TableCell, TableHead, TableRow,
  TextField, ToggleButton, ToggleButtonGroup, Typography,
} from "@mui/material";
import AddIcon         from "@mui/icons-material/Add";
import EditIcon        from "@mui/icons-material/Edit";
import LockIcon        from "@mui/icons-material/Lock";
import CloseIcon       from "@mui/icons-material/Close";
import PeopleIcon      from "@mui/icons-material/People";
import { PERMISSIONS, useAuth } from "../../context/AuthContext";
import ConfirmDialog from "../../components/ConfirmDialog";

// Group permissions
const GROUPS = [...new Set(PERMISSIONS.map(p => p.group))];

// ── Permission toggles ────────────────────────────────────────────────────────
function PermissionToggles({ perms, onChange, disabled }) {
  return (
    <Box sx={{ display:"flex", flexDirection:"column", gap:2 }}>
      {GROUPS.map(group => (
        <Box key={group}>
          <Typography variant="caption" fontWeight={800}
            sx={{ opacity:0.5, textTransform:"uppercase", letterSpacing:1, display:"block", mb:1 }}>
            {group}
          </Typography>
          <Box sx={{ display:"flex", flexDirection:"column", gap:0.5 }}>
            {PERMISSIONS.filter(p => p.group === group).map(p => (
              <Box key={p.key} sx={{ display:"flex", alignItems:"center",
                justifyContent:"space-between", px:1.5, py:0.75, borderRadius:1.5,
                bgcolor: perms[p.key] ? "primary.50" : "grey.50",
                border:"1px solid", borderColor: perms[p.key] ? "primary.200" : "grey.200",
                transition:"all 0.12s",
              }}>
                <Typography variant="body2" fontWeight={perms[p.key] ? 700 : 400}>
                  {p.label}
                </Typography>
                <Switch
                  size="small"
                  checked={Boolean(perms[p.key])}
                  disabled={disabled}
                  onChange={e => onChange({ ...perms, [p.key]: e.target.checked })}
                />
              </Box>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

// ── Employee dialog ───────────────────────────────────────────────────────────
function EmployeeDialog({ open, onClose, onSaved, initial }) {
  const isEdit = Boolean(initial?.id);
  const defaultPerms = Object.fromEntries(PERMISSIONS.map(p => [p.key, false]));

  const [form, setForm] = useState({
    username:"", password:"", full_name:"", role:"employee",
    is_active:1, permissions: { ...defaultPerms },
  });
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) return;
    if (initial) {
      let perms = defaultPerms;
      try { perms = { ...defaultPerms, ...JSON.parse(initial.permissions || "{}") }; } catch {}
      setForm({
        username:    initial.username   || "",
        password:    "",
        full_name:   initial.full_name  || "",
        role:        initial.role       || "employee",
        is_active:   initial.is_active  ?? 1,
        permissions: perms,
      });
    } else {
      setForm({ username:"", password:"", full_name:"", role:"employee",
        is_active:1, permissions: { ...defaultPerms } });
    }
    setErr("");
  }, [open, initial]);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    if (!form.full_name.trim()) return setErr("Full name is required");
    if (!isEdit && !form.username.trim()) return setErr("Username is required");
    if (!isEdit && !form.password.trim()) return setErr("Password is required");

    const payload = {
      ...(isEdit ? { id: initial.id } : {}),
      username:    form.username.trim(),
      full_name:   form.full_name.trim(),
      role:        form.role,
      is_active:   form.is_active,
      permissions: form.role === "admin" ? { all: true } : form.permissions,
    };
    if (!isEdit) payload.password = form.password.trim();

    const res = isEdit
      ? await window.api.updateEmployee(payload)
      : await window.api.addEmployee(payload);

    if (!res?.ok) {
      if (res?.reason === "USERNAME_TAKEN") return setErr("Username already taken");
      if (res?.reason === "LAST_ADMIN")     return setErr("Cannot deactivate the last admin");
      return setErr("Failed to save");
    }
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx:{ borderRadius:3 } }}>
      <DialogTitle sx={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <Typography variant="h6" fontWeight={800}>
          {isEdit ? "Edit Employee" : "New Employee"}
        </Typography>
        <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Box sx={{ display:"flex", flexDirection:"column", gap:2, pt:1 }}>

          {/* Basic info */}
          <TextField size="small" label="Full Name *" fullWidth
            value={form.full_name} onChange={set("full_name")} />
          {!isEdit && (
            <Box sx={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:2 }}>
              <TextField size="small" label="Username *" fullWidth
                value={form.username} onChange={set("username")} />
              <TextField size="small" label="Password *" fullWidth
                value={form.password} onChange={set("password")} />
            </Box>
          )}

          {/* Role */}
          <Box>
            <Typography variant="caption" fontWeight={700} sx={{ opacity:0.6, display:"block", mb:1 }}>
              ROLE
            </Typography>
            <ToggleButtonGroup value={form.role} exclusive size="small" fullWidth
              onChange={(_, v) => v && setForm(p => ({ ...p, role:v }))}>
              <ToggleButton value="employee" sx={{ fontWeight:700 }}>Employee</ToggleButton>
              <ToggleButton value="admin"    sx={{ fontWeight:700, color:"warning.main" }}>Admin</ToggleButton>
            </ToggleButtonGroup>
            {form.role === "admin" && (
              <Typography variant="caption" color="warning.dark" sx={{ mt:0.5, display:"block" }}>
                ⚠️ Admin has full access to everything
              </Typography>
            )}
          </Box>

          {/* Active toggle */}
          <FormControlLabel
            control={<Switch checked={Boolean(form.is_active)}
              onChange={e => setForm(p => ({ ...p, is_active: e.target.checked ? 1 : 0 }))} />}
            label={<Typography variant="body2" fontWeight={600}>
              Account Active
            </Typography>}
          />

          {/* Permissions — only for employees */}
          {form.role === "employee" && (
            <Box>
              <Divider sx={{ mb:2 }} />
              <Typography variant="subtitle2" fontWeight={800} sx={{ mb:1.5 }}>
                Permissions
              </Typography>
              <PermissionToggles
                perms={form.permissions}
                onChange={perms => setForm(p => ({ ...p, permissions: perms }))}
              />
            </Box>
          )}

          {err && <Typography color="error" variant="body2">{err}</Typography>}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px:3, pb:2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} sx={{ fontWeight:800 }}>
          {isEdit ? "Save Changes" : "Create Employee"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Change password dialog ────────────────────────────────────────────────────
function ChangePasswordDialog({ open, onClose, employee }) {
  const [newPass, setNewPass] = useState("");
  const [err,     setErr]     = useState("");

  useEffect(() => { if (open) { setNewPass(""); setErr(""); } }, [open]);

  const save = async () => {
    if (!newPass.trim()) return setErr("Enter new password");
    const res = await window.api.changePassword({ id: employee.id, new_password: newPass.trim() });
    if (res?.ok) onClose();
    else setErr("Failed to change password");
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx:{ borderRadius:3 } }}>
      <DialogTitle>
        <Typography variant="h6" fontWeight={800}>Change Password</Typography>
        <Typography variant="caption" sx={{ opacity:0.6 }}>{employee?.full_name}</Typography>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <TextField size="small" fullWidth label="New Password *" sx={{ mt:1 }}
          value={newPass} onChange={e => setNewPass(e.target.value)} />
        {err && <Typography color="error" variant="body2" sx={{ mt:1 }}>{err}</Typography>}
      </DialogContent>
      <DialogActions sx={{ px:3, pb:2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} sx={{ fontWeight:800 }}>Set Password</Button>
      </DialogActions>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function EmployeesPage() {
  const { employee: me } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [dialog,    setDialog]    = useState({ open:false, item:null });
  const [passDialog, setPassDialog] = useState({ open:false, item:null });
  const [confirm,   setConfirm]   = useState({ open:false, title:"", message:"", onConfirm:null });
  const [msg,       setMsg]       = useState({ text:"", ok:true });

  const load = async () => {
    const d = await window.api.listEmployees();
    setEmployees(d || []);
  };

  useEffect(() => { load(); }, []);

  const showMsg = (text, ok=true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg({ text:"", ok:true }), 4000);
  };

  const handleDelete = (emp) => {
    setConfirm({
      open: true,
      title: "Delete Employee",
      message: `Delete "${emp.full_name}"? This cannot be done if they have activity history.`,
      onConfirm: async () => {
        const res = await window.api.deleteEmployee(emp.id);
        if (res?.ok) { showMsg("Employee deleted"); load(); }
        else if (res?.reason === "HAS_ACTIVITY")
          showMsg(`Cannot delete — ${res.count} activity record(s) linked`, false);
        else if (res?.reason === "LAST_ADMIN")
          showMsg("Cannot delete the last admin account", false);
        else showMsg("Delete failed", false);
      }
    });
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display:"flex", alignItems:"center", justifyContent:"space-between", mb:3 }}>
        <Box sx={{ display:"flex", alignItems:"center", gap:1.5 }}>
          <PeopleIcon sx={{ fontSize:28, opacity:0.7 }} />
          <Box>
            <Typography variant="h4" fontWeight={900} sx={{ lineHeight:1.1 }}>Employees</Typography>
            <Typography variant="body2" sx={{ opacity:0.55 }}>
              Manage staff accounts and access permissions
            </Typography>
          </Box>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />}
          onClick={() => setDialog({ open:true, item:null })} sx={{ fontWeight:700 }}>
          New Employee
        </Button>
      </Box>

      {/* Message */}
      {msg.text && (
        <Paper sx={{ p:1.5, mb:2, borderRadius:2,
          bgcolor: msg.ok?"success.50":"error.50",
          border:"1px solid", borderColor: msg.ok?"success.200":"error.200" }}>
          <Typography variant="body2" fontWeight={600}
            color={msg.ok?"success.dark":"error.dark"}>{msg.text}</Typography>
        </Paper>
      )}

      {/* Table */}
      <Paper elevation={0} sx={{ borderRadius:3, border:"1px solid", borderColor:"grey.200", overflow:"hidden" }}>
        <Box sx={{ px:2, py:1.5, bgcolor:"grey.50", borderBottom:"1px solid", borderColor:"grey.200",
          display:"flex", alignItems:"center" }}>
          <Typography variant="subtitle1" fontWeight={800} sx={{ flexGrow:1 }}>
            Staff Accounts
          </Typography>
          <Chip label={`${employees.length} employees`} size="small" sx={{ fontWeight:700 }} />
        </Box>

        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor:"grey.50" }}>
              <TableCell sx={{ fontWeight:800 }}>Name</TableCell>
              <TableCell sx={{ fontWeight:800 }}>Username</TableCell>
              <TableCell sx={{ fontWeight:800 }}>Role</TableCell>
              <TableCell sx={{ fontWeight:800 }}>Status</TableCell>
              <TableCell sx={{ fontWeight:800 }}>Last Login</TableCell>
              <TableCell sx={{ fontWeight:800 }}>Permissions</TableCell>
              <TableCell sx={{ fontWeight:800 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {employees.map(emp => {
              const isMe = emp.id === me?.id;
              let perms = {};
              try { perms = JSON.parse(emp.permissions || "{}"); } catch {}
              const permCount = perms.all ? "All" :
                Object.values(perms).filter(Boolean).length;

              return (
                <TableRow key={emp.id} hover sx={{ "&:last-child td":{border:0} }}>
                  <TableCell sx={{ fontWeight:700 }}>
                    {emp.full_name}
                    {isMe && <Chip label="You" size="small" sx={{ ml:1, fontSize:10, height:18 }} />}
                  </TableCell>
                  <TableCell sx={{ fontFamily:"monospace", fontSize:12, opacity:0.8 }}>
                    {emp.username}
                  </TableCell>
                  <TableCell>
                    <Chip label={emp.role} size="small"
                      color={emp.role==="admin"?"warning":"default"}
                      sx={{ fontWeight:700, fontSize:11 }} />
                  </TableCell>
                  <TableCell>
                    <Chip label={emp.is_active?"Active":"Inactive"} size="small"
                      color={emp.is_active?"success":"default"}
                      sx={{ fontWeight:700, fontSize:11 }} />
                  </TableCell>
                  <TableCell sx={{ fontSize:11, opacity:0.6 }}>
                    {emp.last_login
                      ? new Date(emp.last_login).toLocaleDateString("en-GB")
                      : "Never"}
                  </TableCell>
                  <TableCell>
                    <Chip label={emp.role==="admin"?"Full Access":`${permCount} permissions`}
                      size="small" variant="outlined" sx={{ fontSize:10 }} />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display:"flex", gap:0.75 }}>
                      <IconButton size="small"
                        onClick={() => setDialog({ open:true, item:emp })}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small"
                        onClick={() => setPassDialog({ open:true, item:emp })}>
                        <LockIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>

      <EmployeeDialog open={dialog.open} initial={dialog.item}
        onClose={() => setDialog({ open:false, item:null })}
        onSaved={() => { load(); showMsg(dialog.item?"Employee updated":"Employee created"); }} />

      <ChangePasswordDialog open={passDialog.open} employee={passDialog.item}
        onClose={() => { setPassDialog({ open:false, item:null }); showMsg("Password changed"); load(); }} />

      <ConfirmDialog open={confirm.open} title={confirm.title} message={confirm.message}
        confirmText="Delete" cancelText="Cancel"
        onCancel={() => setConfirm(c => ({ ...c, open:false }))}
        onConfirm={async () => {
          const fn = confirm.onConfirm;
          setConfirm(c => ({ ...c, open:false, onConfirm:null }));
          if (fn) await fn();
        }} />
    </Box>
  );
}