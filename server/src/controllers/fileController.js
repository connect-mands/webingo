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
    const { attachment, stream, contentType } = await fileService.getAttachmentForDownload(
      req.params.projectId,
      req.params.attachmentId
    );
    res.setHeader("Content-Type", contentType || "application/octet-stream");
    const disposition = attachment.mimeType?.startsWith("image/") ? "inline" : "attachment";
    res.setHeader("Content-Disposition", `${disposition}; filename="${attachment.originalName.replace(/"/g, "")}"`);
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
}
