const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth", require("./routes/auth"));
app.use("/api/products", require("./routes/products"));
app.use("/api/sales", require("./routes/sales"));
app.use("/api/reports", require("./routes/reports"));
app.use("/api/alerts", require("./routes/alerts"));

// ── Health Check ──────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "Inventory Management API Running",
    version: "1.0.0",
  });
});

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Error:", err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// ── Unhandled Rejection / Exception Handlers ──────────────────────────────────
process.on("unhandledRejection", (err, promise) => {
  console.error(`❌ Unhandled Rejection: ${err.message}`);
  // Optionally, log the promise that caused the rejection
  // console.error(promise);
  // Close server & exit process
  if (server) {
    // Ensure server is defined before trying to close
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

process.on("uncaughtException", (err) => {
  console.error(`❌ Uncaught Exception: ${err.message}`);
  // Close server & exit process
  if (server) {
    // Ensure server is defined before trying to close
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

// ── MongoDB Connection + Server Start ─────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/inventory_db";

let server; // Declare server variable here so it's accessible by the global error handlers

const startServer = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      family: 4,
    });
    console.log("✅ MongoDB connected successfully");

    server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📱 API available at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    if (
      String(err.message).includes("querySrv") ||
      String(err.message).includes("ECONNREFUSED")
    ) {
      console.error(
        "   Hint: Atlas DNS/network issue. Try: (1) Use Wi‑Fi/mobile hotspot, (2) Turn VPN off, (3) Set DNS to 8.8.8.8, (4) Run: ipconfig /flushdns",
      );
    }
    process.exit(1);
  }
};

startServer(); // Call the async function to start the server

module.exports = app;
