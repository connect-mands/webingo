import path from "path";
import multer from "multer";
import { nanoid } from "nanoid";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

const allowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);

const storage = multer.diskStorage({
  destination: env.uploadDir,
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${nanoid()}${path.extname(file.originalname).toLowerCase()}`);
  }
});

export const upload = multer({
  storage,
  limits: { fileSize: env.maxFileSizeMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!allowedTypes.has(file.mimetype)) {
      return cb(new AppError("Unsupported file type", 415));
    }
    return cb(null, true);
  }
});
