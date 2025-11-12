/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as analytics from "../analytics.js";
import type * as apiKeys from "../apiKeys.js";
import type * as bulk from "../bulk.js";
import type * as clients from "../clients.js";
import type * as contactGroups from "../contactGroups.js";
import type * as contacts from "../contacts.js";
import type * as http from "../http.js";
import type * as incomingMessages from "../incomingMessages.js";
import type * as lib_keyGeneration from "../lib/keyGeneration.js";
import type * as lib_secureKey from "../lib/secureKey.js";
import type * as lib_validation from "../lib/validation.js";
import type * as messages from "../messages.js";
import type * as providers from "../providers.js";
import type * as reports from "../reports.js";
import type * as sms_queries from "../sms/queries.js";
import type * as sms_send from "../sms/send.js";
import type * as sms_webhooks from "../sms/webhooks.js";
import type * as templates from "../templates.js";
import type * as testMode from "../testMode.js";
import type * as users from "../users.js";
import type * as webhookActions from "../webhookActions.js";
import type * as webhookEvents from "../webhookEvents.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  analytics: typeof analytics;
  apiKeys: typeof apiKeys;
  bulk: typeof bulk;
  clients: typeof clients;
  contactGroups: typeof contactGroups;
  contacts: typeof contacts;
  http: typeof http;
  incomingMessages: typeof incomingMessages;
  "lib/keyGeneration": typeof lib_keyGeneration;
  "lib/secureKey": typeof lib_secureKey;
  "lib/validation": typeof lib_validation;
  messages: typeof messages;
  providers: typeof providers;
  reports: typeof reports;
  "sms/queries": typeof sms_queries;
  "sms/send": typeof sms_send;
  "sms/webhooks": typeof sms_webhooks;
  templates: typeof templates;
  testMode: typeof testMode;
  users: typeof users;
  webhookActions: typeof webhookActions;
  webhookEvents: typeof webhookEvents;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
