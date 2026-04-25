import { Router } from "express";
import authRoutes from "./authRoutes.js";
import notificationRoutes from "./notificationRoutes.js";
import projectRoutes from "./projectRoutes.js";
import taskRoutes from "./taskRoutes.js";

const router = Router();

router.get("/health", (_req, res) => res.json({ status: "ok" }));
router.use("/auth", authRoutes);
router.use("/projects", projectRoutes);
router.use("/projects/:projectId/tasks", taskRoutes);
router.use("/notifications", notificationRoutes);

export default router;
