"use node";

import { Hercules } from "@usehercules/sdk";
import escapeHtml from "escape-html";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";

const hercules = new Hercules({
  apiKey: process.env.HERCULES_API_KEY!,
  apiVersion: "2025-12-09",
});

const SENDER = "SAYELE <noreply@sayele.co>";

// ─── Helpers ──────────────────────────────────────────────────

function formatXOF(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Africa/Abidjan",
  }).format(new Date(timestamp));
}

// Shared email wrapper for consistent branding
function wrapHtml(body: string): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:#7c2d12;padding:24px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">SAYELE</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            ${body}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:24px 32px;background:#fafafa;border-top:1px solid #e4e4e7;text-align:center;">
            <p style="margin:0;font-size:12px;color:#71717a;">
              &copy; ${new Date().getFullYear()} SAYELE &mdash; Plateforme de messagerie intelligente
            </p>
            <p style="margin:6px 0 0;font-size:12px;color:#a1a1aa;">
              <a href="https://sayele.co" style="color:#a1a1aa;text-decoration:underline;">sayele.co</a>
              &nbsp;&bull;&nbsp;
              <a href="mailto:support@sayele.co" style="color:#a1a1aa;text-decoration:underline;">support@sayele.co</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Payment Completed Receipt ────────────────────────────────

export const sendPaymentReceipt = internalAction({
  args: {
    to: v.string(),
    customerName: v.string(),
    transactionId: v.string(),
    packageName: v.string(),
    credits: v.number(),
    amount: v.number(),
    currency: v.string(),
    completedAt: v.number(),
  },
  handler: async (_ctx, args) => {
    const safeName = escapeHtml(args.customerName);
    const safeTxId = escapeHtml(args.transactionId);
    const safePackage = escapeHtml(args.packageName);

    const body = `
      <h2 style="margin:0 0 8px;font-size:20px;color:#18181b;">Reçu de paiement</h2>
      <p style="margin:0 0 24px;color:#52525b;font-size:14px;">
        Merci pour votre achat, ${safeName} !
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        <tr>
          <td style="padding:12px 16px;background:#f0fdf4;border-radius:8px;">
            <p style="margin:0;font-size:14px;color:#15803d;font-weight:600;">
              ✅ Paiement confirmé
            </p>
          </td>
        </tr>
      </table>

      <table width="100%" cellpadding="8" cellspacing="0" style="font-size:14px;color:#3f3f46;border-collapse:collapse;">
        <tr style="border-bottom:1px solid #e4e4e7;">
          <td style="padding:10px 0;color:#71717a;">Transaction</td>
          <td style="padding:10px 0;text-align:right;font-family:monospace;font-size:13px;">${safeTxId}</td>
        </tr>
        <tr style="border-bottom:1px solid #e4e4e7;">
          <td style="padding:10px 0;color:#71717a;">Forfait</td>
          <td style="padding:10px 0;text-align:right;font-weight:600;">${safePackage}</td>
        </tr>
        <tr style="border-bottom:1px solid #e4e4e7;">
          <td style="padding:10px 0;color:#71717a;">Crédits ajoutés</td>
          <td style="padding:10px 0;text-align:right;font-weight:600;color:#15803d;">+${args.credits.toLocaleString("fr-FR")} SMS</td>
        </tr>
        <tr style="border-bottom:1px solid #e4e4e7;">
          <td style="padding:10px 0;color:#71717a;">Montant payé</td>
          <td style="padding:10px 0;text-align:right;font-weight:700;font-size:16px;">${escapeHtml(formatXOF(args.amount))}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#71717a;">Date</td>
          <td style="padding:10px 0;text-align:right;">${escapeHtml(formatDate(args.completedAt))}</td>
        </tr>
      </table>

      <p style="margin:24px 0 0;font-size:13px;color:#71717a;">
        Vos crédits sont immédiatement disponibles dans votre tableau de bord.
        Si vous avez des questions, contactez-nous à
        <a href="mailto:support@sayele.co" style="color:#7c2d12;">support@sayele.co</a>.
      </p>
    `;

    try {
      await hercules.email.send({
        from: SENDER,
        to: args.to,
        subject: `Reçu de paiement – ${safePackage} (${args.credits.toLocaleString("fr-FR")} crédits)`,
        html: wrapHtml(body),
      });
      console.log(`[PaymentEmail] Receipt sent to ${args.to} for tx ${args.transactionId}`);
    } catch (err) {
      console.error("[PaymentEmail] Failed to send receipt:", err);
    }
  },
});

// ─── Payment Cancelled Notification ───────────────────────────

export const sendPaymentCancelled = internalAction({
  args: {
    to: v.string(),
    customerName: v.string(),
    transactionId: v.string(),
    packageName: v.string(),
    credits: v.number(),
    amount: v.number(),
    currency: v.string(),
    cancelledAt: v.number(),
  },
  handler: async (_ctx, args) => {
    const safeName = escapeHtml(args.customerName);
    const safeTxId = escapeHtml(args.transactionId);
    const safePackage = escapeHtml(args.packageName);

    const body = `
      <h2 style="margin:0 0 8px;font-size:20px;color:#18181b;">Paiement annulé</h2>
      <p style="margin:0 0 24px;color:#52525b;font-size:14px;">
        Bonjour ${safeName}, votre paiement a été annulé.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        <tr>
          <td style="padding:12px 16px;background:#fef2f2;border-radius:8px;">
            <p style="margin:0;font-size:14px;color:#dc2626;font-weight:600;">
              ❌ Paiement annulé
            </p>
          </td>
        </tr>
      </table>

      <table width="100%" cellpadding="8" cellspacing="0" style="font-size:14px;color:#3f3f46;border-collapse:collapse;">
        <tr style="border-bottom:1px solid #e4e4e7;">
          <td style="padding:10px 0;color:#71717a;">Transaction</td>
          <td style="padding:10px 0;text-align:right;font-family:monospace;font-size:13px;">${safeTxId}</td>
        </tr>
        <tr style="border-bottom:1px solid #e4e4e7;">
          <td style="padding:10px 0;color:#71717a;">Forfait</td>
          <td style="padding:10px 0;text-align:right;">${safePackage}</td>
        </tr>
        <tr style="border-bottom:1px solid #e4e4e7;">
          <td style="padding:10px 0;color:#71717a;">Montant</td>
          <td style="padding:10px 0;text-align:right;">${escapeHtml(formatXOF(args.amount))}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#71717a;">Date</td>
          <td style="padding:10px 0;text-align:right;">${escapeHtml(formatDate(args.cancelledAt))}</td>
        </tr>
      </table>

      <p style="margin:24px 0 0;font-size:13px;color:#71717a;">
        Aucun montant n'a été débité de votre compte. Si vous souhaitez réessayer,
        rendez-vous dans votre tableau de bord SAYELE.
      </p>
      <p style="margin:12px 0 0;font-size:13px;color:#71717a;">
        Besoin d'aide ? Contactez
        <a href="mailto:support@sayele.co" style="color:#7c2d12;">support@sayele.co</a>.
      </p>
    `;

    try {
      await hercules.email.send({
        from: SENDER,
        to: args.to,
        subject: `Paiement annulé – ${safePackage}`,
        html: wrapHtml(body),
      });
      console.log(`[PaymentEmail] Cancellation sent to ${args.to} for tx ${args.transactionId}`);
    } catch (err) {
      console.error("[PaymentEmail] Failed to send cancellation:", err);
    }
  },
});
