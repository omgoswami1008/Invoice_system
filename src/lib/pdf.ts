import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { numberToWords } from "./utils";

declare module "jspdf" {
  interface jsPDF {
    lastAutoTable: { finalY: number };
  }
}

interface InvoiceItem {
  productName: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  gstPercent: number;
  gstAmount: number;
}

interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  customerGstNumber: string;
  items: InvoiceItem[];
  subtotal: number;
  totalGst: number;
  discount: number;
  discountType: string;
  roundOff: number;
  total: number;
  status: string;
  notes: string;
}

interface CompanyData {
  companyName: string;
  address: string;
  mobileNumber: string;
  bankDetails: {
    bankName: string;
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    branch: string;
  };
  signature: string;
}

const GJ = "NotoSansGujarati";
const HR = "Helvetica";

function fc(amount: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);
}

function fd(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

async function loadFont(doc: jsPDF): Promise<void> {
  try {
    const res = await fetch("/fonts/NotoSansGujarati.ttf");
    const buffer = await res.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    doc.addFileToVFS(GJ, btoa(binary));
    doc.addFont(GJ, GJ, "normal");
  } catch {
    console.warn("Failed to load Gujarati font");
  }
}

function setFont(doc: jsPDF, font: string, bold = false) {
  if (font === GJ) {
    doc.setFont(GJ, "normal");
    if (bold) doc.setFontSize(doc.getFontSize() + 1);
  } else {
    doc.setFont(HR, bold ? "bold" : "normal");
  }
}

export async function generateInvoicePDF(
  invoice: InvoiceData,
  company: CompanyData | null,
  invoiceNumber: string
): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = 210;
  const m = 15;
  const cw = pageW - m * 2;
  const r = pageW - m;

  await loadFont(doc);

  let y = m;

  // ── Company Name (Gujarati) ──
  setFont(doc, GJ, true);
  doc.setFontSize(18);
  doc.setTextColor(17, 24, 39);
  doc.text(company?.companyName || "Your Company Name", m, y + 6);
  y += 10;

  // Company Address (Gujarati)
  setFont(doc, GJ);
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  if (company?.address) {
    const lines = doc.splitTextToSize(company.address, cw / 2);
    doc.text(lines, m, y);
    y += lines.length * 4;
  }
  if (company?.mobileNumber) {
    doc.text(`Mobile: ${company.mobileNumber}`, m, y);
    y += 4;
  }
  y += 4;

  // Separator
  doc.setDrawColor(209, 213, 219);
  doc.setLineWidth(0.3);
  doc.line(m, y, r, y);
  y += 8;

  // INVOICE title
  setFont(doc, HR, true);
  doc.setFontSize(22);
  doc.setTextColor(37, 99, 235);
  doc.text("INVOICE", r, y, { align: "right" });
  y += 6;

  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  setFont(doc, HR, true);
  doc.text("Invoice #:", r - 40, y);
  setFont(doc, HR);
  doc.text(invoice.invoiceNumber, r, y, { align: "right" });
  y += 5;

  setFont(doc, HR, true);
  doc.text("Date:", r - 40, y);
  setFont(doc, HR);
  doc.text(fd(invoice.invoiceDate), r, y, { align: "right" });
  y += 5;

  // Status badge
  const sc: Record<string, [number, number, number]> = {
    paid: [22, 163, 74], pending: [202, 138, 4],
    overdue: [220, 38, 38], draft: [107, 114, 128],
  };
  const [cr, cg, cb] = sc[invoice.status] || sc.draft;
  doc.setFillColor(cr, cg, cb);
  doc.roundedRect(r - 20, y - 3.5, 20, 5, 2, 2, "F");
  setFont(doc, HR, true);
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text(invoice.status.toUpperCase(), r - 10, y, { align: "center" });
  y += 10;

  // Bill To
  setFont(doc, HR, true);
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text("BILL TO", m, y);
  y += 5;

  if (invoice.customerName) {
    setFont(doc, GJ, true);
    doc.setFontSize(11);
    doc.setTextColor(17, 24, 39);
    doc.text(invoice.customerName, m, y);
    y += 5;

    setFont(doc, GJ);
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    if (invoice.customerAddress) {
      const al = doc.splitTextToSize(invoice.customerAddress, cw / 2);
      doc.text(al, m, y);
      y += al.length * 4;
    }
    setFont(doc, HR);
    if (invoice.customerPhone) {
      doc.text(`Phone: ${invoice.customerPhone}`, m, y);
      y += 4;
    }
    if (invoice.customerEmail) {
      doc.text(`Email: ${invoice.customerEmail}`, m, y);
      y += 4;
    }
    if (invoice.customerGstNumber) {
      doc.text(`GSTIN: ${invoice.customerGstNumber}`, m, y);
      y += 4;
    }
  } else {
    setFont(doc, HR);
    doc.setFontSize(9);
    doc.text("Walk-in Customer", m, y);
    y += 5;
  }
  y += 6;

  // Items Table
  const tableBody = invoice.items.map((item, i) => [
    String(i + 1),
    item.productName || item.description || "-",
    String(item.quantity),
    fc(item.rate),
    `${item.gstPercent}%`,
    fc(item.amount),
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: m, right: m },
    head: [["#", "Description", "Qty", "Rate", "GST%", "Amount"]],
    body: tableBody,
    theme: "grid",
    styles: {
      font: GJ,
      fontStyle: "normal",
      fontSize: 9,
      textColor: [55, 65, 81],
    },
    headStyles: {
      font: HR,
      fontStyle: "bold",
      fillColor: [243, 244, 246],
      textColor: [75, 85, 99],
      fontSize: 8,
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: "auto" },
      2: { cellWidth: 16, halign: "center" },
      3: { cellWidth: 28, halign: "right" },
      4: { cellWidth: 18, halign: "right" },
      5: { cellWidth: 28, halign: "right" },
    },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    tableLineWidth: 0.1,
    tableLineColor: [229, 231, 235],
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 8;

  // Totals
  const sx = m + cw - 70;
  const vx = r;

  setFont(doc, HR);
  doc.setFontSize(9);

  const drawRow = (label: string, val: string, bold = false, clr: [number, number, number] = [55, 65, 81]) => {
    setFont(doc, HR, bold);
    doc.setTextColor(...clr);
    doc.text(label, sx, y);
    doc.text(val, vx, y, { align: "right" });
    y += 5;
  };

  drawRow("Subtotal", fc(invoice.subtotal));
  if (invoice.totalGst > 0) drawRow("GST", fc(invoice.totalGst));
  if (invoice.discount > 0) drawRow("Discount", `-${fc(invoice.discount)}`, false, [220, 38, 38]);
  if (invoice.roundOff !== 0) {
    const prefix = invoice.roundOff >= 0 ? "+" : "";
    const clr: [number, number, number] = invoice.roundOff >= 0 ? [22, 163, 74] : [220, 38, 38];
    drawRow("Round Off", `${prefix}${fc(invoice.roundOff)}`, false, clr);
  }

  // Total line
  doc.setDrawColor(209, 213, 219);
  doc.setLineWidth(0.3);
  doc.line(sx, y - 1, vx, y - 1);
  y += 3;

  setFont(doc, HR, true);
  doc.setFontSize(13);
  doc.setTextColor(17, 24, 39);
  doc.text("Total", sx, y);
  doc.text(fc(invoice.total), vx, y, { align: "right" });
  y += 7;

  // Amount in words (Gujarati font so it can handle any script)
  setFont(doc, GJ);
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text(numberToWords(invoice.total), m, y);
  y += 8;

  // Bank Details
  if (company?.bankDetails?.bankName) {
    y += 6;
    setFont(doc, HR, true);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text("BANK DETAILS", m, y);
    y += 5;

    doc.setFillColor(249, 250, 251);
    doc.roundedRect(m, y - 4, cw, 24, 2, 2, "F");
    setFont(doc, GJ);
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);

    doc.text(`Bank: ${company.bankDetails.bankName}`, m + 4, y);
    doc.text(`Branch: ${company.bankDetails.branch}`, m + cw / 2, y);
    y += 5;
    doc.text(`A/C Name: ${company.bankDetails.accountHolderName}`, m + 4, y);
    y += 5;
    doc.text(`A/C No: ${company.bankDetails.accountNumber}`, m + 4, y);
    doc.text(`IFSC: ${company.bankDetails.ifscCode}`, m + cw / 2, y);
    y += 10;
  }

  // Notes (Gujarati)
  if (invoice.notes) {
    setFont(doc, HR, true);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text("NOTES", m, y);
    y += 4;
    setFont(doc, GJ);
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    const nl = doc.splitTextToSize(invoice.notes, cw);
    doc.text(nl, m, y);
    y += nl.length * 4 + 4;
  }

  // Signature (Gujarati)
  if (company?.signature) {
    const sigY = 270;
    setFont(doc, GJ);
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text(company.signature, r, sigY, { align: "right" });
    doc.setDrawColor(156, 163, 175);
    doc.setLineWidth(0.2);
    doc.line(r - 40, sigY + 1, r, sigY + 1);
    setFont(doc, HR);
    doc.setFontSize(7);
    doc.setTextColor(156, 163, 175);
    doc.text("Authorized Signatory", r, sigY + 5, { align: "right" });
  }

  // Footer
  setFont(doc, HR);
  doc.setFontSize(7);
  doc.setTextColor(209, 213, 219);
  doc.text("Thank you for your business!", pageW / 2, 290, { align: "center" });

  doc.save(`${invoiceNumber}.pdf`);
}
