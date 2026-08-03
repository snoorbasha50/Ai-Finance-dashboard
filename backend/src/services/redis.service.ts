import Redis from "ioredis";
import { config } from "../config";
import { logger } from "../utils/logger";

class RedisService {
  private client?: Redis;

  constructor() {
    // Don't connect to Redis on Lambda for now
    if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
      logger.info("Lambda detected - Redis disabled");
      return;
    }

    this.client = new Redis(config.redis.url, {
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });

    this.client.on("connect", () => logger.info("Redis connected"));
    this.client.on("error", (err) => logger.error({ err }, "Redis error"));
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null;

    const data = await this.client.get(key);
    if (!data) return null;

    return JSON.parse(data) as T;
  }

  async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    if (!this.client) return;

    await this.client.set(key, JSON.stringify(value), "EX", ttlSeconds);
  }

  async delete(key: string): Promise<void> {
    if (!this.client) return;

    await this.client.del(key);
  }

  async deletePattern(pattern: string): Promise<void> {
    if (!this.client) return;

    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }
}

export const redisService = new RedisService();
