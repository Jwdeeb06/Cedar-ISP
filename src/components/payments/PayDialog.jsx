// src/components/payments/PayDialog.jsx
import { useEffect, useState } from "react";
import {
  Box, Button, Chip, Dialog, DialogContent, DialogTitle,
  Divider, IconButton, Paper, Stack, TextField, Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

function fmt(n) {
  return (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PayDialog({ open, onClose, invoice, onPaid }) {
  const [methods,  setMethods]  = useState(["CASH"]);
  const [method,   setMethod]   = useState("CASH");
  const [lbpRate,  setLbpRate]  = useState(0);
  const [usd,      setUsd]      = useState("");
  const [lbp,      setLbp]      = useState("");
  const [note,     setNote]     = useState("");
  const [paying,   setPaying]   = useState(false);
  const [err,      setErr]      = useState("");

  // load settings on open
  useEffect(() => {
    if (!open) return;
    setUsd(""); setLbp(""); setNote(""); setErr("");

    window.api.getSettings().then((s) => {
      const rate = Number(s?.lbp_rate || 0);
      setLbpRate(rate);

      // payment_methods stored as JSON array e.g. '["CASH","WHISH","OMT"]'
      try {
        const pm = JSON.parse(s?.payment_methods || "[]");
        if (Array.isArray(pm) && pm.length > 0) {
          setMethods(pm);
          setMethod(pm[0]);
        } else {
          setMethods(["CASH"]);
          setMethod("CASH");
        }
      } catch {
        setMethods(["CASH"]);
        setMethod("CASH");
      }
    });
  }, [open]);

  if (!invoice) return null;

  const paidSum   = Number(invoice.paid_sum  || 0);
  const total     = Number(invoice.amount    || 0);
  const remaining = Math.max(0, total - paidSum);
  const isFullyPaid = remaining === 0 && total > 0;

  // live conversion
  const lbpAsUsd  = lbp && lbpRate > 0 ? Number(lbp) / lbpRate : 0;
  const totalUsd  = (Number(usd) || 0) + lbpAsUsd;
  const afterPay  = Math.max(0, remaining - totalUsd);

  const submit = async () => {
    setErr("");
    if (isFullyPaid) return;
    if (totalUsd <= 0) return setErr("Enter at least one amount (USD or LBP).");
    if (lbp && lbpRate <= 0) return setErr("LBP rate not set. Go to Settings → ISP.");
    setPaying(true);
    try {
      const res = await window.api.payInvoice({
        invoice_id: invoice.id,
        usd_amount: Number(usd) || 0,
        lbp_amount: Number(lbp) || 0,
        lbp_rate:   lbpRate,
        method,
        note: note.trim() || null,
      });
      if (res?.ok) {
        onPaid?.(res);
        onClose?.();
      } else {
        setErr(res?.reason || "Payment failed.");
      }
    } finally {
      setPaying(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}>

      {/* Header */}
      <Box sx={{
        px: 3, pt: 2.5, pb: 2,
        background: "linear-gradient(135deg, #1565c0 0%, #1976d2 100%)",
        color: "white",
        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
      }}>
        <Box>
          <Typography variant="overline" sx={{ opacity: 0.75, letterSpacing: 1.5, fontSize: 11 }}>
            PAY INVOICE
          </Typography>
          <Typography variant="h5" fontWeight={900} sx={{ lineHeight: 1.15, mt: 0.25 }}>
            ${fmt(total)}
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}>
            <Box sx={{
              px: 1, py: 0.25, borderRadius: 1,
              bgcolor: "rgba(255,255,255,0.15)",
              fontSize: 12, fontWeight: 700,
            }}>
              {invoice.user_name}
            </Box>
            {invoice.user_service && (
              <Box sx={{
                px: 1, py: 0.25, borderRadius: 1,
                bgcolor: "rgba(255,255,255,0.12)",
                fontSize: 12, fontWeight: 600,
              }}>
                {invoice.user_service}
              </Box>
            )}
            <Box sx={{
              px: 1, py: 0.25, borderRadius: 1,
              bgcolor: "rgba(255,255,255,0.12)",
              fontSize: 12, fontWeight: 600, fontFamily: "monospace",
            }}>
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

      <DialogContent>
        <Stack spacing={2.5}>

          {/* Invoice summary */}
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: "grey.50" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">Invoice total</Typography>
              <Typography fontWeight={700}>${fmt(total)}</Typography>
            </Box>
            {paidSum > 0 && (
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                <Typography variant="body2" color="text.secondary">Already paid</Typography>
                <Typography color="success.main" fontWeight={600}>${fmt(paidSum)}</Typography>
              </Box>
            )}
            <Divider sx={{ my: 0.75 }} />
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="body2" fontWeight={700}>Remaining</Typography>
              <Typography fontWeight={900} color={remaining > 0 ? "error.main" : "success.main"}>
                ${fmt(remaining)}
              </Typography>
            </Box>
          </Paper>

          {/* Already paid — show friendly message instead of form */}
          {isFullyPaid ? (
            <Paper sx={{ p: 2.5, borderRadius: 2, bgcolor: "success.50",
              border: "1px solid", borderColor: "success.300", textAlign: "center" }}>
              <Typography fontSize={32} sx={{ mb: 0.5 }}>✅</Typography>
              <Typography variant="subtitle1" fontWeight={800} color="success.dark">
                Invoice Fully Paid
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.7, mt: 0.5 }}>
                This invoice has been paid in full. No further payment is needed.
              </Typography>
              <Button variant="outlined" color="success" onClick={onClose} sx={{ mt: 2, fontWeight: 700 }}>
                Close
              </Button>
            </Paper>
          ) : (
            <>
              {/* Payment method */}
              <Box>
                <Typography variant="caption" fontWeight={800} sx={{ opacity: 0.6, display: "block", mb: 0.75 }}>
                  PAYMENT METHOD
                </Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {methods.map((m) => (
                    <Chip key={m} label={m} onClick={() => setMethod(m)}
                      variant={method === m ? "filled" : "outlined"}
                      color={method === m ? "primary" : "default"}
                      sx={{ fontWeight: 700, fontSize: 13, px: 0.5 }}
                    />
                  ))}
                </Box>
              </Box>

              {/* Amounts */}
              <Box>
                <Typography variant="caption" fontWeight={800} sx={{ opacity: 0.6, display: "block", mb: 1 }}>
                  AMOUNTS
                </Typography>
                <Stack spacing={1.5}>
                  {/* USD */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <TextField label="USD Amount" value={usd} onChange={(e) => setUsd(e.target.value)}
                      type="number" inputProps={{ min: 0, step: 0.5 }} sx={{ flex: 1 }}
                      InputProps={{ startAdornment: (
                        <Typography sx={{ mr: 0.5, fontWeight: 700, color: "text.secondary" }}>$</Typography>
                      )}}
                    />
                    {usd > 0 && <Chip label={`$${fmt(usd)}`} color="success" size="small" sx={{ fontWeight: 700 }} />}
                  </Box>

                  {/* LBP */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <TextField label="LBP Amount" value={lbp} onChange={(e) => setLbp(e.target.value)}
                      type="number" inputProps={{ min: 0, step: 10000 }} sx={{ flex: 1 }}
                      InputProps={{ startAdornment: (
                        <Typography sx={{ mr: 0.5, fontWeight: 700, color: "text.secondary" }}>L£</Typography>
                      )}}
                      helperText={
                        lbp && lbpRate > 0
                          ? `L£ ${Number(lbp).toLocaleString()} ÷ ${lbpRate.toLocaleString()} = $${fmt(lbpAsUsd)}`
                          : lbpRate > 0
                          ? `Rate: 1 USD = ${lbpRate.toLocaleString()} L£`
                          : "LBP rate not configured in Settings"
                      }
                    />
                    {lbp > 0 && lbpRate > 0 && (
                      <Chip label={`≈ $${fmt(lbpAsUsd)}`} color="warning" size="small" sx={{ fontWeight: 700 }} />
                    )}
                  </Box>
                </Stack>
              </Box>

              {/* Total being paid */}
              {totalUsd > 0 && (
                <Paper sx={{ p: 1.5, borderRadius: 2,
                  bgcolor: totalUsd >= remaining ? "success.50" : "warning.50",
                  border: "1px solid", borderColor: totalUsd >= remaining ? "success.200" : "warning.200" }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Box>
                      <Typography variant="body2" fontWeight={700}>
                        Total paying: <strong>${fmt(totalUsd)}</strong>
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.7 }}>
                        {totalUsd >= remaining ? "✅ Full payment" : `Remaining after: $${fmt(afterPay)}`}
                      </Typography>
                    </Box>
                    <Typography variant="h6" fontWeight={900}
                      color={totalUsd >= remaining ? "success.dark" : "warning.dark"}>
                      ${fmt(Math.min(totalUsd, remaining))}
                    </Typography>
                  </Box>
                </Paper>
              )}

              {/* Note */}
              <TextField label="Note (optional)" value={note}
                onChange={(e) => setNote(e.target.value)} multiline minRows={2} fullWidth />

              {/* Error */}
              {err && (
                <Typography color="error" variant="body2" fontWeight={600}>{err}</Typography>
              )}

              {/* Submit */}
              <Button variant="contained" size="large" fullWidth onClick={submit}
                disabled={paying || totalUsd <= 0}
                sx={{ fontWeight: 800, py: 1.5, borderRadius: 2 }}>
                {paying ? "Processing…" : `Confirm Payment · $${fmt(Math.min(totalUsd, remaining))}`}
              </Button>
            </>
          )}

        </Stack>
      </DialogContent>
    </Dialog>
  );
}