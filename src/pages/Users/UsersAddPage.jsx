// import { useEffect, useMemo, useState } from "react";
// import {
//   Box,
//   Button,
//   Divider,
//   IconButton,
//   Paper,
//   Stack,
//   TextField,
//   Typography,
//   FormControlLabel,
//   Checkbox,
// } from "@mui/material";

// import { usersApi } from "../../services/usersApi";
// import ServiceSelect from "../../components/ServiceSelect";
// import AddressSelect from "../../components/AddressSelect";

// export default function UsersAdd() {
//   const [name, setName] = useState("");
//   const [mobile, setMobile] = useState(""); // ✅ phone -> mobile
//   const [address, setAddress] = useState("");

//   const [service, setService] = useState(""); // ✅ package -> service
//   const [price, setPrice] = useState("");     // stored as number
//   const [balance, setBalance] = useState(""); // optional
//   const [expiryDate, setExpiryDate] = useState(""); // 'YYYY-MM-DD'
//   const [blocked, setBlocked] = useState(false);

//   const [msg, setMsg] = useState("");

//   // ✅ refresh addresses after add user / add address / delete address
//   const [addressRefreshKey, setAddressRefreshKey] = useState(0);

//   // refresh services list when needed (after adding user)
//   const [serviceRefreshKey, setServiceRefreshKey] = useState(0);

//   useEffect(() => {
//     if (!msg) return;
//     const t = setTimeout(() => setMsg(""), 8000);
//     return () => clearTimeout(t);
//   }, [msg]);

//   const canSubmit = useMemo(() => name.trim().length > 0, [name]);

//   const clear = () => {
//     setName("");
//     setMobile("");
//     setAddress("");
//     setService("");
//     setPrice("");
//     setBalance("");
//     setExpiryDate("");
//     setBlocked(false);
//   };

//   const addUser = async () => {
//     await usersApi.addUser({
//       name: name.trim(),
//       mobile: mobile.trim(),
//       address,

//       service: service || null,
//       price: price === "" ? 0 : Number(price),
//       balance: balance === "" ? 0 : Number(balance),
//       expiry_date: expiryDate ? expiryDate : null,
//       blocked: blocked ? 1 : 0,
//     });

//     clear();

//     // ✅ important: force refresh for next user
//     setAddressRefreshKey((k) => k + 1);
//     setServiceRefreshKey((k) => k + 1);

//     setMsg("User added ✅");
//   };

//   return (
//     <Box sx={{ minHeight: "calc(100vh - 64px)" }}>
//       <Paper
//         sx={{
//           height: "100%",
//           p: 3,
//           borderRadius: 3,
//           maxWidth: 1100,
//           mx: "auto",
//         }}
//       >
//         <Box
//           sx={{
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "space-between",
//             gap: 2,
//             mb: 2,
//             flexWrap: "wrap",
//           }}
//         >
//           <Box>
//             <Typography variant="h5" sx={{ fontWeight: 900 }}>
//               Add User
//             </Typography>
//             <Typography variant="body2" sx={{ opacity: 0.75 }}>
//               Fill the details and press Add.
//             </Typography>
//           </Box>

//           {msg ? (
//             <Paper
//               sx={{
//                 px: 1.5,
//                 py: 1,
//                 bgcolor: "info.light",
//                 display: "flex",
//                 alignItems: "center",
//                 gap: 1,
//                 borderRadius: 2,
//               }}
//             >
//               <Typography variant="body2">{msg}</Typography>
//               <IconButton size="small" onClick={() => setMsg("")}>
//                 ✕
//               </IconButton>
//             </Paper>
//           ) : null}
//         </Box>

//         <Divider sx={{ mb: 3 }} />

//         <Stack spacing={2} sx={{ maxWidth: 700 }}>
//           <TextField
//             label="Name *"
//             value={name}
//             onChange={(e) => setName(e.target.value)}
//             fullWidth
//           />

//           <TextField
//             label="Mobile"
//             value={mobile}
//             onChange={(e) => setMobile(e.target.value)}
//             fullWidth
//           />

//           <Box>
//             <Typography variant="caption" sx={{ fontWeight: 700, opacity: 0.7 }}>
//               Address
//             </Typography>
//             <Box sx={{ mt: 0.75 }}>
//               <AddressSelect
//                 value={address}
//                 onChange={setAddress}
//                 refreshKey={addressRefreshKey}
//                 onRefresh={() => setAddressRefreshKey((k) => k + 1)}
//               />
//             </Box>
//           </Box>

//           <Box>
//             <Typography variant="caption" sx={{ fontWeight: 700, opacity: 0.7 }}>
//               Service
//             </Typography>
//             <Box sx={{ mt: 0.75 }}>
//               <ServiceSelect
//                 value={service}
//                 onChange={setService}
//                 refreshKey={serviceRefreshKey}
//               />
//             </Box>
//           </Box>

//           <TextField
//             label="Price"
//             value={price}
//             onChange={(e) => setPrice(e.target.value)}
//             fullWidth
//             placeholder="0"
//           />

//           <TextField
//             label="Balance"
//             value={balance}
//             onChange={(e) => setBalance(e.target.value)}
//             fullWidth
//             placeholder="0"
//           />

//           <TextField
//             label="Expiry Date (YYYY-MM-DD)"
//             value={expiryDate}
//             onChange={(e) => setExpiryDate(e.target.value)}
//             fullWidth
//             placeholder="2026-02-01"
//           />

