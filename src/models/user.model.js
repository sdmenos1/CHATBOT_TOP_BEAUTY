const mongoose = require("mongoose");

// REFACTOR NOTE: Removed all Google Calendar related fields (googleTokens, wantsCalendarIntegration)
// Removed WAITING_CALENDAR state - flow now goes directly from date to completion
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
        "COMPLETED",
      ],
      default: "INITIAL",
    },
    selectedLocation: {
      type: String,
      enum: [
        "Los Olivos",
        "Trujillo",
        "Arequipa",
        "Chimbote",
        "Pucallpa",
        "Medellín",
        "Chico",
        "Chapinero",
        "Los Leones",
        "Providencia",
        "Lince",
        "Luxury",
        "Mor",
        null,
      ],
      default: null,
    },
    selectedSheetId: {
      type: String,
      default: null,
    },
    selectedService: {
      type: String,
      enum: ["Alisado", "Laceado", "Color", null],
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
