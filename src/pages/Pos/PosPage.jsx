import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, FormControl, IconButton, InputAdornment,
  InputLabel, MenuItem, Paper, Select, TextField, Typography,
} from "@mui/material";
import AddIcon        from "@mui/icons-material/Add";
import RemoveIcon     from "@mui/icons-material/Remove";
import DeleteIcon     from "@mui/icons-material/Delete";
import SearchIcon     from "@mui/icons-material/Search";
import ReceiptIcon    from "@mui/icons-material/Receipt";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import CloseIcon      from "@mui/icons-material/Close";

const fmt = (n) => (Number(n) || 0).toLocaleString(undefined, {
  minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Item card in catalog grid ─────────────────────────────────────────────────
function ItemCard({ item, onAdd }) {
  const outOfStock = item.track_stock && Number(item.stock_qty) <= 0;
  return (
    <Paper
      elevation={0}
      onClick={() => !outOfStock && onAdd(item)}
      sx={{
        p: 1.5, borderRadius: 2, cursor: outOfStock ? "not-allowed" : "pointer",
        border: "1px solid", borderColor: "grey.200",
        opacity: outOfStock ? 0.45 : 1,
        transition: "all 0.15s",
        "&:hover": outOfStock ? {} : {
          borderColor: "primary.main", boxShadow: "0 2px 12px rgba(21,101,192,0.12)",
          transform: "translateY(-1px)",
        },
        display: "flex", flexDirection: "column", gap: 0.5,
        position: "relative", overflow: "hidden",
      }}
    >
      {/* Category color bar */}
      <Box sx={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        bgcolor: item.category_color || "#1565c0",
      }} />

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mt: 0.5 }}>
        <Typography fontWeight={700} fontSize={13} sx={{ lineHeight: 1.3, flexGrow: 1, pr: 1 }}>
          {item.name}
        </Typography>
        {item.track_stock && (
          <Chip
            label={`${Number(item.stock_qty)} ${item.unit || "pcs"}`}
            size="small"
            color={Number(item.stock_qty) <= Number(item.stock_min) ? "error" : "success"}
            sx={{ height: 18, fontSize: 9, fontWeight: 700, "& .MuiChip-label": { px: 0.5 } }}
          />
        )}
      </Box>

      {item.category_name && (
        <Typography fontSize={10} sx={{ opacity: 0.5, textTransform: "uppercase", letterSpacing: 0.5 }}>
          {item.category_name}
        </Typography>
      )}

      <Typography fontWeight={900} fontSize={16} color="primary.main" sx={{ mt: "auto" }}>
        ${fmt(item.price)}
      </Typography>
    </Paper>
  );
}

// ── Cart line item ────────────────────────────────────────────────────────────
function CartLine({ line, onChange, onRemove }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.75,
      borderBottom: "1px solid", borderColor: "grey.100" }}>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography fontSize={13} fontWeight={700} noWrap>{line.item_name}</Typography>
        <Typography fontSize={11} color="text.secondary">${fmt(line.unit_price)} ea.</Typography>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <IconButton size="small" onClick={() => onChange(line.item_id, -1)}
          sx={{ width: 24, height: 24, border: "1px solid", borderColor: "grey.300" }}>
          <RemoveIcon sx={{ fontSize: 14 }} />
        </IconButton>
        <Typography fontWeight={800} sx={{ minWidth: 28, textAlign: "center" }}>
          {line.qty}
        </Typography>
        <IconButton size="small" onClick={() => onChange(line.item_id, +1)}
          sx={{ width: 24, height: 24, border: "1px solid", borderColor: "grey.300" }}>
          <AddIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Box>

      <Typography fontWeight={900} fontSize={13} sx={{ minWidth: 60, textAlign: "right" }}>
        ${fmt(line.unit_price * line.qty)}
      </Typography>

      <IconButton size="small" color="error" onClick={() => onRemove(line.item_id)}>
        <DeleteIcon sx={{ fontSize: 16 }} />
      </IconButton>
    </Box>
  );
}

