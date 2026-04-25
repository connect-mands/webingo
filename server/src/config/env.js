import dotenv from "dotenv";

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5000),
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/collab_platform",
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || "dev-access-secret-change-me",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-change-me",
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS || 12),
  maxFileSizeMb: Number(process.env.MAX_FILE_SIZE_MB || 5),
  emailjs: {
    serviceId: process.env.EMAILJS_SERVICE_ID,
    publicKey: process.env.EMAILJS_PUBLIC_KEY,
    passwordResetTemplateId: process.env.EMAILJS_PASSWORD_RESET_TEMPLATE_ID || process.env.EMAILJS_TEMPLATE_ID || process.env.TemplateID,
    inviteTemplateId: process.env.EMAILJS_INVITE_TEMPLATE_ID
  },
  aws: {
    region: process.env.AWS_REGION || "ap-south-1",
    s3Bucket: process.env.AWS_S3_BUCKET_NAME,
    s3Prefix: (process.env.AWS_S3_PREFIX || "demo").replace(/^\/+|\/+$/g, "")
  },
  appUrl: process.env.APP_URL || "http://localhost:5173"
};
