import * as notificationService from "../services/notificationService.js";

export async function listNotifications(req, res, next) {
  try {
    res.json(await notificationService.listNotifications(req.user._id));
  } catch (error) {
    next(error);
  }
}

export async function markRead(req, res, next) {
  try {
    res.json(await notificationService.markNotificationRead(req.user._id, req.params.notificationId));
  } catch (error) {
    next(error);
  }
}
