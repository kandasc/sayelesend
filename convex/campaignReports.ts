"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

type CampaignData = {
  campaign: {
    name: string;
    message: string;
    channel: string;
    status: string;
    totalRecipients: number;
    sentCount: number;
    deliveredCount: number;
    failedCount: number;
    creditsUsed: number;
    createdAt: number;
    scheduledAt?: number;
    from?: string;
    clientName?: string;
  };
  recipients: Array<{
    phoneNumber: string;
    status: string;
    deliveredAt?: number;
    failureReason?: string;
    createdAt: number;
  }>;
};

export const exportCampaignPDF = action({
  args: {
    bulkMessageId: v.id("bulkMessages"),
  },
  handler: async (ctx, args): Promise<string> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "User not logged in", code: "UNAUTHENTICATED" });
    }

    const data: CampaignData = await ctx.runQuery(internal.campaignReportsQueries.getCampaignExportData, {
      bulkMessageId: args.bulkMessageId,
    });

    const { campaign, recipients } = data;
    const doc = new jsPDF();
    let y = 20;

    // Header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("SAYELE", 20, y);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Campaign Report", 20, y + 7);
    doc.setTextColor(0);
    y += 20;

    // Horizontal line
    doc.setDrawColor(200);
    doc.line(20, y, 190, y);
    y += 10;

    // Campaign info
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(campaign.name, 20, y);
    y += 8;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80);
    doc.text(`Created: ${new Date(campaign.createdAt).toLocaleString()}`, 20, y);
    y += 5;
    doc.text(`Channel: ${(campaign.channel || "sms").toUpperCase()}`, 20, y);
    y += 5;
    doc.text(`Status: ${campaign.status.toUpperCase()}`, 20, y);
    y += 5;
    if (campaign.from) {
      doc.text(`Sender: ${campaign.from}`, 20, y);
      y += 5;
    }
    if (campaign.clientName) {
      doc.text(`Client: ${campaign.clientName}`, 20, y);
      y += 5;
    }
    doc.setTextColor(0);
    y += 5;

    // Message content
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Message:", 20, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const messageLines = doc.splitTextToSize(campaign.message, 160);
    doc.text(messageLines, 20, y);
    y += messageLines.length * 4.5 + 8;

    // Stats box
    doc.setDrawColor(200);
    doc.setFillColor(248, 248, 248);
    doc.roundedRect(20, y, 170, 32, 3, 3, "FD");
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Summary", 25, y);
    y += 8;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");

    // Stats in columns
    const col1 = 25;
    const col2 = 70;
    const col3 = 115;
    const col4 = 160;

    doc.text(`Total: ${campaign.totalRecipients}`, col1, y);
    doc.text(`Sent: ${campaign.sentCount}`, col2, y);
    doc.setTextColor(34, 139, 34);
    doc.text(`Delivered: ${campaign.deliveredCount}`, col3, y);
    doc.setTextColor(220, 20, 60);
    doc.text(`Failed: ${campaign.failedCount}`, col4, y);
    doc.setTextColor(0);
    y += 6;

    const deliveryRate = campaign.totalRecipients > 0
      ? ((campaign.deliveredCount / campaign.totalRecipients) * 100).toFixed(1)
      : "0.0";
    const failureRate = campaign.totalRecipients > 0
      ? ((campaign.failedCount / campaign.totalRecipients) * 100).toFixed(1)
      : "0.0";

    doc.text(`Credits Used: ${campaign.creditsUsed}`, col1, y);
    doc.text(`Delivery Rate: ${deliveryRate}%`, col2, y);
    doc.text(`Failure Rate: ${failureRate}%`, col3, y);
    y += 15;

    // Recipients table
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Recipients", 20, y);
    y += 8;

    // Table header
    doc.setFillColor(60, 60, 60);
    doc.rect(20, y, 170, 8, "F");
    doc.setTextColor(255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("#", 23, y + 5.5);
    doc.text("Phone Number", 33, y + 5.5);
    doc.text("Status", 95, y + 5.5);
    doc.text("Delivered At", 125, y + 5.5);
    doc.text("Failure Reason", 160, y + 5.5);
    doc.setTextColor(0);
    y += 8;

    // Table rows
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);

    for (let i = 0; i < recipients.length; i++) {
      if (y > 275) {
        doc.addPage();
        y = 20;

        // Re-draw table header on new page
        doc.setFillColor(60, 60, 60);
        doc.rect(20, y, 170, 8, "F");
        doc.setTextColor(255);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text("#", 23, y + 5.5);
        doc.text("Phone Number", 33, y + 5.5);
        doc.text("Status", 95, y + 5.5);
        doc.text("Delivered At", 125, y + 5.5);
        doc.text("Failure Reason", 160, y + 5.5);
        doc.setTextColor(0);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        y += 8;
      }

      const r = recipients[i];

      // Alternate row coloring
      if (i % 2 === 0) {
        doc.setFillColor(245, 245, 245);
        doc.rect(20, y, 170, 6, "F");
      }

      doc.text(String(i + 1), 23, y + 4);
      doc.text(r.phoneNumber, 33, y + 4);

      // Color-coded status
      if (r.status === "delivered") {
        doc.setTextColor(34, 139, 34);
      } else if (r.status === "failed") {
        doc.setTextColor(220, 20, 60);
      } else {
        doc.setTextColor(100);
      }
      doc.text(r.status, 95, y + 4);
      doc.setTextColor(0);

      doc.text(r.deliveredAt ? new Date(r.deliveredAt).toLocaleString() : "-", 125, y + 4);

      const reason = r.failureReason || "-";
      const truncatedReason = reason.length > 20 ? reason.substring(0, 20) + "..." : reason;
      doc.text(truncatedReason, 160, y + 4);

      y += 6;
    }

    // Footer
    y += 10;
    if (y > 275) {
      doc.addPage();
      y = 20;
    }
    doc.setDrawColor(200);
    doc.line(20, y, 190, y);
    y += 6;
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(`Generated by SAYELE on ${new Date().toLocaleString()}`, 20, y);
    doc.text(`Total: ${recipients.length} recipients`, 150, y);

    const pdfBase64 = doc.output("datauristring").split(",")[1];
    return pdfBase64;
  },
});

