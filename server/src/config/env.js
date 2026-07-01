import dotenv from "dotenv";
dotenv.config();

export const env = {
  port: parseInt(process.env.PORT || "5000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  clientUrl: process.env.CLIENT_URL || "http://localhost:3000",
  databaseUrl: process.env.DATABASE_URL,
  jwt: {
    secret: process.env.JWT_SECRET || "dev-secret-change-me",
    accessExpires: process.env.JWT_ACCESS_EXPIRES || "15m",
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || "7d",
  },
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
    clientId: process.env.KAFKA_CLIENT_ID || "codearena",
    enabled: process.env.KAFKA_ENABLED === "true",
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || "CodeArena <noreply@codearena.dev>",
  },
  ai: {
    apiKey: process.env.COHERE_API_KEY || process.env.AI_API_KEY,
    apiUrl: process.env.COHERE_API_URL || process.env.AI_API_URL || "https://api.cohere.ai/v2/chat",
    model: process.env.COHERE_MODEL || process.env.AI_MODEL || "command-r-plus",
  },
  execution: {
    enabled: process.env.EXECUTION_ENABLED === "true",
    sandboxImage: process.env.DOCKER_SANDBOX_IMAGE || "codearena-sandbox:latest",
  },
  admin: {
    apiKey: process.env.ADMIN_API_KEY || "",
  },
};
