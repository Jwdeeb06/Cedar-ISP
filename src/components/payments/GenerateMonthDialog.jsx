import { Button, Dialog, DialogActions, DialogContent, Typography } from "@mui/material";
import dayjs from "dayjs";
import { useState } from "react";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { paymentsApi } from "../../services/paymentsApi";

export default function GenerateMonthDialog({ open, onOpen, onClose, onGenerated }) {
  const [genMonth, setGenMonth] = useState(dayjs());
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!genMonth) return;

    const m = genMonth.format("YYYY-MM");
    setLoading(true);
    try {
      const res = await paymentsApi.generateMonth({ month: m });
      onGenerated?.(
        `Generated ${res.inserted} invoice(s) for ${m}. ` +
        `Users with sufficient balance were auto-paid and expiry extended.`
      );
      onClose?.();
    } catch (e) {
      onGenerated?.("Generation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} disableRestoreFocus keepMounted>
        <DialogContent
          sx={{
            pt: 2,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            minWidth: 360,
          }}
        >
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Month"
              views={["year", "month"]}
              openTo="month"
              value={genMonth}
              onChange={(v) => setGenMonth(v)}
              slotProps={{
                textField: {
                  sx: { mt: 2 },
                  fullWidth: true,
                },
              }}
            />
          </LocalizationProvider>

          <Typography variant="body2" sx={{ opacity: 0.85 }}>
            This will:
          </Typography>

          <Typography variant="body2" sx={{ opacity: 0.75 }}>
            • Create invoices for all <b>unblocked users</b> who don’t already have one for this month.<br />
            • Automatically mark invoices as <b>PAID</b> if the user’s balance covers the price.<br />
            • Extend the user’s <b>expiry date by 1 month</b> for each paid invoice.
          </Typography>

          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            Blocked users and users expiring in other months are ignored.
          </Typography>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={generate}
            disabled={loading}
          >
            {loading ? "Generating..." : "Generate"}
          </Button>
        </DialogActions>
      </Dialog>
  );
}