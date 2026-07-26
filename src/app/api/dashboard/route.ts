import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Invoice from "@/models/Invoice";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const userId = (session.user as { id: string }).id;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [
      totalInvoices,
      todayInvoices,
      monthlyStats,
      pendingPayments,
      recentInvoices,
      uniqueCustomers,
    ] = await Promise.all([
      Invoice.countDocuments({ userId }),

      Invoice.countDocuments({
        userId,
        createdAt: { $gte: todayStart, $lt: todayEnd },
      }),

      Invoice.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            createdAt: { $gte: monthStart, $lt: monthEnd },
            status: { $in: ["paid", "pending"] },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$total" },
            paidAmount: {
              $sum: {
                $cond: [{ $eq: ["$status", "paid"] }, "$total", 0],
              },
            },
            pendingAmount: {
              $sum: {
                $cond: [{ $eq: ["$status", "pending"] }, "$total", 0],
              },
            },
          },
        },
      ]),

      Invoice.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            status: { $in: ["pending", "overdue"] },
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            totalPending: { $sum: "$total" },
          },
        },
      ]),

      Invoice.find({ userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("invoiceNumber customerName total status createdAt"),

      Invoice.distinct("customerName", { userId }),
    ]);

    const stats = monthlyStats[0] || { totalRevenue: 0, paidAmount: 0, pendingAmount: 0 };
    const pending = pendingPayments[0] || { count: 0, totalPending: 0 };

    return NextResponse.json({
      todayInvoices,
      monthlyRevenue: stats.totalRevenue,
      monthlyPaid: stats.paidAmount,
      monthlyPending: stats.pendingAmount,
      pendingCount: pending.count,
      pendingTotal: pending.totalPending,
      totalInvoices,
      totalCustomers: uniqueCustomers.length,
      recentInvoices,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
