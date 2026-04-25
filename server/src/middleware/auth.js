import { Project, ProjectMember, User } from "../models/index.js";
import { AppError } from "../utils/AppError.js";
import { verifyAccessToken } from "../utils/tokens.js";

export const roles = {
  admin: "Project Admin",
  member: "Team Member",
  viewer: "Viewer"
};

const roleRank = {
  [roles.viewer]: 1,
  [roles.member]: 2,
  [roles.admin]: 3
};

export async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization || "";
    const bearerToken = header.startsWith("Bearer ") ? header.slice(7) : null;
    const token = req.cookies.accessToken || bearerToken;
    if (!token) throw new AppError("Authentication required", 401);
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub).select("_id name email").lean();
    if (!user) throw new AppError("Authentication required", 401);
    req.user = user;
    next();
  } catch (_error) {
    next(new AppError("Authentication required", 401));
  }
}

export async function loadProjectRole(req, _res, next) {
  const projectId = req.params.projectId || req.body.projectId || req.query.projectId;
  if (!projectId) return next(new AppError("Project id required", 400));
  const [project, membership] = await Promise.all([
    Project.findById(projectId).select("owner").lean(),
    ProjectMember.findOne({ project: projectId, user: req.user._id }).lean()
  ]);
  if (!project) return next(new AppError("Project not found", 404));
  if (project.owner?.toString() === req.user._id.toString()) {
    req.projectRole = roles.admin;
    req.projectId = projectId;
    return next();
  }
  if (!membership) return next(new AppError("Project access denied", 403));
  req.projectRole = membership.role;
  req.projectId = projectId;
  return next();
}

export function requireProjectRole(minRole) {
  return (req, _res, next) => {
    if (!req.projectRole || roleRank[req.projectRole] < roleRank[minRole]) {
      return next(new AppError("Insufficient project permissions", 403));
    }
    return next();
  };
}

export async function assertTaskWriteAllowed(userId, projectId, task, role) {
  if (role === roles.admin) return;
  if (role === roles.viewer) throw new AppError("Viewer role is read-only", 403);
  const assigned = task?.assignees?.some((id) => id.toString() === userId.toString());
  if (!assigned && task?.createdBy?.toString() !== userId.toString()) {
    throw new AppError("Team members can only edit tasks they created or are assigned to", 403);
  }
}
