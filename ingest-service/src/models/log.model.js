const mongoose = require("mongoose");

const logSchema = new mongoose.Schema(
  {
    service: {
      type: String,
      required: true,
    },
    level: {
      type: String,
      required: true,
      enum: ["info", "warn", "error", "debug"],
    },
    message: {
      type: String,
      required: true,
    },
    environment: {
      type: String,
      default: "dev",
    },
    metadata: {
      type: Object,
      default: {},
    },
    requestId: {
      type: String,
    },
    embedding: {
  type: [Number],
  default: null
},
embeddingProcessed: {
  type: Boolean,
  default: false
},
anomalyScore: {
  type: Number,
  default: null
},
anomalyProcessed: {
  type: Boolean,
  default: false
},
  },
  {
    timestamps: true,
  }
);

// Indexes
logSchema.index({ service: 1 });
logSchema.index({ level: 1 });
logSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Log", logSchema);
