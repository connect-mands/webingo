import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { env } from "../config/env.js";

const { Schema, model, models, Types } = mongoose;

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpiresAt: Date
  },
  { timestamps: true }
);

userSchema.methods.setPassword = async function setPassword(password) {
  this.passwordHash = await bcrypt.hash(password, env.bcryptRounds);
};

userSchema.methods.verifyPassword = function verifyPassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

const refreshTokenSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: "User", required: true, index: true },
    tokenId: { type: String, required: true, unique: true },
    revokedAt: Date,
    expiresAt: { type: Date, required: true, index: true }
  },
  { timestamps: true }
);

const projectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    status: { type: String, enum: ["Active", "Archived"], default: "Active", index: true },
    owner: { type: Types.ObjectId, ref: "User", required: true, index: true }
  },
  { timestamps: true }
);

projectSchema.index({ owner: 1, status: 1 });

const projectMemberSchema = new Schema(
  {
    project: { type: Types.ObjectId, ref: "Project", required: true, index: true },
    user: { type: Types.ObjectId, ref: "User", required: true, index: true },
    role: { type: String, enum: ["Project Admin", "Team Member", "Viewer"], required: true }
  },
  { timestamps: true }
);

projectMemberSchema.index({ project: 1, user: 1 }, { unique: true });

const invitationSchema = new Schema(
  {
    project: { type: Types.ObjectId, ref: "Project", required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    role: { type: String, enum: ["Project Admin", "Team Member", "Viewer"], required: true },
    tokenHash: { type: String, required: true, unique: true },
    invitedBy: { type: Types.ObjectId, ref: "User", required: true },
    acceptedAt: Date,
    expiresAt: { type: Date, required: true, index: true }
  },
  { timestamps: true }
);

const taskSchema = new Schema(
  {
    project: { type: Types.ObjectId, ref: "Project", required: true, index: true },
    title: { type: String, required: true, trim: true, index: "text" },
    description: { type: String, default: "", index: "text" },
    status: { type: String, enum: ["Todo", "In Progress", "Review", "Completed"], default: "Todo", index: true },
    priority: { type: String, enum: ["Low", "Medium", "High", "Critical"], default: "Medium", index: true },
    assignees: [{ type: Types.ObjectId, ref: "User", index: true }],
    dueDate: Date,
    createdBy: { type: Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Types.ObjectId, ref: "User", required: true },
    version: { type: Number, default: 0 }
  },
  { timestamps: true }
);

taskSchema.index({ project: 1, status: 1, priority: 1, updatedAt: -1 });
taskSchema.index({ project: 1, assignees: 1 });

const attachmentSchema = new Schema(
  {
    project: { type: Types.ObjectId, ref: "Project", required: true, index: true },
    task: { type: Types.ObjectId, ref: "Task", required: true, index: true },
    uploadedBy: { type: Types.ObjectId, ref: "User", required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    storageKey: { type: String, required: true }
  },
  { timestamps: true }
);

const activityLogSchema = new Schema(
  {
    project: { type: Types.ObjectId, ref: "Project", required: true, index: true },
    actor: { type: Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: Types.ObjectId, required: true },
    metadata: Schema.Types.Mixed
  },
  { timestamps: true }
);

activityLogSchema.index({ project: 1, createdAt: -1 });

const notificationSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: "User", required: true, index: true },
    project: { type: Types.ObjectId, ref: "Project", index: true },
    task: { type: Types.ObjectId, ref: "Task" },
    message: { type: String, required: true },
    readAt: Date
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, readAt: 1, createdAt: -1 });

export const User = models.User || model("User", userSchema);
export const RefreshToken = models.RefreshToken || model("RefreshToken", refreshTokenSchema);
export const Project = models.Project || model("Project", projectSchema);
export const ProjectMember = models.ProjectMember || model("ProjectMember", projectMemberSchema);
export const Invitation = models.Invitation || model("Invitation", invitationSchema);
export const Task = models.Task || model("Task", taskSchema);
export const Attachment = models.Attachment || model("Attachment", attachmentSchema);
export const ActivityLog = models.ActivityLog || model("ActivityLog", activityLogSchema);
export const Notification = models.Notification || model("Notification", notificationSchema);
