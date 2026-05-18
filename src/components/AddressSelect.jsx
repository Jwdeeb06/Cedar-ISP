import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  IconButton,
  ListItemText,
  Menu,
  MenuItem,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  Typography,
  Paper,
  InputAdornment,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ConfirmDialog from "./ConfirmDialog";
import { usersApi } from "../services/usersApi";

/**
 * Props:
 * value: string
 * onChange: (v: string) => void
 * refreshKey?: number
 * onRefresh?: () => void   // optional (when add/delete)
 */
export default function AddressSelect({ value, onChange, refreshKey = 0, onRefresh }) {
  const [addresses, setAddresses] = useState([]);

  // menu
  const anchorRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // add dialog
  const [openAdd, setOpenAdd] = useState(false);
  const [newAddress, setNewAddress] = useState("");

  // message
  const [msg, setMsg] = useState("");

  // delete confirm
  const [delConfirmOpen, setDelConfirmOpen] = useState(false);
  const [addrToDelete, setAddrToDelete] = useState(null);

  const loadAddresses = async () => {
    const data = await usersApi.listAddresses();
    setAddresses(data || []);
  };

  useEffect(() => {
    loadAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const items = useMemo(() => addresses || [], [addresses]);

  const openMenu = async () => {
    await loadAddresses(); // ✅ always fresh
    setMenuOpen(true);
  };
  const closeMenu = () => setMenuOpen(false);

  const addAddress = async () => {
    const a = String(newAddress || "").trim();
    if (!a) return;

    const res = await usersApi.addAddress(a);

    if (res?.ok) {
      setMsg("Address added.");
      setNewAddress("");
      setOpenAdd(false);

      await loadAddresses();
      onChange(a);      // auto select
      onRefresh?.();    // optional: parent refresh
      return;
    }

    setMsg("Add failed.");
  };

  const requestDelete = (addr) => {
    setAddrToDelete(addr);
    setDelConfirmOpen(true);
  };

  const confirmDelete = async () => {
    const addr = addrToDelete;
    setDelConfirmOpen(false);
    setAddrToDelete(null);
    if (!addr) return;

    const res = await usersApi.deleteAddress(addr);

    if (res?.deleted === 1) {
      if (value === addr) onChange("");
      setMsg("Address deleted.");
      await loadAddresses();
      onRefresh?.();
      return;
    }

    if (res?.reason === "IN_USE") {
      setMsg(`Cannot delete. ${res.count} user(s) use this address.`);
      return;
    }

    setMsg("Delete failed.");
  };

  return (
    <Box>
      {/* Trigger (looks like Select) */}
      <Box ref={anchorRef}>
        <TextField
          fullWidth
          value={value ?? ""} // ✅ always controlled
          placeholder="Select address..."
          onClick={openMenu}
          InputProps={{
            readOnly: true,
            endAdornment: (
              <InputAdornment position="end">
                <ArrowDropDownIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Menu */}
      <Menu
        anchorEl={anchorRef.current}
        open={menuOpen}
        onClose={closeMenu}
        disableAutoFocusItem
        keepMounted
        PaperProps={{ sx: { width: anchorRef.current?.clientWidth || 320 } }}
      >
        {/* Add address */}
        <MenuItem
          onClick={() => {
            closeMenu();
            setTimeout(() => setOpenAdd(true), 0);
          }}
        >
          <AddIcon fontSize="small" style={{ marginRight: 8 }} />
          <strong>Add address</strong>
        </MenuItem>

        <Divider />

        {items.map((a) => (
          <MenuItem
            key={a}
            onClick={() => {
              onChange(a);
              closeMenu();
            }}
            sx={{ display: "flex", gap: 1 }}
          >
            <ListItemText primary={a} />

            <IconButton
              edge="end"
              size="small"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();

                closeMenu(); // ✅ CLOSE MENU instantly
                setTimeout(() => requestDelete(a), 0);
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </MenuItem>
        ))}
      </Menu>

      {/* message */}
      {msg && (
        <Paper
          sx={{
            mt: 1,
            p: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="body2">{msg}</Typography>
          <IconButton size="small" onClick={() => setMsg("")}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Paper>
      )}

      {/* Add dialog */}
      <Dialog
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        fullWidth
        maxWidth="sm"
        disableRestoreFocus
      >
        <DialogTitle>Add Address</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <TextField
            label="Address"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAdd(false)}>Cancel</Button>
          <Button variant="contained" onClick={addAddress} disabled={!newAddress.trim()}>
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm */}
      <ConfirmDialog
        open={delConfirmOpen}
        title="Delete address"
        message={addrToDelete ? `Delete address "${addrToDelete}"?` : "Delete this address?"}
        confirmText="Delete"
        cancelText="Cancel"
        onCancel={() => {
          setDelConfirmOpen(false);
          setAddrToDelete(null);
        }}
        onConfirm={confirmDelete}
      />
    </Box>
  );
}
