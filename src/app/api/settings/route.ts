import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Settings from "@/models/Settings";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const userId = (session.user as { id: string }).id;

    let settings = await Settings.findOne({ userId });

    if (!settings) {
      settings = await Settings.create({
        userId,
        invoicePrefix: "INV",
        currency: "INR",
        currencySymbol: "₹",
        theme: "light",
        printerSettings: {
          pageSize: "A4",
          marginTop: "10mm",
          marginBottom: "10mm",
          marginLeft: "10mm",
          marginRight: "10mm",
          showHeader: true,
          showFooter: true,
          printCopies: 1,
        },
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Settings fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { invoicePrefix, currency, currencySymbol, theme, printerSettings } = body;

    await connectToDatabase();

    const userId = (session.user as { id: string }).id;

    const settings = await Settings.findOneAndUpdate(
      { userId },
      {
        invoicePrefix,
        currency,
        currencySymbol,
        theme,
        printerSettings,
      },
      { returnDocument: "after", runValidators: true, upsert: true }
    );

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Settings update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
