import { Router } from "express";
import * as notificationController from "../controllers/notificationController.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);
router.get("/", notificationController.listNotifications);
router.patch("/:notificationId/read", notificationController.markRead);

export default router;
