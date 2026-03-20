import dotenv from "dotenv";
import mongoose from "mongoose";
import express from "express";
import client from "prom-client";

dotenv.config();

const app = express();
const METRICS_PORT = 5100;

client.collectDefaultMetrics();

const anomalyGauge = new client.Gauge({
  name: "log_anomaly_score",
  help: "Anomaly score of processed logs",
  labelNames: ["service"],
});

// Schema (same as others)
const logSchema = new mongoose.Schema(
  {
    level: String,
    message: String,
    service: String,
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
      default: false
    },
  },
  { timestamps: true }
);

const Log = mongoose.model("Log", logSchema, "logs");

function cosineSimilarity(vecA, vecB) {
  const dot = vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0));
  return dot / (magnitudeA * magnitudeB);
}

async function processAnomalies() {
  try {
    const logs = await Log.find({
      embeddingProcessed: true,
      anomalyProcessed: false
    }).limit(5);

    if (logs.length === 0) return;

    console.log(`Analyzing ${logs.length} logs...`);

    for (const log of logs) {
      const recentLogs = await Log.find({
        anomalyProcessed: true,
        embedding: { $ne: null }
      })
        .sort({ createdAt: -1 })
        .limit(20);

      let avgSimilarity = 1;

      if (recentLogs.length > 0) {
        const similarities = recentLogs.map((oldLog) =>
          cosineSimilarity(log.embedding, oldLog.embedding)
        );

        avgSimilarity =
          similarities.reduce((sum, val) => sum + val, 0) /
          similarities.length;
      }

      const anomalyScore = 1 - avgSimilarity;

      log.anomalyScore = anomalyScore;
      log.anomalyProcessed = true;

      anomalyGauge.set(
        { service: log.service || "unknown" },
        anomalyScore
      );

      await log.save();

      console.log(`Anomaly processed | Score: ${anomalyScore.toFixed(4)}`);
    }
  } catch (err) {
    console.error("Anomaly worker error:", err);
  }
}

async function start() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB connected (Anomaly Service)");

  console.log("Anomaly worker started...");
  setInterval(processAnomalies, 5000);
}

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});

app.listen(METRICS_PORT, () => {
  console.log(`Anomaly metrics server running on port ${METRICS_PORT}`);
});

start();