"use client";

import ReportView, { type ReportColumn } from "@/components/reports/ReportView";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);
}

const columns: ReportColumn<Record<string, unknown>>[] = [
  { key: "_id", label: "Customer", render: (item) => (item._id as string) || "Walk-in" },
  { key: "count", label: "Invoices" },
  { key: "totalRevenue", label: "Total Revenue", align: "right", render: (item) => formatCurrency((item.totalRevenue as number) || 0) },
  { key: "avgInvoice", label: "Avg Invoice", align: "right", render: (item) => formatCurrency((item.avgInvoice as number) || 0) },
  { key: "paidAmount", label: "Paid", align: "right", render: (item) => formatCurrency((item.paidAmount as number) || 0) },
  { key: "pendingAmount", label: "Pending", align: "right", render: (item) => formatCurrency((item.pendingAmount as number) || 0) },
  { key: "lastInvoiceDate", label: "Last Invoice", render: (item) => {
    const d = item.lastInvoiceDate as string;
    return d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";
  }},
];

export default function CustomerReportPage() {
  return (
    <ReportView
      title="Customer Report"
      reportType="customer"
      columns={columns}
      summaryCards={[]}
    />
  );
}
