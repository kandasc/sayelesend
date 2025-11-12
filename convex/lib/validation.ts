import { ConvexError } from "convex/values";

/**
 * Validates phone number in E.164 format
 * Format: +[country code][number]
 * Example: +1234567890
 */
export function validatePhoneNumber(phone: string): void {
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  
  if (!e164Regex.test(phone)) {
    throw new ConvexError({
      message: "Invalid phone number format. Use E.164 format (e.g., +1234567890)",
      code: "BAD_REQUEST",
    });
  }
}

/**
 * Validates SMS message content
 * - Cannot be empty
 * - Maximum 1600 characters (10 SMS segments)
 * - No malicious content
 */
export function validateMessage(message: string): void {
  if (!message || message.trim().length === 0) {
    throw new ConvexError({
      message: "Message cannot be empty",
      code: "BAD_REQUEST",
    });
  }
  
  // SMS max length is typically 1600 chars (10 segments of 160 chars)
  if (message.length > 1600) {
    throw new ConvexError({
      message: "Message too long. Maximum 1600 characters.",
      code: "BAD_REQUEST",
    });
  }
  
  // Check for potential injection attempts
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+=/i, // event handlers
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(message)) {
      throw new ConvexError({
        message: "Message contains invalid content",
        code: "BAD_REQUEST",
      });
    }
  }
}

/**
 * Sanitizes message by removing control characters
 * Preserves newline, tab, and carriage return
 */
export function sanitizeMessage(message: string): string {
  // Remove control characters except newline, tab, carriage return
  // eslint-disable-next-line no-control-regex
  return message.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Validates webhook URL
 * - Must be HTTPS
 * - Cannot point to private/internal networks
 */
export function validateWebhookUrl(url: string): void {
  try {
    const parsed = new URL(url);
    
    // Must be HTTPS
    if (parsed.protocol !== 'https:') {
      throw new ConvexError({
        message: "Webhook URL must use HTTPS",
        code: "BAD_REQUEST",
      });
    }
    
    // Block private/internal IPs
    const hostname = parsed.hostname;
    const privateIpRanges = [
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^localhost$/i,
      /^0\.0\.0\.0$/,
    ];
    
    for (const pattern of privateIpRanges) {
      if (pattern.test(hostname)) {
        throw new ConvexError({
          message: "Webhook URL cannot point to private/internal networks",
          code: "BAD_REQUEST",
        });
      }
    }
  } catch (error) {
    if (error instanceof ConvexError) throw error;
    throw new ConvexError({
      message: "Invalid webhook URL format",
      code: "BAD_REQUEST",
    });
  }
}

/**
 * Validates bulk SMS recipient count
 */
export function validateBulkRecipients(recipients: string[], maxCount: number = 10000): void {
  if (recipients.length === 0) {
    throw new ConvexError({
      message: "Recipient list cannot be empty",
      code: "BAD_REQUEST",
    });
  }

  if (recipients.length > maxCount) {
    throw new ConvexError({
      message: `Maximum ${maxCount} recipients per bulk campaign`,
      code: "BAD_REQUEST",
    });
  }

  // Validate each phone number
  for (const phone of recipients) {
    try {
      validatePhoneNumber(phone);
    } catch (error) {
      throw new ConvexError({
        message: `Invalid phone number in recipients: ${phone}`,
        code: "BAD_REQUEST",
      });
    }
  }
}
