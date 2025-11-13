import type { GenericMutationCtx } from "convex/server";
import type { DataModel } from "../_generated/dataModel.d.ts";

const WINDOW_SIZE = 60000; // 1 minute in milliseconds
const MAX_REQUESTS_PER_WINDOW = 100;

/**
 * Rate limiter using sliding window algorithm
 * Returns true if request is allowed, false if rate limit exceeded
 */
export async function checkRateLimit(
  ctx: GenericMutationCtx<DataModel>,
  identifier: string,
  maxRequests: number = MAX_REQUESTS_PER_WINDOW
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const windowStart = now - WINDOW_SIZE;

  // Clean up old rate limit entries
  const oldEntries = await ctx.db
    .query("rateLimits")
    .withIndex("by_identifier", (q) => q.eq("identifier", identifier))
    .filter((q) => q.lt(q.field("windowStart"), windowStart))
    .collect();

  for (const entry of oldEntries) {
    await ctx.db.delete(entry._id);
  }

  // Get current window entry
  let rateLimit = await ctx.db
    .query("rateLimits")
    .withIndex("by_identifier", (q) => q.eq("identifier", identifier))
    .filter((q) => q.gte(q.field("windowStart"), windowStart))
    .first();

  if (!rateLimit) {
    // Create new window
    await ctx.db.insert("rateLimits", {
      identifier,
      windowStart: now,
      requestCount: 1,
      lastRequest: now,
    });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: now + WINDOW_SIZE,
    };
  }

  // Check if limit exceeded
  if (rateLimit.requestCount >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: rateLimit.windowStart + WINDOW_SIZE,
    };
  }

  // Increment counter
  await ctx.db.patch(rateLimit._id, {
    requestCount: rateLimit.requestCount + 1,
    lastRequest: now,
  });

  return {
    allowed: true,
    remaining: maxRequests - (rateLimit.requestCount + 1),
    resetAt: rateLimit.windowStart + WINDOW_SIZE,
  };
}

/**
 * Get current rate limit status without incrementing
 */
export async function getRateLimitStatus(
  ctx: GenericMutationCtx<DataModel>,
  identifier: string,
  maxRequests: number = MAX_REQUESTS_PER_WINDOW
): Promise<{ remaining: number; resetAt: number }> {
  const now = Date.now();
  const windowStart = now - WINDOW_SIZE;

  const rateLimit = await ctx.db
    .query("rateLimits")
    .withIndex("by_identifier", (q) => q.eq("identifier", identifier))
    .filter((q) => q.gte(q.field("windowStart"), windowStart))
    .first();

  if (!rateLimit) {
    return {
      remaining: maxRequests,
      resetAt: now + WINDOW_SIZE,
    };
  }

  return {
    remaining: Math.max(0, maxRequests - rateLimit.requestCount),
    resetAt: rateLimit.windowStart + WINDOW_SIZE,
  };
}
