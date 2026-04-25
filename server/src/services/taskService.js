import { Attachment, Notification, Task } from "../models/index.js";
import { getTaskInProject, listTasks } from "../repositories/taskRepository.js";
import { roles, assertTaskWriteAllowed } from "../middleware/auth.js";
import { AppError, notFound } from "../utils/AppError.js";
import { cacheDeleteByPrefix, cacheGet, cacheSet } from "../utils/cache.js";
import { logActivity } from "./activityService.js";

export async function getTasks(projectId, filters) {
  const key = `tasks:${projectId}:${JSON.stringify(filters)}`;
  const cached = cacheGet(key);
  if (cached) return cached;
  const tasks = await listTasks(projectId, filters);
  cacheSet(key, tasks, 15000);
  return tasks;
}

export async function createTask({ projectId, userId, payload, io }) {
  const task = await Task.create({
    project: projectId,
    title: payload.title,
    description: payload.description,
    status: payload.status,
    priority: payload.priority,
    assignees: payload.assignees || [],
    dueDate: payload.dueDate,
    createdBy: userId,
    updatedBy: userId
  });
  await logActivity({ project: projectId, actor: userId, action: "task.created", entityType: "Task", entityId: task._id });
  await notifyAssignees(projectId, task, "You were assigned to a task");
  cacheDeleteByPrefix(`tasks:${projectId}`);
  io?.to(`project:${projectId}`).emit("task:created", task);
  return task;
}

export async function updateTask({ projectId, taskId, userId, role, payload, io }) {
  const task = await getTaskInProject(projectId, taskId);
  if (!task) throw notFound("Task");
  await assertTaskWriteAllowed(userId, projectId, task, role);
  if (payload.version !== undefined && Number(payload.version) !== task.version) {
    throw new AppError("Task was modified by someone else. Refresh and retry.", 409);
  }
  const allowed = ["title", "description", "status", "priority", "assignees", "dueDate"];
  const changes = Object.fromEntries(Object.entries(payload).filter(([key]) => allowed.includes(key)));
  Object.assign(task, {
    ...changes,
    updatedBy: userId,
    version: task.version + 1
  });
  await task.save();
  await logActivity({ project: projectId, actor: userId, action: "task.updated", entityType: "Task", entityId: task._id });
  await notifyAssignees(projectId, task, `Task updated: ${task.title}`);
  cacheDeleteByPrefix(`tasks:${projectId}`);
  io?.to(`project:${projectId}`).emit("task:updated", task);
  return task;
}

export async function deleteTask({ projectId, taskId, userId, role, io }) {
  const task = await getTaskInProject(projectId, taskId);
  if (!task) throw notFound("Task");
  await assertTaskWriteAllowed(userId, projectId, task, role);
  await Attachment.deleteMany({ task: taskId });
  await task.deleteOne();
  await logActivity({ project: projectId, actor: userId, action: "task.deleted", entityType: "Task", entityId: task._id });
  cacheDeleteByPrefix(`tasks:${projectId}`);
  io?.to(`project:${projectId}`).emit("task:deleted", { id: taskId });
}

export async function bulkUpdate({ projectId, userId, role, operation, taskIds, value, io }) {
  if (role === roles.viewer) throw new AppError("Viewer role is read-only", 403);
  const tasks = await Task.find({ _id: { $in: taskIds }, project: projectId });
  if (tasks.length !== taskIds.length) throw new AppError("Some tasks were not found", 404);
  if (role !== roles.admin) {
    for (const task of tasks) await assertTaskWriteAllowed(userId, projectId, task, role);
  }
  if (operation === "status") {
    await Task.updateMany({ _id: { $in: taskIds }, project: projectId }, { status: value, updatedBy: userId, $inc: { version: 1 } });
  } else if (operation === "assign") {
    await Task.updateMany({ _id: { $in: taskIds }, project: projectId }, { assignees: value, updatedBy: userId, $inc: { version: 1 } });
  } else if (operation === "delete") {
    await Task.deleteMany({ _id: { $in: taskIds }, project: projectId });
  } else {
    throw new AppError("Unsupported bulk operation", 400);
  }
  await logActivity({ project: projectId, actor: userId, action: `task.bulk.${operation}`, entityType: "Task", entityId: tasks[0]._id, metadata: { count: tasks.length } });
  cacheDeleteByPrefix(`tasks:${projectId}`);
  io?.to(`project:${projectId}`).emit("task:bulkUpdated", { operation, taskIds, value });
}

async function notifyAssignees(projectId, task, message) {
  if (!task.assignees?.length) return;
  await Notification.insertMany(task.assignees.map((user) => ({ user, project: projectId, task: task._id, message })), { ordered: false });
}
