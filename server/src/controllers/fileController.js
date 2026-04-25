import { env } from "../config/env.js";
import * as fileService from "../services/fileService.js";

export async function uploadAttachments(req, res, next) {
  try {
    const attachments = await fileService.attachFiles({
      projectId: req.params.projectId,
      taskId: req.params.taskId,
      userId: req.user._id,
      files: req.files || [],
      io: req.app.get("io")
    });
    res.status(201).json(attachments);
  } catch (error) {
    next(error);
  }
}

export async function listAttachments(req, res, next) {
  try {
    res.json(await fileService.listAttachments(req.params.taskId));
  } catch (error) {
    next(error);
  }
}

export async function downloadAttachment(req, res, next) {
  try {
    const { attachment, absolutePath } = await fileService.getAttachmentForDownload(
      req.params.projectId,
      req.params.attachmentId,
      env.uploadDir
    );
    res.download(absolutePath, attachment.originalName);
  } catch (error) {
    next(error);
  }
}
