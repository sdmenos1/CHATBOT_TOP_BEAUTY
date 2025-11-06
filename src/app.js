require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const whatsappRoutes = require("./routes/whatsapp.routes");
const googleRoutes = require("./routes/google.routes");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({
    status: "active",
    message: "WhatsApp Chatbot API with Google Calendar Integration",
    version: "2.0.0",
    features: [
      "WhatsApp messaging",
      "Appointment booking",
      "Google Calendar integration",
    ],
  });
});

app.use("/", whatsappRoutes);
app.use("/", googleRoutes);

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
    console.log(`\n🚀 WhatsApp Chatbot Server running on port ${PORT}`);
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
    console.log(`\n📅 Google Calendar Integration:`);
    console.log(
      `   - GOOGLE_CLIENT_ID: ${
        process.env.GOOGLE_CLIENT_ID ? "✅ Set" : "⚠️  Optional (not set)"
      }`
    );
    console.log(
      `   - GOOGLE_CLIENT_SECRET: ${
        process.env.GOOGLE_CLIENT_SECRET ? "✅ Set" : "⚠️  Optional (not set)"
      }`
    );
    console.log(
      `   - GOOGLE_REDIRECT_URI: ${
        process.env.GOOGLE_REDIRECT_URI ? "✅ Set" : "⚠️  Optional (not set)"
      }`
    );
    console.log(
      `   - PUBLIC_URL: ${
        process.env.PUBLIC_URL ? "✅ Set" : "⚠️  Auto-detected from environment"
      }`
    );
    console.log(`\n💡 To test locally with ngrok:`);
    console.log(`   1. Run: ngrok http ${PORT}`);
    console.log(`   2. Copy the ngrok URL`);
    console.log(
      `   3. Set webhook in Meta for Developers: <ngrok-url>/webhook`
    );
    console.log(`\n✨ Server ready to receive WhatsApp messages!`);
  });
}

startServer();
// Detecta errores no capturados en promesas (como async/await fallidos)
process.on("unhandledRejection", (error) => {
  console.error("❌ Unhandled Promise Rejection:", error);
});

// Detecta excepciones no controladas (errores que revientan el proceso)
process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught Exception:", error);
});

// Captura señales de detención del proceso
process.on("SIGTERM", () => {
  console.log("🛑 Server stopped gracefully (SIGTERM)");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("🛑 Server interrupted (CTRL+C)");
  process.exit(0);
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled Promise Rejection:", error);
});
