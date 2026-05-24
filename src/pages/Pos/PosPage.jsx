import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, IconButton, InputAdornment,
  Paper, Select, Stack, TextField, Typography,MenuItem,
} from "@mui/material";
import AddIcon          from "@mui/icons-material/Add";
import RemoveIcon       from "@mui/icons-material/Remove";
import DeleteIcon       from "@mui/icons-material/Delete";
import SearchIcon       from "@mui/icons-material/Search";
import ReceiptIcon      from "@mui/icons-material/Receipt";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import PauseIcon        from "@mui/icons-material/Pause";
import PlayArrowIcon    from "@mui/icons-material/PlayArrow";
import PersonIcon       from "@mui/icons-material/Person";
import CloseIcon        from "@mui/icons-material/Close";
import WhatsAppIcon     from "@mui/icons-material/WhatsApp";

const fmt = (n) => (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ll  = (n) => (Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

// ── Item card ─────────────────────────────────────────────────────────────────
function ItemCard({ item, onAdd }) {
  const outOfStock = item.track_stock && Number(item.stock_qty) <= 0;
  return (
    <Paper elevation={0} onClick={() => !outOfStock && onAdd(item)} sx={{
      p: 1.5, borderRadius: 2, cursor: outOfStock ? "not-allowed" : "pointer",
      border: "1px solid", borderColor: "grey.200", opacity: outOfStock ? 0.45 : 1,
      transition: "all 0.15s", position: "relative", overflow: "hidden",
      "&:hover": outOfStock ? {} : { borderColor: "primary.main", boxShadow: "0 2px 12px rgba(21,101,192,0.12)", transform: "translateY(-1px)" },
    }}>
      <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, bgcolor: item.category_color || "#1565c0" }} />
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mt: 0.5 }}>
        <Typography fontWeight={700} fontSize={13} sx={{ lineHeight: 1.3, flexGrow: 1, pr: 1 }}>{item.name}</Typography>
        {item.track_stock && (
          <Chip label={`${Number(item.stock_qty)} ${item.unit || "pcs"}`} size="small"
            color={Number(item.stock_qty) <= Number(item.stock_min) ? "error" : "success"}
            sx={{ height: 18, fontSize: 9, fontWeight: 700, "& .MuiChip-label": { px: 0.5 } }} />
        )}
      </Box>
      {item.category_name && <Typography fontSize={10} sx={{ opacity: 0.5, textTransform: "uppercase", letterSpacing: 0.5 }}>{item.category_name}</Typography>}
      <Typography fontWeight={900} fontSize={16} color="primary.main" sx={{ mt: "auto" }}>${fmt(item.price)}</Typography>
    </Paper>
  );
}

