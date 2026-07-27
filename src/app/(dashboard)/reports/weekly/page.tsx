"use client";

import ReportView, { type ReportColumn } from "@/components/reports/ReportView";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);
}

const columns: ReportColumn<Record<string, unknown>>[] = [
  { key: "_id", label: "Week", render: (item) => {
    const id = item._id as { year?: number; week?: number };
    return id?.year && id?.week ? `Week ${id.week}, ${id.year}` : "-";
  }},
  { key: "count", label: "Invoices" },
  { key: "totalRevenue", label: "Revenue", align: "right", render: (item) => formatCurrency((item.totalRevenue as number) || 0) },
  { key: "paidAmount", label: "Paid", align: "right", render: (item) => formatCurrency((item.paidAmount as number) || 0) },
  { key: "pendingAmount", label: "Pending", align: "right", render: (item) => formatCurrency((item.pendingAmount as number) || 0) },
  { key: "gstCollected", label: "GST", align: "right", render: (item) => formatCurrency((item.gstCollected as number) || 0) },
];

export default function WeeklyReportPage() {
  return (
    <ReportView
      title="Weekly Report"
      reportType="weekly"
      columns={columns}
      summaryCards={[]}
    />
  );
}
