import path from "path";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";
import { env } from "../config/env.js";
import { Attachment, Task } from "../models/index.js";
import { AppError, notFound } from "../utils/AppError.js";
import { logActivity } from "./activityService.js";

const s3Client = new S3Client({ region: env.aws.region });

function sanitizeFileName(fileName) {
  return path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, "-");
}

function buildS3Key({ projectId, taskId, originalName }) {
  const fileName = `${Date.now()}-${nanoid()}-${sanitizeFileName(originalName)}`;
  return [env.aws.s3Prefix, "projects", projectId, "tasks", taskId, fileName].filter(Boolean).join("/");
}

async function persistFile({ file, projectId, taskId }) {
  if (!env.aws.s3Bucket) {
    throw new AppError("AWS S3 bucket is not configured", 500);
  }
  if (!file.buffer) {
    throw new AppError("S3 upload requires in-memory file data", 500);
  }

  const storageKey = buildS3Key({ projectId, taskId, originalName: file.originalname });
  await s3Client.send(
    new PutObjectCommand({
      Bucket: env.aws.s3Bucket,
      Key: storageKey,
      Body: file.buffer,
      ContentType: file.mimetype
    })
  );
  return storageKey;
}

export async function attachFiles({ projectId, taskId, userId, files, io }) {
  const task = await Task.findOne({ _id: taskId, project: projectId });
  if (!task) throw notFound("Task");
  const persistedFiles = await Promise.all(
    files.map(async (file) => ({
      file,
      storageKey: await persistFile({ file, projectId, taskId })
    }))
  );
  const attachments = await Attachment.insertMany(
    persistedFiles.map(({ file, storageKey }) => ({
      project: projectId,
      task: taskId,
      uploadedBy: userId,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      storageKey
    }))
  );
  await logActivity({ project: projectId, actor: userId, action: "attachment.added", entityType: "Task", entityId: taskId, metadata: { count: attachments.length } });
  io?.to(`project:${projectId}`).emit("attachments:created", { taskId, attachments });
  return attachments;
}

export async function listAttachments(taskId) {
  return Attachment.find({ task: taskId }).sort({ createdAt: -1 }).lean();
}

export async function getAttachmentForDownload(projectId, attachmentId) {
  const attachment = await Attachment.findOne({ _id: attachmentId, project: projectId }).lean();
  if (!attachment) throw notFound("Attachment");

  if (!env.aws.s3Bucket) {
    throw new AppError("AWS S3 bucket is not configured", 500);
  }

  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: env.aws.s3Bucket,
      Key: attachment.storageKey
    })
  );
  return {
    attachment,
    stream: response.Body,
    contentType: response.ContentType || attachment.mimeType
  };
}
