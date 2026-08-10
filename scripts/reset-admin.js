const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const uri = "mongodb+srv://omg60963_db_user:aLE6dmt4c3M4px6a@invoices.ddzmm78.mongodb.net/invoice_db";

async function main() {
  await mongoose.connect(uri, { dbName: "invoice_db" });

  const User = mongoose.connection.collection("users");

  const email = "admin@invoice.com";
  const password = "om@10081008";
  const hashed = await bcrypt.hash(password, 12);

  const existing = await User.findOne({ email });

  if (existing) {
    const result = await User.updateOne({ email }, { $set: { password: hashed } });
    console.log("Updated existing user:", result.modifiedCount);
  } else {
    const result = await User.insertOne({
      name: "Admin",
      email,
      password: hashed,
      company: "Invoice Generator",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log("Created new user:", result.insertedId.toString());
  }

  const verify = await User.findOne({ email });
  const ok = await bcrypt.compare(password, verify.password);
  console.log("Password verify:", ok ? "SUCCESS" : "FAILED");
  console.log("Login with: admin@invoice.com / om@10081008");

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
