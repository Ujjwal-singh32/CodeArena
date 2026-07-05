import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app.js";
import { env } from "./config/env.js";
import { connectRedis, getRedis } from "./config/redis.js"; // <-- Updated import
import { setupSockets } from "./sockets/index.js";
import { setIo } from "./sockets/io.js";
import { startWorkers } from "./workers/index.js";

// <-- ADDED: Imports for Step 4 (Bloom Filter)
import prisma from "./config/db.js";
import { addUsernameToBloom } from "./utils/bloomFilter.js"; 

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: env.clientUrl,
    credentials: true,
  },
});

setIo(io);
setupSockets(io);

// <-- ADDED: Step 4 Bloom Filter Initialization Function
async function initializeBloomFilter() {
  const redis = getRedis();
  if (!redis) {
    console.warn("Redis not available, skipping Bloom Filter sync.");
    return;
  }

  try {
    // Check if we've already synced the DB to avoid doing it every restart
    const isSynced = await redis.get("bloom_filter_synced");
    if (isSynced) return;

    console.log("Syncing database usernames to Bloom Filter...");
    
    // Fetch just the usernames from the database
    const users = await prisma.user.findMany({ select: { username: true } });
    
    for (const user of users) {
      await addUsernameToBloom(user.username);
    }
    
    // Set flag so we don't run this expensive DB query on every reboot
    await redis.set("bloom_filter_synced", "true");
    console.log(`Successfully added ${users.length} users to the Bloom Filter.`);
  } catch (error) {
    console.error("Failed to initialize Bloom Filter:", error);
  }
}

async function bootstrap() {
  await connectRedis(); // Wait for Redis to connect

  // <-- ADDED: Run the Bloom Filter sync right after Redis connects
  await initializeBloomFilter();

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