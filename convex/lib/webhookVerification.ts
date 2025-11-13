"use node";

import crypto from "crypto";

/**
 * Verify Twilio webhook signature
 */
export function verifyTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  try {
    // Sort params and create string
    const data = Object.keys(params)
      .sort()
      .reduce((acc, key) => acc + key + params[key], url);

    const expectedSignature = crypto
      .createHmac('sha1', authToken)
      .update(Buffer.from(data, 'utf-8'))
      .digest('base64');

    return signature === expectedSignature;
  } catch {
    return false;
  }
}

/**
 * Verify Vonage webhook signature
 */
export function verifyVonageSignature(
  secret: string,
  signature: string,
  body: string,
  timestamp: string
): boolean {
  try {
    const hash = crypto
      .createHmac('sha256', secret)
      .update(timestamp + body)
      .digest('hex');

    return signature === hash;
  } catch {
    return false;
  }
}

/**
 * Verify Africa's Talking webhook (they don't use signatures, verify by IP)
 */
export function verifyAfricasTalkingIP(ipAddress: string): boolean {
  // Africa's Talking webhook IPs (update with actual IPs from documentation)
  const allowedIPs = [
    '5.189.166.92',
    '5.189.166.93',
    // Add more IPs from Africa's Talking documentation
  ];
  return allowedIPs.includes(ipAddress);
}

/**
 * Verify Meta (WhatsApp/Messenger) webhook signature
 */
export function verifyMetaSignature(
  appSecret: string,
  signature: string,
  body: string
): boolean {
  try {
    // Remove 'sha256=' prefix if present
    const sig = signature.replace('sha256=', '');
    
    const expectedSignature = crypto
      .createHmac('sha256', appSecret)
      .update(body)
      .digest('hex');

    return sig === expectedSignature;
  } catch {
    return false;
  }
}

/**
 * Generic HMAC-SHA256 verification
 */
export function verifyHmacSignature(
  secret: string,
  signature: string,
  body: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    // Use timing-safe comparison
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}
