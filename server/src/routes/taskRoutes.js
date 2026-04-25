import { Router } from "express";
import { body, param } from "express-validator";
import * as fileController from "../controllers/fileController.js";
import * as taskController from "../controllers/taskController.js";
import { authenticate, loadProjectRole, requireProjectRole, roles } from "../middleware/auth.js";
import { validate } from "../middleware/error.js";
import { upload } from "../middleware/upload.js";

const router = Router({ mergeParams: true });

router.use(authenticate, param("projectId").isMongoId(), validate, loadProjectRole);

router.get("/", taskController.listTasks);
router.post("/", requireProjectRole(roles.member), [
  body("title").trim().isLength({ min: 2 }),
  body("status").optional().isIn(["Todo", "In Progress", "Review", "Completed"]),
  body("priority").optional().isIn(["Low", "Medium", "High", "Critical"]),
  body("assignees").optional().isArray()
], validate, taskController.createTask);

router.patch("/bulk", requireProjectRole(roles.member), [
  body("operation").isIn(["status", "assign", "delete"]),
  body("taskIds").isArray({ min: 1 }),
  body("taskIds.*").isMongoId()
], validate, taskController.bulkUpdate);

router.patch("/:taskId", param("taskId").isMongoId(), validate, requireProjectRole(roles.member), taskController.updateTask);
router.delete("/:taskId", param("taskId").isMongoId(), validate, requireProjectRole(roles.member), taskController.deleteTask);
router.get("/:taskId/attachments", param("taskId").isMongoId(), validate, fileController.listAttachments);
router.post("/:taskId/attachments", param("taskId").isMongoId(), validate, requireProjectRole(roles.member), upload.array("files", 5), fileController.uploadAttachments);
router.get("/attachments/:attachmentId/download", param("attachmentId").isMongoId(), validate, fileController.downloadAttachment);

export default router;
