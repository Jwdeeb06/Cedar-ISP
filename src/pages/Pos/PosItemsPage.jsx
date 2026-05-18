import { useCallback, useEffect, useState } from "react";
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, FormControl, FormControlLabel, IconButton, InputAdornment,
  InputLabel, MenuItem, Paper, Select, Switch, Table, TableBody,
  TableCell, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import AddIcon         from "@mui/icons-material/Add";
import EditIcon        from "@mui/icons-material/Edit";
import DeleteIcon      from "@mui/icons-material/Delete";
import InventoryIcon   from "@mui/icons-material/Inventory";
import SearchIcon      from "@mui/icons-material/Search";
import CloseIcon       from "@mui/icons-material/Close";
import AddCircleIcon   from "@mui/icons-material/AddCircle";
import RemoveCircleIcon from "@mui/icons-material/RemoveCircle";

const fmt = (n) => (Number(n) || 0).toLocaleString(undefined, {
  minimumFractionDigits: 2, maximumFractionDigits: 2 });

const UNITS = ["pcs", "box", "kg", "g", "L", "ml", "m", "roll", "pack", "set"];

const BLANK_ITEM = {
  name: "", category_id: "", price: "", cost: "",
  unit: "pcs", barcode: "", notes: "",
  track_stock: true, stock_qty: "", stock_min: "",
};

