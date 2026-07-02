import { Queue, Worker } from "bullmq";
import Redis from "ioredis";
import { env } from "../config/env.js";
import { isRedisReady } from "../config/redis.js";

const QUEUE_NAMES = {
  EXECUTION: "execution",
  AI_REVIEW: "ai-review",
  EMAIL: "email",
};

let bullConnection = null;

function getBullConnection() {
  if (bullConnection) return bullConnection;
  try {
    bullConnection = new Redis(env.redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    return bullConnection;
  } catch {
    return null;
  }
}

const queues = {};

export function getQueue(name) {
  if (!isRedisReady()) return null;
  if (queues[name]) return queues[name];
  const connection = getBullConnection();
  if (!connection) return null;
  queues[name] = new Queue(name, { connection });
  return queues[name];
}

export async function addExecutionJob(data) {
  const queue = getQueue(QUEUE_NAMES.EXECUTION);
  if (!queue) return processInline(QUEUE_NAMES.EXECUTION, data);
  try {
    const job = await queue.add("judge", data, { attempts: 2, backoff: 1000 });
    return { jobId: job.id, inline: false };
  } catch (err) {
    console.warn("BullMQ execution enqueue failed, processing inline:", err.message);
    return processInline(QUEUE_NAMES.EXECUTION, data);
  }
}

export async function addAiReviewJob(data) {
  const queue = getQueue(QUEUE_NAMES.AI_REVIEW);
  if (!queue) return processInline(QUEUE_NAMES.AI_REVIEW, data);
  try {
    const job = await queue.add("review", data, { attempts: 2 });
    return { jobId: job.id, inline: false };
  } catch (err) {
    console.warn("BullMQ AI review enqueue failed, processing inline:", err.message);
    return processInline(QUEUE_NAMES.AI_REVIEW, data);
  }
}

export async function addEmailJob(data) {
  const queue = getQueue(QUEUE_NAMES.EMAIL);
  if (!queue) return processInline(QUEUE_NAMES.EMAIL, data);
  try {
    const job = await queue.add("send", data, { attempts: 3 });
    return { jobId: job.id, inline: false };
  } catch (err) {
    console.warn("BullMQ email enqueue failed, processing inline:", err.message);
    return processInline(QUEUE_NAMES.EMAIL, data);
  }
}

const inlineHandlers = {};

export function registerInlineHandler(type, handler) {
  inlineHandlers[type] = handler;
}

async function processInline(type, data) {
  const handler = inlineHandlers[type];
  if (handler) {
    const result = await handler(data);
    return { inline: true, result };
  }
  return { inline: true, skipped: true };
}

export function createWorker(name, processor) {
  registerInlineHandler(name, processor);
  if (!isRedisReady()) return null;
  const connection = getBullConnection();
  if (!connection) return null;
  return new Worker(name, async (job) => processor(job.data), { connection });
}

export { QUEUE_NAMES };
