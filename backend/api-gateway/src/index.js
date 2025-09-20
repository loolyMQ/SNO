const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests',
});
app.use(limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: Date.now(),
  });
});

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Science Map API Gateway',
    version: '1.0.0',
    timestamp: Date.now(),
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    timestamp: Date.now(),
  });
});

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});