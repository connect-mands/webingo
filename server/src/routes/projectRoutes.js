import { Router } from "express";
import { body, param, query } from "express-validator";
import * as projectController from "../controllers/projectController.js";
import { authenticate, loadProjectRole, requireProjectRole, roles } from "../middleware/auth.js";
import { validate } from "../middleware/error.js";

const router = Router();

router.get("/invitations/validate", [
  query("email").isEmail().normalizeEmail(),
  query("token").notEmpty()
], validate, projectController.validateInvite);

router.use(authenticate);

router.get("/", projectController.listProjects);
router.post("/", [
  body("name").trim().isLength({ min: 2 }),
  body("description").optional().trim()
], validate, projectController.createProject);

router.post("/accept-invite", [
  body("email").isEmail().normalizeEmail(),
  body("token").notEmpty()
], validate, projectController.acceptInvite);

router.get("/:projectId", param("projectId").isMongoId(), validate, loadProjectRole, projectController.getProject);
router.patch("/:projectId", [
  param("projectId").isMongoId(),
  body("name").optional().trim().isLength({ min: 2 }),
  body("description").optional().trim(),
  body("status").optional().isIn(["Active", "Archived"])
], validate, loadProjectRole, requireProjectRole(roles.admin), projectController.updateProject);
router.delete("/:projectId", param("projectId").isMongoId(), validate, loadProjectRole, requireProjectRole(roles.admin), projectController.deleteProject);
router.post("/:projectId/invitations", [
  param("projectId").isMongoId(),
  body("email").isEmail().normalizeEmail(),
  body("role").isIn(Object.values(roles))
], validate, loadProjectRole, requireProjectRole(roles.admin), projectController.inviteMember);

export default router;
