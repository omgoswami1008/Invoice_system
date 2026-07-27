"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import PrintCopiesDialog from "@/components/ui/PrintCopiesDialog";
import { numberToWords, formatCurrency } from "@/lib/utils";
import { generateInvoicePDF } from "@/lib/pdf";

interface InvoiceItem {
  productName: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  gstPercent: number;
  gstAmount: number;
}

interface Invoice {
  _id: string;
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
  createdAt: string;
}

interface CompanySettings {
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

export default function InvoicePreviewPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showPrintMenu, setShowPrintMenu] = useState(false);
  const [showCopiesDialog, setShowCopiesDialog] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    async function load() {
      try {
        const [invRes, compRes] = await Promise.all([
          fetch(`/api/invoices/${invoiceId}`),
          fetch("/api/company-settings"),
        ]);

        if (invRes.ok) {
          const invData = await invRes.json();
          setInvoice(invData.invoice);
        }
        if (compRes.ok) {
          const compData = await compRes.json();
          setCompany(compData.settings);
        }
        setLastUpdated(new Date());
      } catch {
        console.error("Failed to load invoice");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [invoiceId]);

  useEffect(() => {
    if (!autoRefresh) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }

    pollRef.current = setInterval(async () => {
      try {
        const [invRes, compRes] = await Promise.all([
          fetch(`/api/invoices/${invoiceId}`),
          fetch("/api/company-settings"),
        ]);

        if (invRes.ok) {
          const invData = await invRes.json();
          setInvoice(invData.invoice);
        }
        if (compRes.ok) {
          const compData = await compRes.json();
          setCompany(compData.settings);
        }
        setLastUpdated(new Date());
      } catch {
        console.error("Failed to refresh invoice");
      }
    }, 30000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [autoRefresh, invoiceId]);

  const handleDownloadPDF = async () => {
    if (!printRef.current || !invoice) return;
    setDownloading(true);
    try {
      await generateInvoicePDF(invoice, company, invoice.invoiceNumber);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrintNormal = () => {
    document.body.classList.remove("thermal-print");
    window.print();
  };

  const handlePrintThermal = () => {
    document.body.classList.add("thermal-print");
    setTimeout(() => {
      window.print();
      document.body.classList.remove("thermal-print");
    }, 100);
  };

  const handlePrintCopies = (copies: number) => {
    document.body.classList.remove("thermal-print");
    let printed = 0;
    const printNext = () => {
      if (printed >= copies) return;
      window.print();
      printed++;
      if (printed < copies) {
        setTimeout(printNext, 500);
      }
    };
    printNext();
  };

  const zoomIn = () => setZoom((z) => Math.min(150, z + 10));
  const zoomOut = () => setZoom((z) => Math.max(50, z - 10));
  const zoomFit = () => setZoom(70);
  const zoomReset = () => setZoom(100);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-xl font-bold text-gray-900">Invoice not found</h2>
        <Button className="mt-4" onClick={() => router.push("/invoices")}>
          Back to Invoices
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 print:space-y-0">
      {/* Toolbar — hidden on print */}
      <div className="no-print flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </Button>
          <Button variant="secondary" size="sm" onClick={() => router.push(`/invoices/${invoiceId}/edit`)}>
            Edit
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1">
            <button onClick={zoomOut} className="rounded p-1 text-gray-600 hover:bg-gray-200" title="Zoom Out">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <button onClick={zoomReset} className="min-w-[48px] px-1 text-center text-xs font-medium text-gray-700 hover:bg-gray-200 rounded" title="Reset Zoom">
              {zoom}%
            </button>
            <button onClick={zoomIn} className="rounded p-1 text-gray-600 hover:bg-gray-200" title="Zoom In">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button onClick={zoomFit} className="rounded p-1 text-gray-600 hover:bg-gray-200" title="Fit to Width">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          </div>

          {/* Auto-refresh */}
          <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Auto-refresh
          </label>

          {/* Download PDF */}
          <Button variant="secondary" size="sm" onClick={handleDownloadPDF} loading={downloading}>
            <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            PDF
          </Button>

          {/* Print Menu */}
          <div className="relative">
            <Button size="sm" onClick={() => setShowPrintMenu(!showPrintMenu)}>
              <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
              <svg className="ml-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </Button>
            {showPrintMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowPrintMenu(false)} />
                <div className="absolute right-0 z-50 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  <button
                    onClick={() => { setShowPrintMenu(false); handlePrintNormal(); }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print Invoice
                  </button>
                  <button
                    onClick={() => { setShowPrintMenu(false); setShowCopiesDialog(true); }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                    </svg>
                    Print Multiple Copies
                  </button>
                  <button
                    onClick={() => { setShowPrintMenu(false); handlePrintThermal(); }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Thermal Print (80mm)
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Last Updated */}
      {lastUpdated && (
        <div className="no-print text-right text-xs text-gray-400">
          Last updated: {lastUpdated.toLocaleTimeString("en-IN")}
        </div>
      )}

      {/* Invoice Document */}
      <div
        ref={printRef}
        className="invoice-document rounded-xl border border-gray-200 shadow-sm print:border-0 print:shadow-none"
        style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
      >
        {/* Header */}
        <div className="mb-8 flex items-start justify-between border-b-2 border-gray-200 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {company?.companyName || "Your Company Name"}
            </h1>
            {company?.address && (
              <p className="mt-1 text-sm text-gray-600 whitespace-pre-line">{company.address}</p>
            )}
            {company?.mobileNumber && (
              <p className="mt-1 text-sm text-gray-600">Mobile: {company.mobileNumber}</p>
            )}
          </div>
          <div className="text-right">
            <h2 className="text-3xl font-bold uppercase text-blue-600">Invoice</h2>
            <p className="mt-2 text-sm text-gray-600">
              <span className="font-medium">Invoice #:</span> {invoice.invoiceNumber}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Date:</span>{" "}
              {new Date(invoice.invoiceDate).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
            <p className="mt-1">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  invoice.status === "paid"
                    ? "bg-green-100 text-green-800"
                    : invoice.status === "pending"
                    ? "bg-yellow-100 text-yellow-800"
                    : invoice.status === "overdue"
                    ? "bg-red-100 text-red-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
              </span>
            </p>
          </div>
        </div>

        {/* Bill To */}
        <div className="mb-8">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-500">Bill To</h3>
          {invoice.customerName ? (
            <>
              <p className="text-base font-semibold text-gray-900">{invoice.customerName}</p>
              {invoice.customerAddress && (
                <p className="text-sm text-gray-600 whitespace-pre-line">{invoice.customerAddress}</p>
              )}
              {invoice.customerPhone && (
                <p className="text-sm text-gray-600">Phone: {invoice.customerPhone}</p>
              )}
              {invoice.customerEmail && (
                <p className="text-sm text-gray-600">Email: {invoice.customerEmail}</p>
              )}
              {invoice.customerGstNumber && (
                <p className="text-sm text-gray-600">GSTIN: {invoice.customerGstNumber}</p>
              )}
            </>
          ) : (
            <p className="text-sm italic text-gray-400">Walk-in Customer</p>
          )}
        </div>

        {/* Items Table */}
        <div className="mb-8">
          <table className="min-w-full border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">#</th>
                <th className="border border-gray-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Description</th>
                <th className="border border-gray-200 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">Qty</th>
                <th className="border border-gray-200 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Rate</th>
                <th className="border border-gray-200 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">GST%</th>
                <th className="border border-gray-200 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoice.items.map((item, index) => (
                <tr key={index}>
                  <td className="border border-gray-200 px-4 py-3 text-sm text-gray-700">{index + 1}</td>
                  <td className="border border-gray-200 px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{item.productName || item.description}</p>
                  </td>
                  <td className="border border-gray-200 px-4 py-3 text-center text-sm text-gray-700">{item.quantity}</td>
                  <td className="border border-gray-200 px-4 py-3 text-right text-sm text-gray-700">{formatCurrency(item.rate)}</td>
                  <td className="border border-gray-200 px-4 py-3 text-right text-sm text-gray-700">{item.gstPercent}%</td>
                  <td className="border border-gray-200 px-4 py-3 text-right text-sm font-medium text-gray-900">{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mb-8 flex justify-end">
          <div className="w-full max-w-xs space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.totalGst > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">GST</span>
                <span className="font-medium">{formatCurrency(invoice.totalGst)}</span>
              </div>
            )}
            {invoice.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Discount</span>
                <span className="font-medium text-red-600">-{formatCurrency(invoice.discount)}</span>
              </div>
            )}
            {invoice.roundOff !== 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Round Off</span>
                <span className={`font-medium ${invoice.roundOff >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {invoice.roundOff >= 0 ? "+" : ""}{formatCurrency(invoice.roundOff)}
                </span>
              </div>
            )}
            <div className="border-t border-gray-300 pt-2">
              <div className="flex justify-between">
                <span className="text-lg font-bold text-gray-900">Total</span>
                <span className="text-lg font-bold text-gray-900">{formatCurrency(invoice.total)}</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 italic">{numberToWords(invoice.total)}</p>
          </div>
        </div>

        {/* Bank Details */}
        {company?.bankDetails?.bankName && (
          <div className="mb-8 rounded-lg border border-gray-200 bg-gray-50 p-4 thermal-hide">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-500">Bank Details</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <p className="text-gray-600">Bank: <span className="font-medium text-gray-900">{company.bankDetails.bankName}</span></p>
              <p className="text-gray-600">Branch: <span className="font-medium text-gray-900">{company.bankDetails.branch}</span></p>
              <p className="text-gray-600">A/C Name: <span className="font-medium text-gray-900">{company.bankDetails.accountHolderName}</span></p>
              <p className="text-gray-600">A/C No: <span className="font-medium text-gray-900">{company.bankDetails.accountNumber}</span></p>
              <p className="text-gray-600">IFSC: <span className="font-medium text-gray-900">{company.bankDetails.ifscCode}</span></p>
            </div>
          </div>
        )}

        {/* Notes */}
        {invoice.notes && (
          <div className="mb-8">
            <h3 className="mb-1 text-sm font-semibold uppercase tracking-wider text-gray-500">Notes</h3>
            <p className="text-sm text-gray-600 whitespace-pre-line">{invoice.notes}</p>
          </div>
        )}

        {/* Signature */}
        {company?.signature && (
          <div className="flex justify-end pt-8 thermal-hide">
            <div className="text-center">
              {company.signature.startsWith("data:image") ? (
                <img src={company.signature} alt="Signature" className="h-16 max-w-[200px] object-contain" />
              ) : (
                <p className="text-sm text-gray-600">{company.signature}</p>
              )}
              <div className="mt-1 border-t border-gray-400 pt-1">
                <p className="text-xs text-gray-500">Authorized Signatory</p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 border-t border-gray-200 pt-4 text-center text-xs text-gray-400 thermal-hide">
          <p>Thank you for your business!</p>
        </div>
      </div>

      <PrintCopiesDialog
        isOpen={showCopiesDialog}
        onClose={() => setShowCopiesDialog(false)}
        onPrint={handlePrintCopies}
      />
    </div>
  );
}
