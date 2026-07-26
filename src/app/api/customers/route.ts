import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Customer from "@/models/Customer";

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

    const query: Record<string, unknown> = { userId: new mongoose.Types.ObjectId(userId) };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { mobile: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { gstNumber: { $regex: search, $options: "i" } },
      ];
    }

    const customers = await Customer.find(query).sort({ createdAt: -1 });

    return NextResponse.json({ customers });
  } catch (error) {
    console.error("Customer fetch error:", error);
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
    const { name, mobile, gstNumber, address, email } = body;

    if (!name) {
      return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
    }

    await connectToDatabase();

    const userId = (session.user as { id: string }).id;

    const customer = await Customer.create({
      userId,
      name,
      mobile: mobile || "",
      gstNumber: gstNumber || "",
      address: address || "",
      email: email || "",
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    console.error("Customer create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
