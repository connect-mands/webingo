import { Notification } from "../models/index.js";

export function listNotifications(userId) {
  return Notification.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
}

export function markNotificationRead(userId, notificationId) {
  return Notification.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { readAt: new Date() },
    { new: true }
  ).lean();
}
