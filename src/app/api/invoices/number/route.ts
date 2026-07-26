import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
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

    const invoiceNumber = `${prefix}${String(nextNumber).padStart(4, "0")}`;

    return NextResponse.json({ invoiceNumber });
  } catch (error) {
    console.error("Invoice number generation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
