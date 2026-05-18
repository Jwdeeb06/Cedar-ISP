import { Box, Button, Chip, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { useAuth } from "../../context/AuthContext";
import { bFormat } from "../../utils/dateUtils";

function isOverdue(row) {
  if (row.status === "PAID") return false;
  if (!row.user_expiry_date) return false;
  const exp = new Date(row.user_expiry_date);
  if (Number.isNaN(exp.getTime())) return false;
  const today = new Date();
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const e = new Date(exp.getFullYear(), exp.getMonth(), exp.getDate());
  return t > e;
}

function rowSx(row) {
  if (row.status === "PAID") return { bgcolor: "#e8f5e9" };
  if (isOverdue(row))        return { bgcolor: "#fdecea" };
  return {};
}

export default function PaymentsTable({ rows, onTogglePaid, onDelete, readOnly = false }) {
  const { employee } = useAuth() || {};
  const perms   = employee?.permissions || {};
  const isAdmin = perms.all === true || employee?.role === "admin";

  // Only admins or employees with payments_create can pay/unpay
  // readOnly (e.g. on the Payments List page) hides both action columns entirely
  const canPay    = !readOnly && (isAdmin || Boolean(perms.payments_create));
  // Only admins can delete invoices
  const canDelete = !readOnly && isAdmin;

  return (
    <Table size="small">
      <TableHead>
        <TableRow sx={{ bgcolor:"grey.50" }}>
          <TableCell sx={{ fontWeight:800 }}>Invoice #</TableCell>
          <TableCell sx={{ fontWeight:800 }}>User</TableCell>
          <TableCell sx={{ fontWeight:800 }}>Mobile</TableCell>
          <TableCell sx={{ fontWeight:800 }}>Service</TableCell>
          <TableCell sx={{ fontWeight:800 }}>Month</TableCell>
          <TableCell sx={{ fontWeight:800 }}>Amount</TableCell>
          <TableCell sx={{ fontWeight:800 }}>Status</TableCell>
          <TableCell sx={{ fontWeight:800 }}>Expiry</TableCell>
          <TableCell sx={{ fontWeight:800 }}>Balance</TableCell>
          <TableCell sx={{ fontWeight:800 }}>Created</TableCell>
          <TableCell sx={{ fontWeight:800 }}>Paid Date</TableCell>
          <TableCell sx={{ fontWeight:800 }}>Type</TableCell>
          {canPay    && <TableCell sx={{ fontWeight:800 }}>Pay</TableCell>}
          {canDelete && <TableCell sx={{ fontWeight:800 }}>Delete</TableCell>}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map(r => {
          const type    = Number(r.affects_expiry) === 0 ? "STATIC" : "SUB";
          const overdue = isOverdue(r);
          const status  = r.status === "PAID" ? "PAID" : overdue ? "OVERDUE" : "UNPAID";
          return (
            <TableRow key={r.id} sx={rowSx(r)} hover>
              <TableCell sx={{ fontFamily:"monospace", fontSize:11 }}>{r.invoice_number}</TableCell>
              <TableCell sx={{ fontWeight:600 }}>{r.user_name || `User ${r.user_id}`}</TableCell>
              <TableCell sx={{ fontSize:12, opacity:0.75 }}>{r.user_mobile || "—"}</TableCell>
              <TableCell sx={{ fontSize:12 }}>{r.user_service || "—"}</TableCell>
              <TableCell sx={{ fontFamily:"monospace" }}>{r.month}</TableCell>
              <TableCell sx={{ fontWeight:700, fontFamily:"monospace" }}>${Number(r.amount||0).toFixed(2)}</TableCell>
              <TableCell>
                <Chip label={status} size="small" sx={{ fontWeight:700, fontSize:10 }}
                  color={r.status==="PAID"?"success":overdue?"error":"default"} />
              </TableCell>
              <TableCell sx={{ fontSize:11, fontFamily:"monospace" }}>{r.user_expiry_date || "—"}</TableCell>
              <TableCell sx={{ fontFamily:"monospace" }}>{r.user_balance ?? 0}</TableCell>
              <TableCell sx={{ fontSize:11, opacity:0.65 }}>
                {r.created_at ? bFormat(r.created_at, "DD/MM/YY HH:mm") : "—"}
              </TableCell>
              <TableCell sx={{ fontSize:11, opacity:0.65 }}>
                {r.paid_at ? bFormat(r.paid_at, "DD/MM/YY HH:mm") : "—"}
              </TableCell>
              <TableCell>
                <Chip label={type} size="small" sx={{ fontSize:10, fontWeight:700,
                  bgcolor: type==="STATIC" ? "#fff3e0" : "#e3f2fd",
                  color:   type==="STATIC" ? "#bf360c" : "#0d47a1" }} />
              </TableCell>
              {canPay && (
                <TableCell>
                  <Button size="small"
                    variant={r.status==="PAID" ? "outlined" : "contained"}
                    color={r.status==="PAID" ? "warning" : "success"}
                    onClick={() => onTogglePaid?.(r)}
                    sx={{ fontWeight:700, fontSize:11 }}>
                    {r.status==="PAID" ? "Unpay" : "Pay"}
                  </Button>
                </TableCell>
              )}
              {canDelete && (
                <TableCell>
                  <Button size="small" color="error" variant="outlined"
                    disabled={r.status==="PAID" && Number(r.affects_expiry)===1}
                    onClick={() => onDelete?.(r)}
                    sx={{ fontWeight:700, fontSize:11 }}>
                    Delete
                  </Button>
                </TableCell>
              )}
            </TableRow>
          );
        })}
        {rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={12 + (canPay ? 1 : 0) + (canDelete ? 1 : 0)}
              sx={{ py:5, textAlign:"center", opacity:0.4 }}>
              No invoices found
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}