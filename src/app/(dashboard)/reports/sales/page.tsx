"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);
}

interface SalesData {
  totalInvoices: number;
  totalRevenue: number;
  totalGst: number;
  totalDiscount: number;
  netRevenue: number;
  paidCount: number;
  pendingCount: number;
  overdueCount: number;
  draftCount: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
}

export default function SalesReportPage() {
  const router = useRouter();
  const [data, setData] = useState<SalesData | null>(null);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split("T")[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];

  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(today);

  const fetchedRef = useRef(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: "sales" });
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const res = await fetch(`/api/reports?${params.toString()}`);
      if (res.ok) {
        const result = await res.json();
        setData(result.data);
      }
    } catch {
      console.error("Failed to load report");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    loadData();
  }, [loadData]);

  const handleExportCSV = () => {
    if (!data) return;
    const rows = [
      ["Metric", "Value"],
      ["Total Invoices", String(data.totalInvoices)],
      ["Total Revenue", data.totalRevenue.toFixed(2)],
      ["Total GST Collected", data.totalGst.toFixed(2)],
      ["Total Discounts", data.totalDiscount.toFixed(2)],
      ["Net Revenue", data.netRevenue.toFixed(2)],
      ["Paid Invoices", String(data.paidCount)],
      ["Paid Amount", data.paidAmount.toFixed(2)],
      ["Pending Invoices", String(data.pendingCount)],
      ["Pending Amount", data.pendingAmount.toFixed(2)],
      ["Overdue Invoices", String(data.overdueCount)],
      ["Overdue Amount", data.overdueAmount.toFixed(2)],
      ["Draft Invoices", String(data.draftCount)],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-report-${dateFrom}-to-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Report</h1>
          <p className="mt-1 text-sm text-gray-600">Overall sales summary with GST breakdown.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => router.push("/reports")}>
          <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          All Reports
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div>
          <label className="block text-xs font-medium text-gray-600">From</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600">To</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <Button size="sm" onClick={loadData}>Refresh</Button>
        <Button variant="secondary" size="sm" onClick={handleExportCSV}>Export CSV</Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : data ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-gray-200 border-l-4 border-l-blue-500 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-500">Total Invoices</p>
              <p className="mt-1 text-xl font-bold text-gray-900">{data.totalInvoices}</p>
            </div>
            <div className="rounded-lg border border-gray-200 border-l-4 border-l-green-500 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-500">Total Revenue</p>
              <p className="mt-1 text-xl font-bold text-gray-900">{formatCurrency(data.totalRevenue)}</p>
            </div>
            <div className="rounded-lg border border-gray-200 border-l-4 border-l-purple-500 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-500">GST Collected</p>
              <p className="mt-1 text-xl font-bold text-gray-900">{formatCurrency(data.totalGst)}</p>
              <p className="mt-0.5 text-xs text-gray-500">Discounts: {formatCurrency(data.totalDiscount)}</p>
            </div>
            <div className="rounded-lg border border-gray-200 border-l-4 border-l-teal-500 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-500">Net Revenue</p>
              <p className="mt-1 text-xl font-bold text-gray-900">{formatCurrency(data.netRevenue)}</p>
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                  <span className="text-sm font-bold text-green-700">{data.paidCount}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Paid</p>
                  <p className="text-xs text-gray-500">{formatCurrency(data.paidAmount)}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
                  <span className="text-sm font-bold text-yellow-700">{data.pendingCount}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Pending</p>
                  <p className="text-xs text-gray-500">{formatCurrency(data.pendingAmount)}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                  <span className="text-sm font-bold text-red-700">{data.overdueCount}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Overdue</p>
                  <p className="text-xs text-gray-500">{formatCurrency(data.overdueAmount)}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                  <span className="text-sm font-bold text-gray-700">{data.draftCount}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Draft</p>
                  <p className="text-xs text-gray-500">Not yet submitted</p>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white py-12 text-center">
          <p className="text-sm text-gray-500">No data available for the selected period.</p>
        </div>
      )}
    </div>
  );
}
