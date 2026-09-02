import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redisClient = createClient({
  url: redisUrl,
});

redisClient.on('error', (error) => {
  console.error('[RateLimit] Redis error:', error);
});

let connecting: Promise<void> | null = null;

async function ensureRedisConnection(): Promise<void> {
  if (redisClient.isOpen) {
    return;
  }

  if (!connecting) {
    connecting = redisClient
      .connect()
      .then(() => undefined)
      .finally(() => {
        connecting = null;
      });
  }

  await connecting;
}

export interface RateLimitOptions {
  limit: number;
  windowSeconds: number;
  prefix?: string;
}

export function createRateLimiter(
  options: RateLimitOptions,
) {
  const prefix = options.prefix ?? 'rate-limit';

  return async (
    identifier: string,
  ): Promise<{
    allowed: boolean;
    remaining: number;
  }> => {
    await ensureRedisConnection();

    const key = `${prefix}:${identifier}`;

    const current = await redisClient.incr(key);

    if (current === 1) {
      await redisClient.expire(key, options.windowSeconds);
    }

    const remaining = Math.max(
      0,
      options.limit - current,
    );

    return {
      allowed: current <= options.limit,
      remaining,
    };
  };
}