import compression from "compression";
import cookieParser from "cookie-parser";
import express from "express";
import morgan from "morgan";
import routes from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { apiLimiter, apiSlowDown, corsMiddleware, securityMiddleware } from "./middleware/security.js";

export function createApp() {
  const app = express();
  app.use(corsMiddleware);
  app.use(securityMiddleware);
  app.use(compression());
  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(apiSlowDown);
  app.use(apiLimiter);
  if (process.env.NODE_ENV !== "test") app.use(morgan("dev"));
  app.use("/api", routes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
