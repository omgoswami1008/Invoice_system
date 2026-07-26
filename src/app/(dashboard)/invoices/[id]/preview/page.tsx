"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { numberToWords, formatCurrency } from "@/lib/utils";

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
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
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

      setLoading(false);
    }

    load();
  }, [invoiceId]);

  const handlePrint = () => {
    window.print();
  };

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
    <div className="mx-auto max-w-4xl space-y-6 print:space-y-0">
      {/* Action buttons — hidden on print */}
      <div className="flex items-center justify-between no-print">
        <Button variant="ghost" onClick={() => router.back()}>
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </Button>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => router.push(`/invoices/${invoiceId}/edit`)}>
            Edit
          </Button>
          <Button onClick={handlePrint}>
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </Button>
        </div>
      </div>

      {/* Invoice Document */}
      <div ref={printRef} className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm print:border-0 print:shadow-none">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between border-b border-gray-200 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {company?.companyName || "Your Company Name"}
            </h1>
            {company?.address && <p className="mt-1 text-sm text-gray-600 whitespace-pre-line">{company.address}</p>}
            {company?.mobileNumber && <p className="mt-1 text-sm text-gray-600">Mobile: {company.mobileNumber}</p>}
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
          <p className="text-base font-semibold text-gray-900">{invoice.customerName}</p>
          {invoice.customerAddress && <p className="text-sm text-gray-600 whitespace-pre-line">{invoice.customerAddress}</p>}
          {invoice.customerPhone && <p className="text-sm text-gray-600">Phone: {invoice.customerPhone}</p>}
          {invoice.customerEmail && <p className="text-sm text-gray-600">Email: {invoice.customerEmail}</p>}
          {invoice.customerGstNumber && <p className="text-sm text-gray-600">GSTIN: {invoice.customerGstNumber}</p>}
        </div>

        {/* Items Table */}
        <div className="mb-8 overflow-x-auto">
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
          <div className="mb-8 rounded-lg border border-gray-200 bg-gray-50 p-4">
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
          <div className="flex justify-end pt-8">
            <div className="text-center">
              <p className="text-sm text-gray-600">{company.signature}</p>
              <div className="mt-1 border-t border-gray-400 pt-1">
                <p className="text-xs text-gray-500">Authorized Signatory</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
