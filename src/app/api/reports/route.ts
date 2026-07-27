import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Invoice from "@/models/Invoice";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const userId = (session.user as { id: string }).id;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "daily";
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";
    const customerId = searchParams.get("customerId") || "";

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const matchStage: Record<string, unknown> = { userId: userObjectId };

    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) dateFilter.$gte = new Date(dateFrom);
      if (dateTo) {
        const d = new Date(dateTo);
        d.setDate(d.getDate() + 1);
        dateFilter.$lt = d;
      }
      matchStage.invoiceDate = dateFilter;
    }

    let result: unknown = {};

    switch (type) {
      case "daily": {
        const data = await Invoice.aggregate([
          { $match: matchStage },
          {
            $group: {
              _id: "$invoiceDate",
              count: { $sum: 1 },
              totalRevenue: { $sum: "$total" },
              paidAmount: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$total", 0] } },
              pendingAmount: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$total", 0] } },
              overdueAmount: { $sum: { $cond: [{ $eq: ["$status", "overdue"] }, "$total", 0] } },
              draftAmount: { $sum: { $cond: [{ $eq: ["$status", "draft"] }, "$total", 0] } },
              gstCollected: { $sum: "$totalGst" },
              totalDiscount: { $sum: "$discount" },
            },
          },
          { $sort: { _id: -1 } },
        ]);
        result = data;
        break;
      }

      case "weekly": {
        const data = await Invoice.aggregate([
          { $match: matchStage },
          {
            $group: {
              _id: {
                year: { $year: "$invoiceDate" },
                week: { $isoWeek: "$invoiceDate" },
              },
              count: { $sum: 1 },
              totalRevenue: { $sum: "$total" },
              paidAmount: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$total", 0] } },
              pendingAmount: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$total", 0] } },
              gstCollected: { $sum: "$totalGst" },
              startDate: { $min: "$invoiceDate" },
              endDate: { $max: "$invoiceDate" },
            },
          },
          { $sort: { "_id.year": -1, "_id.week": -1 } },
        ]);
        result = data;
        break;
      }

      case "monthly": {
        const data = await Invoice.aggregate([
          { $match: matchStage },
          {
            $group: {
              _id: {
                year: { $year: "$invoiceDate" },
                month: { $month: "$invoiceDate" },
              },
              count: { $sum: 1 },
              totalRevenue: { $sum: "$total" },
              paidAmount: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$total", 0] } },
              pendingAmount: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$total", 0] } },
              overdueAmount: { $sum: { $cond: [{ $eq: ["$status", "overdue"] }, "$total", 0] } },
              gstCollected: { $sum: "$totalGst" },
              totalDiscount: { $sum: "$discount" },
            },
          },
          { $sort: { "_id.year": -1, "_id.month": -1 } },
        ]);
        result = data;
        break;
      }

      case "customer": {
        const customerMatch = customerId
          ? { ...matchStage, customerName: customerId }
          : matchStage;
        const data = await Invoice.aggregate([
          { $match: customerMatch },
          {
            $group: {
              _id: "$customerName",
              count: { $sum: 1 },
              totalRevenue: { $sum: "$total" },
              avgInvoice: { $avg: "$total" },
              paidAmount: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$total", 0] } },
              pendingAmount: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$total", 0] } },
              lastInvoiceDate: { $max: "$invoiceDate" },
            },
          },
          { $sort: { totalRevenue: -1 } },
        ]);
        result = data;
        break;
      }

      case "product": {
        const data = await Invoice.aggregate([
          { $match: matchStage },
          { $unwind: "$items" },
          {
            $group: {
              _id: "$items.productName",
              totalQuantity: { $sum: "$items.quantity" },
              totalRevenue: { $sum: "$items.amount" },
              totalGst: { $sum: "$items.gstAmount" },
              avgRate: { $avg: "$items.rate" },
              invoiceCount: { $addToSet: "$_id" },
            },
          },
          {
            $project: {
              _id: 1,
              totalQuantity: 1,
              totalRevenue: 1,
              totalGst: 1,
              avgRate: 1,
              invoiceCount: { $size: "$invoiceCount" },
            },
          },
          { $sort: { totalRevenue: -1 } },
        ]);
        result = data;
        break;
      }

      case "sales": {
        const data = await Invoice.aggregate([
          { $match: matchStage },
          {
            $group: {
              _id: null,
              totalInvoices: { $sum: 1 },
              totalRevenue: { $sum: "$total" },
              totalGst: { $sum: "$totalGst" },
              totalDiscount: { $sum: "$discount" },
              paidCount: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] } },
              pendingCount: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
              overdueCount: { $sum: { $cond: [{ $eq: ["$status", "overdue"] }, 1, 0] } },
              draftCount: { $sum: { $cond: [{ $eq: ["$status", "draft"] }, 1, 0] } },
              paidAmount: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$total", 0] } },
              pendingAmount: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$total", 0] } },
              overdueAmount: { $sum: { $cond: [{ $eq: ["$status", "overdue"] }, "$total", 0] } },
              netRevenue: { $sum: { $subtract: ["$total", "$discount"] } },
            },
          },
        ]);
        result = data[0] || {};
        break;
      }

      default:
        return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("Reports error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
