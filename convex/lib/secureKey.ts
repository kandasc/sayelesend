"use node";

import crypto from "crypto";

/**
 * Generates a cryptographically secure API key
 * Uses Node's crypto module for true random generation
 * Format: sk_[base64url encoded random bytes]
 */
export function generateSecureApiKey(): string {
  // Generate 32 random bytes (256 bits) for high entropy
  const randomBytes = crypto.randomBytes(32);
  
  // Convert to base64url (URL-safe base64)
  const key = randomBytes
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  return `sk_${key}`;
}

/**
 * Generates a secure hash of a value using SHA-256
 */
export function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}
