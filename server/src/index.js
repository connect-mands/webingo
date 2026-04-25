import http from "http";
import { createApp } from "./app.js";
import { connectDatabase } from "./config/db.js";
import { env } from "./config/env.js";
import { configureSocket } from "./sockets/index.js";

const app = createApp();
const server = http.createServer(app);
const io = configureSocket(server, env.clientOrigin);
app.set("io", io);

await connectDatabase();

server.listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}`);
});
