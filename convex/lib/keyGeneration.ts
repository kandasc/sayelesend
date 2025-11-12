"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { generateSecureApiKey } from "./secureKey";

/**
 * Internal action to generate secure API keys
 * Must run in Node.js environment for crypto module
 */
export const generateApiKey = internalAction({
  args: {},
  handler: async () => {
    return generateSecureApiKey();
  },
});
