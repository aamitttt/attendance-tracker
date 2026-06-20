import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import workLogRoutes from './routes/workLogRoutes.js';
import leaveRoutes from './routes/leaveRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';

export function createApp() {
  const app = express();

  // Allow requests from the configured origins. Requests with no Origin header
  // (curl, Postman, server-to-server, health checks) are allowed through.
  app.use(
    cors({
      origin(origin, cb) {
        if (!origin || env.clientOrigins.includes(origin)) return cb(null, true);
        return cb(new Error(`Origin ${origin} not allowed by CORS`));
      },
      credentials: true,
    })
  );
  app.use(express.json());

  // Basic abuse protection on auth endpoints.
  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });

  app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api', userRoutes); // /api/users, /api/teams
  app.use('/api/attendance', attendanceRoutes);
  app.use('/api/work-logs', workLogRoutes);
  app.use('/api/leave', leaveRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
