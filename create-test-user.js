require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/inventory_db")
  .then(async () => {
    console.log("✅ MongoDB connected");

    try {
      // Delete existing test user
      await User.deleteOne({ email: "test@example.com" });
      console.log("Deleted existing test user");

      // Create new test user
      const user = await User.create({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        storeName: "Test Store",
      });

      console.log("✅ Test user created successfully!");
      console.log("Email: test@example.com");
      console.log("Password: password123");
      console.log("User ID:", user._id);

      process.exit(0);
    } catch (err) {
      console.error("❌ Error:", err.message);
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });
