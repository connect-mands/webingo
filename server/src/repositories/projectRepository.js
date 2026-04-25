import { Project, ProjectMember } from "../models/index.js";

export async function createProjectWithOwner({ owner, name, description }, session) {
  const options = session ? { session } : undefined;
  const [project] = await Project.create([{ owner, name, description }], options);
  await ProjectMember.create([{ project: project._id, user: owner, role: "Project Admin" }], options);
  return project;
}

export function listProjectsForUser(userId, { page = 1, limit = 20 } = {}) {
  return ProjectMember.find({ user: userId })
    .populate({ path: "project", select: "name description status owner createdAt updatedAt" })
    .sort({ updatedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
}

export function listProjectMembers(projectId) {
  return ProjectMember.find({ project: projectId })
    .populate({ path: "user", select: "name email" })
    .sort({ role: 1, createdAt: 1 })
    .lean();
}