export const exportCampaignExcel = action({
  args: {
    bulkMessageId: v.id("bulkMessages"),
  },
  handler: async (ctx, args): Promise<string> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "User not logged in", code: "UNAUTHENTICATED" });
    }

    const data: CampaignData = await ctx.runQuery(internal.campaignReportsQueries.getCampaignExportData, {
      bulkMessageId: args.bulkMessageId,
    });

    const { campaign, recipients } = data;
    const workbook = XLSX.utils.book_new();

    // --- Summary sheet ---
    const deliveryRate = campaign.totalRecipients > 0
      ? ((campaign.deliveredCount / campaign.totalRecipients) * 100).toFixed(1) + "%"
      : "0%";
    const failureRate = campaign.totalRecipients > 0
      ? ((campaign.failedCount / campaign.totalRecipients) * 100).toFixed(1) + "%"
      : "0%";

    type SummaryRow = (string | number)[];
    const summaryData: SummaryRow[] = [
      ["SAYELE Campaign Report"],
      [],
      ["Campaign Name", campaign.name],
      ["Message", campaign.message],
      ["Channel", (campaign.channel || "sms").toUpperCase()],
      ["Status", campaign.status.toUpperCase()],
      ["Created", new Date(campaign.createdAt).toLocaleString()],
      ...(campaign.scheduledAt ? [["Scheduled", new Date(campaign.scheduledAt).toLocaleString()]] as SummaryRow[] : []),
      ...(campaign.from ? [["Sender", campaign.from]] as SummaryRow[] : []),
      ...(campaign.clientName ? [["Client", campaign.clientName]] as SummaryRow[] : []),
      [],
      ["STATISTICS"],
      ["Total Recipients", campaign.totalRecipients],
      ["Sent", campaign.sentCount],
      ["Delivered", campaign.deliveredCount],
      ["Failed", campaign.failedCount],
      ["Delivery Rate", deliveryRate],
      ["Failure Rate", failureRate],
      ["Credits Used", campaign.creditsUsed],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    summarySheet["!cols"] = [{ wch: 20 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    // --- Recipients sheet ---
    type RecipientRow = (string | number)[];
    const recipientHeaders: RecipientRow = ["#", "Phone Number", "Status", "Delivered At", "Failure Reason"];
    const recipientRows: RecipientRow[] = recipients.map((r, i) => [
      i + 1,
      r.phoneNumber,
      r.status,
      r.deliveredAt ? new Date(r.deliveredAt).toLocaleString() : "",
      r.failureReason || "",
    ]);

    const recipientData = [recipientHeaders, ...recipientRows];
    const recipientSheet = XLSX.utils.aoa_to_sheet(recipientData);

    // Auto-size columns
    const maxWidth = 40;
    recipientSheet["!cols"] = recipientHeaders.map((_: string | number, colIdx: number) => {
      const maxLen = Math.max(
        ...recipientData.map((row: RecipientRow) => String(row[colIdx] || "").length)
      );
      return { wch: Math.min(maxLen + 2, maxWidth) };
    });

    XLSX.utils.book_append_sheet(workbook, recipientSheet, "Recipients");

    // --- Status Breakdown sheet ---
    const statusCounts: Record<string, number> = {};
    for (const r of recipients) {
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    }

    type BreakdownRow = (string | number)[];
    const breakdownData: BreakdownRow[] = [
      ["Status", "Count", "Percentage"],
      ...Object.entries(statusCounts).map(([status, count]) => [
        status,
        count,
        recipients.length > 0 ? ((count / recipients.length) * 100).toFixed(1) + "%" : "0%",
      ]),
    ];
    const breakdownSheet = XLSX.utils.aoa_to_sheet(breakdownData);
    breakdownSheet["!cols"] = [{ wch: 15 }, { wch: 10 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(workbook, breakdownSheet, "Status Breakdown");

    // Convert to base64
    const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const base64 = excelBuffer.toString("base64");
    return base64;
  },
});
