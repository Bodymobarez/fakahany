import PDFDocument from 'pdfkit';
import type { Address, CompanySettings, Order, OrderItem } from '@prisma/client';

type InvoiceOrder = Order & {
  items: OrderItem[];
  address?: Pick<Address, 'label' | 'line1' | 'city' | 'emirate'> | null;
};

const BRAND = '#0f766e';
const INK = '#0f172a';
const MUTED = '#64748b';
const LINE = '#e2e8f0';
const HEADER_BG = '#f1f5f9';

function money(value: unknown): string {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function buildInvoicePdf(
  order: InvoiceOrder,
  company?: CompanySettings | null,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const companyName = company?.companyName || order.companyNameSnap || 'Fresh Harvest';
    const tagline = 'Farm-fresh produce · UAE';
    const trn = company?.trn || order.trnSnap || '';
    const companyAddress = company?.address || 'Dubai, UAE';
    const currency = order.currency || 'AED';
    const pageWidth = doc.page.width;
    const left = 48;
    const right = pageWidth - 48;
    const contentWidth = right - left;

    // ── Header ──────────────────────────────────────────────
    doc.circle(left + 14, 62, 14).fill(BRAND);
    doc
      .fillColor('#ffffff')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('FH', left + 5, 56, { width: 18, align: 'center' });

    doc
      .fillColor(BRAND)
      .fontSize(18)
      .font('Helvetica-Bold')
      .text(companyName, left + 36, 48);
    doc
      .fillColor(MUTED)
      .fontSize(9)
      .font('Helvetica')
      .text(tagline, left + 36, 70);
    if (trn) {
      doc.text(`TRN: ${trn}`, left + 36, 82);
    }

    doc
      .fillColor(INK)
      .fontSize(26)
      .font('Helvetica-Bold')
      .text('INVOICE', left, 48, { width: contentWidth, align: 'right' });
    doc
      .fillColor(MUTED)
      .fontSize(10)
      .font('Helvetica')
      .text(order.orderNumber, left, 78, { width: contentWidth, align: 'right' });

    doc
      .moveTo(left, 104)
      .lineTo(right, 104)
      .lineWidth(3)
      .strokeColor(BRAND)
      .stroke();

    // ── Meta columns ────────────────────────────────────────
    let y = 122;
    doc.fillColor(MUTED).fontSize(8).font('Helvetica-Bold').text('INVOICE DETAILS', left, y);
    doc.text('DELIVERY ADDRESS', left + contentWidth / 2, y);

    y = 138;
    const dateStr = new Date(order.createdAt).toLocaleDateString('en-AE');
    const payment = String(order.paymentMethod || 'COD').replaceAll('_', ' ');
    const status = String(order.status || '').replaceAll('_', ' ');

    doc.fillColor(INK).fontSize(10).font('Helvetica');
    doc.text(`Date: ${dateStr}`, left, y);
    doc.text(
      order.address
        ? `${order.address.line1}, ${order.address.city}, ${order.address.emirate}`
        : '—',
      left + contentWidth / 2,
      y,
      { width: contentWidth / 2 - 8 },
    );

    y += 16;
    doc.fillColor(MUTED).fontSize(9).text('Status:', left, y + 2);
    const badgeX = left + 42;
    const badgeLabel = status || 'PENDING';
    const badgeWidth = Math.max(72, doc.widthOfString(badgeLabel) + 14);
    doc.roundedRect(badgeX, y - 2, badgeWidth, 16, 8).fill('#dcfce7');
    doc
      .fillColor('#166534')
      .fontSize(8)
      .font('Helvetica-Bold')
      .text(badgeLabel, badgeX, y + 2, { width: badgeWidth, align: 'center' });

    y += 20;
    doc
      .fillColor(INK)
      .fontSize(10)
      .font('Helvetica')
      .text(`Payment: ${payment}`, left, y);
    if (order.invoiceNumber) {
      doc.text(`Invoice #: ${order.invoiceNumber}`, left + contentWidth / 2, y);
    }

    // ── Items table ─────────────────────────────────────────
    y += 36;
    const colItem = left;
    const colQty = left + contentWidth * 0.52;
    const colUnit = left + contentWidth * 0.68;
    const colAmt = left + contentWidth * 0.84;
    const rowH = 22;

    doc.rect(left, y, contentWidth, rowH).fill(HEADER_BG);
    doc.fillColor(INK).fontSize(8).font('Helvetica-Bold');
    doc.text('ITEM', colItem + 8, y + 7);
    doc.text('QTY', colQty, y + 7, { width: 40, align: 'center' });
    doc.text('UNIT PRICE', colUnit, y + 7, { width: 70, align: 'right' });
    doc.text('AMOUNT', colAmt, y + 7, { width: right - colAmt, align: 'right' });

    y += rowH;
    doc.font('Helvetica').fontSize(9).fillColor(INK);

    for (const item of order.items) {
      if (y > doc.page.height - 160) {
        doc.addPage();
        y = 48;
      }
      const name = item.nameEn || item.sku;
      doc.text(name, colItem + 8, y + 6, { width: colQty - colItem - 16 });
      doc.text(String(item.quantity), colQty, y + 6, { width: 40, align: 'center' });
      doc.text(`${currency} ${money(item.unitPrice)}`, colUnit, y + 6, {
        width: 70,
        align: 'right',
      });
      doc.text(`${currency} ${money(item.lineTotal)}`, colAmt, y + 6, {
        width: right - colAmt,
        align: 'right',
      });
      y += rowH;
      doc
        .moveTo(left, y)
        .lineTo(right, y)
        .lineWidth(0.5)
        .strokeColor(LINE)
        .stroke();
    }

    // ── Totals ──────────────────────────────────────────────
    y += 18;
    const labelX = right - 200;
    const valueX = right - 100;
    const vatRate = num(order.vatRateSnap ?? company?.vatRate ?? 5);
    const lines: Array<[string, string, boolean?]> = [
      ['Subtotal', `${currency} ${money(order.subtotal)}`],
    ];
    if (num(order.discount) > 0) {
      lines.push(['Discount', `-${currency} ${money(order.discount)}`]);
    }
    lines.push([`VAT (${vatRate}%)`, `${currency} ${money(order.tax)}`]);
    lines.push(['Delivery Fee', `${currency} ${money(order.shipping)}`]);

    doc.font('Helvetica').fontSize(10).fillColor(MUTED);
    for (const [label, value] of lines) {
      doc.text(label, labelX, y, { width: 90, align: 'right' });
      doc.fillColor(INK).text(value, valueX, y, { width: 100, align: 'right' });
      doc.fillColor(MUTED);
      y += 16;
    }

    y += 4;
    doc
      .moveTo(labelX, y)
      .lineTo(right, y)
      .lineWidth(1.5)
      .strokeColor(INK)
      .stroke();
    y += 10;
    doc
      .fillColor(INK)
      .font('Helvetica-Bold')
      .fontSize(12)
      .text('Total', labelX, y, { width: 90, align: 'right' });
    doc.text(`${currency} ${money(order.total)}`, valueX, y, {
      width: 100,
      align: 'right',
    });

    // ── Footer ──────────────────────────────────────────────
    const footerY = doc.page.height - 56;
    doc
      .fillColor(MUTED)
      .font('Helvetica')
      .fontSize(9)
      .text('Thank you for your order!', left, footerY, {
        width: contentWidth,
        align: 'center',
      });
    doc.text(`${companyName} · ${tagline} · ${companyAddress}`, left, footerY + 14, {
      width: contentWidth,
      align: 'center',
    });

    doc.end();
  });
}
