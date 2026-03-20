const express = require("express");
const router = express.Router();

const {
  createLog,
  getLogs,
  getErrorAnalytics,
} = require("../controllers/log.controller");

// Create log
router.post("/logs", createLog);

// Get logs (filters + pagination)
router.get("/logs", getLogs);

// Analytics endpoint
router.get("/logs/analytics/errors-per-minute", getErrorAnalytics);


module.exports = router;
