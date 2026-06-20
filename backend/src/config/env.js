import dotenv from 'dotenv';
dotenv.config();

function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// Parse CLIENT_ORIGIN as a comma-separated allowlist and normalize trailing slashes,
// so e.g. "http://localhost:5173, https://teams-tracker1.netlify.app/" both work.
function origins(value, fallback) {
  return (value || fallback)
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

export const env = {
  port: num(process.env.PORT, 4000),
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/attendance_tracker',
  jwtSecret: process.env.JWT_SECRET || 'dev_only_insecure_secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  lateThresholdHour: num(process.env.LATE_THRESHOLD_HOUR, 9),
  lateThresholdMinute: num(process.env.LATE_THRESHOLD_MINUTE, 30),
  standardDayHours: num(process.env.STANDARD_DAY_HOURS, 9),
  clientOrigins: origins(process.env.CLIENT_ORIGIN, 'http://localhost:5173'),
};
