// src/utils/InvoicePrintUtil.js
import dayjs from "dayjs";

function fmt(n) {
  return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtLL(n) {
  return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

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

export function sendWhatsApp({ phone, message }) {
  const cleaned = phone.replace(/[^\d+]/g, "");
  const encoded = encodeURIComponent(message);
  const url = `https://wa.me/${cleaned}?text=${encoded}`;
  window.open(url, "_blank");
}

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
    @page { size: ${pageSize}; margin: ${margin}; }
    body { font-family: Arial, sans-serif; font-size: ${bodySize}; color: #111; background: #fff;
      -webkit-print-color-adjust: exact; print-color-adjust: exact; ${is80 ? "max-width: 72mm;" : ""} }
    .wrap { width: ${width}; margin: 0 auto; padding: ${is80 ? "4mm" : "0"}; page-break-inside: avoid; }
    .header { text-align: ${is80 ? "center" : "left"}; border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 10px; }
    .isp-name { font-size: ${titleSize}; font-weight: 900; letter-spacing: -0.5px; }
    .isp-meta { font-size: 8pt; color: #555; margin-top: 3px; line-height: 1.5; }
    .receipt-title { text-align: center; font-size: ${is80 ? "10pt" : "13pt"}; font-weight: 700;
      letter-spacing: 1px; text-transform: uppercase; margin-bottom: 10px; padding: 6px 0; border-bottom: 1px dashed #999; }
    .row { display: flex; justify-content: space-between; align-items: baseline;
      padding: ${is80 ? "3px 0" : "5px 0"}; border-bottom: 1px solid #f0f0f0; font-size: ${bodySize}; }
    .row:last-child { border-bottom: none; }
    .row-label { opacity: 0.65; font-weight: 600; }
    .row-value { font-weight: 700; text-align: right; }
    .amount-box { margin: 12px 0; padding: ${is80 ? "8px" : "12px"};
      border: 2px solid ${isPaid ? "#2e7d32" : "#c62828"}; border-radius: 6px;
      background: ${isPaid ? "#f1f8f2" : "#fdf3f3"}; text-align: center; }
    .amount-label { font-size: 8pt; font-weight: 700; text-transform: uppercase; opacity: 0.6; letter-spacing: 0.5px; }
    .amount-value { font-size: ${amtSize}; font-weight: 900; color: ${isPaid ? "#2e7d32" : "#c62828"};
      font-family: 'Courier New', monospace; margin-top: 2px; }
    .status-badge { display: inline-block; margin-top: 4px; padding: 2px 10px; border-radius: 20px;
      font-size: 8pt; font-weight: 800; background: ${isPaid ? "#2e7d32" : "#c62828"}; color: #fff; letter-spacing: 0.5px; }
    .dashed { border: none; border-top: 1px dashed #bbb; margin: 10px 0; }
    .footer { margin-top: 12px; padding-top: 8px; border-top: 1px dashed #999;
      text-align: center; font-size: 8pt; color: #666; line-height: 1.8; }
  </style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <div class="isp-name">${ispName}</div>
    <div class="isp-meta">
      ${ispPhone   ? `📞 ${ispPhone}` : ""}
      ${ispAddress ? `<br/>${ispAddress}` : ""}
    </div>
  </div>
  <div class="receipt-title">Payment Receipt</div>
  <div class="row"><span class="row-label">Invoice #</span><span class="row-value" style="font-family:monospace;font-size:8pt;">${invoice.invoice_number}</span></div>
  <div class="row"><span class="row-label">Customer</span><span class="row-value">${invoice.user_name || "—"}</span></div>
  ${invoice.user_mobile ? `<div class="row"><span class="row-label">Mobile</span><span class="row-value">${invoice.user_mobile}</span></div>` : ""}
  ${invoice.user_service || invoice.service_name ? `<div class="row"><span class="row-label">Service</span><span class="row-value">${invoice.user_service || invoice.service_name}</span></div>` : ""}
  <div class="row"><span class="row-label">Month</span><span class="row-value">${invoice.month}</span></div>
  <div class="row"><span class="row-label">Type</span><span class="row-value">${type}</span></div>
  ${paidAt ? `<div class="row"><span class="row-label">Paid At</span><span class="row-value">${paidAt}</span></div>` : ""}
  <div class="row"><span class="row-label">Printed</span><span class="row-value">${now}</span></div>
  <hr class="dashed"/>
  <div class="amount-box">
    <div class="amount-label">Amount</div>
    <div class="amount-value">$${fmt(invoice.amount)}</div>
    <div><span class="status-badge">${invoice.status}</span></div>
  </div>
  <div class="footer">
    <div>Thank you for your payment</div>
    <div>${ispName}${ispPhone ? " · " + ispPhone : ""}</div>
  </div>
</div>
</body>
</html>`;
}

export function printReceipt({ invoice, settings, size = "A4" }) {
  const html = buildReceiptHTML({ invoice, settings, size });
  window.api.printHtml({ html, title: `Receipt — ${invoice.invoice_number}` });
}

// ── Build full report HTML ─────────────────────────────────────────────────────
export function buildReportHTML({ rows, title, subtitle, settings, drawerSummary }) {
  const isp = settings || {};
  const now = dayjs().format("DD/MM/YYYY HH:mm");
  const paid    = rows.filter(r => r.status === "PAID");
  const unpaid  = rows.filter(r => r.status !== "PAID");
  const paidAmt  = paid.reduce((a, r) => a + Number(r.amount || 0), 0);
  const unpaidAmt = unpaid.reduce((a, r) => a + Number(r.amount || 0), 0);
  const totalAmt  = rows.reduce((a, r) => a + Number(r.amount || 0), 0);
  const rate = rows.length ? Math.round((paid.length / rows.length) * 100) : 0;

  // Drawer summary
  const dUsd = Number(drawerSummary?.total_in_usd || 0);
  const dLbp = Number(drawerSummary?.total_in_lbp || 0);
  const dRate = Number(drawerSummary?.lbp_rate || 0);

  const drawerCards = drawerSummary ? `
  <div style="margin-bottom:14px;padding:10px 12px;border:2px solid #1565c0;border-radius:8px;background:#f0f4ff;display:flex;gap:24px;align-items:center;">
    <div>
      <div style="font-size:7pt;font-weight:700;opacity:.6;text-transform:uppercase;letter-spacing:.4px;">Cash Collected (USD)</div>
      <div style="font-size:16pt;font-weight:900;color:#1565c0;font-family:'Courier New',monospace;">$${fmt(dUsd)}</div>
    </div>
    <div style="width:1px;background:#c5d8ff;align-self:stretch;"></div>
    <div>
      <div style="font-size:7pt;font-weight:700;opacity:.6;text-transform:uppercase;letter-spacing:.4px;">Cash Collected (L.L)</div>
      <div style="font-size:16pt;font-weight:900;color:#0d47a1;font-family:'Courier New',monospace;">L.L${fmtLL(dLbp)}</div>
    </div>
    ${dRate > 0 ? `<div style="margin-left:auto;font-size:8pt;color:#555;">Rate: 1 USD = L.L${fmtLL(dRate)}</div>` : ""}
  </div>` : "";

  const rowsHtml = rows.map((r, i) => {
    const overdue = (() => {
      if (r.status === "PAID") return false;
      if (!r.user_expiry_date) return false;
      const exp = new Date(r.user_expiry_date);
      if (isNaN(exp)) return false;
      const today = new Date();
      return new Date(today.getFullYear(), today.getMonth(), today.getDate()) >
             new Date(exp.getFullYear(), exp.getMonth(), exp.getDate());
    })();
    const isPaid  = r.status === "PAID";
    const type    = Number(r.affects_expiry) === 0 ? "STATIC" : "SUB";
    const rowBg   = isPaid ? "#f1f8f2" : overdue ? "#fdf3f3" : i % 2 === 0 ? "#fff" : "#fafafa";
    const sLabel  = isPaid ? "PAID" : overdue ? "OVERDUE" : "UNPAID";
    const sColor  = isPaid ? "#1a5928" : overdue ? "#b71c1c" : "#7b1528";
    const sBg     = isPaid ? "#d4edda" : overdue ? "#ffccbc" : "#f8d7da";
    const paidDate = r.paid_at ? dayjs(r.paid_at).format("DD/MM/YYYY") : "—";
    return `<tr style="background:${rowBg};border-bottom:1px solid #eee;">
      <td style="padding:4px 6px;font-size:8pt;opacity:0.4;font-family:monospace;">${i + 1}</td>
      <td style="padding:4px 6px;font-size:8pt;font-family:monospace;">${r.invoice_number || ""}</td>
      <td style="padding:4px 6px;font-weight:600;">${r.user_name || ""}</td>
      <td style="padding:4px 6px;font-size:9pt;opacity:0.8;">${r.user_mobile || "—"}</td>
      <td style="padding:4px 6px;font-size:9pt;">${r.user_service || "—"}</td>
      <td style="padding:4px 6px;font-size:9pt;">${r.month || "—"}</td>
      <td style="padding:4px 6px;"><span style="display:inline-block;padding:1px 5px;border-radius:3px;font-size:7.5pt;font-weight:700;background:${type==="SUB"?"#e3f2fd":"#fff3e0"};color:${type==="SUB"?"#0d47a1":"#bf360c"};">${type}</span></td>
      <td style="padding:4px 6px;"><span style="display:inline-block;padding:1px 5px;border-radius:3px;font-size:7.5pt;font-weight:800;background:${sBg};color:${sColor};">${sLabel}</span></td>
      <td style="padding:4px 6px;font-size:8.5pt;font-family:monospace;">${paidDate}</td>
      <td style="padding:4px 6px;text-align:right;font-weight:800;font-family:monospace;">$${fmt(r.amount)}</td>
    </tr>`;
  }).join("");

  return `<!doctype html><html><head><meta charset="utf-8"/><title>${title}</title>
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  @page{size:A4 landscape;margin:12mm 10mm 16mm 10mm;}
  body{font-family:Arial,sans-serif;font-size:10pt;color:#111;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  table{width:100%;border-collapse:collapse;}
  thead tr{background:#111;color:#fff;}
  thead th{padding:5px 6px;text-align:left;font-size:7.5pt;font-weight:700;letter-spacing:.3px;white-space:nowrap;}
  thead th.r{text-align:right;}
  tbody tr{border-bottom:1px solid #eee;break-inside:avoid;}
  tfoot tr{background:#f4f4f4;border-top:2.5px solid #111;}
  tfoot td{padding:6px;font-weight:900;font-size:9pt;}
</style>
</head><body>
<div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #111;padding-bottom:10px;margin-bottom:12px;">
  <div>
    <div style="font-size:18pt;font-weight:900;">${isp.isp_name || "ISP Company"}</div>
    <div style="font-size:8pt;color:#555;margin-top:2px;">${isp.isp_number ? "Reg: "+isp.isp_number+"  ·  " : ""}${isp.isp_phone || ""}${isp.isp_address ? "  ·  "+isp.isp_address : ""}</div>
  </div>
  <div style="text-align:right;">
    <div style="font-size:13pt;font-weight:800;">${title}</div>
    ${subtitle ? `<div style="font-size:8.5pt;color:#555;margin-top:2px;">${subtitle}</div>` : ""}
    <div style="font-size:8pt;color:#666;margin-top:2px;">Printed: ${now}</div>
    <div style="font-size:8pt;color:#666;">Total rows: <b>${rows.length}</b></div>
  </div>
</div>

${drawerCards}

<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:14px;">
  ${[
    {l:"Paid Total",    v:"$"+fmt(paidAmt),   bg:"#f1f8f2", bc:"#2e7d32"},
    {l:"Unpaid Total",  v:"$"+fmt(unpaidAmt),  bg:"#fdf3f3", bc:"#c62828"},
    {l:"Grand Total",   v:"$"+fmt(totalAmt),   bg:"#f0f4ff", bc:"#1565c0"},
    {l:"Collection",    v:rate+"%",            bg:"#f8f2ff", bc:"#6a1b9a"},
    {l:"Invoices",      v:paid.length+"/"+rows.length, bg:"#f7f7f7", bc:"#777"},
  ].map(c=>`<div style="border:1.5px solid ${c.bc};border-radius:6px;padding:8px 10px;background:${c.bg};">
    <div style="font-size:7pt;font-weight:700;opacity:.65;text-transform:uppercase;letter-spacing:.4px;">${c.l}</div>
    <div style="font-size:13pt;font-weight:900;margin-top:2px;">${c.v}</div>
  </div>`).join("")}
</div>

<table>
  <thead><tr>
    <th>#</th><th>Invoice #</th><th>User</th><th>Mobile</th>
    <th>Service</th><th>Month</th><th>Type</th><th>Status</th>
    <th>Paid Date</th><th class="r">Amount</th>
  </tr></thead>
  <tbody>${rowsHtml}</tbody>
  <tfoot><tr>
    <td colspan="8" style="padding:6px;">
      Paid: <b>$${fmt(paidAmt)}</b> &nbsp;·&nbsp;
      Unpaid: <b>$${fmt(unpaidAmt)}</b> &nbsp;·&nbsp;
      Cash USD: <b>$${fmt(dUsd)}</b> &nbsp;·&nbsp;
      Cash L.L: <b>L.L${fmtLL(dLbp)}</b> &nbsp;·&nbsp;
      Rows: <b>${rows.length}</b>
    </td>
    <td style="text-align:right;padding:6px;">TOTAL</td>
    <td style="text-align:right;font-family:monospace;font-size:12pt;padding:6px;">$${fmt(totalAmt)}</td>
  </tr></tfoot>
</table>

<div style="margin-top:12px;padding-top:8px;border-top:1px solid #ddd;display:flex;justify-content:space-between;font-size:8pt;color:#666;">
  <span>Generated by ISP Management System · ${dayjs().format("YYYY-MM-DD HH:mm:ss")}</span>
  <span>${isp.isp_name || ""}${isp.isp_phone ? " · "+isp.isp_phone : ""}</span>
</div>
</body></html>`;
}