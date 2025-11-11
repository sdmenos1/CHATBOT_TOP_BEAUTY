require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const whatsappRoutes = require("./routes/whatsapp.routes");

// REFACTOR NOTE: Removed Google OAuth routes import - no longer needed

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({
    status: "active",
    message: "WhatsApp Chatbot API - Internal Advisor System",
    version: "3.0.0",
    features: [
      "WhatsApp messaging",
      "Appointment registration for advisors",
      "Google Sheets integration",
    ],
  });
});

app.use("/", whatsappRoutes);
// REFACTOR NOTE: Removed Google OAuth routes - no longer needed

async function connectDatabase() {
  try {
    if (!process.env.MONGO_URI) {
      console.warn("⚠️  MONGO_URI not configured.");
      console.warn(
        "📦 Using in-memory session storage (data will not persist between restarts)."
      );
      console.warn(
        "💡 Set MONGO_URI in your environment to enable permanent data persistence."
      );
      return;
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected successfully - data will persist");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    console.log("📦 Falling back to in-memory session storage.");
    console.log(
      "⚠️  Data will not persist between restarts. Fix MONGO_URI to enable persistence."
    );
  }
}

async function startServer() {
  await connectDatabase();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🚀 WhatsApp Chatbot Server (Advisor System) running on port ${PORT}`);
    console.log(`📍 Webhook URL: http://localhost:${PORT}/webhook`);
    console.log(`\n📋 Required environment variables:`);
    console.log(`   - PORT: ${process.env.PORT || "using default 3000"}`);
    console.log(
      `   - VERIFY_TOKEN: ${process.env.VERIFY_TOKEN ? "✅ Set" : "❌ Not set"}`
    );
    console.log(
      `   - ACCESS_TOKEN: ${process.env.ACCESS_TOKEN ? "✅ Set" : "❌ Not set"}`
    );
    console.log(
      `   - PHONE_NUMBER_ID: ${
        process.env.PHONE_NUMBER_ID ? "✅ Set" : "❌ Not set"
      }`
    );
    console.log(
      `   - MONGO_URI: ${
        process.env.MONGO_URI ? "✅ Set" : "⚠️  Optional (not set)"
      }`
    );
    console.log(`\n📊 Google Sheets Integration:`);
    console.log(
      `   - GOOGLE_CREDENTIALS_PATH: ${
        process.env.GOOGLE_CREDENTIALS_PATH ? "✅ Set" : "⚠️  Using default path"
      }`
    );
    console.log(
      `   - GOOGLE_SHEETS_ID_CHIMBOTE: ${
        process.env.GOOGLE_SHEETS_ID_CHIMBOTE ? "✅ Set" : "⚠️  Not set"
      }`
    );
    console.log(
      `   - GOOGLE_SHEETS_ID_TRUJILLO: ${
        process.env.GOOGLE_SHEETS_ID_TRUJILLO ? "✅ Set" : "⚠️  Not set"
      }`
    );
    console.log(
      `   - GOOGLE_SHEETS_ID_OLIVOS: ${
        process.env.GOOGLE_SHEETS_ID_OLIVOS ? "✅ Set" : "⚠️  Not set"
      }`
    );
    console.log(
      `   - GOOGLE_SHEETS_ID_AREQUIPA: ${
        process.env.GOOGLE_SHEETS_ID_AREQUIPA ? "✅ Set" : "⚠️  Not set"
      }`
    );
    console.log(
      `   - GOOGLE_SHEETS_ID_LINCE: ${
        process.env.GOOGLE_SHEETS_ID_LINCE ? "✅ Set" : "⚠️  Not set"
      }`
    );
    console.log(
      `   - GOOGLE_SHEETS_ID_PUCALLPA: ${
        process.env.GOOGLE_SHEETS_ID_PUCALLPA ? "✅ Set" : "⚠️  Not set"
      }`
    );
    console.log(
      `   - GOOGLE_SHEETS_ID_BOGOTA: ${
        process.env.GOOGLE_SHEETS_ID_BOGOTA ? "✅ Set" : "⚠️  Not set"
      }`
    );
    console.log(
      `   - GOOGLE_SHEETS_ID_LUXURY: ${
        process.env.GOOGLE_SHEETS_ID_LUXURY ? "✅ Set" : "⚠️  Not set"
      }`
    );
    console.log(
      `   - GOOGLE_SHEETS_ID_MEDELLIN: ${
        process.env.GOOGLE_SHEETS_ID_MEDELLIN ? "✅ Set" : "⚠️  Not set"
      }`
    );
    console.log(
      `   - GOOGLE_SHEETS_ID_CHAPINEROS: ${
        process.env.GOOGLE_SHEETS_ID_CHAPINEROS ? "✅ Set" : "⚠️  Not set"
      }`
    );
    console.log(
      `   - GOOGLE_SHEETS_ID_LOS_LEONES: ${
        process.env.GOOGLE_SHEETS_ID_LOS_LEONES ? "✅ Set" : "⚠️  Not set"
      }`
    );
    console.log(
      `   - GOOGLE_SHEETS_ID_PROVIDENCIA: ${
        process.env.GOOGLE_SHEETS_ID_PROVIDENCIA ? "✅ Set" : "⚠️  Not set"
      }`
    );
    console.log(
      `   - GOOGLE_SHEETS_ID_MOR: ${
        process.env.GOOGLE_SHEETS_ID_MOR ? "✅ Set" : "⚠️  Not set"
      }`
    );
    console.log(
      `   - GOOGLE_SHEETS_ID_CHICO: ${
        process.env.GOOGLE_SHEETS_ID_CHICO ? "✅ Set" : "⚠️  Not set"
      }`
    );
    console.log(`\n✨ Server ready to receive WhatsApp messages from advisors!`);
    console.log(`📝 System designed for internal use - advisors register client appointments`);
  });
}

startServer();

process.on("unhandledRejection", (error) => {
  console.error("❌ Unhandled Promise Rejection:", error);
});

process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught Exception:", error);
});

process.on("SIGTERM", () => {
  console.log("🛑 Server stopped gracefully (SIGTERM)");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("🛑 Server interrupted (CTRL+C)");
  process.exit(0);
});
