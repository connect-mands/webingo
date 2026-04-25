import { Server } from "socket.io";
import { ProjectMember, User } from "../models/index.js";
import { verifyAccessToken } from "../utils/tokens.js";

const presence = new Map();

function parseCookies(cookieHeader = "") {
  return Object.fromEntries(
    cookieHeader
      .split(";")
      .map((cookie) => cookie.trim().split("="))
      .filter(([key, value]) => key && value)
      .map(([key, value]) => [key, decodeURIComponent(value)])
  );
}

function projectKey(projectId) {
  return `project:${projectId}`;
}

function currentPresence(projectId) {
  return Array.from(presence.get(projectId)?.values() || []);
}

export function configureSocket(server, corsOrigin) {
  const io = new Server(server, {
    cors: { origin: corsOrigin, credentials: true },
    connectionStateRecovery: { maxDisconnectionDuration: 120000 }
  });

  io.use(async (socket, next) => {
    try {
      const cookies = parseCookies(socket.handshake.headers.cookie);
      const token = cookies.accessToken;
      const payload = verifyAccessToken(token);
      const user = await User.findById(payload.sub).select("_id name email").lean();
      if (!user) throw new Error("Unauthorized");
      socket.user = user;
      next();
    } catch (_error) {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("project:join", async ({ projectId }) => {
      const membership = await ProjectMember.findOne({ project: projectId, user: socket.user._id }).lean();
      if (!membership) return socket.emit("error", { message: "Project access denied" });
      socket.join(projectKey(projectId));
      if (!presence.has(projectId)) presence.set(projectId, new Map());
      presence.get(projectId).set(socket.id, { user: socket.user, editingTaskId: null });
      io.to(projectKey(projectId)).emit("presence:update", currentPresence(projectId));
    });

    socket.on("project:leave", ({ projectId }) => {
      socket.leave(projectKey(projectId));
      presence.get(projectId)?.delete(socket.id);
      io.to(projectKey(projectId)).emit("presence:update", currentPresence(projectId));
    });

    socket.on("task:editing", ({ projectId, taskId }) => {
      const users = presence.get(projectId);
      if (!users?.has(socket.id)) return;
      users.set(socket.id, { user: socket.user, editingTaskId: taskId || null });
      io.to(projectKey(projectId)).emit("presence:update", currentPresence(projectId));
    });

    socket.on("disconnect", () => {
      for (const [projectId, users] of presence.entries()) {
        if (users.delete(socket.id)) {
          io.to(projectKey(projectId)).emit("presence:update", currentPresence(projectId));
        }
      }
    });
  });

  return io;
}
