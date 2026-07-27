"use client";

import ReportView, { type ReportColumn } from "@/components/reports/ReportView";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);
}

const columns: ReportColumn<Record<string, unknown>>[] = [
  { key: "_id", label: "Product", render: (item) => (item._id as string) || "Unknown" },
  { key: "totalQuantity", label: "Qty Sold" },
  { key: "invoiceCount", label: "Invoices" },
  { key: "avgRate", label: "Avg Rate", align: "right", render: (item) => formatCurrency((item.avgRate as number) || 0) },
  { key: "totalRevenue", label: "Revenue", align: "right", render: (item) => formatCurrency((item.totalRevenue as number) || 0) },
  { key: "totalGst", label: "GST", align: "right", render: (item) => formatCurrency((item.totalGst as number) || 0) },
];

export default function ProductReportPage() {
  return (
    <ReportView
      title="Product Report"
      reportType="product"
      columns={columns}
      summaryCards={[]}
    />
  );
}
