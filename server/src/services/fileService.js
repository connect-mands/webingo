import path from "path";
import { Attachment, Task } from "../models/index.js";
import { notFound } from "../utils/AppError.js";
import { logActivity } from "./activityService.js";

export async function attachFiles({ projectId, taskId, userId, files, io }) {
  const task = await Task.findOne({ _id: taskId, project: projectId });
  if (!task) throw notFound("Task");
  const attachments = await Attachment.insertMany(
    files.map((file) => ({
      project: projectId,
      task: taskId,
      uploadedBy: userId,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      storageKey: file.filename
    }))
  );
  await logActivity({ project: projectId, actor: userId, action: "attachment.added", entityType: "Task", entityId: taskId, metadata: { count: attachments.length } });
  io?.to(`project:${projectId}`).emit("attachments:created", { taskId, attachments });
  return attachments;
}

export async function listAttachments(taskId) {
  return Attachment.find({ task: taskId }).sort({ createdAt: -1 }).lean();
}

export async function getAttachmentForDownload(projectId, attachmentId, uploadDir) {
  const attachment = await Attachment.findOne({ _id: attachmentId, project: projectId }).lean();
  if (!attachment) throw notFound("Attachment");
  return {
    attachment,
    absolutePath: path.resolve(uploadDir, attachment.storageKey)
  };
}