// ── Item form dialog ──────────────────────────────────────────────────────────
function ItemDialog({ open, item, categories, onSave, onClose }) {
  const [form, setForm] = useState(BLANK_ITEM);
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(item?.id);

  useEffect(() => {
    if (open) setForm(item ? {
      name: item.name || "", category_id: item.category_id || "",
      price: item.price ?? "", cost: item.cost ?? "",
      unit: item.unit || "pcs", barcode: item.barcode || "",
      notes: item.notes || "", track_stock: Boolean(item.track_stock),
      stock_qty: item.stock_qty ?? "", stock_min: item.stock_min ?? "",
    } : BLANK_ITEM);
  }, [open, item]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...form, id: item?.id,
        price: Number(form.price) || 0,
        cost:  Number(form.cost)  || 0,
        stock_qty: Number(form.stock_qty) || 0,
        stock_min: Number(form.stock_min) || 0,
        category_id: form.category_id || null,
      };
      const res = isEdit
        ? await window.api.posUpdateItem(payload)
        : await window.api.posAddItem(payload);
      if (res?.ok || res?.updated) onSave();
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 900 }}>
        {isEdit ? "Edit Item" : "Add New Item"}
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 0.5 }}>
          <TextField label="Item Name *" value={form.name}
            onChange={e => set("name", e.target.value)} fullWidth />

          <Box sx={{ display: "flex", gap: 2 }}>
            <FormControl sx={{ flex: 1 }}>
              <InputLabel>Category</InputLabel>
              <Select label="Category" value={form.category_id || ""}
                onChange={e => set("category_id", e.target.value)}>
                <MenuItem value="">— None —</MenuItem>
                {categories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl sx={{ width: 120 }}>
              <InputLabel>Unit</InputLabel>
              <Select label="Unit" value={form.unit}
                onChange={e => set("unit", e.target.value)}>
                {UNITS.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField label="Sell Price *" type="number" value={form.price}
              onChange={e => set("price", e.target.value)} sx={{ flex: 1 }}
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
            <TextField label="Cost Price" type="number" value={form.cost}
              onChange={e => set("cost", e.target.value)} sx={{ flex: 1 }}
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
          </Box>

          <TextField label="Barcode" value={form.barcode}
            onChange={e => set("barcode", e.target.value)} fullWidth />

          <Divider />

          <FormControlLabel
            control={<Switch checked={form.track_stock}
              onChange={e => set("track_stock", e.target.checked)} />}
            label="Track stock quantity"
          />

          {form.track_stock && (
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField label="Current Stock" type="number" value={form.stock_qty}
                onChange={e => set("stock_qty", e.target.value)} sx={{ flex: 1 }} />
              <TextField label="Low Stock Alert" type="number" value={form.stock_min}
                onChange={e => set("stock_min", e.target.value)} sx={{ flex: 1 }}
                helperText="Alert when stock reaches this" />
            </Box>
          )}

          <TextField label="Notes" value={form.notes}
            onChange={e => set("notes", e.target.value)} fullWidth multiline rows={2} />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={handleSave}
          disabled={saving || !form.name.trim()} sx={{ fontWeight: 800, px: 3 }}>
          {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Item"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Category dialog ───────────────────────────────────────────────────────────
function CategoryDialog({ open, categories, onSave, onClose }) {
  const [name,  setName]  = useState("");
  const [color, setColor] = useState("#1565c0");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await window.api.posAddCategory({ name: name.trim(), color });
      if (res?.ok) { setName(""); onSave(); }
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    await window.api.posDeleteCategory(id);
    onSave();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 900 }}>Manage Categories</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
          <TextField size="small" label="New category" value={name}
            onChange={e => setName(e.target.value)} sx={{ flex: 1 }}
            onKeyDown={e => e.key === "Enter" && handleAdd()} />
          <input type="color" value={color}
            onChange={e => setColor(e.target.value)}
            style={{ width: 40, height: 40, border: "none", borderRadius: 8,
              cursor: "pointer", padding: 2 }} />
          <Button variant="contained" onClick={handleAdd} disabled={saving || !name.trim()}
            sx={{ fontWeight: 800 }}>
            Add
          </Button>
        </Box>
        {categories.map(c => (
          <Box key={c.id} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
            <Box sx={{ width: 14, height: 14, borderRadius: "50%", bgcolor: c.color, flexShrink: 0 }} />
            <Typography sx={{ flexGrow: 1, fontSize: 14 }}>{c.name}</Typography>
            <IconButton size="small" color="error" onClick={() => handleDelete(c.id)}>
              <DeleteIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        ))}
        {categories.length === 0 && (
          <Typography variant="body2" sx={{ opacity: 0.5, textAlign: "center", py: 2 }}>
            No categories yet
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ fontWeight: 700 }}>Done</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Stock adjustment dialog ───────────────────────────────────────────────────
function StockDialog({ open, item, onSave, onClose }) {
  const [delta,  setDelta]  = useState("");
  const [reason, setReason] = useState("Restock");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setDelta(""); setReason("Restock"); } }, [open]);

  const handleAdjust = async (sign) => {
    const d = Number(delta);
    if (!Number.isFinite(d) || d <= 0) return;
    setSaving(true);
    try {
      const res = await window.api.posAdjustStock({
        item_id: item.id, delta: sign * d, reason, actor: "admin",
      });
      if (res?.ok) onSave(res.stock_qty);
    } finally { setSaving(false); }
  };

  if (!item) return null;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 900 }}>Adjust Stock — {item.name}</DialogTitle>
      <DialogContent>
        <Typography variant="h4" fontWeight={900} color="primary" sx={{ mb: 2, textAlign: "center" }}>
          {Number(item.stock_qty)} {item.unit}
        </Typography>
        <TextField label="Quantity" type="number" value={delta}
          onChange={e => setDelta(e.target.value)} fullWidth sx={{ mb: 2 }}
          inputProps={{ min: 0 }} />
        <TextField label="Reason" value={reason}
          onChange={e => setReason(e.target.value)} fullWidth />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="outlined" color="error" startIcon={<RemoveCircleIcon />}
          disabled={saving || !delta} onClick={() => handleAdjust(-1)}
          sx={{ fontWeight: 800 }}>Remove</Button>
        <Button variant="contained" color="success" startIcon={<AddCircleIcon />}
          disabled={saving || !delta} onClick={() => handleAdjust(+1)}
          sx={{ fontWeight: 800 }}>Add</Button>
      </DialogActions>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function PosItemsPage() {
  const [items,      setItems]      = useState([]);
  const [categories, setCategories] = useState([]);
  const [search,     setSearch]     = useState("");
  const [selCat,     setSelCat]     = useState("");
  const [lowStock,   setLowStock]   = useState(false);

  const [itemDlg,    setItemDlg]    = useState(false);
  const [editItem,   setEditItem]   = useState(null);
  const [catDlg,     setCatDlg]     = useState(false);
  const [stockDlg,   setStockDlg]   = useState(false);
  const [stockItem,  setStockItem]  = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [archived,   setArchived]   = useState([]);

  const load = useCallback(async () => {
    const [its, cats, arch] = await Promise.all([
      window.api.posListItems({ search, category_id: selCat || undefined, low_stock: lowStock }),
      window.api.posListCategories(),
      window.api.posListArchivedItems(),
    ]);
    setItems(its || []);
    setCategories(cats || []);
    setArchived(arch || []);
  }, [search, selCat, lowStock]);

  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setEditItem(null); setItemDlg(true); };
  const openEdit = (item) => { setEditItem(item); setItemDlg(true); };
  const openStock = (item) => { setStockItem(item); setStockDlg(true); };

  const handleDelete = async (item) => {
    const res = await window.api.posDeleteItem(item.id);
    if (!res?.ok && res?.reason === "HAS_SALES") {
      // Has sales history — archive instead
      if (window.confirm(`"${item.name}" has sales history and cannot be fully deleted.\nArchive it instead? (Hidden from terminal, history kept)`)) {
        await window.api.posArchiveItem(item.id);
      }
    }
    load();
  };

  const handleRestore = async (id) => {
    await window.api.posRestoreItem(id);
    load();
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5" fontWeight={900}>Items & Catalog</Typography>
          <Typography variant="body2" sx={{ opacity: 0.6 }}>
            Manage your POS products, prices and stock
          </Typography>
        </Box>
        <Button variant="outlined" onClick={() => setCatDlg(true)} sx={{ fontWeight: 700 }}>
          Categories
        </Button>
        <Button variant={showArchived ? "contained" : "outlined"} color="warning"
          onClick={() => setShowArchived(v => !v)}
          sx={{ fontWeight: 700 }}>
          🗄 Archive {archived.length > 0 && `(${archived.length})`}
        </Button>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}
          sx={{ fontWeight: 800 }}>
          Add Item
        </Button>
      </Box>

      {/* Filters */}
      <Paper elevation={0} sx={{ p: 1.5, mb: 2, borderRadius: 3,
        border: "1px solid", borderColor: "grey.200",
        display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap" }}>
        <TextField size="small" placeholder="Search items…" value={search}
          onChange={e => setSearch(e.target.value)} sx={{ width: 220 }}
          InputProps={{
            startAdornment: <InputAdornment position="start">
              <SearchIcon sx={{ fontSize: 17, opacity: 0.4 }} />
            </InputAdornment>,
            endAdornment: search ? <InputAdornment position="end">
              <IconButton size="small" onClick={() => setSearch("")}>
                <CloseIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </InputAdornment> : null,
          }} />

        <FormControl size="small" sx={{ width: 160 }}>
          <InputLabel>Category</InputLabel>
          <Select label="Category" value={selCat} onChange={e => setSelCat(e.target.value)}>
            <MenuItem value="">All Categories</MenuItem>
            {categories.map(c => <MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>)}
          </Select>
        </FormControl>

        <FormControlLabel
          control={<Switch size="small" checked={lowStock}
            onChange={e => setLowStock(e.target.checked)} />}
          label={<Typography fontSize={13} fontWeight={700}>Low Stock Only</Typography>}
        />

        <Typography variant="caption" sx={{ opacity: 0.5, ml: "auto" }}>
          {items.length} items
        </Typography>
      </Paper>

      {/* Items table */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid",
        borderColor: "grey.200", overflow: "hidden" }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "grey.50" }}>
              <TableCell sx={{ fontWeight: 800 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Category</TableCell>
              <TableCell sx={{ fontWeight: 800 }} align="right">Price</TableCell>
              <TableCell sx={{ fontWeight: 800 }} align="right">Cost</TableCell>
              <TableCell sx={{ fontWeight: 800 }} align="center">Stock</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Unit</TableCell>
              <TableCell sx={{ fontWeight: 800 }} align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ textAlign: "center", py: 6, opacity: 0.4 }}>
                  <InventoryIcon sx={{ fontSize: 40, mb: 1, display: "block", mx: "auto" }} />
                  No items found
                </TableCell>
              </TableRow>
            ) : items.map(item => {
              const lowStockAlert = item.track_stock &&
                Number(item.stock_qty) <= Number(item.stock_min);
              return (
                <TableRow key={item.id} hover sx={{ "&:last-child td": { border: 0 } }}>
                  <TableCell>
                    <Typography fontWeight={700} fontSize={13}>{item.name}</Typography>
                    {item.barcode && (
                      <Typography fontSize={10} sx={{ opacity: 0.45, fontFamily: "monospace" }}>
                        {item.barcode}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.category_name ? (
                      <Chip label={item.category_name} size="small"
                        sx={{ bgcolor: (item.category_color || "#1565c0") + "22",
                          color: item.category_color || "#1565c0",
                          fontWeight: 700, fontSize: 11, height: 20 }} />
                    ) : "—"}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, fontFamily: "monospace" }}>
                    ${fmt(item.price)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontFamily: "monospace", opacity: 0.6, fontSize: 12 }}>
                    ${fmt(item.cost)}
                  </TableCell>
                  <TableCell align="center">
                    {item.track_stock ? (
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5 }}>
                        <Chip
                          label={`${Number(item.stock_qty)}`}
                          size="small"
                          color={lowStockAlert ? "error" : Number(item.stock_qty) === 0 ? "default" : "success"}
                          sx={{ fontWeight: 800, minWidth: 36, height: 20,
                            "& .MuiChip-label": { px: 0.75 } }}
                        />
                        {lowStockAlert && (
                          <Typography fontSize={9} color="error.main" fontWeight={700}>LOW</Typography>
                        )}
                      </Box>
                    ) : (
                      <Typography fontSize={11} sx={{ opacity: 0.4 }}>—</Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12, opacity: 0.7 }}>{item.unit}</TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center" }}>
                      {item.track_stock && (
                        <IconButton size="small" color="primary"
                          onClick={() => openStock(item)} title="Adjust stock">
                          <InventoryIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      )}
                      <IconButton size="small" onClick={() => openEdit(item)}>
                        <EditIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(item)}>
                        <DeleteIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>

      {/* Archived items */}
      {showArchived && archived.length > 0 && (
        <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "warning.200",
          overflow: "hidden", mt: 2 }}>
          <Box sx={{ px: 2, py: 1.5, bgcolor: "warning.50", borderBottom: "1px solid", borderColor: "warning.200" }}>
            <Typography fontWeight={800} color="warning.dark">🗄 Archived Items</Typography>
            <Typography variant="caption" sx={{ opacity: 0.7 }}>
              These items are hidden from the terminal but their sales history is preserved
            </Typography>
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "warning.50" }}>
                <TableCell sx={{ fontWeight: 800 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 800 }} align="right">Price</TableCell>
                <TableCell sx={{ fontWeight: 800 }} align="center">Sales</TableCell>
                <TableCell sx={{ fontWeight: 800 }} align="center">Restore</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {archived.map(item => (
                <TableRow key={item.id} sx={{ opacity: 0.75, "&:last-child td": { border: 0 } }}>
                  <TableCell sx={{ fontWeight: 700, fontSize: 13 }}>{item.name}</TableCell>
                  <TableCell sx={{ fontSize: 12, opacity: 0.6 }}>{item.category_name || "—"}</TableCell>
                  <TableCell align="right" sx={{ fontFamily: "monospace", fontWeight: 700 }}>
                    ${(Number(item.price) || 0).toFixed(2)}
                  </TableCell>
                  <TableCell align="center">
                    <Chip label={`${item.sale_count} sales`} size="small"
                      color={item.sale_count > 0 ? "primary" : "default"}
                      sx={{ fontWeight: 700, fontSize: 11 }} />
                  </TableCell>
                  <TableCell align="center">
                    <Button size="small" variant="outlined" color="success"
                      onClick={() => handleRestore(item.id)} sx={{ fontWeight: 700, fontSize: 11 }}>
                      Restore
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Dialogs */}
      <ItemDialog open={itemDlg} item={editItem} categories={categories}
        onSave={() => { setItemDlg(false); load(); }}
        onClose={() => setItemDlg(false)} />

      <CategoryDialog open={catDlg} categories={categories}
        onSave={load} onClose={() => setCatDlg(false)} />

      <StockDialog open={stockDlg} item={stockItem}
        onSave={(newQty) => {
          setItems(prev => prev.map(it =>
            it.id === stockItem?.id ? { ...it, stock_qty: newQty } : it));
          setStockDlg(false);
        }}
        onClose={() => setStockDlg(false)} />
    </Box>
  );
}