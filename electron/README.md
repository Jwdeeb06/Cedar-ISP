# Cedar ISP — POS Enhanced

## Files in this folder

### Backend (electron/)
| File | Destination |
|------|-------------|
| `electron/database/schema.js` | `electron/database/schema.js` |
| `electron/ipc/pos_handlers.js` | `electron/ipc/pos_handlers.js` |
| `electron/ipc/index.js` | `electron/ipc/index.js` |
| `preload.js` | `electron/preload.js` |

### Frontend (src/)
| File | Destination |
|------|-------------|
| `src/App.js` | `src/App.js` |
| `src/pages/Pos/PosPage.jsx` | `src/pages/Pos/PosPage.jsx` |
| `src/pages/Pos/PosItemsPage.jsx` | `src/pages/Pos/PosItemsPage.jsx` |
| `src/pages/Pos/PosSalesPage.jsx` | `src/pages/Pos/PosSalesPage.jsx` |
| `src/pages/Pos/PosDrawerPage.jsx` | `src/pages/Pos/PosDrawerPage.jsx` |
| `src/pages/Pos/PosDashboardPage.jsx` | NEW → `src/pages/Pos/PosDashboardPage.jsx` |
| `src/pages/Pos/PosCustomersPage.jsx` | NEW → `src/pages/Pos/PosCustomersPage.jsx` |
| `src/pages/Pos/PosShiftsPage.jsx` | NEW → `src/pages/Pos/PosShiftsPage.jsx` |
| `src/pages/Pos/PosVouchersPage.jsx` | NEW → `src/pages/Pos/PosVouchersPage.jsx` |

## New Features

### Terminal (PosPage)
- **Hold & recall orders** — pause button parks cart, badge shows count
- **Barcode scanner** — plug in USB scanner, items auto-add
- **Customer accounts** — link sales to repeat customers
- **Per-line discounts** — discount individual items in cart
- **Quick discount presets** — 5%, 10%, 15%, 20% chips
- **Flat or % discount** — toggle between flat $ and percentage
- **Voucher redemption** — enter code at checkout, balance applied
- **WhatsApp receipt** — one-tap send to customer after sale
- **Split payment** — USD + L.L simultaneously

### Inventory (PosItemsPage)
- **Barcode search** — search by barcode field
- **Low stock count** — badge showing items below minimum
- **Stock movement log** — every sale/refund/adjustment logged

### New Pages
- **Dashboard** — revenue, profit, top items, sales heatmap
- **Customers** — customer list, add/edit, purchase history
- **Shifts** — open/close shifts with cash reconciliation
- **Vouchers** — create, print, track gift vouchers

### Database (schema.js)
New tables: `pos_customers`, `pos_held_carts`, `pos_stock_movements`, `pos_shifts`, `pos_vouchers`

## Routes added to App.js
- `/pos/dashboard` — PosDashboardPage
- `/pos/customers` — PosCustomersPage
- `/pos/shifts` — PosShiftsPage
- `/pos/vouchers` — PosVouchersPage

## Add to Sidebar
Add these navigation items to your Sidebar.jsx under Point of Sale:
```
{ label: "Dashboard", path: "pos/dashboard", icon: <DashboardIcon /> }
{ label: "Customers",  path: "pos/customers",  icon: <PeopleIcon /> }
{ label: "Shifts",     path: "pos/shifts",     icon: <ScheduleIcon /> }
{ label: "Vouchers",   path: "pos/vouchers",   icon: <CardGiftcardIcon /> }
```
