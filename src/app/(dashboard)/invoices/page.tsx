"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";

interface Invoice {
  _id: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  total: number;
  status: string;
  createdAt: string;
}

const statusStyles: Record<string, string> = {
  paid: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  overdue: "bg-red-100 text-red-800",
  draft: "bg-gray-100 text-gray-800",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const fetchedRef = useRef(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadInvoices = async (q = "", status = "", sort = "newest", dFrom = "", dTo = "") => {
    try {
      const params = new URLSearchParams();
      if (q) params.set("search", q);
      if (status) params.set("status", status);
      if (sort) params.set("sort", sort);
      if (dFrom) params.set("dateFrom", dFrom);
      if (dTo) params.set("dateTo", dTo);
      const query = params.toString();
      const res = await fetch(`/api/invoices${query ? `?${query}` : ""}`);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices);
      }
    } catch {
      console.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    loadInvoices();
  }, []);

  const handleSearch = (value: string) => {
    setSearch(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      loadInvoices(value, filterStatus, sortBy, dateFrom, dateTo);
    }, 300);
  };

  const handleFilterChange = (newStatus?: string, newSort?: string, newDateFrom?: string, newDateTo?: string) => {
    const s = newStatus !== undefined ? newStatus : filterStatus;
    const so = newSort !== undefined ? newSort : sortBy;
    const df = newDateFrom !== undefined ? newDateFrom : dateFrom;
    const dt = newDateTo !== undefined ? newDateTo : dateTo;
    if (newStatus !== undefined) setFilterStatus(newStatus);
    if (newSort !== undefined) setSortBy(newSort);
    if (newDateFrom !== undefined) setDateFrom(newDateFrom);
    if (newDateTo !== undefined) setDateTo(newDateTo);
    loadInvoices(search, s, so, df, dt);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      if (res.ok) {
        setInvoices((prev) => prev.filter((inv) => inv._id !== id));
        setDeleteConfirm(null);
      }
    } catch {
      console.error("Failed to delete invoice");
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setInvoices((prev) => prev.map((inv) => (inv._id === id ? { ...inv, status: newStatus } : inv)));
      }
    } catch {
      console.error("Failed to update status");
    }
  };

  const handleDuplicate = async (id: string) => {
    setDuplicating(id);
    try {
      const res = await fetch(`/api/invoices/${id}/duplicate`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        router.push(`/invoices/${data.invoice._id}/edit`);
      }
    } catch {
      console.error("Failed to duplicate invoice");
    } finally {
      setDuplicating(null);
    }
  };

  const handleExportCSV = () => {
    const headers = ["Invoice #", "Customer", "Date", "Amount", "Status"];
    const rows = invoices.map((inv) => [
      inv.invoiceNumber,
      inv.customerName,
      formatDate(inv.invoiceDate || inv.createdAt),
      inv.total.toFixed(2),
      inv.status,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoices-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeFilters = (filterStatus ? 1 : 0) + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0) + (sortBy !== "newest" ? 1 : 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="mt-1 text-sm text-gray-600">Manage and track all your invoices.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleExportCSV}>
            <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </Button>
          <Link href="/invoices/new">
            <Button>
              <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Invoice
            </Button>
          </Link>
        </div>
      </div>

      {/* Search & Quick Filters */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by invoice number or customer..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm shadow-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => handleFilterChange(undefined, e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="amount-high">Amount: High to Low</option>
              <option value="amount-low">Amount: Low to High</option>
              <option value="customer-az">Customer: A-Z</option>
              <option value="customer-za">Customer: Z-A</option>
            </select>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                showFilters || activeFilters > 0
                  ? "border-blue-300 bg-blue-50 text-blue-700"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
              {activeFilters > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">{activeFilters}</span>
              )}
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          {["", "draft", "pending", "paid", "overdue"].map((s) => (
            <button
              key={s}
              onClick={() => handleFilterChange(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filterStatus === s
                  ? "bg-blue-600 text-white"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {s || "All"}
            </button>
          ))}
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="flex flex-wrap items-end gap-4 rounded-lg border border-gray-200 bg-white p-4">
            <div>
              <label className="block text-xs font-medium text-gray-600">Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => handleFilterChange(undefined, undefined, e.target.value)}
                className="mt-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => handleFilterChange(undefined, undefined, undefined, e.target.value)}
                className="mt-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {activeFilters > 0 && (
              <button
                onClick={() => {
                  setFilterStatus("");
                  setSortBy("newest");
                  setDateFrom("");
                  setDateTo("");
                  loadInvoices(search, "", "newest", "", "");
                }}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Invoice Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {invoices.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {search || filterStatus || dateFrom || dateTo ? "Try different search or filters." : "Get started by creating your first invoice."}
            </p>
            {!search && !filterStatus && !dateFrom && !dateTo && (
              <div className="mt-4">
                <Link href="/invoices/new">
                  <Button size="sm">Create Invoice</Button>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Invoice</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <button
                        onClick={() => router.push(`/invoices/${inv._id}/preview`)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        {inv.invoiceNumber}
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">{inv.customerName || "Walk-in"}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">{formatDate(inv.invoiceDate || inv.createdAt)}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{formatCurrency(inv.total)}</td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <select
                        value={inv.status}
                        onChange={(e) => updateStatus(inv._id, e.target.value)}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[inv.status] || ""}`}
                      >
                        <option value="draft">Draft</option>
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                        <option value="overdue">Overdue</option>
                      </select>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => router.push(`/invoices/${inv._id}/preview`)}
                          className="rounded-lg p-2 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                          title="Preview"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => router.push(`/invoices/${inv._id}/edit`)}
                          className="rounded-lg p-2 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                          title="Edit"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDuplicate(inv._id)}
                          disabled={duplicating === inv._id}
                          className="rounded-lg p-2 text-gray-400 hover:bg-green-50 hover:text-green-600 disabled:opacity-50"
                          title="Duplicate"
                        >
                          {duplicating === inv._id ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
                          ) : (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                            </svg>
                          )}
                        </button>
                        {deleteConfirm === inv._id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(inv._id)}
                              className="rounded-lg bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="rounded-lg border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(inv._id)}
                            className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                            title="Delete"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
