import dotenv from "dotenv";
import mongoose from "mongoose";
import { pipeline } from "@xenova/transformers";
import express from "express";
import client from "prom-client";

dotenv.config();

const app = express();
const METRICS_PORT = 4100;

client.collectDefaultMetrics();

let embedder;

// ----------------------
// Mongo Schema (same fields as ingest-service)
// ----------------------
const logSchema = new mongoose.Schema(
  {
    service: String,
    level: String,
    message: String,
    environment: String,
    metadata: Object,
    requestId: String,

    embedding: {
      type: [Number],
      default: null,
    },

    embeddingProcessed: {
      type: Boolean,
      default: false,
    },

    anomalyScore: {
      type: Number,
      default: null,
    },

    anomalyProcessed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// 👇 Force the exact collection name used by ingest-service: "logs"
const Log = mongoose.model("Log", logSchema, "logs");

// ----------------------
// Connect to Mongo
// ----------------------
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected (Embedding Service)");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
}

// ----------------------
// Load Embedding Model
// ----------------------
async function loadModel() {
  console.log("Loading embedding model...");
  embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  console.log("Embedding model loaded");
}

// ----------------------
// Process Logs (ONLY embedding)
// ----------------------
async function processLogs() {
  try {
    // Only pick logs that haven't been embedded yet
    const logs = await Log.find({ embeddingProcessed: false }).limit(5);

    if (logs.length === 0) return;

    console.log(`Embedding ${logs.length} logs...`);

    for (const log of logs) {
      // Safety: skip empty messages
      if (!log.message || typeof log.message !== "string") {
        log.embedding = null;
        log.embeddingProcessed = true; // mark to avoid infinite retry loop
        await log.save();
        console.log("Skipped log (missing message) and marked as processed");
        continue;
      }

      const output = await embedder(log.message, {
        pooling: "mean",
        normalize: true,
      });

      const newEmbedding = Array.from(output.data);

      log.embedding = newEmbedding;
      log.embeddingProcessed = true;

      // Do NOT touch anomalyScore / anomalyProcessed here
      await log.save();

      console.log("Embedding saved ✅");
    }
  } catch (err) {
    console.error("Error in embedding worker:", err);
  }
}

// ----------------------
// Start Worker
// ----------------------
async function start() {
  await connectDB();
  await loadModel();

  console.log("Embedding worker started...");

  setInterval(processLogs, 5000);
}

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});

app.listen(METRICS_PORT, () => {
  console.log(`Embedding metrics server running on port ${METRICS_PORT}`);
});

start();
