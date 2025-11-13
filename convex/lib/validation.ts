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
 * Validates webhook URL with comprehensive SSRF protection
 * - Must be HTTPS
 * - Cannot point to private/internal networks (IPv4 and IPv6)
 * - Blocks cloud metadata endpoints
 * - Blocks link-local addresses
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
    
    const hostname = parsed.hostname.toLowerCase();
    
    // Block localhost variations
    const localhostPatterns = [
      /^localhost$/i,
      /^127\./,
      /^0\.0\.0\.0$/,
      /^::1$/,
      /^0:0:0:0:0:0:0:1$/,
    ];
    
    // Block private IPv4 ranges
    const privateIpv4Patterns = [
      /^10\./,                                    // 10.0.0.0/8
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,         // 172.16.0.0/12
      /^192\.168\./,                              // 192.168.0.0/16
      /^169\.254\./,                              // Link-local (AWS metadata)
    ];
    
    // Block private IPv6 ranges
    const privateIpv6Patterns = [
      /^fe80:/i,                                  // Link-local
      /^fc00:/i,                                  // Unique local
      /^fd00:/i,                                  // Unique local
      /^ff00:/i,                                  // Multicast
    ];
    
    // Combine all blocked patterns
    const allBlockedPatterns = [
      ...localhostPatterns,
      ...privateIpv4Patterns,
      ...privateIpv6Patterns,
    ];
    
    // Check against all patterns
    for (const pattern of allBlockedPatterns) {
      if (pattern.test(hostname)) {
        throw new ConvexError({
          message: "Webhook URL cannot point to private/internal networks",
          code: "BAD_REQUEST",
        });
      }
    }
    
    // Block common internal domains
    const blockedDomains = [
      'internal',
      'local',
      'localhost',
      'intranet',
    ];
    
    for (const domain of blockedDomains) {
      if (hostname.includes(domain)) {
        throw new ConvexError({
          message: "Webhook URL cannot use internal domains",
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
 * Validates email format
 */
export function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    throw new ConvexError({
      message: "Invalid email format",
      code: "BAD_REQUEST",
    });
  }
  
  // Check for suspicious patterns
  if (email.length > 254) {
    throw new ConvexError({
      message: "Email address too long",
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
