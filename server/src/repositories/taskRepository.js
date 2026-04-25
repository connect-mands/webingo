import mongoose from "mongoose";
import { Task } from "../models/index.js";

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildTaskQuery(projectId, filters = {}) {
  const query = { project: new mongoose.Types.ObjectId(projectId) };
  if (filters.status) query.status = filters.status;
  if (filters.priority) query.priority = filters.priority;
  if (filters.assignee) query.assignees = new mongoose.Types.ObjectId(filters.assignee);
  if (filters.search?.trim()) {
    const searchRegex = new RegExp(escapeRegex(filters.search.trim()), "i");
    query.$or = [{ title: searchRegex }, { description: searchRegex }];
  }
  return query;
}

export async function listTasks(projectId, filters = {}) {
  const page = Number(filters.page || 1);
  const limit = Math.min(Number(filters.limit || 50), 100);
  const sortKey = filters.sortBy || "updatedAt";
  const sortDir = filters.sortDir === "asc" ? 1 : -1;
  const sort = sortKey === "priority" ? { priorityWeight: sortDir } : { [sortKey]: sortDir };
  const pipeline = [
    { $match: buildTaskQuery(projectId, filters) },
    {
      $addFields: {
        priorityWeight: {
          $switch: {
            branches: [
              { case: { $eq: ["$priority", "Low"] }, then: 1 },
              { case: { $eq: ["$priority", "Medium"] }, then: 2 },
              { case: { $eq: ["$priority", "High"] }, then: 3 },
              { case: { $eq: ["$priority", "Critical"] }, then: 4 }
            ],
            default: 2
          }
        }
      }
    },
    { $sort: sort },
    { $skip: (page - 1) * limit },
    { $limit: limit },
    {
      $lookup: {
        from: "users",
        localField: "assignees",
        foreignField: "_id",
        as: "assigneeUsers",
        pipeline: [{ $project: { name: 1, email: 1 } }]
      }
    }
  ];
  return Task.aggregate(pipeline);
}

export function getTaskInProject(projectId, taskId) {
  return Task.findOne({ _id: taskId, project: projectId });
}
