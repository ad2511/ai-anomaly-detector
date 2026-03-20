const Log = require("../models/log.model");

// Create Log
exports.createLog = async (req, res) => {
  try {
    const log = new Log({
  ...req.body,
  embedding: null,
  embeddingProcessed: false,
  anomalyScore: null,
  anomalyProcessed: false
});

    const savedLog = await log.save();

    res.status(201).json(savedLog);
  } catch (error) {
    console.error("POST /logs error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get Logs with filters + pagination + sorting
exports.getLogs = async (req, res) => {
  try {
    const { service, level, startDate, endDate } = req.query;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    let filter = {};

    if (service) filter.service = service;

    if (level) {
      filter.level = { $regex: new RegExp(level, "i") };
    }

    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const total = await Log.countDocuments(filter);

    const logs = await Log.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: logs,
    });
  } catch (error) {
    console.error("GET /logs error:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.getErrorAnalytics = async (req, res) => {
  try {
    const { service } = req.query;

    let matchStage = {
      level: { $regex: /error/i },
      createdAt: { $exists: true, $ne: null },
    };

    if (service) {
      matchStage.service = service;
    }

    const results = await Log.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            minute: {
              $dateToString: {
                format: "%Y-%m-%dT%H:%M",
                date: "$createdAt",
              },
            },
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          minute: "$_id.minute",
          count: 1,
        },
      },
      { $sort: { minute: 1 } },
    ]);

    if (results.length < 2) {
      return res.json({
        message: "Not enough data for anomaly detection",
        data: results,
      });
    }

    const windowSize = 10;
    const window = results.slice(-windowSize);

    const counts = window.map((item) => item.count);

    const mean =
      counts.reduce((sum, val) => sum + val, 0) / counts.length;

    const variance =
      counts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      counts.length;

    const stdDev = Math.sqrt(variance);

    const latest = window[window.length - 1];

    const threshold = mean + 2 * stdDev;

    const isAnomaly = latest.count > threshold;

    res.status(200).json({
      rollingWindowSize: window.length,
      meanErrors: mean,
      standardDeviation: stdDev,
      anomalyThreshold: threshold,
      latestMinute: latest.minute,
      latestCount: latest.count,
      anomalyDetected: isAnomaly,
      data: results,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({ error: error.message });
  }
};