// ── Receipt dialog ────────────────────────────────────────────────────────────
function ReceiptDialog({ sale, onClose }) {
  if (!sale) return null;
  return (
    <Dialog open maxWidth="xs" fullWidth onClose={onClose}
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <Box sx={{ background: "linear-gradient(135deg, #1565c0, #1976d2)", px: 3, py: 2, color: "white" }}>
        <Typography variant="overline" sx={{ opacity: 0.7, letterSpacing: 1.5, fontSize: 11 }}>RECEIPT</Typography>
        <Typography variant="h5" fontWeight={900}>${fmt(sale.total)}</Typography>
        <Typography variant="caption" sx={{ opacity: 0.7, fontFamily: "monospace" }}>
          {sale.sale_number}
        </Typography>
      </Box>
      <DialogContent sx={{ p: 2.5 }}>
        {(sale.items || []).map((li, i) => (
          <Box key={i} sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
            <Typography fontSize={13}>{li.item_name} × {li.qty}</Typography>
            <Typography fontSize={13} fontWeight={700}>${fmt(li.line_total)}</Typography>
          </Box>
        ))}
        {sale.discount > 0 && (
          <>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography fontSize={13} color="text.secondary">Discount</Typography>
              <Typography fontSize={13} color="error.main">−${fmt(sale.discount)}</Typography>
            </Box>
          </>
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
          <Chip label={sale.method} size="small" sx={{ fontWeight: 700, fontSize: 11 }} />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 2.5, pb: 2, gap: 1 }}>
        <Button variant="outlined" onClick={() => {
          // Build receipt HTML and print
          const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; font-size: 12px; width: 72mm; margin: 0; padding: 4mm; }
              h2 { text-align: center; font-size: 14px; margin: 0 0 8px; }
              .line { display: flex; justify-content: space-between; margin: 3px 0; }
              .total { font-weight: bold; font-size: 14px; border-top: 1px dashed #000; padding-top: 4px; margin-top: 4px; }
              .center { text-align: center; }
              .num { font-family: monospace; font-size: 10px; opacity: 0.6; }
            </style></head><body>
            <h2>RECEIPT</h2>
            <div class="center num">${sale.sale_number}</div>
            <hr/>
            ${(sale.items||[]).map(li => `<div class="line"><span>${li.item_name} ×${li.qty}</span><span>$${Number(li.line_total).toFixed(2)}</span></div>`).join("")}
            ${sale.discount > 0 ? `<div class="line"><span>Discount</span><span>-$${Number(sale.discount).toFixed(2)}</span></div>` : ""}
            <div class="line total"><span>TOTAL</span><span>$${Number(sale.total).toFixed(2)}</span></div>
            <div class="line"><span>Method</span><span>${sale.method}</span></div>
            <div class="center" style="margin-top:8px;font-size:11px">Thank you!</div>
          </body></html>`;
          window.api.printHtml?.({ html, title: `Receipt — ${sale.sale_number}` });
        }} sx={{ fontWeight: 700 }}>
          🖨 Print
        </Button>
        <Button fullWidth variant="contained" onClick={onClose} sx={{ fontWeight: 800, borderRadius: 2 }}>
          New Sale
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
  const [search,     setSearch]     = useState("");
  const [selCat,     setSelCat]     = useState("");
  const [discount,   setDiscount]   = useState("");
  const [method,     setMethod]     = useState("CASH");
  const [customer,   setCustomer]   = useState("");
  const [note,       setNote]       = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg,        setMsg]        = useState({ text: "", ok: true });
  const [receipt,    setReceipt]    = useState(null);
  const searchRef = useRef(null);

  const load = useCallback(async () => {
    const [its, cats, settings] = await Promise.all([
      window.api.posListItems({}),
      window.api.posListCategories(),
      window.api.getSettings().catch(() => ({})),
    ]);
    setItems(its || []);
    setCategories(cats || []);
    // Load payment methods from ISP settings
    try {
      const pm = JSON.parse(settings?.payment_methods || "[]");
      if (pm.length) {
        setMethods(pm);
        setMethod(prev => pm.includes(prev) ? prev : pm[0]);
      }
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!msg.text) return;
    const t = setTimeout(() => setMsg({ text: "", ok: true }), 5000);
    return () => clearTimeout(t);
  }, [msg.text]);

  // ── Filtered catalog ────────────────────────────────────────────────────────
  const visible = useMemo(() => {
    return items.filter(it => {
      if (selCat && String(it.category_id) !== String(selCat)) return false;
      if (search && !it.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [items, selCat, search]);

  // ── Cart operations ─────────────────────────────────────────────────────────
  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(l => l.item_id === item.id);
      if (existing) {
        // Check stock
        if (item.track_stock && existing.qty >= Number(item.stock_qty))
          return prev; // can't add more than stock
        return prev.map(l => l.item_id === item.id
          ? { ...l, qty: l.qty + 1 }
          : l
        );
      }
      return [...prev, {
        item_id: item.id, item_name: item.name,
        unit_price: Number(item.price), qty: 1,
        track_stock: item.track_stock, stock_qty: Number(item.stock_qty),
      }];
    });
  };

  const changeQty = (item_id, delta) => {
    setCart(prev => prev
      .map(l => l.item_id === item_id ? { ...l, qty: Math.max(1, l.qty + delta) } : l)
    );
  };

  const removeFromCart = (item_id) => {
    setCart(prev => prev.filter(l => l.item_id !== item_id));
  };

  const clearCart = () => { setCart([]); setDiscount(""); setNote(""); setCustomer(""); };

  // ── Totals ─────────────────────────────────────────────────────────────────
  const subtotal     = useMemo(() => cart.reduce((s, l) => s + l.unit_price * l.qty, 0), [cart]);
  const discountAmt  = Math.min(Number(discount) || 0, subtotal);
  const total        = subtotal - discountAmt;

  // ── Submit sale ─────────────────────────────────────────────────────────────
  const submitSale = async () => {
    if (!cart.length) return setMsg({ text: "Cart is empty.", ok: false });
    setSubmitting(true);
    try {
      const res = await window.api.posCreateSale({
        items:    cart,
        discount: discountAmt,
        method,
        note:     [customer.trim(), note.trim()].filter(Boolean).join(" — ") || null,
        actor:    "admin",
        customer: customer.trim() || "Walk-in",
      });

      if (!res?.ok) {
        const reason = res?.reason === "INSUFFICIENT_STOCK"
          ? `Not enough stock: ${res.name} (have ${res.available}, need ${res.requested})`
          : res?.reason || "Sale failed";
        return setMsg({ text: reason, ok: false });
      }

      // Fetch full sale for receipt
      const fullSale = await window.api.posGetSale(res.sale_id);
      setReceipt({ ...fullSale, method, sale_number: res.sale_number, total: res.total });
      clearCart();
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ display: "flex", height: "calc(100vh - 80px)", gap: 0, overflow: "hidden" }}>

      {/* ── LEFT: Catalog ──────────────────────────────────────────────────── */}
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", overflow: "hidden", pr: 2 }}>

        {/* Search + Category filter */}
        <Box sx={{ display: "flex", gap: 1.5, mb: 1.5, alignItems: "center", flexWrap: "wrap" }}>
          <TextField
            size="small" placeholder="Search items…" value={search}
            onChange={e => setSearch(e.target.value)}
            inputRef={searchRef}
            sx={{ flex: 1, minWidth: 200 }}
            InputProps={{
              startAdornment: <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18, opacity: 0.4 }} />
              </InputAdornment>,
              endAdornment: search ? <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearch("")}>
                  <CloseIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </InputAdornment> : null,
            }}
          />

          <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
            <Chip
              label="All" size="small"
              color={!selCat ? "primary" : "default"}
              onClick={() => setSelCat("")}
              sx={{ fontWeight: 700, cursor: "pointer" }}
            />
            {categories.map(c => (
              <Chip
                key={c.id} label={c.name} size="small"
                color={String(selCat) === String(c.id) ? "primary" : "default"}
                onClick={() => setSelCat(String(selCat) === String(c.id) ? "" : String(c.id))}
                sx={{ fontWeight: 700, cursor: "pointer",
                  bgcolor: String(selCat) === String(c.id) ? undefined : c.color + "22",
                  color:   String(selCat) === String(c.id) ? undefined : c.color,
                  borderColor: c.color,
                }}
              />
            ))}
          </Box>
        </Box>

        {/* Item grid */}
        <Box sx={{
          flexGrow: 1, overflowY: "auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 1.25, alignContent: "start", pr: 0.5,
        }}>
          {visible.map(item => (
            <ItemCard key={item.id} item={item} onAdd={addToCart} />
          ))}
          {visible.length === 0 && (
            <Box sx={{ gridColumn: "1/-1", py: 8, textAlign: "center", opacity: 0.4 }}>
              <LocalOfferIcon sx={{ fontSize: 48, mb: 1 }} />
              <Typography>No items found</Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* ── RIGHT: Cart ────────────────────────────────────────────────────── */}
      <Box sx={{
        width: 340, flexShrink: 0,
        display: "flex", flexDirection: "column",
        bgcolor: "white",
        borderLeft: "1px solid", borderColor: "grey.200",
        borderRadius: 3, overflow: "hidden",
      }}>

        {/* Cart header */}
        <Box sx={{
          px: 2, py: 1.5, display: "flex", alignItems: "center", gap: 1,
          bgcolor: "grey.50", borderBottom: "1px solid", borderColor: "grey.200",
        }}>
          <ShoppingCartIcon sx={{ opacity: 0.6 }} />
          <Typography fontWeight={900} sx={{ flexGrow: 1 }}>
            Cart {cart.length > 0 && <Chip label={cart.reduce((s,l) => s+l.qty, 0)} size="small"
              color="primary" sx={{ ml: 0.5, height: 18, fontSize: 10, fontWeight: 800,
                "& .MuiChip-label": { px: 0.75 } }} />}
          </Typography>
          {cart.length > 0 && (
            <Button size="small" color="error" onClick={clearCart} sx={{ fontSize: 11, fontWeight: 700 }}>
              Clear
            </Button>
          )}
        </Box>

        {/* Cart lines */}
        <Box sx={{ flexGrow: 1, overflowY: "auto", px: 2, py: 1 }}>
          {cart.length === 0 ? (
            <Box sx={{ py: 6, textAlign: "center", opacity: 0.35 }}>
              <ShoppingCartIcon sx={{ fontSize: 48 }} />
              <Typography variant="body2" sx={{ mt: 1 }}>
                Tap items to add to cart
              </Typography>
            </Box>
          ) : (
            cart.map(line => (
              <CartLine key={line.item_id} line={line}
                onChange={changeQty} onRemove={removeFromCart} />
            ))
          )}
        </Box>

        {/* Checkout panel */}
        <Box sx={{ px: 2, py: 2, borderTop: "1px solid", borderColor: "grey.200", bgcolor: "grey.50" }}>
          {/* Subtotal */}
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
            <Typography fontSize={13} color="text.secondary">Subtotal</Typography>
            <Typography fontSize={13} fontWeight={700}>${fmt(subtotal)}</Typography>
          </Box>

          {/* Discount */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <Typography fontSize={13} color="text.secondary" sx={{ flexGrow: 1 }}>Discount ($)</Typography>
            <TextField
              size="small" type="number" value={discount}
              onChange={e => setDiscount(e.target.value)}
              sx={{ width: 90 }}
              inputProps={{ min: 0, step: 0.5, style: { textAlign: "right", fontWeight: 700 } }}
            />
          </Box>

          {/* Total */}
          <Divider sx={{ my: 1 }} />
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
            <Typography fontWeight={900} fontSize={16}>Total</Typography>
            <Typography fontWeight={900} fontSize={20} color="primary.main">${fmt(total)}</Typography>
          </Box>

          {/* Customer */}
          <TextField
            size="small" fullWidth label="Customer (optional)" value={customer}
            onChange={e => setCustomer(e.target.value)}
            placeholder="Walk-in customer"
            sx={{ mb: 1 }}
          />

          {/* Method */}
          <FormControl fullWidth size="small" sx={{ mb: 1 }}>
            <InputLabel>Payment Method</InputLabel>
            <Select label="Payment Method" value={method} onChange={e => setMethod(e.target.value)}>
              {methods.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
            </Select>
          </FormControl>

          {/* Note */}
          <TextField
            size="small" fullWidth label="Note (optional)" value={note}
            onChange={e => setNote(e.target.value)} sx={{ mb: 1.5 }}
          />

          {/* Error message */}
          {msg.text && (
            <Box sx={{ mb: 1, px: 1.5, py: 0.75, borderRadius: 1.5,
              bgcolor: msg.ok ? "success.50" : "error.50" }}>
              <Typography fontSize={12} fontWeight={600}
                color={msg.ok ? "success.dark" : "error.dark"}>
                {msg.text}
              </Typography>
            </Box>
          )}

          {/* Charge button */}
          <Button
            fullWidth variant="contained" size="large"
            disabled={cart.length === 0 || submitting}
            onClick={submitSale}
            startIcon={<ReceiptIcon />}
            sx={{ fontWeight: 900, fontSize: 16, borderRadius: 2, py: 1.25, bgcolor: "success.main", "&:hover": { bgcolor: "success.dark" } }}
          >
            {submitting ? "Processing…" : `Charge $${fmt(total)}`}
          </Button>
        </Box>
      </Box>

      {/* Receipt dialog */}
      {receipt && <ReceiptDialog sale={receipt} onClose={() => setReceipt(null)} />}
    </Box>
  );
}