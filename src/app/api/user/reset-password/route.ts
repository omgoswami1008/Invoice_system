import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import { hashPassword } from "@/lib/password";

export async function GET() {
  return handleReset();
}

export async function POST() {
  return handleReset();
}

async function handleReset() {
  try {
    await connectToDatabase();

    const email = "admin@invoice.com";
    const newPassword = "om@10081008";

    const user = await User.findOne({ email });

    if (!user) {
      const hashed = await hashPassword(newPassword);
      const created = await User.create({
        name: "Admin",
        email,
        password: hashed,
        company: "Invoice Generator",
      });
      return NextResponse.json({
        message: "Admin user created",
        credentials: { email, password: newPassword },
        user: { id: created._id, name: created.name, email: created.email },
      });
    }

    user.password = await hashPassword(newPassword);
    await user.save();

    return NextResponse.json({
      message: "Admin password reset successfully",
      credentials: { email, password: newPassword },
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
