import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import { hashPassword } from "@/lib/password";

export async function GET() {
  return handleSeed();
}

export async function POST() {
  return handleSeed();
}

async function handleSeed() {
  try {
    await connectToDatabase();

    const existingUser = await User.findOne();

    if (existingUser) {
      return NextResponse.json(
        { error: "Admin user already exists. You can login with: admin@invoice.com / admin123" },
        { status: 400 }
      );
    }

    const defaultEmail = "admin@invoice.com";
    const defaultPassword = "admin123";
    const defaultName = "Admin";

    const hashedPassword = await hashPassword(defaultPassword);

    const user = await User.create({
      name: defaultName,
      email: defaultEmail,
      password: hashedPassword,
      company: "Invoice Generator",
    });

    return NextResponse.json({
      message: "Admin user created successfully",
      credentials: {
        email: defaultEmail,
        password: defaultPassword,
      },
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
