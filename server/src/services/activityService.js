import { ActivityLog } from "../models/index.js";

export async function logActivity({ project, actor, action, entityType, entityId, metadata = {} }, session) {
  const [entry] = await ActivityLog.create(
    [{ project, actor, action, entityType, entityId, metadata }],
    session ? { session } : undefined
  );
  return entry;
}

export function listActivity(project, limit = 30) {
  return ActivityLog.find({ project })
    .populate({ path: "actor", select: "name email" })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}
