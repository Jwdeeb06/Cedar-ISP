// src/utils/InvoicePrintUtil.js
// Prints a single invoice receipt via hidden iframe (works in Electron)
// Supports: 80mm (thermal), A5, A4

import dayjs from "dayjs";

function fmt(n) {
  return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Build WhatsApp message text for a single invoice ─────────────────────────
export function buildWhatsAppMessage({ invoice, settings }) {
  const ispName  = settings?.isp_name  || "ISP";
  const ispPhone = settings?.isp_phone || "";
  const type     = Number(invoice.affects_expiry) === 0 ? "Static" : "Subscription";
  const paidAt   = invoice.paid_at ? dayjs(invoice.paid_at).format("DD/MM/YYYY HH:mm") : null;

  const lines = [
    `*${ispName}*${ispPhone ? `\n${ispPhone}` : ""}`,
    ``,
    `*Payment Receipt*`,
    ``,
    `*Customer:* ${invoice.user_name || "—"}`,
    `*Invoice:* ${invoice.invoice_number}`,
    `*Month:* ${invoice.month}`,
    `*Type:* ${type}`,
    `*Amount:* $${fmt(invoice.amount)}`,
    `*Status:* ${invoice.status}`,
    paidAt ? `*Paid At:* ${paidAt}` : null,
    ``,
    `Thank you for your payment.`,
  ].filter((l) => l !== null).join("\n");

  return lines;
}

// ── Open WhatsApp with the invoice message ─────────────────────────────────────
export function sendWhatsApp({ phone, message }) {
  // Clean phone: remove spaces, dashes, parens — keep + and digits
  const cleaned = phone.replace(/[^\d+]/g, "");
  const encoded = encodeURIComponent(message);
  const url = `https://wa.me/${cleaned}?text=${encoded}`;
  window.open(url, "_blank");
}

// ── Build HTML for a single invoice receipt ───────────────────────────────────
export function buildReceiptHTML({ invoice, settings, size = "A4" }) {
  const is80 = size === "80mm";
  const isA5 = size === "A5";

  const ispName    = settings?.isp_name    || "ISP Company";
  const ispPhone   = settings?.isp_phone   || "";
  const ispAddress = settings?.isp_address || "";

  const now     = dayjs().format("DD/MM/YYYY HH:mm");
  const paidAt  = invoice.paid_at ? dayjs(invoice.paid_at).format("DD/MM/YYYY HH:mm") : null;
  const type    = Number(invoice.affects_expiry) === 0 ? "STATIC" : "SUBSCRIPTION";
  const isPaid  = invoice.status === "PAID";

  // page config
  const pageSize   = is80 ? "80mm auto"   : isA5 ? "A5 portrait"   : "A4 portrait";
  const margin     = is80 ? "0mm 4mm"     : isA5 ? "10mm"          : "14mm";
  const bodySize   = is80 ? "9pt"         : isA5 ? "10pt"          : "11pt";
  const titleSize  = is80 ? "13pt"        : isA5 ? "16pt"          : "20pt";
  const width      = is80 ? "72mm"        : "100%";
  const amtSize    = is80 ? "18pt"        : isA5 ? "22pt"          : "28pt";

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Receipt — ${invoice.invoice_number}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    @page {
      size: ${pageSize};
      margin: ${margin};
    }

    body {
      font-family: Arial, sans-serif;
      font-size: ${bodySize};
      color: #111;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      ${is80 ? "max-width: 72mm;" : ""}
    }

    .wrap {
      width: ${width};
      margin: 0 auto;
      padding: ${is80 ? "4mm" : "0"};
      page-break-inside: avoid;
      break-inside: avoid;
      page-break-after: avoid;
      break-after: avoid;
    }

    .wrap > * {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* ISP Header */
    .header {
      text-align: ${is80 ? "center" : "left"};
      border-bottom: 2px solid #111;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .isp-name { font-size: ${titleSize}; font-weight: 900; letter-spacing: -0.5px; }
    .isp-meta { font-size: 8pt; color: #555; margin-top: 3px; line-height: 1.5; }

    /* Receipt title */
    .receipt-title {
      text-align: center;
      font-size: ${is80 ? "10pt" : "13pt"};
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 10px;
      padding: 6px 0;
      border-bottom: 1px dashed #999;
    }

    /* Invoice rows */
    .row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding: ${is80 ? "3px 0" : "5px 0"};
      border-bottom: 1px solid #f0f0f0;
      font-size: ${bodySize};
    }
    .row:last-child { border-bottom: none; }
    .row-label { opacity: 0.65; font-weight: 600; }
    .row-value { font-weight: 700; text-align: right; }

    /* Amount box */
    .amount-box {
      margin: 12px 0;
      padding: ${is80 ? "8px" : "12px"};
      border: 2px solid ${isPaid ? "#2e7d32" : "#c62828"};
      border-radius: 6px;
      background: ${isPaid ? "#f1f8f2" : "#fdf3f3"};
      text-align: center;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .amount-label {
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      opacity: 0.6;
      letter-spacing: 0.5px;
    }
    .amount-value {
      font-size: ${amtSize};
      font-weight: 900;
      color: ${isPaid ? "#2e7d32" : "#c62828"};
      font-family: 'Courier New', monospace;
      margin-top: 2px;
    }
    .status-badge {
      display: inline-block;
      margin-top: 4px;
      padding: 2px 10px;
      border-radius: 20px;
      font-size: 8pt;
      font-weight: 800;
      background: ${isPaid ? "#2e7d32" : "#c62828"};
      color: #fff;
      letter-spacing: 0.5px;
    }

    /* Divider */
    .dashed { border: none; border-top: 1px dashed #bbb; margin: 10px 0; }

    /* Footer */
    .footer {
      margin-top: 12px;
      padding-top: 8px;
      border-top: 1px dashed #999;
      text-align: center;
      font-size: 8pt;
      color: #666;
      line-height: 1.8;
    }
  </style>
</head>
<body>
<div class="wrap">

  <!-- ISP Header -->
  <div class="header">
    <div class="isp-name">${ispName}</div>
    <div class="isp-meta">
      ${ispPhone   ? `📞 ${ispPhone}` : ""}
      ${ispAddress ? `<br/>${ispAddress}` : ""}
    </div>
  </div>

  <!-- Receipt Title -->
  <div class="receipt-title">Payment Receipt</div>

  <!-- Invoice Details -->
  <div class="row">
    <span class="row-label">Invoice #</span>
    <span class="row-value" style="font-family:monospace; font-size:8pt;">${invoice.invoice_number}</span>
  </div>
  <div class="row">
    <span class="row-label">Customer</span>
    <span class="row-value">${invoice.user_name || "—"}</span>
  </div>
  ${invoice.user_mobile ? `
  <div class="row">
    <span class="row-label">Mobile</span>
    <span class="row-value">${invoice.user_mobile}</span>
  </div>` : ""}
  ${invoice.user_service || invoice.service_name ? `
  <div class="row">
    <span class="row-label">Service</span>
    <span class="row-value">${invoice.user_service || invoice.service_name}</span>
  </div>` : ""}
  <div class="row">
    <span class="row-label">Month</span>
    <span class="row-value">${invoice.month}</span>
  </div>
  <div class="row">
    <span class="row-label">Type</span>
    <span class="row-value">${type}</span>
  </div>
  ${paidAt ? `
  <div class="row">
    <span class="row-label">Paid At</span>
    <span class="row-value">${paidAt}</span>
  </div>` : ""}
  <div class="row">
    <span class="row-label">Printed</span>
    <span class="row-value">${now}</span>
  </div>

  <hr class="dashed"/>

  <!-- Amount -->
  <div class="amount-box">
    <div class="amount-label">Amount</div>
    <div class="amount-value">$${fmt(invoice.amount)}</div>
    <div><span class="status-badge">${invoice.status}</span></div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div>Thank you for your payment</div>
    <div>${ispName}${ispPhone ? " · " + ispPhone : ""}</div>
  </div>

</div>
</body>
</html>`;
}

// ── Print via Electron IPC (full preview, multi-page safe) ───────────────────
export function printReceipt({ invoice, settings, size = "A4" }) {
  const html = buildReceiptHTML({ invoice, settings, size });
  window.api.printHtml({ html, title: `Receipt — ${invoice.invoice_number}` });
}