import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Invoice from "@/models/Invoice";
import Customer from "@/models/Customer";
import Product from "@/models/Product";
import CompanySettings from "@/models/CompanySettings";
import Settings from "@/models/Settings";
import mongoose from "mongoose";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { data } = body;

    if (!data) {
      return NextResponse.json({ error: "Invalid backup data" }, { status: 400 });
    }

    await connectToDatabase();

    const userId = new mongoose.Types.ObjectId(
      (session.user as { id: string }).id
    );

    const { invoices, customers, products, companySettings, settings } = data;

    const restoreOps: Promise<unknown>[] = [];

    if (customers && Array.isArray(customers)) {
      restoreOps.push(
        Customer.deleteMany({ userId }),
        Customer.insertMany(
          customers.map(
            ({ _id, userId: _uid, createdAt, updatedAt, ...rest }: Record<string, unknown>) => ({
              ...rest,
              userId,
            })
          )
        )
      );
    }

    if (products && Array.isArray(products)) {
      restoreOps.push(
        Product.deleteMany({ userId }),
        Product.insertMany(
          products.map(
            ({ _id, userId: _uid, createdAt, updatedAt, ...rest }: Record<string, unknown>) => ({
              ...rest,
              userId,
            })
          )
        )
      );
    }

    if (invoices && Array.isArray(invoices)) {
      restoreOps.push(
        Invoice.deleteMany({ userId }),
        Invoice.insertMany(
          invoices.map(
            ({ _id, userId: _uid, createdAt, updatedAt, ...rest }: Record<string, unknown>) => ({
              ...rest,
              userId,
            })
          )
        )
      );
    }

    if (companySettings) {
      const { _id, userId: _uid, createdAt, updatedAt, ...csRest } =
        companySettings as Record<string, unknown>;
      restoreOps.push(
        CompanySettings.findOneAndUpdate(
          { userId },
          { ...csRest, userId },
          { upsert: true }
        )
      );
    }

    if (settings) {
      const { _id, userId: _uid, createdAt, updatedAt, ...sRest } =
        settings as Record<string, unknown>;
      restoreOps.push(
        Settings.findOneAndUpdate(
          { userId },
          { ...sRest, userId },
          { upsert: true }
        )
      );
    }

    await Promise.all(restoreOps);

    return NextResponse.json({ message: "Data restored successfully" });
  } catch (error) {
    console.error("Restore error:", error);
    return NextResponse.json(
      { error: "Failed to restore data" },
      { status: 500 }
    );
  }
}
