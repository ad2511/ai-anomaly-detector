require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const client = require('prom-client');

client.collectDefaultMetrics();

const app = express();

app.use(express.json());

// Import routes
const logRoutes = require('./routes/log.routes');
app.use('/', logRoutes);

// Metrics route
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  } catch (error) {
    res.status(500).end(error.message);
  }
});

const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected successfully');

    app.listen(PORT, () => {
      console.log(`Ingest Service running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection failed:', error);
  });