//           <FormControlLabel
//             control={
//               <Checkbox
//                 checked={blocked}
//                 onChange={(e) => setBlocked(e.target.checked)}
//               />
//             }
//             label="Blocked"
//           />

//           <Box sx={{ display: "flex", gap: 1.5, pt: 1 }}>
//             <Button variant="outlined" onClick={clear}>
//               Clear
//             </Button>
//             <Button variant="contained" onClick={addUser} disabled={!canSubmit}>
//               Add User
//             </Button>
//           </Box>
//         </Stack>
//       </Paper>
//     </Box>
//   );
// }
// src/pages/Users/UsersAddPage.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Box, Button, Checkbox, Divider, FormControlLabel,
  IconButton, Paper, Stack, TextField, Typography,
} from "@mui/material";
import { usersApi }     from "../../services/usersApi";
import ServiceSelect    from "../../components/ServiceSelect";
import AddressSelect    from "../../components/AddressSelect";
import LocationPicker   from "../../components/LocationPicker";

export default function UsersAddPage() {
  const [name,       setName]       = useState("");
  const [mobile,     setMobile]     = useState("");
  const [address,    setAddress]    = useState("");
  const [service,    setService]    = useState("");
  const [price,      setPrice]      = useState("");
  const [balance,    setBalance]    = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [blocked,    setBlocked]    = useState(false);
  const [lat,        setLat]        = useState(null);
  const [lng,        setLng]        = useState(null);
  const [msg,        setMsg]        = useState("");

  const [addressRefreshKey, setAddressRefreshKey] = useState(0);
  const [serviceRefreshKey, setServiceRefreshKey] = useState(0);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(""), 8000);
    return () => clearTimeout(t);
  }, [msg]);

  const canSubmit = useMemo(() => name.trim().length > 0, [name]);

  const clear = () => {
    setName(""); setMobile(""); setAddress(""); setService("");
    setPrice(""); setBalance(""); setExpiryDate(""); setBlocked(false);
    setLat(null); setLng(null);
  };

  const addUser = async () => {
    await usersApi.addUser({
      name:        name.trim(),
      mobile:      mobile.trim(),
      address,
      service:     service || null,
      price:       price   === "" ? 0 : Number(price),
      balance:     balance === "" ? 0 : Number(balance),
      expiry_date: expiryDate || null,
      blocked:     blocked ? 1 : 0,
      lat:         lat  ?? null,
      lng:         lng  ?? null,
    });

    clear();
    setAddressRefreshKey((k) => k + 1);
    setServiceRefreshKey((k) => k + 1);
    setMsg("User added ✅");
  };

  return (
    <Box sx={{ minHeight: "calc(100vh - 64px)" }}>
      <Paper sx={{ p: 3, borderRadius: 3, maxWidth: 1100, mx: "auto" }}>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, mb: 2, flexWrap: "wrap" }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>Add User</Typography>
            <Typography variant="body2" sx={{ opacity: 0.75 }}>Fill the details and press Add.</Typography>
          </Box>
          {msg && (
            <Paper sx={{ px: 1.5, py: 1, bgcolor: "info.light", display: "flex", alignItems: "center", gap: 1, borderRadius: 2 }}>
              <Typography variant="body2">{msg}</Typography>
              <IconButton size="small" onClick={() => setMsg("")}>✕</IconButton>
            </Paper>
          )}
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Two-column layout: form left, map right */}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
          {/* Left: form fields */}
          <Stack spacing={2}>
            <TextField label="Name *" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
            <TextField label="Mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} fullWidth />

            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, opacity: 0.7 }}>Address</Typography>
              <Box sx={{ mt: 0.75 }}>
                <AddressSelect value={address} onChange={setAddress} refreshKey={addressRefreshKey} onRefresh={() => setAddressRefreshKey((k) => k + 1)} />
              </Box>
            </Box>

            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, opacity: 0.7 }}>Service</Typography>
              <Box sx={{ mt: 0.75 }}>
                <ServiceSelect value={service} onChange={setService} refreshKey={serviceRefreshKey} />
              </Box>
            </Box>

            <TextField label="Price" value={price} onChange={(e) => setPrice(e.target.value)} fullWidth placeholder="0" />
            <TextField label="Balance" value={balance} onChange={(e) => setBalance(e.target.value)} fullWidth placeholder="0" />
            <TextField label="Expiry Date" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />

            <FormControlLabel
              control={<Checkbox checked={blocked} onChange={(e) => setBlocked(e.target.checked)} />}
              label="Blocked"
            />

            <Box sx={{ display: "flex", gap: 1.5, pt: 1 }}>
              <Button variant="outlined" onClick={clear}>Clear</Button>
              <Button variant="contained" onClick={addUser} disabled={!canSubmit}>Add User</Button>
            </Box>
          </Stack>

          {/* Right: location picker */}
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, opacity: 0.7, display: "block", mb: 0.75 }}>
              Customer Location (optional)
            </Typography>
            <LocationPicker
              lat={lat}
              lng={lng}
              onChange={(la, ln) => { setLat(la); setLng(ln); }}
              height={420}
            />
            {(lat != null) && (
              <Button
                size="small"
                variant="text"
                color="error"
                sx={{ mt: 0.5 }}
                onClick={() => { setLat(null); setLng(null); }}
              >
                Clear location
              </Button>
            )}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}