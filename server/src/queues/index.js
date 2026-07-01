import { Queue, Worker } from "bullmq";
import Redis from "ioredis";
import { env } from "../config/env.js";

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
  if (queues[name]) return queues[name];
  const connection = getBullConnection();
  if (!connection) return null;
  queues[name] = new Queue(name, { connection });
  return queues[name];
}

export async function addExecutionJob(data) {
  const queue = getQueue(QUEUE_NAMES.EXECUTION);
  if (!queue) return processInline("execution", data);
  const job = await queue.add("judge", data, { attempts: 2, backoff: 1000 });
  return { jobId: job.id, inline: false };
}

export async function addAiReviewJob(data) {
  const queue = getQueue(QUEUE_NAMES.AI_REVIEW);
  if (!queue) return processInline("ai-review", data);
  const job = await queue.add("review", data, { attempts: 2 });
  return { jobId: job.id, inline: false };
}

export async function addEmailJob(data) {
  const queue = getQueue(QUEUE_NAMES.EMAIL);
  if (!queue) return processInline("email", data);
  const job = await queue.add("send", data, { attempts: 3 });
  return { jobId: job.id, inline: false };
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
  const connection = getBullConnection();
  if (!connection) {
    registerInlineHandler(name, processor);
    return null;
  }
  return new Worker(name, async (job) => processor(job.data), { connection });
}

export { QUEUE_NAMES };
