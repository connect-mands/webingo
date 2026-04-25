import { Router } from "express";
import { body } from "express-validator";
import * as authController from "../controllers/authController.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/error.js";
import { authLimiter, authSlowDown } from "../middleware/security.js";

const router = Router();

router.post("/register", authSlowDown, authLimiter, [
  body("name").trim().isLength({ min: 2 }),
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 8 })
], validate, authController.register);

router.post("/login", authSlowDown, authLimiter, [
  body("email").isEmail().normalizeEmail(),
  body("password").notEmpty()
], validate, authController.login);

router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);
router.get("/me", authenticate, authController.me);
router.post("/forgot-password", authSlowDown, authLimiter, body("email").isEmail().normalizeEmail(), validate, authController.forgotPassword);
router.post("/reset-password", authSlowDown, authLimiter, [
  body("email").isEmail().normalizeEmail(),
  body("token").notEmpty(),
  body("password").isLength({ min: 8 })
], validate, authController.resetPassword);

export default router;
