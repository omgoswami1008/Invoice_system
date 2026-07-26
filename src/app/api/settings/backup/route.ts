import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Invoice from "@/models/Invoice";
import Customer from "@/models/Customer";
import Product from "@/models/Product";
import CompanySettings from "@/models/CompanySettings";
import Settings from "@/models/Settings";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const userId = (session.user as { id: string }).id;

    const [invoices, customers, products, companySettings, settings] =
      await Promise.all([
        Invoice.find({ userId }).lean(),
        Customer.find({ userId }).lean(),
        Product.find({ userId }).lean(),
        CompanySettings.findOne({ userId }).lean(),
        Settings.findOne({ userId }).lean(),
      ]);

    const backup = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      data: {
        invoices,
        customers,
        products,
        companySettings,
        settings,
      },
    };

    return NextResponse.json(backup, {
      headers: {
        "Content-Disposition": `attachment; filename="invoice-backup-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("Backup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
