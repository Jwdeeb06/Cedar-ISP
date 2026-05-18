// src/components/payments/PrintInvoiceButton.jsx
import { useState } from "react";
import {
  Box, Button, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, IconButton, ListItemIcon, ListItemText,
  Menu, MenuItem, TextField, Tooltip, Typography,
} from "@mui/material";
import PrintIcon    from "@mui/icons-material/Print";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import { printReceipt, buildWhatsAppMessage, sendWhatsApp } from "../../utils/InvoicePrintUtil";

const SIZES = [
  { key: "80mm", label: "80mm — Thermal", icon: "🧾" },
  { key: "A5",   label: "A5 — Half Page", icon: "📄" },
  { key: "A4",   label: "A4 — Full Page", icon: "📋" },
];

export default function PrintInvoiceButton({ invoice }) {
  const [printAnchor, setPrintAnchor] = useState(null);

  // WhatsApp state
  const [waOpen,   setWaOpen]   = useState(false);
  const [waPhone,  setWaPhone]  = useState("");
  const [waSending, setWaSending] = useState(false);

  // ── Print ────────────────────────────────────────────────────────────────────
  const openPrintMenu  = (e) => { e.stopPropagation(); setPrintAnchor(e.currentTarget); };
  const closePrintMenu = () => setPrintAnchor(null);

  const doPrint = async (size) => {
    closePrintMenu();
    if (!invoice) return;
    const settings = await window.api.getSettings();
    printReceipt({ invoice, settings, size });
  };

  // ── WhatsApp ─────────────────────────────────────────────────────────────────
  const openWhatsApp = async (e) => {
    e.stopPropagation();
    if (!invoice) return;

    const mobile = invoice.user_mobile || invoice.mobile || "";

    if (mobile) {
      // number exists — send directly
      const settings = await window.api.getSettings();
      const message  = buildWhatsAppMessage({ invoice, settings });
      sendWhatsApp({ phone: mobile, message });
    } else {
      // no number — ask
      setWaPhone("");
      setWaOpen(true);
    }
  };

  const doSendWhatsApp = async () => {
    if (!waPhone.trim()) return;
    setWaSending(true);
    try {
      const settings = await window.api.getSettings();
      const message  = buildWhatsAppMessage({ invoice, settings });
      sendWhatsApp({ phone: waPhone.trim(), message });
      setWaOpen(false);
    } finally {
      setWaSending(false);
    }
  };

  return (
    <Box sx={{ display: "inline-flex", gap: 0.5 }}>

      {/* ── Print Button ──────────────────────────────────────────────────── */}
      <Tooltip title="Print receipt">
        <Button
          size="small"
          variant="contained"
          onClick={openPrintMenu}
          sx={{
            minWidth: 0,
            px: 1,
            bgcolor: "#1565c0",
            "&:hover": { bgcolor: "#0d47a1" },
          }}
        >
          <PrintIcon sx={{ fontSize: 16 }} />
        </Button>
      </Tooltip>

      <Menu
        anchorEl={printAnchor}
        open={Boolean(printAnchor)}
        onClose={closePrintMenu}
        PaperProps={{ sx: { minWidth: 200, borderRadius: 2 } }}
      >
        <Typography variant="caption" sx={{ px: 2, pt: 1, pb: 0.5, display: "block", fontWeight: 800, opacity: 0.55 }}>
          PAPER SIZE
        </Typography>
        <Divider />
        {SIZES.map((s) => (
          <MenuItem key={s.key} onClick={() => doPrint(s.key)} sx={{ py: 1 }}>
            <ListItemIcon sx={{ fontSize: 16, minWidth: 30 }}>{s.icon}</ListItemIcon>
            <ListItemText primary={s.label} primaryTypographyProps={{ fontSize: 13, fontWeight: 600 }} />
          </MenuItem>
        ))}
      </Menu>

      {/* ── WhatsApp Button ───────────────────────────────────────────────── */}
      <Tooltip title={invoice?.user_mobile ? `Send to ${invoice.user_mobile}` : "Send via WhatsApp"}>
        <Button
          size="small"
          variant="contained"
          onClick={openWhatsApp}
          sx={{
            minWidth: 0,
            px: 1,
            bgcolor: "#25D366",
            "&:hover": { bgcolor: "#128C7E" },
          }}
        >
          <WhatsAppIcon sx={{ fontSize: 16 }} />
        </Button>
      </Tooltip>

      {/* ── Ask phone dialog ──────────────────────────────────────────────── */}
      <Dialog
        open={waOpen}
        onClose={() => setWaOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <WhatsAppIcon sx={{ color: "#25D366" }} />
            Send via WhatsApp
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, opacity: 0.7 }}>
            No phone number found for this user. Enter a number to send the receipt to:
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Phone number"
            placeholder="+961 70 123 456"
            value={waPhone}
            onChange={(e) => setWaPhone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doSendWhatsApp()}
            inputProps={{ inputMode: "tel" }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setWaOpen(false)} variant="outlined">Cancel</Button>
          <Button
            variant="contained"
            onClick={doSendWhatsApp}
            disabled={!waPhone.trim() || waSending}
            startIcon={<WhatsAppIcon />}
            sx={{ bgcolor: "#25D366", "&:hover": { bgcolor: "#128C7E" } }}
          >
            Send
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}