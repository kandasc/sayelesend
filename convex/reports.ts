"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { api } from "./_generated/api";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

export const exportReportCSV = action({
  args: {
    startDate: v.number(),
    endDate: v.number(),
    clientId: v.optional(v.id("clients")),
  },
  handler: async (ctx, args): Promise<string> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    // Fetch messages within the date range
    const messages: Array<{
      _creationTime: number;
      to: string;
      from: string;
      message: string;
      status: string;
      providerName?: string;
      creditsUsed: number;
    }> = await ctx.runQuery(api.analytics.getMessagesForExport, {
      startDate: args.startDate,
      endDate: args.endDate,
      clientId: args.clientId,
    });

    // Convert to CSV
    const headers = ["Date", "Recipient", "From", "Message", "Status", "Provider", "Credits Used"];
    const rows: string[][] = messages.map((msg: {
      _creationTime: number;
      to: string;
      from: string;
      message: string;
      status: string;
      providerName?: string;
      creditsUsed: number;
    }) => [
      new Date(msg._creationTime).toISOString(),
      msg.to,
      msg.from,
      msg.message.replace(/"/g, '""'), // Escape quotes
      msg.status,
      msg.providerName || "N/A",
      msg.creditsUsed.toString(),
    ]);

    const csvContent: string = [
      headers.join(","),
      ...rows.map((row: string[]) => row.map((cell: string) => `"${cell}"`).join(",")),
    ].join("\n");

    return csvContent;
  },
});

export const exportReportExcel = action({
  args: {
    startDate: v.number(),
    endDate: v.number(),
    clientId: v.optional(v.id("clients")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    // Fetch messages within the date range
    const messages = await ctx.runQuery(api.analytics.getMessagesForExport, {
      startDate: args.startDate,
      endDate: args.endDate,
      clientId: args.clientId,
    });

    // Prepare data for Excel
    type WorksheetRow = (string | number)[];
    const worksheetData: WorksheetRow[] = [
      ["Date", "Recipient", "From", "Message", "Status", "Provider", "Credits Used"],
      ...messages.map((msg: {
        _creationTime: number;
        to: string;
        from: string;
        message: string;
        status: string;
        providerName?: string;
        creditsUsed: number;
      }) => [
        new Date(msg._creationTime).toISOString(),
        msg.to,
        msg.from,
        msg.message,
        msg.status,
        msg.providerName || "N/A",
        msg.creditsUsed,
      ] as WorksheetRow),
    ];

    // Create workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Auto-size columns
    const maxWidth = 50;
    const colWidths = worksheetData[0].map((_: string | number, colIdx: number) => {
      const maxLen = Math.max(
        ...worksheetData.map((row: WorksheetRow) => String(row[colIdx] || "").length)
      );
      return { wch: Math.min(maxLen + 2, maxWidth) };
    });
    worksheet['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, "Messages");

    // Convert to base64
    const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const base64 = excelBuffer.toString("base64");

    return base64;
  },
});

export const exportReportPDF = action({
  args: {
    startDate: v.number(),
    endDate: v.number(),
    clientId: v.optional(v.id("clients")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    // Fetch data
    const messages = await ctx.runQuery(api.analytics.getMessagesForExport, {
      startDate: args.startDate,
      endDate: args.endDate,
      clientId: args.clientId,
    });

    const stats = await ctx.runQuery(api.analytics.getMessageStats, {
      startDate: args.startDate,
      endDate: args.endDate,
      clientId: args.clientId,
    });

    // Create PDF
    const doc = new jsPDF();
    let yPosition = 20;

    // Title
    doc.setFontSize(18);
    doc.text("SAYELE SMS Report", 105, yPosition, { align: "center" });
    yPosition += 10;

    // Date range
    doc.setFontSize(10);
    doc.text(
      `Period: ${new Date(args.startDate).toLocaleDateString()} - ${new Date(args.endDate).toLocaleDateString()}`,
      105,
      yPosition,
      { align: "center" }
    );
    yPosition += 15;

    // Statistics
    doc.setFontSize(14);
    doc.text("Summary Statistics", 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.text(`Total Messages: ${stats.totalMessages}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Delivered: ${stats.deliveredMessages} (${stats.deliveryRate.toFixed(1)}%)`, 20, yPosition);
    yPosition += 6;
    doc.text(`Failed: ${stats.failedMessages} (${stats.failureRate.toFixed(1)}%)`, 20, yPosition);
    yPosition += 6;
    doc.text(`Pending: ${stats.pendingMessages}`, 20, yPosition);
    yPosition += 15;

    // Message list (limited to first 100 for PDF size)
    doc.setFontSize(14);
    doc.text("Recent Messages", 20, yPosition);
    yPosition += 10;

    doc.setFontSize(8);
    const displayMessages = messages.slice(0, 100);

    for (const msg of displayMessages) {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }

      const date = new Date(msg._creationTime).toLocaleString();
      doc.text(`${date} | To: ${msg.to} | Status: ${msg.status}`, 20, yPosition);
      yPosition += 5;
    }

    if (messages.length > 100) {
      yPosition += 10;
      doc.setFontSize(10);
      doc.text(`... and ${messages.length - 100} more messages`, 20, yPosition);
    }

    // Convert to base64
    const pdfBase64 = doc.output("datauristring").split(",")[1];
    return pdfBase64;
  },
});
