import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Invoice from "@/models/Invoice";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = (session.user as { id: string }).id;

    await connectToDatabase();

    const original = await Invoice.findOne({
      _id: id,
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!original) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const prefix = `INV-${year}${month}-`;

    const lastInvoice = await Invoice.findOne({
      userId,
      invoiceNumber: { $regex: `^${prefix}` },
    })
      .sort({ invoiceNumber: -1 })
      .select("invoiceNumber");

    let nextNumber = 1;
    if (lastInvoice) {
      const lastNum = parseInt(lastInvoice.invoiceNumber.split("-").pop() || "0", 10);
      nextNumber = lastNum + 1;
    }
    const newInvoiceNumber = `${prefix}${String(nextNumber).padStart(4, "0")}`;

    const duplicated = await Invoice.create({
      userId,
      invoiceNumber: newInvoiceNumber,
      invoiceDate: now.toISOString().split("T")[0],
      customerName: original.customerName,
      customerEmail: original.customerEmail,
      customerPhone: original.customerPhone,
      customerAddress: original.customerAddress,
      customerGstNumber: original.customerGstNumber,
      items: original.items.map((item: { productName: string; description: string; quantity: number; rate: number; amount: number; gstPercent: number; gstAmount: number }) => ({
        productName: item.productName,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount,
        gstPercent: item.gstPercent,
        gstAmount: item.gstAmount,
      })),
      subtotal: original.subtotal,
      totalGst: original.totalGst,
      discount: original.discount,
      discountType: original.discountType,
      roundOff: original.roundOff,
      total: original.total,
      status: "draft",
      notes: original.notes,
    });

    return NextResponse.json({ invoice: duplicated }, { status: 201 });
  } catch (error) {
    console.error("Invoice duplicate error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
