const mongoose = require("mongoose");

const chatHistorySchema = new mongoose.Schema(
  {
    patientId: { type: String, required: true, index: true },
    messages: [
      {
        role: { type: String, enum: ["user", "assistant"], required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    severity: {
      type: String,
      enum: ["Neutral", "Moderate", "Critical"],
      default: "Neutral",
    },
    status: {
      type: String,
      enum: ["active", "completed"],
      default: "active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChatHistory", chatHistorySchema);
