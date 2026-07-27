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
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";
    const sort = searchParams.get("sort") || "newest";

    const query: Record<string, unknown> = { userId: new mongoose.Types.ObjectId(userId) };

    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: "i" } },
        { customerName: { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      query.status = status;
    }

    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) dateFilter.$gte = new Date(dateFrom);
      if (dateTo) {
        const d = new Date(dateTo);
        d.setDate(d.getDate() + 1);
        dateFilter.$lt = d;
      }
      query.invoiceDate = dateFilter;
    }

    const sortOptions: Record<string, Record<string, 1 | -1>> = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      "amount-high": { total: -1 },
      "amount-low": { total: 1 },
      "customer-az": { customerName: 1 },
      "customer-za": { customerName: -1 },
    };

    const invoices = await Invoice.find(query).sort(sortOptions[sort] || sortOptions.newest);

    return NextResponse.json({ invoices });
  } catch (error) {
    console.error("Invoices fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      invoiceNumber,
      invoiceDate,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      customerGstNumber,
      items,
      subtotal,
      totalGst,
      discount,
      discountType,
      roundOff,
      total,
      status,
      notes,
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "At least one item is required" }, { status: 400 });
    }

    await connectToDatabase();

    const userId = (session.user as { id: string }).id;

    const invoice = await Invoice.create({
      userId,
      invoiceNumber,
      invoiceDate,
      customerName,
      customerEmail: customerEmail || "",
      customerPhone: customerPhone || "",
      customerAddress: customerAddress || "",
      customerGstNumber: customerGstNumber || "",
      items,
      subtotal,
      totalGst: totalGst || 0,
      discount: discount || 0,
      discountType: discountType || "fixed",
      roundOff: roundOff || 0,
      total,
      status: status || "draft",
      notes: notes || "",
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    console.error("Invoice create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
