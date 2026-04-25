import cors from "cors";
import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import xss from "xss-clean";
import { env } from "../config/env.js";

export const corsMiddleware = cors({
  origin: env.clientOrigin,
  credentials: true
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 25,
  standardHeaders: true,
  legacyHeaders: false
});

export const authSlowDown = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 5,
  delayMs: (hits) => Math.min((hits - 5) * 500, 5000),
  validate: { delayMs: false }
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 240,
  standardHeaders: true,
  legacyHeaders: false
});

export const apiSlowDown = slowDown({
  windowMs: 60 * 1000,
  delayAfter: 120,
  delayMs: (hits) => Math.min((hits - 120) * 100, 2000),
  validate: { delayMs: false }
});

export const securityMiddleware = [helmet(), mongoSanitize(), xss()];
