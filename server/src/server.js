import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app.js";
import { env } from "./config/env.js";
import { connectRedis } from "./config/redis.js";
import { setupSockets } from "./sockets/index.js";
import { setIo } from "./sockets/io.js";
import { startWorkers } from "./workers/index.js";

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: env.clientUrl,
    credentials: true,
  },
});

setIo(io);
setupSockets(io);

async function bootstrap() {
  await connectRedis();
  startWorkers(io);

  httpServer.listen(env.port, () => {
    console.log(`CodeArena API v1 running on port ${env.port}`);
    console.log(`Socket.IO enabled · CORS: ${env.clientUrl}`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
