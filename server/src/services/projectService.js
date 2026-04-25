import mongoose from "mongoose";
import { ActivityLog, Attachment, Invitation, Notification, Project, ProjectMember, Task, User } from "../models/index.js";
import { createProjectWithOwner, listProjectMembers, listProjectsForUser } from "../repositories/projectRepository.js";
import { AppError, notFound } from "../utils/AppError.js";
import { cacheDeleteByPrefix, cacheGet, cacheSet } from "../utils/cache.js";
import { hashToken, randomToken } from "../utils/tokens.js";
import { logActivity, listActivity } from "./activityService.js";
import { sendProjectInvitationEmail } from "./mailService.js";
import { env } from "../config/env.js";

function isTransactionUnsupported(error) {
  return error?.code === 20 || /Transaction numbers are only allowed/.test(error?.message || "");
}

async function createProjectRecords(userId, payload, session) {
  const project = await createProjectWithOwner({ owner: userId, ...payload }, session);
  await logActivity({
    project: project._id,
    actor: userId,
    action: "project.created",
    entityType: "Project",
    entityId: project._id
  }, session);
  return project;
}

export async function createProject(userId, payload) {
  const session = await mongoose.startSession();
  try {
    let project;
    try {
      await session.withTransaction(async () => {
        project = await createProjectRecords(userId, payload, session);
      });
    } catch (error) {
      if (!isTransactionUnsupported(error)) throw error;
      project = await createProjectRecords(userId, payload);
    }
    cacheDeleteByPrefix(`projects:${userId}`);
    return project;
  } finally {
    await session.endSession();
  }
}

export async function getProjects(userId, paging) {
  const key = `projects:${userId}:${paging.page || 1}:${paging.limit || 20}`;
  const cached = cacheGet(key);
  if (cached) return cached;
  const projects = await listProjectsForUser(userId, paging);
  cacheSet(key, projects);
  return projects;
}

export async function getProjectDetails(projectId) {
  const project = await Project.findById(projectId).lean();
  if (!project) throw notFound("Project");
  const [members, activity, stats] = await Promise.all([
    listProjectMembers(projectId),
    listActivity(projectId),
    Task.aggregate([{ $match: { project: project._id } }, { $group: { _id: "$status", count: { $sum: 1 } } }])
  ]);
  return { project, members, activity, stats };
}

export async function updateProject({ projectId, userId, payload }) {
  const allowed = ["name", "description", "status"];
  const changes = Object.fromEntries(Object.entries(payload).filter(([key]) => allowed.includes(key)));
  const project = await Project.findByIdAndUpdate(projectId, changes, {
    new: true,
    runValidators: true
  });
  if (!project) throw notFound("Project");
  await logActivity({
    project: projectId,
    actor: userId,
    action: "project.updated",
    entityType: "Project",
    entityId: project._id,
    metadata: changes
  });
  cacheDeleteByPrefix("projects:");
  return project;
}

export async function deleteProject({ projectId, userId }) {
  const project = await Project.findById(projectId);
  if (!project) throw notFound("Project");
  await Promise.all([
    Attachment.deleteMany({ project: projectId }),
    Task.deleteMany({ project: projectId }),
    ProjectMember.deleteMany({ project: projectId }),
    Invitation.deleteMany({ project: projectId }),
    Notification.deleteMany({ project: projectId }),
    ActivityLog.deleteMany({ project: projectId })
  ]);
  await project.deleteOne();
  cacheDeleteByPrefix("projects:");
  return { deletedProjectId: projectId, deletedBy: userId };
}

export async function inviteMember({ projectId, email, role, invitedBy }) {
  const project = await Project.findById(projectId).select("name").lean();
  if (!project) throw notFound("Project");
  const existingUser = await User.findOne({ email }).select("_id").lean();
  if (existingUser) {
    const existingMembership = await ProjectMember.findOne({ project: projectId, user: existingUser._id }).lean();
    if (existingMembership) {
      throw new AppError("User is already assigned to this project", 409);
    }
  }

  const activeInvite = await Invitation.findOne({
    project: projectId,
    email,
    acceptedAt: null,
    expiresAt: { $gt: new Date() }
  }).lean();
  if (activeInvite) {
    throw new AppError("An active invitation already exists for this email", 409);
  }

  const token = randomToken();
  const invitation = await Invitation.create({
    project: projectId,
    email,
    role,
    tokenHash: hashToken(token),
    invitedBy,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  });
  const link = `${env.appUrl}/accept-invite?token=${token}&email=${encodeURIComponent(email)}`;
  await sendProjectInvitationEmail({
    to: email,
    name: email.split("@")[0],
    projectName: project.name,
    role,
    link
  });
  await logActivity({
    project: projectId,
    actor: invitedBy,
    action: "member.invited",
    entityType: "Invitation",
    entityId: invitation._id,
    metadata: { email, role }
  });
  return { invitationId: invitation._id, inviteTokenPreview: env.nodeEnv === "production" ? undefined : token };
}

export async function validateInvite({ email, token }) {
  const invitation = await Invitation.findOne({
    email,
    tokenHash: hashToken(token),
    acceptedAt: null,
    expiresAt: { $gt: new Date() }
  })
    .populate({ path: "project", select: "name description" })
    .lean();

  if (!invitation) throw new AppError("Invalid or expired invitation", 400);
  return {
    email: invitation.email,
    role: invitation.role,
    project: invitation.project
  };
}

export async function acceptInvite({ userId, email, token }) {
  const invitation = await Invitation.findOne({ email, tokenHash: hashToken(token), acceptedAt: null });
  if (!invitation || invitation.expiresAt < new Date()) throw new AppError("Invalid or expired invitation", 400);
  const project = await Project.findById(invitation.project).select("owner").lean();
  if (!project) throw notFound("Project");
  const role = project.owner?.toString() === userId.toString() ? "Project Admin" : invitation.role;
  await ProjectMember.updateOne(
    { project: invitation.project, user: userId },
    { role },
    { upsert: true }
  );
  invitation.acceptedAt = new Date();
  await invitation.save();
  await logActivity({
    project: invitation.project,
    actor: userId,
    action: "member.joined",
    entityType: "ProjectMember",
    entityId: userId,
    metadata: { email, role }
  });
  cacheDeleteByPrefix(`projects:${userId}`);
}
