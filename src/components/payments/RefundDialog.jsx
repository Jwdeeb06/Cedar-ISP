// src/components/payments/RefundDialog.jsx
import { useEffect, useState } from "react";
import {
  Box, Button, Chip, Dialog, DialogContent,
  IconButton, Paper, Stack, TextField, Typography,
} from "@mui/material";
import CloseIcon       from "@mui/icons-material/Close";
import UndoIcon        from "@mui/icons-material/Undo";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

function fmt(n) {
  return (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─────────────────────────────────────────────────────────────────────────────
// RefundDialog
//
// Props:
//   open        – boolean
//   onClose     – () => void
//   invoice     – invoice row (amount, invoice_number, user_name, month, paid_usd, paid_lbp, paid_sum)
//   onConfirm   – ({ refund_usd, refund_lbp, lbp_rate }) => void
// ─────────────────────────────────────────────────────────────────────────────
export default function RefundDialog({ open, onClose, invoice, onConfirm }) {
  const [refundUsd, setRefundUsd] = useState("");
  const [refundLbp, setRefundLbp] = useState("");
  const [lbpRate,   setLbpRate]   = useState(0);
  const [loading,   setLoading]   = useState(false);
  const [err,       setErr]       = useState("");

  // Load LBP rate and pre-fill from original payment amounts
  useEffect(() => {
    if (!open || !invoice) return;
    setErr("");
    setLoading(false);

    window.api.getSettings().then(s => {
      const rate = Number(s?.lbp_rate || 0);
      setLbpRate(rate);
    }).catch(() => {});

    // Pre-fill with the original payment's USD and LBP split
    const origUsd = Number(invoice.paid_usd || 0);
    const origLbp = Number(invoice.paid_lbp || 0);
    setRefundUsd(origUsd > 0 ? String(origUsd) : "");
    setRefundLbp(origLbp > 0 ? String(origLbp) : "");
  }, [open, invoice]);

  if (!invoice) return null;

  const paidTotal   = Number(invoice.paid_sum || 0);
  const usdVal      = Number(refundUsd) || 0;
  const lbpVal      = Number(refundLbp) || 0;
  const lbpAsUsd    = lbpVal > 0 && lbpRate > 0 ? lbpVal / lbpRate : 0;
  const totalRefund = usdVal + lbpAsUsd;

  const handleConfirm = async () => {
    setErr("");
    if (usdVal === 0 && lbpVal === 0) {
      return setErr("Enter at least one refund amount.");
    }
    if (lbpVal > 0 && lbpRate <= 0) {
      return setErr("LBP rate not set. Go to Settings → Billing.");
    }
    setLoading(true);
    try {
      await onConfirm({
        refund_usd: usdVal,
        refund_lbp: lbpVal,
        lbp_rate:   lbpRate,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}>

      {/* Header — red to signal reversal */}
      <Box sx={{
        px: 3, pt: 2.5, pb: 2,
        background: "linear-gradient(135deg, #c62828 0%, #d32f2f 100%)",
        color: "white",
        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
      }}>
        <Box>
          <Typography variant="overline" sx={{ opacity: 0.75, letterSpacing: 1.5, fontSize: 11 }}>
            MARK AS UNPAID
          </Typography>
          <Typography variant="h5" fontWeight={900} sx={{ lineHeight: 1.15, mt: 0.25 }}>
            Refund ${fmt(paidTotal)}
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}>
            <Box sx={{ px: 1, py: 0.25, borderRadius: 1, bgcolor: "rgba(255,255,255,0.15)", fontSize: 12, fontWeight: 700 }}>
              {invoice.user_name}
            </Box>
            <Box sx={{ px: 1, py: 0.25, borderRadius: 1, bgcolor: "rgba(255,255,255,0.12)", fontSize: 12, fontWeight: 600, fontFamily: "monospace" }}>
              {invoice.month}
            </Box>
          </Box>
          <Typography variant="caption" sx={{ opacity: 0.6, mt: 0.5, display: "block", fontFamily: "monospace" }}>
            {invoice.invoice_number}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: "white", opacity: 0.8, mt: -0.5 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <DialogContent sx={{ pt: 2.5 }}>
        <Stack spacing={2}>

          {/* Warning */}
          <Paper sx={{ p: 1.5, borderRadius: 2, bgcolor: "warning.50", border: "1px solid", borderColor: "warning.200" }}>
            <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
              <WarningAmberIcon sx={{ color: "warning.dark", fontSize: 18, mt: 0.1, flexShrink: 0 }} />
              <Typography variant="caption" sx={{ color: "warning.dark", lineHeight: 1.5 }}>
                This will reverse the payment, subtract one month from the expiry date, and record a drawer <strong>OUT</strong> refund.
              </Typography>
            </Box>
          </Paper>

          {/* Refund amounts */}
          <Box>
            <Typography variant="caption" fontWeight={800} sx={{ opacity: 0.6, display: "block", mb: 1 }}>
              REFUND AMOUNTS
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.55, display: "block", mb: 1.5 }}>
              Pre-filled from the original payment. Adjust if needed.
            </Typography>

            <Stack spacing={1.5}>
              {/* USD */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <TextField
                  label="USD Refund" value={refundUsd}
                  onChange={e => setRefundUsd(e.target.value)}
                  type="number" inputProps={{ min: 0, step: 0.5 }} sx={{ flex: 1 }}
                  InputProps={{ startAdornment: <Typography sx={{ mr: 0.5, fontWeight: 700, color: "text.secondary" }}>$</Typography> }}
                />
                {usdVal > 0 && <Chip label={`$${fmt(usdVal)}`} color="error" size="small" sx={{ fontWeight: 700 }} />}
              </Box>

              {/* LBP */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <TextField
                  label="LBP Refund" value={refundLbp}
                  onChange={e => setRefundLbp(e.target.value)}
                  type="number" inputProps={{ min: 0, step: 10000 }} sx={{ flex: 1 }}
                  InputProps={{ startAdornment: <Typography sx={{ mr: 0.5, fontWeight: 700, color: "text.secondary" }}>L£</Typography> }}
                  helperText={
                    lbpVal > 0 && lbpRate > 0
                      ? `L£${Number(lbpVal).toLocaleString()} ÷ ${lbpRate.toLocaleString()} = $${fmt(lbpAsUsd)}`
                      : lbpRate > 0
                      ? `Rate: 1 USD = ${lbpRate.toLocaleString()} L£`
                      : "LBP rate not configured in Settings"
                  }
                />
                {lbpVal > 0 && lbpRate > 0 && (
                  <Chip label={`≈ $${fmt(lbpAsUsd)}`} color="warning" size="small" sx={{ fontWeight: 700 }} />
                )}
              </Box>
            </Stack>
          </Box>

          {/* Total */}
          {(usdVal > 0 || lbpVal > 0) && (
            <Paper sx={{ p: 1.5, borderRadius: 2, bgcolor: "error.50", border: "1px solid", borderColor: "error.200" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="body2" fontWeight={700} color="error.dark">Total Refund (USD equiv.)</Typography>
                <Typography variant="h6" fontWeight={900} color="error.dark">${fmt(totalRefund)}</Typography>
              </Box>
              {lbpVal > 0 && usdVal > 0 && (
                <Typography variant="caption" sx={{ opacity: 0.6 }}>
                  ${fmt(usdVal)} USD + L£{Number(lbpVal).toLocaleString()}
                </Typography>
              )}
            </Paper>
          )}

          {/* Error */}
          {err && (
            <Typography variant="caption" color="error" fontWeight={700}>{err}</Typography>
          )}

          {/* Actions */}
          <Box sx={{ display: "flex", gap: 1, pt: 0.5 }}>
            <Button variant="outlined" onClick={onClose} sx={{ flex: 1 }}>Cancel</Button>
            <Button
              variant="contained" color="error"
              startIcon={<UndoIcon />}
              onClick={handleConfirm}
              disabled={loading || (usdVal === 0 && lbpVal === 0)}
              sx={{ flex: 1, fontWeight: 800 }}
            >
              {loading ? "Processing…" : "Confirm Refund"}
            </Button>
          </Box>

        </Stack>
      </DialogContent>
    </Dialog>
  );
}