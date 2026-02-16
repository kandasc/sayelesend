import { internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

export const getCampaignExportData = internalQuery({
  args: {
    bulkMessageId: v.id("bulkMessages"),
  },
  handler: async (ctx, args) => {
    const bulkMessage = await ctx.db.get(args.bulkMessageId);
    if (!bulkMessage) {
      throw new ConvexError({ message: "Campaign not found", code: "NOT_FOUND" });
    }

    // Get client name
    const client = await ctx.db.get(bulkMessage.clientId);
    const clientName = client?.companyName || client?.contactName || "Unknown";

    // Get all recipients
    const recipients = await ctx.db
      .query("bulkMessageRecipients")
      .withIndex("by_bulk", (q) => q.eq("bulkMessageId", args.bulkMessageId))
      .collect();

    return {
      campaign: {
        name: bulkMessage.name,
        message: bulkMessage.message,
        channel: bulkMessage.channel || "sms",
        status: bulkMessage.status,
        totalRecipients: bulkMessage.totalRecipients,
        sentCount: bulkMessage.sentCount,
        deliveredCount: bulkMessage.deliveredCount,
        failedCount: bulkMessage.failedCount,
        creditsUsed: bulkMessage.creditsUsed,
        createdAt: bulkMessage._creationTime,
        scheduledAt: bulkMessage.scheduledAt,
        from: bulkMessage.from,
        clientName,
      },
      recipients: recipients.map((r) => ({
        phoneNumber: r.phoneNumber,
        status: r.status,
        deliveredAt: r.deliveredAt,
        failureReason: r.failureReason,
        createdAt: r._creationTime,
      })),
    };
  },
});
