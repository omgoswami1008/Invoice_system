"use client";

import ReportView, { type ReportColumn } from "@/components/reports/ReportView";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);
}

const months = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const columns: ReportColumn<Record<string, unknown>>[] = [
  { key: "_id", label: "Month", render: (item) => {
    const id = item._id as { year?: number; month?: number };
    return id?.year && id?.month ? `${months[id.month]} ${id.year}` : "-";
  }},
  { key: "count", label: "Invoices" },
  { key: "totalRevenue", label: "Revenue", align: "right", render: (item) => formatCurrency((item.totalRevenue as number) || 0) },
  { key: "paidAmount", label: "Paid", align: "right", render: (item) => formatCurrency((item.paidAmount as number) || 0) },
  { key: "pendingAmount", label: "Pending", align: "right", render: (item) => formatCurrency((item.pendingAmount as number) || 0) },
  { key: "overdueAmount", label: "Overdue", align: "right", render: (item) => formatCurrency((item.overdueAmount as number) || 0) },
  { key: "gstCollected", label: "GST", align: "right", render: (item) => formatCurrency((item.gstCollected as number) || 0) },
  { key: "totalDiscount", label: "Discount", align: "right", render: (item) => formatCurrency((item.totalDiscount as number) || 0) },
];

export default function MonthlyReportPage() {
  return (
    <ReportView
      title="Monthly Report"
      reportType="monthly"
      columns={columns}
      summaryCards={[]}
    />
  );
}
