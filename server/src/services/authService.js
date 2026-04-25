import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";
import { env } from "../config/env.js";
import { RefreshToken, User } from "../models/index.js";
import { AppError } from "../utils/AppError.js";
import { hashToken, randomToken, signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/tokens.js";
import { sendMail } from "./mailService.js";

function refreshExpiryDate() {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}

function publicUser(user) {
  return { id: user._id, name: user.name, email: user.email };
}

export async function register({ name, email, password }) {
  const existing = await User.findOne({ email });
  if (existing) throw new AppError("Email is already registered", 409);
  const user = new User({ name, email });
  await user.setPassword(password);
  await user.save();
  return issueSession(user);
}

export async function login({ email, password }) {
  const user = await User.findOne({ email }).select("+passwordHash");
  if (!user || !(await user.verifyPassword(password))) {
    throw new AppError("Invalid email or password", 401);
  }
  return issueSession(user);
}

export async function issueSession(user) {
  const tokenId = nanoid();
  await RefreshToken.create({ user: user._id, tokenId, expiresAt: refreshExpiryDate() });
  return {
    user: publicUser(user),
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user, tokenId)
  };
}

export async function refresh(refreshToken) {
  try {
    const payload = verifyRefreshToken(refreshToken);
    const record = await RefreshToken.findOne({ tokenId: payload.jti, user: payload.sub, revokedAt: null });
    if (!record || record.expiresAt < new Date()) throw new AppError("Refresh token expired", 401);
    record.revokedAt = new Date();
    await record.save();
    const user = await User.findById(payload.sub);
    if (!user) throw new AppError("User not found", 401);
    return issueSession(user);
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error instanceof jwt.JsonWebTokenError) throw new AppError("Invalid refresh token", 401);
    throw error;
  }
}

export async function logout(refreshToken) {
  if (!refreshToken) return;
  try {
    const payload = verifyRefreshToken(refreshToken);
    await RefreshToken.updateOne({ tokenId: payload.jti }, { revokedAt: new Date() });
  } catch (_error) {
    // Logout is idempotent.
  }
}

export async function requestPasswordReset(email) {
  const user = await User.findOne({ email }).select("+passwordResetTokenHash");
  if (!user) return;
  const token = randomToken();
  user.passwordResetTokenHash = hashToken(token);
  user.passwordResetExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await user.save();
  const link = `${env.appUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
  await sendMail({ to: email, subject: "Reset your password", text: `Use this link to reset your password: ${link}` });
}

export async function resetPassword({ email, token, password }) {
  const user = await User.findOne({ email }).select("+passwordResetTokenHash +passwordHash");
  if (!user || !user.passwordResetTokenHash || user.passwordResetExpiresAt < new Date()) {
    throw new AppError("Invalid or expired reset token", 400);
  }
  if (user.passwordResetTokenHash !== hashToken(token)) {
    throw new AppError("Invalid or expired reset token", 400);
  }
  await user.setPassword(password);
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpiresAt = undefined;
  await user.save();
}
