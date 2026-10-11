require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { Server } = require('socket.io');

const { connectDB } = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const { setIO } = require('./sockets/ioInstance');
const { registerMatchSocketHandlers } = require('./sockets/matchSocket');

// Route modules - one per merged sub-module.
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const playerRoutes = require('./routes/playerRoutes');
const teamRoutes = require('./routes/teamRoutes');
const auctionRoutes = require('./routes/auctionRoutes');
const matchRoutes = require('./routes/matchRoutes');
const scoringRoutes = require('./routes/scoringRoutes');
const module5Routes = require('./routes/module5Routes');

const app = express();
const server = http.createServer(app);

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://10.169.127.39:5173';

const allowedOrigins = [
  CLIENT_ORIGIN,
  'http://10.169.127.39:5173',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
].filter(Boolean);

const corsOriginHandler = (origin, callback) => {
  if (!origin || allowedOrigins.includes(origin) || origin.includes('10.169.127.39') || origin.includes('localhost') || origin.includes('127.0.0.1')) {
    callback(null, true);
  } else {
    callback(null, true);
  }
};

const io = new Server(server, {
  cors: { origin: corsOriginHandler, methods: ['GET', 'POST'], credentials: true }
});
setIO(io);
registerMatchSocketHandlers(io);

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: corsOriginHandler, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'CricForge API is running',
    ip: '10.169.127.39',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/auction', auctionRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/scoring', scoringRoutes);
app.use('/api/module5', module5Routes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5001;

const start = async () => {
  await connectDB();
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`CricForge unified backend listening on 0.0.0.0:${PORT}`);
    console.log(`Network address: http://10.169.127.39:${PORT}`);
    console.log(`Allowed frontend origin: ${CLIENT_ORIGIN}`);
  });
};

start();

module.exports = { app, server, io };
