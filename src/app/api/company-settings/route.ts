import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import CompanySettings from "@/models/CompanySettings";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const userId = (session.user as { id: string }).id;

    let settings = await CompanySettings.findOne({ userId });

    if (!settings) {
      settings = await CompanySettings.create({
        userId,
        companyName: "",
        address: "",
        mobileNumber: "",
        bankDetails: {
          bankName: "",
          accountHolderName: "",
          accountNumber: "",
          ifscCode: "",
          branch: "",
        },
        signature: "",
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Company settings fetch error:", error);
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
    const { companyName, address, mobileNumber, bankDetails, signature } = body;

    await connectToDatabase();

    const userId = (session.user as { id: string }).id;

    const settings = await CompanySettings.findOneAndUpdate(
      { userId },
      {
        companyName,
        address,
        mobileNumber,
        bankDetails,
        signature,
      },
      { returnDocument: "after", runValidators: true, upsert: true }
    );

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Company settings update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
