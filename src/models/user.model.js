const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      default: null,
    },
    state: {
      type: String,
      enum: [
        "INITIAL",
        "WAITING_LOCATION",
        "WAITING_SERVICE",
        "WAITING_NAME",
        "WAITING_PHONE",
        "WAITING_CONFIRMATION",
        "WAITING_DATE",
        "WAITING_CALENDAR",
        "COMPLETED",
      ],
      default: "INITIAL",
    },
    selectedLocation: {
      type: String,
      enum: ["Chimbote", "Trujillo", "Olivos", "Arequipa", "Lince", "Pucallpa", null],
      default: null,
    },
    selectedSheetId: {
      type: String,
      default: null,
    },
    selectedService: {
      type: String,
      enum: ["Botox", "Bioplastia reconstructora", "Bioplastia organica", "Bioplastia Top Láser", "Semipermanente", "Dual", null],
      default: null,
    },
    servicePrice: {
      type: Number,
      default: null,
    },
    collectedPhone: {
      type: String,
      default: null,
    },
    appointmentDate: {
      type: String,
      default: null,
    },
    parsedAppointmentDate: {
      type: Date,
      default: null,
    },
    googleTokens: {
      access_token: { type: String, default: null },
      refresh_token: { type: String, default: null },
      expiry_date: { type: Number, default: null },
    },
    wantsCalendarIntegration: {
      type: Boolean,
      default: null,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.methods.resetConversation = function () {
  this.state = "INITIAL";
  this.selectedLocation = null;
  this.selectedSheetId = null;
  this.selectedService = null;
  this.servicePrice = null;
  this.collectedPhone = null;
  this.appointmentDate = null;
  this.parsedAppointmentDate = null;
  this.name = null;
};

module.exports = mongoose.model("User", userSchema);
