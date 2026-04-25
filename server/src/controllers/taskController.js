import * as taskService from "../services/taskService.js";

export async function listTasks(req, res, next) {
  try {
    res.json(await taskService.getTasks(req.params.projectId, req.query));
  } catch (error) {
    next(error);
  }
}

export async function createTask(req, res, next) {
  try {
    res.status(201).json(await taskService.createTask({
      projectId: req.params.projectId,
      userId: req.user._id,
      payload: req.body,
      io: req.app.get("io")
    }));
  } catch (error) {
    next(error);
  }
}

export async function updateTask(req, res, next) {
  try {
    res.json(await taskService.updateTask({
      projectId: req.params.projectId,
      taskId: req.params.taskId,
      userId: req.user._id,
      role: req.projectRole,
      payload: req.body,
      io: req.app.get("io")
    }));
  } catch (error) {
    next(error);
  }
}

export async function deleteTask(req, res, next) {
  try {
    await taskService.deleteTask({
      projectId: req.params.projectId,
      taskId: req.params.taskId,
      userId: req.user._id,
      role: req.projectRole,
      io: req.app.get("io")
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function bulkUpdate(req, res, next) {
  try {
    await taskService.bulkUpdate({
      projectId: req.params.projectId,
      userId: req.user._id,
      role: req.projectRole,
      operation: req.body.operation,
      taskIds: req.body.taskIds,
      value: req.body.value,
      io: req.app.get("io")
    });
    res.json({ message: "Bulk operation completed." });
  } catch (error) {
    next(error);
  }
}
