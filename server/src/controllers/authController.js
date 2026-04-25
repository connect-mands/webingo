import * as authService from "../services/authService.js";
import { env } from "../config/env.js";

const cookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === "production",
  sameSite: env.nodeEnv === "production" ? "none" : "lax",
  path: "/"
};

function setSessionCookies(res, session) {
  res.cookie("accessToken", session.accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000
  });
  res.cookie("refreshToken", session.refreshToken, {
    ...cookieOptions,
    path: "/api/auth",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

function clearSessionCookies(res) {
  res.clearCookie("accessToken", cookieOptions);
  res.clearCookie("refreshToken", { ...cookieOptions, path: "/api/auth" });
}

export async function register(req, res, next) {
  try {
    const session = await authService.register(req.body);
    setSessionCookies(res, session);
    res.status(201).json({ user: session.user });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const session = await authService.login(req.body);
    setSessionCookies(res, session);
    res.json({ user: session.user });
  } catch (error) {
    next(error);
  }
}

export async function refresh(req, res, next) {
  try {
    const session = await authService.refresh(req.cookies.refreshToken);
    setSessionCookies(res, session);
    res.json({ user: session.user });
  } catch (error) {
    clearSessionCookies(res);
    next(error);
  }
}

export async function logout(req, res, next) {
  try {
    await authService.logout(req.cookies.refreshToken);
    clearSessionCookies(res);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function me(req, res) {
  res.json({ user: req.user });
}

export async function forgotPassword(req, res, next) {
  try {
    await authService.requestPasswordReset(req.body.email);
    res.json({ message: "If an account exists, a reset link has been sent." });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    await authService.resetPassword(req.body);
    res.json({ message: "Password reset successful." });
  } catch (error) {
    next(error);
  }
}
