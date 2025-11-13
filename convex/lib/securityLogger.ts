import type { GenericMutationCtx } from "convex/server";
import type { Id } from "../_generated/dataModel.d.ts";
import type { DataModel } from "../_generated/dataModel.d.ts";

type SecurityEventType =
  | "api_key_created"
  | "api_key_deleted"
  | "api_key_used"
  | "admin_action"
  | "credit_modified"
  | "provider_accessed"
  | "user_role_changed"
  | "client_created"
  | "client_suspended"
  | "webhook_failed"
  | "rate_limit_exceeded"
  | "unauthorized_access";

interface LogSecurityEventArgs {
  ctx: GenericMutationCtx<DataModel>;
  eventType: SecurityEventType;
  action: string;
  success: boolean;
  userId?: Id<"users">;
  clientId?: Id<"clients">;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Logs security-relevant events for audit trail
 */
export async function logSecurityEvent(args: LogSecurityEventArgs): Promise<void> {
  const {
    ctx,
    eventType,
    action,
    success,
    userId,
    clientId,
    metadata,
    ipAddress,
    userAgent,
  } = args;

  await ctx.db.insert("securityLogs", {
    userId,
    clientId,
    eventType,
    action,
    success,
    metadata: metadata ? JSON.stringify(metadata) : undefined,
    ipAddress,
    userAgent,
  });
}
