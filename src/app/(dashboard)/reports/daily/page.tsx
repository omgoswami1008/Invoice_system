"use client";

import ReportView, { type ReportColumn } from "@/components/reports/ReportView";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);
}

const columns: ReportColumn<Record<string, unknown>>[] = [
  { key: "_id", label: "Date", render: (item) => item._id ? new Date(item._id as string).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-" },
  { key: "count", label: "Invoices" },
  { key: "totalRevenue", label: "Revenue", align: "right", render: (item) => formatCurrency((item.totalRevenue as number) || 0) },
  { key: "paidAmount", label: "Paid", align: "right", render: (item) => formatCurrency((item.paidAmount as number) || 0) },
  { key: "pendingAmount", label: "Pending", align: "right", render: (item) => formatCurrency((item.pendingAmount as number) || 0) },
  { key: "overdueAmount", label: "Overdue", align: "right", render: (item) => formatCurrency((item.overdueAmount as number) || 0) },
  { key: "gstCollected", label: "GST", align: "right", render: (item) => formatCurrency((item.gstCollected as number) || 0) },
];

export default function DailyReportPage() {
  return (
    <ReportView
      title="Daily Report"
      reportType="daily"
      columns={columns}
      summaryCards={[]}
    />
  );
}
