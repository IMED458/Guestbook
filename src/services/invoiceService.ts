import type { Client, Order, Payment, SystemSettings } from '../domain/models.ts';
import { formatGel } from '../domain/money.ts';
import { formatDateShort, formatDateLong } from '../domain/dates.ts';
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from '../domain/labels.ts';

/**
 * An invoice as a self-contained HTML document opened in a new window, ready
 * to print or save as PDF.
 *
 * Deliberately not a PDF library: that would add megabytes to the bundle and
 * font embedding for Georgian is where those libraries tend to fail. The
 * browser's own print engine already has the fonts and renders the script
 * correctly.
 */
export function buildInvoiceHtml(params: {
  order: Order;
  client: Client;
  payments: Payment[];
  settings: SystemSettings;
}): string {
  const { order, client, payments, settings } = params;

  const escape = (value: string) =>
    value.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] || c);

  const rows = order.items
    .map(
      (item, index) => `
        <tr>
          <td class="num">${index + 1}</td>
          <td>${escape(item.name)}</td>
          <td class="num">${item.quantity}</td>
          <td class="money">${formatGel(item.unitPrice)}</td>
          <td class="money">${item.discount > 0 ? `− ${formatGel(item.discount)}` : '—'}</td>
          <td class="money strong">${formatGel(item.lineTotal)}</td>
        </tr>`
    )
    .join('');

  const paymentRows = payments.length
    ? payments
        .map(
          (p) => `
          <tr>
            <td>${formatDateShort(p.paidAt)}</td>
            <td>${escape(PAYMENT_METHOD_LABELS[p.method])}</td>
            <td class="money">${formatGel(p.amount)}</td>
          </tr>`
        )
        .join('')
    : '<tr><td colspan="3" class="muted">გადახდა ჯერ არ დაფიქსირებულა</td></tr>';

  const operator = [
    settings.companyLegalName || settings.brandName,
    settings.companyRegistrationNumber ? `ს/ნ ${settings.companyRegistrationNumber}` : '',
    settings.companyAddress || '',
    settings.supportPhone || '',
    settings.supportEmail || '',
  ]
    .filter(Boolean)
    .map((line) => `<div>${escape(line)}</div>`)
    .join('');

  const recipient = [client.displayName, client.companyName, client.phone, client.email, client.address]
    .filter(Boolean)
    .map((line) => `<div>${escape(String(line))}</div>`)
    .join('');

  return `<!doctype html>
<html lang="ka">
<head>
<meta charset="utf-8">
<title>ინვოისი ${escape(order.orderNumber)}</title>
<style>
  @page { size: A4; margin: 18mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: 'Noto Sans Georgian', 'BPG Glaho', system-ui, sans-serif;
    font-size: 12px;
    color: #1c1917;
    line-height: 1.55;
  }
  .sheet { max-width: 174mm; margin: 0 auto; }
  header { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start;
           padding-bottom: 16px; border-bottom: 2px solid #1c1917; }
  h1 { font-family: 'Noto Serif Georgian', Georgia, serif; font-size: 26px; margin: 0 0 4px; }
  .num-badge { font-family: ui-monospace, monospace; font-size: 15px; font-weight: 700; }
  .parties { display: flex; justify-content: space-between; gap: 32px; margin: 22px 0 26px; }
  .parties section { flex: 1; }
  .label { font-size: 10px; text-transform: uppercase; letter-spacing: .08em;
           color: #78716c; font-weight: 700; margin-bottom: 5px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .05em;
       color: #57534e; border-bottom: 1px solid #d6d3d1; padding: 7px 8px; }
  td { padding: 8px; border-bottom: 1px solid #f5f5f4; vertical-align: top; }
  .num { width: 34px; color: #78716c; }
  .money { text-align: right; white-space: nowrap; }
  .strong { font-weight: 700; }
  .muted { color: #78716c; }
  .totals { margin-left: auto; width: 250px; }
  .totals div { display: flex; justify-content: space-between; padding: 5px 0; }
  .totals .grand { border-top: 2px solid #1c1917; margin-top: 6px; padding-top: 9px;
                   font-size: 15px; font-weight: 700; }
  .due { color: #9f1239; }
  .paid { color: #065f46; }
  footer { margin-top: 34px; padding-top: 14px; border-top: 1px solid #e7e5e4;
           font-size: 10px; color: #78716c; }
  h2 { font-family: 'Noto Serif Georgian', Georgia, serif; font-size: 14px; margin: 0 0 8px; }
  @media print { .no-print { display: none !important; } }
  .no-print { margin-bottom: 18px; }
  button { font: inherit; padding: 9px 16px; border-radius: 9px; border: 1px solid #1c1917;
           background: #1c1917; color: #fff; cursor: pointer; }
</style>
</head>
<body>
<div class="sheet">
  <div class="no-print"><button onclick="window.print()">ბეჭდვა ან PDF-ში შენახვა</button></div>

  <header>
    <div>
      <h1>ინვოისი</h1>
      <div class="num-badge">${escape(order.orderNumber)}</div>
    </div>
    <div style="text-align:right">
      <div class="label">გაცემის თარიღი</div>
      <div>${formatDateLong(order.createdAt)}</div>
      ${order.deadline ? `<div class="label" style="margin-top:8px">ვადა</div><div>${formatDateLong(order.deadline)}</div>` : ''}
    </div>
  </header>

  <div class="parties">
    <section>
      <div class="label">გამყიდველი</div>
      ${operator}
    </section>
    <section>
      <div class="label">მყიდველი</div>
      ${recipient}
    </section>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th><th>დასახელება</th><th>რაოდ.</th>
        <th class="money">ერთეული</th><th class="money">ფასდაკლება</th><th class="money">ჯამი</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <div><span>ჯამი</span><span>${formatGel(order.subtotal)}</span></div>
    <div><span>ფასდაკლება</span><span>− ${formatGel(order.discount)}</span></div>
    <div class="grand"><span>გადასახდელი</span><span>${formatGel(order.total)}</span></div>
    <div class="paid"><span>გადახდილი</span><span>${formatGel(order.paidAmount)}</span></div>
    <div class="${order.balance > 0 ? 'due' : 'paid'} strong">
      <span>დარჩენილი</span><span>${formatGel(order.balance)}</span>
    </div>
  </div>

  <h2 style="margin-top:26px">გადახდები</h2>
  <table>
    <thead><tr><th>თარიღი</th><th>მეთოდი</th><th class="money">თანხა</th></tr></thead>
    <tbody>${paymentRows}</tbody>
  </table>

  <footer>
    სტატუსი: ${escape(PAYMENT_STATUS_LABELS[order.paymentStatus])}
    ${settings.brandName ? ` · ${escape(settings.brandName)}` : ''}
  </footer>
</div>
</body>
</html>`;
}

export function openInvoice(params: Parameters<typeof buildInvoiceHtml>[0]): void {
  const html = buildInvoiceHtml(params);
  const win = window.open('', '_blank', 'noopener,width=900,height=1000');
  if (!win) {
    throw new Error('ბრაუზერმა ახალი ფანჯარა დაბლოკა — დაუშვით pop-up ამ საიტისთვის');
  }
  win.document.write(html);
  win.document.close();
}
