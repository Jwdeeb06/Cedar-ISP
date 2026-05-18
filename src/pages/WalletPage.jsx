import { useEffect, useState } from "react";
import {
  Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, FormControl, IconButton,
  InputAdornment, InputLabel, MenuItem, Paper, Select, Stack,
  TextField, Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import CloseIcon from "@mui/icons-material/Close";
import dayjs from "dayjs";

const fmt = (n) =>
  Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── CreditDebitDialog ─────────────────────────────────────────────────────────
function TxDialog({ open, type, userId, onClose, onDone }) {
  const [amount, setAmount] = useState("");
  const [note,   setNote]   = useState("");
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState("");

  useEffect(() => { if (open) { setAmount(""); setNote(""); setErr(""); } }, [open]);

  const submit = async () => {
    const a = Number(amount);
    if (!a || a <= 0) return setErr("Enter a valid amount.");
    setSaving(true);
    const fn = type === "CREDIT" ? window.api.walletCredit : window.api.walletDebit;
    const res = await fn({ user_id: userId, amount: a, note });
    setSaving(false);
    if (res?.ok) { onDone(res.balance); onClose(); }
    else if (res?.reason === "INSUFFICIENT_BALANCE")
      setErr(`Insufficient balance. Current: $${fmt(res.balance)}`);
    else setErr("Operation failed.");
  };

  const isCredit = type === "CREDIT";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 0 }}>
        <Typography fontWeight={700} color={isCredit ? "success.main" : "error.main"}>
          {isCredit ? "Add Credit" : "Deduct Balance"}
        </Typography>
        <IconButton onClick={onClose} size="small"><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>
      <Divider sx={{ mt: 1.5 }} />
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          {err && (
            <Paper sx={{ p: 1.5, bgcolor: "error.light", borderRadius: 2 }}>
              <Typography variant="body2" color="error.dark">{err}</Typography>
            </Paper>
          )}
          <TextField
            label="Amount (USD)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            inputProps={{ min: 0, step: 0.5 }}
            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
            fullWidth
            autoFocus
          />
          <TextField label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} fullWidth />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" color="inherit">Cancel</Button>
        <Button
          onClick={submit}
          variant="contained"
          color={isCredit ? "success" : "error"}
          startIcon={isCredit ? <AddIcon /> : <RemoveIcon />}
          disabled={saving}
        >
          {saving ? "Saving…" : isCredit ? "Add" : "Deduct"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── main ──────────────────────────────────────────────────────────────────────
export default function WalletPage({ userId, userName }) {
  const [summary,   setSummary]   = useState(null);
  const [txList,    setTxList]    = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [dialog,    setDialog]    = useState(null); // "CREDIT" | "DEBIT" | null
  const [typeFilter, setTypeFilter] = useState("ALL");

  const load = async () => {
    if (!userId) return;
    setLoading(true);
    const [sum, list] = await Promise.all([
      window.api.walletSummary(userId),
      window.api.walletList({ user_id: userId, type: typeFilter === "ALL" ? "" : typeFilter, limit: 200 }),
    ]);
    setSummary(sum);
    setTxList(list || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [userId, typeFilter]);

  const balance = summary ? (summary.total_credited - summary.total_debited) : 0;
  const balanceColor = balance >= 0 ? "success.main" : "error.main";

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, flexWrap: "wrap", gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <AccountBalanceWalletIcon sx={{ opacity: 0.7 }} />
          <Box>
            <Typography variant="h6" fontWeight={800}>
              {userName ? `${userName} — Wallet` : "Wallet"}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.55 }}>
              Prepaid balance and transaction history
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            color="error"
            startIcon={<RemoveIcon />}
            size="small"
            onClick={() => setDialog("DEBIT")}
          >
            Deduct
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<AddIcon />}
            size="small"
            onClick={() => setDialog("CREDIT")}
          >
            Add Credit
          </Button>
        </Box>
      </Box>

      {/* Balance cards */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 1.5, mb: 2 }}>
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "2px solid", borderColor: "grey.200" }}>
          <Typography variant="caption" sx={{ opacity: 0.6 }}>Balance</Typography>
          <Typography variant="h4" fontWeight={900} color={balanceColor}>
            ${fmt(balance)}
          </Typography>
        </Paper>
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid", borderColor: "grey.200" }}>
          <Typography variant="caption" sx={{ opacity: 0.6 }}>Total Credited</Typography>
          <Typography variant="h5" fontWeight={700} color="success.main">
            ${fmt(summary?.total_credited)}
          </Typography>
        </Paper>
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid", borderColor: "grey.200" }}>
          <Typography variant="caption" sx={{ opacity: 0.6 }}>Total Debited</Typography>
          <Typography variant="h5" fontWeight={700} color="error.main">
            ${fmt(summary?.total_debited)}
          </Typography>
        </Paper>
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid", borderColor: "grey.200" }}>
          <Typography variant="caption" sx={{ opacity: 0.6 }}>Transactions</Typography>
          <Typography variant="h5" fontWeight={700}>{summary?.tx_count ?? 0}</Typography>
        </Paper>
      </Box>

      {/* Transaction list */}
      <Paper elevation={0} sx={{ border: "1px solid", borderColor: "grey.200", borderRadius: 3, overflow: "hidden" }}>
        {/* List header with filter */}
        <Box sx={{ px: 2, py: 1.5, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid", borderColor: "grey.100" }}>
          <Typography variant="subtitle2" fontWeight={700}>Transaction History</Typography>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} displayEmpty>
              <MenuItem value="ALL">All</MenuItem>
              <MenuItem value="CREDIT">Credits</MenuItem>
              <MenuItem value="DEBIT">Debits</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : txList.length === 0 ? (
          <Box sx={{ py: 5, textAlign: "center", opacity: 0.45 }}>
            <Typography variant="body2">No transactions yet.</Typography>
          </Box>
        ) : (
          <Box>
            {txList.map((tx, i) => {
              const isCredit = tx.type === "CREDIT";
              return (
                <Box key={tx.id} sx={{
                  display: "flex",
                  alignItems: "center",
                  px: 2,
                  py: 1.25,
                  borderBottom: i < txList.length - 1 ? "1px solid" : "none",
                  borderColor: "grey.100",
                  "&:hover": { bgcolor: "grey.50" },
                }}>
                  {/* Type badge */}
                  <Box sx={{
                    width: 32, height: 32, borderRadius: "50%", display: "flex",
                    alignItems: "center", justifyContent: "center", mr: 1.5, flexShrink: 0,
                    bgcolor: isCredit ? "success.light" : "error.light",
                    color:   isCredit ? "success.dark"  : "error.dark",
                  }}>
                    {isCredit ? <AddIcon fontSize="small" /> : <RemoveIcon fontSize="small" />}
                  </Box>

                  {/* Info */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {tx.note || (tx.ref_type && tx.ref_type !== "MANUAL" ? `${tx.ref_type} #${tx.ref_id}` : tx.ref_type === "MANUAL" ? "Manual adjustment" : tx.type)}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.55 }}>
                      {dayjs(tx.created_at).format("DD MMM YYYY HH:mm")}
                    </Typography>
                  </Box>

                  {/* Amount */}
                  <Typography fontWeight={800} color={isCredit ? "success.main" : "error.main"} sx={{ ml: 2 }}>
                    {isCredit ? "+" : "−"}${fmt(tx.amount)}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        )}
      </Paper>

      <TxDialog
        open={!!dialog}
        type={dialog}
        userId={userId}
        onClose={() => setDialog(null)}
        onDone={() => load()}
      />
    </Box>
  );
}