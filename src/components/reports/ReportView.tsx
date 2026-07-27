"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);
}

interface DateRangePickerProps {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
}

function DateRangePicker({ dateFrom, dateTo, onDateFromChange, onDateToChange }: DateRangePickerProps) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div>
        <label className="block text-xs font-medium text-gray-600">From</label>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600">To</label>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}

interface SummaryCardProps {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}

function SummaryCard({ label, value, sub, color = "gray" }: SummaryCardProps) {
  const colorMap: Record<string, string> = {
    blue: "border-l-blue-500",
    green: "border-l-green-500",
    red: "border-l-red-500",
    yellow: "border-l-yellow-500",
    purple: "border-l-purple-500",
    gray: "border-l-gray-300",
  };
  return (
    <div className={`rounded-lg border border-gray-200 border-l-4 ${colorMap[color]} bg-white p-4 shadow-sm`}>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

export interface ReportColumn<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
  align?: "left" | "center" | "right";
}

interface ReportViewProps {
  title: string;
  reportType: string;
  columns: ReportColumn<Record<string, unknown>>[];
  summaryCards: SummaryCardProps[];
  showDateRange?: boolean;
  extraFilters?: React.ReactNode;
}

function toCSV(columns: ReportColumn<Record<string, unknown>>[], data: Record<string, unknown>[]): string {
  const headers = columns.map((c) => c.label);
  const rows = data.map((item) =>
    columns.map((c) => {
      const val = item[c.key];
      if (typeof val === "number") return val.toString();
      if (typeof val === "string") return val;
      if (val && typeof val === "object") return JSON.stringify(val);
      return "";
    })
  );
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

export default function ReportView({
  title,
  reportType,
  columns,
  summaryCards,
  showDateRange = true,
  extraFilters,
}: ReportViewProps) {
  const router = useRouter();
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split("T")[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];

  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(today);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: reportType });
      if (showDateRange && dateFrom) params.set("dateFrom", dateFrom);
      if (showDateRange && dateTo) params.set("dateTo", dateTo);
      const res = await fetch(`/api/reports?${params.toString()}`);
      if (res.ok) {
        const result = await res.json();
        const d = result.data;
        setData(Array.isArray(d) ? d : d && typeof d === "object" ? [d] : []);
      }
    } catch {
      console.error("Failed to load report");
    } finally {
      setLoading(false);
    }
  }, [reportType, showDateRange, dateFrom, dateTo]);

  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    loadData();
  }, [loadData]);

  const handleExportCSV = () => {
    const csv = toCSV(columns, data);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reportType}-report-${dateFrom}-to-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const maxRevenue = Math.max(...data.map((d) => (d.totalRevenue as number) || 0), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="mt-1 text-sm text-gray-600">Analyze your data for the selected period.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => router.push("/reports")}>
          <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          All Reports
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        {showDateRange && (
          <DateRangePicker dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} />
        )}
        {extraFilters}
        <Button size="sm" onClick={loadData}>Refresh</Button>
        <Button variant="secondary" size="sm" onClick={handleExportCSV}>Export CSV</Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          {summaryCards.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {summaryCards.map((card, i) => (
                <SummaryCard key={i} {...card} />
              ))}
            </div>
          )}

          {/* Bar Chart */}
          {data.length > 0 && data[0].totalRevenue !== undefined && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold text-gray-700">Revenue Overview</h3>
              <div className="flex items-end gap-2" style={{ height: "160px" }}>
                {data.slice(0, 12).map((item, i) => {
                  const height = ((item.totalRevenue as number) || 0) / maxRevenue * 100;
                  const label = (item._id as string) || "";
                  return (
                    <div key={i} className="flex flex-1 flex-col items-center gap-1">
                      <span className="text-[10px] text-gray-500">{formatCurrency((item.totalRevenue as number) || 0)}</span>
                      <div
                        className="w-full rounded-t bg-blue-500 transition-all"
                        style={{ height: `${Math.max(height, 4)}%` }}
                        title={`${label}: ${formatCurrency((item.totalRevenue as number) || 0)}`}
                      />
                      <span className="text-[10px] text-gray-500 truncate w-full text-center" title={label}>
                        {typeof label === "string" && label.length > 6 ? label.slice(5, 7) + "/" + label.slice(2, 4) : label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Data Table */}
          {data.length > 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {columns.map((col) => (
                        <th
                          key={col.key}
                          className={`px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 ${
                            col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                          }`}
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        {columns.map((col) => (
                          <td
                            key={col.key}
                            className={`px-4 py-3 text-sm text-gray-700 ${
                              col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : ""
                            }`}
                          >
                            {col.render ? col.render(item) : String(item[col.key] ?? "-")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white py-12 text-center">
              <p className="text-sm text-gray-500">No data available for the selected period.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