// ── Cart line ─────────────────────────────────────────────────────────────────
function CartLine({ line, onChange, onRemove, lineDiscount, onDiscountChange }) {
  return (
    <Box sx={{ py: 0.75, borderBottom: "1px solid", borderColor: "grey.100" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography fontSize={13} fontWeight={700} noWrap>{line.item_name}</Typography>
          <Typography fontSize={11} color="text.secondary">${fmt(line.unit_price)} ea.</Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <IconButton size="small" onClick={() => onChange(line.item_id, -1)} sx={{ width: 24, height: 24, border: "1px solid", borderColor: "grey.300" }}>
            <RemoveIcon sx={{ fontSize: 14 }} />
          </IconButton>
          <Typography fontWeight={800} sx={{ minWidth: 28, textAlign: "center" }}>{line.qty}</Typography>
          <IconButton size="small" onClick={() => onChange(line.item_id, +1)} sx={{ width: 24, height: 24, border: "1px solid", borderColor: "grey.300" }}>
            <AddIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>
        <Typography fontWeight={900} fontSize={13} sx={{ minWidth: 60, textAlign: "right" }}>${fmt(line.unit_price * line.qty - (lineDiscount || 0))}</Typography>
        <IconButton size="small" color="error" onClick={() => onRemove(line.item_id)}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton>
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
        <Typography fontSize={11} sx={{ opacity: 0.5 }}>Line discount $</Typography>
        <TextField size="small" type="number" value={lineDiscount || ""} inputProps={{ min: 0, step: 0.5, style: { textAlign: "right", padding: "2px 6px", fontSize: 11 } }}
          sx={{ width: 70 }} onChange={e => onDiscountChange(line.item_id, Number(e.target.value) || 0)} />
      </Box>
    </Box>
  );
}

// ── Receipt dialog ────────────────────────────────────────────────────────────
function ReceiptDialog({ sale, method, onClose }) {
  if (!sale) return null;
  const sendWa = () => {
    if (!sale.customer_phone && !sale.customer) return;
    const phone = sale.customer_phone || "";
    const msg = `*Receipt*\n${sale.sale_number}\nTotal: $${fmt(sale.total)}\nThank you!`;
    if (phone) window.open(`https://wa.me/${phone.replace(/[^\d+]/g,"")}?text=${encodeURIComponent(msg)}`, "_blank");
  };
  return (
    <Dialog open maxWidth="xs" fullWidth onClose={onClose} PaperProps={{ sx: { borderRadius: 3 } }}>
      <Box sx={{ background: "linear-gradient(135deg,#1565c0,#1976d2)", px: 3, py: 2, color: "white" }}>
        <Typography variant="overline" sx={{ opacity: 0.7, letterSpacing: 1.5, fontSize: 11 }}>RECEIPT</Typography>
        <Typography variant="h5" fontWeight={900}>${fmt(sale.total)}</Typography>
        <Typography variant="caption" sx={{ opacity: 0.7, fontFamily: "monospace" }}>{sale.sale_number}</Typography>
      </Box>
      <DialogContent sx={{ p: 2.5 }}>
        {(sale.items || []).map((li, i) => (
          <Box key={i} sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
            <Typography fontSize={13}>{li.item_name} × {li.qty}</Typography>
            <Typography fontSize={13} fontWeight={700}>${fmt(li.line_total)}</Typography>
          </Box>
        ))}
        {sale.discount > 0 && (
          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
            <Typography fontSize={13} color="text.secondary">Discount</Typography>
            <Typography fontSize={13} color="error.main">−${fmt(sale.discount)}</Typography>
          </Box>
        )}
        <Divider sx={{ my: 1 }} />
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography fontWeight={900}>Total</Typography>
          <Typography fontWeight={900} color="primary.main">${fmt(sale.total)}</Typography>
        </Box>
        {sale.customer && sale.customer !== "Walk-in" && (
          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
            <Typography fontSize={12} color="text.secondary">Customer</Typography>
            <Typography fontSize={12} fontWeight={700}>{sale.customer}</Typography>
          </Box>
        )}
        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
          <Typography fontSize={12} color="text.secondary">Method</Typography>
          <Chip label={method || sale.method} size="small" sx={{ fontWeight: 700, fontSize: 11 }} />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 2.5, pb: 2.5, pt: 1, flexDirection: "column", gap: 1, alignItems: "stretch" }}>
        <Box sx={{ display: "flex", gap: 1, width: "100%" }}>
          <Button variant="outlined" color="success" startIcon={<WhatsAppIcon />} onClick={sendWa}
            disabled={!sale.customer_phone}
            sx={{ fontWeight: 700, flex: 1, height: 40, borderRadius: 2 }}>WhatsApp</Button>
          <Button variant="outlined" onClick={() => {
            const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
              <style>body{font-family:Arial,sans-serif;font-size:12px;width:72mm;margin:0;padding:4mm;}
              h2{text-align:center;font-size:14px;margin:0 0 8px;}.line{display:flex;justify-content:space-between;margin:3px 0;}
              .total{font-weight:bold;font-size:14px;border-top:1px dashed #000;padding-top:4px;margin-top:4px;}.center{text-align:center;}.num{font-family:monospace;font-size:10px;opacity:.6;}
              </style></head><body>
              <h2>RECEIPT</h2><div class="center num">${sale.sale_number}</div><hr/>
              ${(sale.items||[]).map(li=>`<div class="line"><span>${li.item_name} ×${li.qty}</span><span>$${Number(li.line_total).toFixed(2)}</span></div>`).join("")}
              ${sale.discount>0?`<div class="line"><span>Discount</span><span>-$${Number(sale.discount).toFixed(2)}</span></div>`:""}
              <div class="line total"><span>TOTAL</span><span>$${Number(sale.total).toFixed(2)}</span></div>
              <div class="line"><span>Method</span><span>${method||sale.method}</span></div>
              ${sale.customer&&sale.customer!=="Walk-in"?`<div class="line"><span>Customer</span><span>${sale.customer}</span></div>`:""}
              <div class="center" style="margin-top:8px;font-size:11px">Thank you!</div>
              </body></html>`;
            window.api.printHtml?.({ html, title: `Receipt — ${sale.sale_number}` });
          }} sx={{ fontWeight: 700, flex: 1, height: 40, borderRadius: 2 }}>🖨 Print</Button>
        </Box>
        <Button fullWidth variant="contained" onClick={onClose}
          sx={{ fontWeight: 800, fontSize: 15, py: 1.25, borderRadius: 2, ml: "0 !important" }}>New Sale</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Holds drawer ──────────────────────────────────────────────────────────────
function HoldsDrawer({ open, onClose, onRecall }) {
  const [holds, setHolds] = useState([]);
  useEffect(() => {
    if (open) window.api.posListHeldCarts?.().then(setHolds).catch(() => {});
  }, [open]);
  if (!open) return null;
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 800 }}>Held Orders ({holds.length})</DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        {holds.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 4, opacity: 0.4 }}>
            <PauseIcon sx={{ fontSize: 40 }} />
            <Typography>No held orders</Typography>
          </Box>
        ) : holds.map(h => (
          <Box key={h.id} sx={{ px: 2, py: 1.5, borderBottom: "1px solid", borderColor: "grey.100",
            display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box>
              <Typography fontWeight={700} fontSize={14}>{h.label}</Typography>
              <Typography fontSize={12} sx={{ opacity: 0.6 }}>{h.cart?.length || 0} items{h.customer ? ` · ${h.customer}` : ""}</Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button size="small" variant="contained" startIcon={<PlayArrowIcon />}
                onClick={() => { onRecall(h); onClose(); }} sx={{ fontWeight: 700 }}>Recall</Button>
              <IconButton size="small" color="error" onClick={async () => {
                await window.api.posDeleteHeldCart?.(h.id);
                setHolds(p => p.filter(x => x.id !== h.id));
              }}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton>
            </Box>
          </Box>
        ))}
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Close</Button></DialogActions>
    </Dialog>
  );
}

// ── Customer picker ───────────────────────────────────────────────────────────
function CustomerDialog({ open, onClose, onSelect }) {
  const [search, setSearch]     = useState("");
  const [customers, setCustomers] = useState([]);
  const [newName, setNewName]   = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [adding, setAdding]     = useState(false);

  useEffect(() => {
    if (open) window.api.posListCustomers?.({ search }).then(setCustomers).catch(() => {});
  }, [open, search]);

  const addNew = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const res = await window.api.posAddCustomer?.({ name: newName.trim(), phone: newPhone.trim() });
      if (res?.ok) {
        onSelect({ id: res.id, name: newName.trim(), phone: newPhone.trim() });
        onClose();
      }
    } finally { setAdding(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 800 }}>Select Customer</DialogTitle>
      <DialogContent>
        <TextField fullWidth size="small" placeholder="Search name or phone…" value={search}
          onChange={e => setSearch(e.target.value)} sx={{ mb: 2 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18 }} /></InputAdornment> }} />
        <Box sx={{ maxHeight: 200, overflowY: "auto", mb: 2 }}>
          {customers.map(c => (
            <Box key={c.id} onClick={() => { onSelect(c); onClose(); }}
              sx={{ px: 2, py: 1, borderRadius: 1, cursor: "pointer", "&:hover": { bgcolor: "grey.100" } }}>
              <Typography fontWeight={700} fontSize={14}>{c.name}</Typography>
              {c.phone && <Typography fontSize={12} sx={{ opacity: 0.6 }}>{c.phone}</Typography>}
            </Box>
          ))}
        </Box>
        <Divider sx={{ mb: 2 }}>
          <Typography variant="caption" sx={{ opacity: 0.5 }}>ADD NEW</Typography>
        </Divider>
        <Stack spacing={1}>
          <TextField size="small" label="Name" value={newName} onChange={e => setNewName(e.target.value)} fullWidth />
          <TextField size="small" label="Phone" value={newPhone} onChange={e => setNewPhone(e.target.value)} fullWidth />
          <Button variant="contained" onClick={addNew} disabled={adding || !newName.trim()} fullWidth sx={{ fontWeight: 700 }}>
            {adding ? "Adding…" : "Add Customer"}
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

// ── Payment dialog (voucher removed) ──────────────────────────────────────────
function PayDialog({ open, total, method, methods, lbpRate, submitting, customer, customerObj, onClose, onConfirm }) {
  const [usd,       setUsd]       = useState("");
  const [lbp,       setLbp]       = useState("");
  const [selMethod, setSelMethod] = useState(method);

  useEffect(() => { setUsd(""); setLbp(""); }, [total, open]);

  const lbpAsUsd    = lbp && lbpRate > 0 ? Number(lbp) / lbpRate : 0;
  const totalPaying = (Number(usd) || 0) + lbpAsUsd;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}>
      <Box sx={{ px: 3, pt: 2.5, pb: 2, background: "linear-gradient(135deg,#1565c0,#1976d2)", color: "white",
        display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <Box>
          <Typography variant="overline" sx={{ opacity: 0.75, letterSpacing: 1.5, fontSize: 11 }}>COLLECT PAYMENT</Typography>
          <Typography variant="h5" fontWeight={900}>${fmt(total)}</Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: "white", opacity: 0.8, mt: -0.5 }}><CloseIcon fontSize="small" /></IconButton>
      </Box>
      <DialogContent>
        <Stack spacing={2}>
          {/* Method */}
          <Box>
            <Typography variant="caption" fontWeight={800} sx={{ opacity: 0.6, display: "block", mb: 0.75 }}>PAYMENT METHOD</Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {methods.map(m => (
                <Chip key={m} label={m} onClick={() => setSelMethod(m)}
                  variant={selMethod === m ? "filled" : "outlined"}
                  color={selMethod === m ? "primary" : "default"}
                  sx={{ fontWeight: 700 }} />
              ))}
            </Box>
          </Box>

          {/* Amounts */}
          <TextField label="USD Amount" value={usd} onChange={e => setUsd(e.target.value)}
            type="number" inputProps={{ min: 0, step: 0.5 }} fullWidth
            InputProps={{ startAdornment: <Typography sx={{ mr: 0.5, fontWeight: 700, color: "text.secondary" }}>$</Typography> }} />
          <TextField label="L.L Amount" value={lbp} onChange={e => setLbp(e.target.value)}
            type="number" inputProps={{ min: 0, step: 10000 }} fullWidth
            InputProps={{ startAdornment: <Typography sx={{ mr: 0.5, fontWeight: 700, color: "text.secondary" }}>L.L</Typography> }}
            helperText={lbp && lbpRate > 0 ? `L.L${ll(lbp)} ÷ ${ll(lbpRate)} = $${fmt(lbpAsUsd)}` : lbpRate > 0 ? `Rate: 1 USD = L.L${ll(lbpRate)}` : "L.L rate not set"} />

          {/* Summary */}
          {totalPaying === 0 ? (
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: customerObj ? "warning.50" : "error.50",
              border: "1px solid", borderColor: customerObj ? "warning.200" : "error.200" }}>
              <Typography variant="body2" fontWeight={700} color={customerObj ? "warning.dark" : "error.main"}>
                {customerObj
                  ? `⏳ Pay Later — ${customerObj.name} owes $${fmt(total)}`
                  : "⚠️ Go back and select a customer to use Pay Later"}
              </Typography>
            </Box>
          ) : (
            <Paper sx={{ p: 1.5, borderRadius: 2,
              bgcolor: totalPaying >= total ? "success.50" : "warning.50",
              border: "1px solid", borderColor: totalPaying >= total ? "success.200" : "warning.200" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" fontWeight={700}>Collecting: ${fmt(totalPaying)}</Typography>
                {totalPaying > total && <Typography variant="caption" color="warning.dark">Change: ${fmt(totalPaying - total)}</Typography>}
                {totalPaying > 0 && totalPaying < total && (
                  <Typography variant="caption" color="warning.dark">
                    Partial — remaining: ${fmt(total - totalPaying)}
                  </Typography>
                )}
              </Box>
            </Paper>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 2.5, pb: 2.5 }}>
        <Button variant="outlined" onClick={onClose} sx={{ fontWeight: 700 }}>Cancel</Button>
        <Button variant="contained" fullWidth
          disabled={submitting || (totalPaying <= 0 && !customerObj)}
          onClick={() => {
            const usdAmt = Number(usd) || 0;
            const lbpAmt = Number(lbp) || 0;
            const lbpAsUsdAmt = lbpAmt > 0 && lbpRate > 0 ? lbpAmt / lbpRate : 0;
            const paying = usdAmt + lbpAsUsdAmt;
            if (paying === 0 && !customerObj) return;
            onConfirm({ usdAmount: usdAmt, lbpAmount: lbpAmt, selectedMethod: selMethod, payLater: paying === 0 });
          }}
          sx={{ fontWeight: 800, py: 1.25, borderRadius: 2 }}>
          {submitting ? "Processing…" : `Confirm · $${fmt(Math.min(totalPaying, total))}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function PosPage() {
  const [items,      setItems]      = useState([]);
  const [categories, setCategories] = useState([]);
  const [methods,    setMethods]    = useState(["CASH"]);
  const [cart,       setCart]       = useState([]);
  const [lineDiscounts, setLineDiscounts] = useState({});
  const [search,     setSearch]     = useState("");
  const [selCat,     setSelCat]     = useState("");
  const [discount,   setDiscount]   = useState("");
  const [method,     setMethod]     = useState("CASH");
  const [customer,   setCustomer]   = useState("Walk-in");
  const [customerObj, setCustomerObj] = useState(null);
  const [note,       setNote]       = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg,        setMsg]        = useState({ text: "", ok: true });
  const [receipt,    setReceipt]    = useState(null);
  const [payOpen,    setPayOpen]    = useState(false);
  const [activeHoldId, setActiveHoldId] = useState(null);
  const [holdsOpen,  setHoldsOpen]  = useState(false);
  const [custOpen,   setCustOpen]   = useState(false);
  const [lbpRate,    setLbpRate]    = useState(0);
  const [holdCount,  setHoldCount]  = useState(0);
  const [discountType, setDiscountType] = useState("flat");
  const [discountPresets] = useState([5, 10, 15, 20]);
  const searchRef = useRef(null);

  const load = useCallback(async () => {
    const [its, cats, settings] = await Promise.all([
      window.api.posListItems({}),
      window.api.posListCategories(),
      window.api.getSettings().catch(() => ({})),
    ]);
    setItems(its || []);
    setCategories(cats || []);
    setLbpRate(Number(settings?.lbp_rate || 0));
    try {
      const pm = JSON.parse(settings?.payment_methods || "[]");
      if (pm.length) { setMethods(pm); setMethod(prev => pm.includes(prev) ? prev : pm[0]); }
    } catch {}
  }, []);

  const loadHoldCount = useCallback(async () => {
    const holds = await window.api.posListHeldCarts?.().catch(() => []);
    setHoldCount(holds?.length || 0);
  }, []);

  useEffect(() => { load(); loadHoldCount(); }, [load, loadHoldCount]);
  useEffect(() => {
    if (!msg.text) return;
    const t = setTimeout(() => setMsg({ text: "", ok: true }), 5000);
    return () => clearTimeout(t);
  }, [msg.text]);

  useEffect(() => {
    let barcodeBuffer = "";
    let barcodeTimer = null;
    const handleKey = (e) => {
      if (e.key === "Enter" && barcodeBuffer.length > 3) {
        const found = items.find(it => it.barcode === barcodeBuffer);
        if (found) addToCart(found);
        barcodeBuffer = "";
        return;
      }
      if (e.key.length === 1) {
        barcodeBuffer += e.key;
        clearTimeout(barcodeTimer);
        barcodeTimer = setTimeout(() => { barcodeBuffer = ""; }, 200);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [items]);

  const visible = useMemo(() => items.filter(it => {
    if (selCat && String(it.category_id) !== String(selCat)) return false;
    if (search && !it.name.toLowerCase().includes(search.toLowerCase()) &&
        !(it.barcode || "").includes(search)) return false;
    return true;
  }), [items, selCat, search]);

  const addToCart = (item) => {
    setCart(prev => {
      const ex = prev.find(l => l.item_id === item.id);
      if (ex) {
        if (item.track_stock && ex.qty >= Number(item.stock_qty)) return prev;
        return prev.map(l => l.item_id === item.id ? { ...l, qty: l.qty + 1 } : l);
      }
      return [...prev, { item_id: item.id, item_name: item.name, unit_price: Number(item.price), qty: 1, track_stock: item.track_stock, stock_qty: Number(item.stock_qty) }];
    });
  };

  const changeQty   = (id, delta) => setCart(prev => prev.map(l => l.item_id === id ? { ...l, qty: Math.max(1, l.qty + delta) } : l));
  const removeItem  = (id) => setCart(prev => prev.filter(l => l.item_id !== id));
  const clearCart   = () => { setCart([]); setDiscount(""); setNote(""); setCustomer("Walk-in"); setCustomerObj(null); setLineDiscounts({}); setActiveHoldId(null); };

  const subtotal    = useMemo(() => cart.reduce((s, l) => s + l.unit_price * l.qty, 0), [cart]);
  const totalLineDisc = Object.values(lineDiscounts).reduce((s, v) => s + (Number(v) || 0), 0);
  const discountAmt = useMemo(() => {
    if (!discount) return 0;
    if (discountType === "percent") return Math.min(subtotal * (Number(discount) / 100), subtotal);
    return Math.min(Number(discount) || 0, subtotal);
  }, [discount, discountType, subtotal]);
  const total       = Math.max(0, subtotal - discountAmt - totalLineDisc);

  const holdCart = async () => {
    if (!cart.length) return;
    const label = `Hold ${new Date().toLocaleTimeString()}`;
    await window.api.posHoldCart?.({ cart, label, customer, actor: "admin" });
    clearCart();
    loadHoldCount();
    setMsg({ text: "Order held.", ok: true });
  };

  const recallCart = async (held) => {
    setCart(held.cart || []);
    setActiveHoldId(held.id);
    if (held.customer) setCustomer(held.customer);
    if (held.customer) {
      const custs = await window.api.posListCustomers?.({ search: held.customer }).catch(() => []);
      const match = (custs || []).find(c => c.name === held.customer);
      if (match) setCustomerObj(match);
    }
    await loadHoldCount();
  };

  const submitSale = async ({ usdAmount, lbpAmount, selectedMethod, payLater }) => {
    if (!cart.length) return;
    setSubmitting(true);
    setMethod(selectedMethod);

    const lbpAsUsd   = lbpAmount > 0 && lbpRate > 0 ? lbpAmount / lbpRate : 0;
    const totalPaying = usdAmount + lbpAsUsd;
    const saleTotal   = total;
    const isPayLater  = payLater === true || totalPaying === 0;
    const isPartial   = !isPayLater && totalPaying > 0 && totalPaying < saleTotal;

    if ((isPayLater || isPartial) && !customerObj?.id) {
      setSubmitting(false);
      return setMsg({ text: "⚠️ Please select a customer before using Pay Later or Partial payment.", ok: false });
    }

    try {
      const res = await window.api.posCreateSale({
        items:         cart,
        discount:      discountAmt + totalLineDisc,
        method:        isPayLater ? "PAY_LATER" : selectedMethod,
        note:          [customer !== "Walk-in" ? customer : "", note.trim()].filter(Boolean).join(" — ") || null,
        actor:         "admin",
        customer:      customerObj?.name || customer,
        customer_id:   customerObj?.id || null,
        usd_amount:    isPayLater ? 0 : usdAmount,
        lbp_amount:    isPayLater ? 0 : lbpAmount,
        lbp_rate:      lbpRate,
        line_discounts: lineDiscounts,
      });

      if (!res?.ok) {
        const reason = res?.reason === "INSUFFICIENT_STOCK"
          ? `Not enough stock: ${res.name} (have ${res.available}, need ${res.requested})`
          : res?.reason || "Sale failed";
        return setMsg({ text: reason, ok: false });
      }

      if ((isPayLater || isPartial) && customerObj?.id) {
        const invoiceRes = await window.api.posCreateInvoice?.({
          sale_id:       res.sale_id,
          customer_id:   customerObj.id,
          customer_name: customerObj.name,
          total:         saleTotal,
          paid_amount:   isPayLater ? 0 : totalPaying,
          method:        selectedMethod,
          note:          note.trim() || null,
          actor:         "admin",
        });
        if (!invoiceRes?.ok) {
          console.warn("[POS] Invoice creation failed:", invoiceRes?.reason);
        }
      }

      if (activeHoldId) {
        await window.api.posDeleteHeldCart?.(activeHoldId).catch(() => {});
        setActiveHoldId(null);
        await loadHoldCount();
      }

      const fullSale = await window.api.posGetSale(res.sale_id);
      setReceipt({ ...fullSale, method: isPayLater ? "PAY_LATER" : selectedMethod,
        sale_number: res.sale_number, total: res.total });
      clearCart();
      await load();
    } finally { setSubmitting(false); }
  };

  return (
    <Box sx={{ display: "flex", height: "calc(100vh - 80px)", gap: 0, overflow: "hidden" }}>

      {/* ── LEFT: Catalog ─────────────────────────────────────────────── */}
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", overflow: "hidden", pr: 2 }}>
        <Box sx={{ display: "flex", gap: 1.5, mb: 1.5, alignItems: "center", flexWrap: "wrap" }}>
          <TextField size="small" placeholder="Search or scan barcode…" value={search}
            onChange={e => setSearch(e.target.value)} inputRef={searchRef} sx={{ flex: 1, minWidth: 200 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, opacity: 0.4 }} /></InputAdornment>,
              endAdornment: search ? <InputAdornment position="end"><IconButton size="small" onClick={() => setSearch("")}><CloseIcon sx={{ fontSize: 14 }} /></IconButton></InputAdornment> : null,
            }} />
          <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
            <Chip label="All" size="small" color={!selCat ? "primary" : "default"} onClick={() => setSelCat("")} sx={{ fontWeight: 700, cursor: "pointer" }} />
            {categories.map(c => (
              <Chip key={c.id} label={c.name} size="small"
                color={String(selCat) === String(c.id) ? "primary" : "default"}
                onClick={() => setSelCat(String(selCat) === String(c.id) ? "" : String(c.id))}
                sx={{ fontWeight: 700, cursor: "pointer", bgcolor: String(selCat) === String(c.id) ? undefined : c.color + "22", color: String(selCat) === String(c.id) ? undefined : c.color, borderColor: c.color }} />
            ))}
          </Box>
        </Box>

        <Box sx={{ flexGrow: 1, overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px,1fr))", gap: 1, alignContent: "start" }}>
          {visible.map(item => <ItemCard key={item.id} item={item} onAdd={addToCart} />)}
          {visible.length === 0 && (
            <Box sx={{ gridColumn: "1/-1", textAlign: "center", py: 8, opacity: 0.3 }}>
              <Typography>No items match</Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* ── RIGHT: Cart ───────────────────────────────────────────────── */}
      <Box sx={{ width: 320, display: "flex", flexDirection: "column", border: "1px solid", borderColor: "grey.200", borderRadius: 2, overflow: "hidden", bgcolor: "background.paper" }}>

        {/* Cart header — aligned buttons */}
        <Box sx={{ px: 2, py: 1.5, display: "flex", alignItems: "center", gap: 1, bgcolor: "grey.50", borderBottom: "1px solid", borderColor: "grey.200" }}>
          <ShoppingCartIcon sx={{ opacity: 0.6 }} />
          <Typography fontWeight={900} sx={{ flexGrow: 1 }}>
            Cart {cart.length > 0 && <Chip label={cart.reduce((s,l) => s+l.qty, 0)} size="small" color="primary" sx={{ ml: 0.5, height: 18, fontSize: 10, fontWeight: 800, "& .MuiChip-label": { px: 0.75 } }} />}
          </Typography>
          <IconButton size="small" onClick={holdCart} disabled={!cart.length} title="Hold order"
            sx={{ width: 32, height: 32, border: "1px solid", borderColor: "grey.300", borderRadius: 1.5, bgcolor: "background.paper" }}>
            <PauseIcon sx={{ fontSize: 16 }} />
          </IconButton>
          <IconButton size="small" onClick={() => setHoldsOpen(true)} title="Recall held order"
            sx={{ width: 32, height: 32, border: "1px solid", borderColor: "grey.300", borderRadius: 1.5, bgcolor: "background.paper", position: "relative" }}>
            <PlayArrowIcon sx={{ fontSize: 16 }} />
            {holdCount > 0 && (
              <Box sx={{ position: "absolute", top: -5, right: -5, width: 16, height: 16, borderRadius: "50%",
                bgcolor: "error.main", display: "flex", alignItems: "center", justifyContent: "center",
                border: "2px solid white" }}>
                <Typography sx={{ fontSize: 9, color: "white", fontWeight: 800, lineHeight: 1 }}>{holdCount}</Typography>
              </Box>
            )}
          </IconButton>
          {cart.length > 0 && (
            <Button size="small" color="error" onClick={clearCart}
              sx={{ fontSize: 11, fontWeight: 700, minWidth: 0, px: 1, height: 32 }}>Clear</Button>
          )}
        </Box>

        {/* Cart lines */}
        <Box sx={{ flexGrow: 1, overflowY: "auto", px: 2, py: 1 }}>
          {cart.length === 0 ? (
            <Box sx={{ py: 6, textAlign: "center", opacity: 0.35 }}>
              <ShoppingCartIcon sx={{ fontSize: 48 }} />
              <Typography variant="body2" sx={{ mt: 1 }}>Tap items to add to cart</Typography>
            </Box>
          ) : cart.map(line => (
            <CartLine key={line.item_id} line={line} onChange={changeQty} onRemove={removeItem}
              lineDiscount={lineDiscounts[line.item_id] || 0}
              onDiscountChange={(id, val) => setLineDiscounts(prev => ({ ...prev, [id]: val }))} />
          ))}
        </Box>

        {/* Checkout panel */}
        <Box sx={{ px: 2, py: 2, borderTop: "1px solid", borderColor: "grey.200", bgcolor: "grey.50" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
            <Typography fontSize={13} color="text.secondary">Subtotal</Typography>
            <Typography fontSize={13} fontWeight={700}>${fmt(subtotal)}</Typography>
          </Box>

          {/* Discount — aligned */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
            <Typography fontSize={13} color="text.secondary" sx={{ flexGrow: 1 }}>Discount</Typography>
            <Select size="small" value={discountType} onChange={e => setDiscountType(e.target.value)}
              sx={{ width: 56, height: 34, fontSize: 12, fontWeight: 700, bgcolor: "background.paper" }}>
              <MenuItem value="flat">$</MenuItem>
              <MenuItem value="percent">%</MenuItem>
            </Select>
            <TextField size="small" type="number" value={discount} onChange={e => setDiscount(e.target.value)}
              sx={{ width: 90, "& .MuiInputBase-root": { height: 34, bgcolor: "background.paper" } }}
              inputProps={{ min: 0, step: discountType === "percent" ? 5 : 0.5,
                style: { textAlign: "right", fontWeight: 700, padding: "6px 8px" } }} />
          </Box>

          {discountType === "percent" && (
            <Box sx={{ display: "flex", gap: 0.5, mb: 1 }}>
              {discountPresets.map(p => (
                <Chip key={p} label={`${p}%`} size="small" onClick={() => setDiscount(String(p))}
                  variant={String(discount) === String(p) ? "filled" : "outlined"}
                  color={String(discount) === String(p) ? "primary" : "default"}
                  sx={{ fontWeight: 700, cursor: "pointer", fontSize: 10 }} />
              ))}
            </Box>
          )}

          {discountAmt > 0 && <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
            <Typography fontSize={12} color="error.main">Cart discount</Typography>
            <Typography fontSize={12} color="error.main">−${fmt(discountAmt)}</Typography>
          </Box>}
          {totalLineDisc > 0 && <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
            <Typography fontSize={12} color="error.main">Line discounts</Typography>
            <Typography fontSize={12} color="error.main">−${fmt(totalLineDisc)}</Typography>
          </Box>}

          <Divider sx={{ my: 1 }} />
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
            <Typography fontWeight={900} fontSize={16}>Total</Typography>
            <Typography fontWeight={900} fontSize={20} color="primary.main">${fmt(total)}</Typography>
          </Box>

          {/* Customer — read-only, set via picker only, X inside to clear */}
          <Box sx={{ display: "flex", gap: 1, mb: 1, alignItems: "stretch" }}>
            <TextField size="small" label="Customer"
              value={customerObj?.name || "Walk-in"}
              InputProps={{
                readOnly: true,
                endAdornment: customerObj ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={(e) => {
                      e.stopPropagation();
                      setCustomerObj(null); setCustomer("Walk-in");
                    }} sx={{ p: 0.5 }}>
                      <CloseIcon sx={{ fontSize: 16, color: "error.main" }} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
              onClick={() => setCustOpen(true)}
              sx={{ flex: 1, cursor: "pointer",
                "& .MuiInputBase-root": { bgcolor: "background.paper", cursor: "pointer" },
                "& .MuiInputBase-input": { color: "text.secondary", cursor: "pointer", fontWeight: 600 } }} />
            <IconButton size="small" onClick={() => setCustOpen(true)} title="Select customer"
              sx={{ border: "1px solid", borderColor: "grey.300", borderRadius: 1.5, width: 40, bgcolor: "background.paper" }}>
              <PersonSearchIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>

          <TextField size="small" fullWidth label="Note (optional)" value={note} onChange={e => setNote(e.target.value)}
            sx={{ mb: 1, "& .MuiInputBase-root": { bgcolor: "background.paper" } }} />

          {msg.text && (
            <Box sx={{ mb: 1, px: 1.5, py: 0.75, borderRadius: 1.5, bgcolor: msg.ok ? "success.50" : "error.50" }}>
              <Typography fontSize={12} fontWeight={600} color={msg.ok ? "success.dark" : "error.dark"}>{msg.text}</Typography>
            </Box>
          )}

          <Button fullWidth variant="contained" size="large"
            disabled={cart.length === 0 || submitting}
            onClick={() => setPayOpen(true)}
            startIcon={<ReceiptIcon />}
            sx={{ fontWeight: 900, fontSize: 16, borderRadius: 2, py: 1.25, bgcolor: "success.main", "&:hover": { bgcolor: "success.dark" } }}>
            {submitting ? "Processing…" : `Charge $${fmt(total)}`}
          </Button>
        </Box>
      </Box>

      {/* Dialogs */}
      {payOpen && (
        <PayDialog open={payOpen} total={total} method={method} methods={methods} lbpRate={lbpRate}
          submitting={submitting} customer={customer} customerObj={customerObj}
          onClose={() => setPayOpen(false)}
          onConfirm={({ usdAmount, lbpAmount, selectedMethod, payLater }) => {
            setPayOpen(false);
            submitSale({ usdAmount, lbpAmount, selectedMethod, payLater });
          }} />
      )}
      <HoldsDrawer open={holdsOpen} onClose={() => setHoldsOpen(false)} onRecall={recallCart} />
      <CustomerDialog open={custOpen} onClose={() => setCustOpen(false)}
        onSelect={c => { setCustomerObj(c); setCustomer(c.name); }} />
      {receipt && <ReceiptDialog sale={receipt} method={method} onClose={() => { setReceipt(null); load(); }} />}
    </Box>
  );
}

function PersonSearchIcon(props) { return <PersonIcon {...props} />; }