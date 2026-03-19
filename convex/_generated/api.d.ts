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
import type * as ai from "../ai.js";
import type * as aiAssistants from "../aiAssistants.js";
import type * as aiAssistantsActions from "../aiAssistantsActions.js";
import type * as aiHandoverActions from "../aiHandoverActions.js";
import type * as analytics from "../analytics.js";
import type * as apiKeys from "../apiKeys.js";
import type * as apiKeysActions from "../apiKeysActions.js";
import type * as automation from "../automation.js";
import type * as bulk from "../bulk.js";
import type * as campaignReports from "../campaignReports.js";
import type * as campaignReportsQueries from "../campaignReportsQueries.js";
import type * as clients from "../clients.js";
import type * as compliance from "../compliance.js";
import type * as contactForm from "../contactForm.js";
import type * as contactGroups from "../contactGroups.js";
import type * as contacts from "../contacts.js";
import type * as conversations from "../conversations.js";
import type * as credits from "../credits.js";
import type * as documentActions from "../documentActions.js";
import type * as documents from "../documents.js";
import type * as emailAssistantActions from "../emailAssistantActions.js";
import type * as http from "../http.js";
import type * as httpHelpers from "../httpHelpers.js";
import type * as incomingMessages from "../incomingMessages.js";
import type * as lib_encryption from "../lib/encryption.js";
import type * as lib_keyGeneration from "../lib/keyGeneration.js";
import type * as lib_rateLimiter from "../lib/rateLimiter.js";
import type * as lib_secureKey from "../lib/secureKey.js";
import type * as lib_securityLogger from "../lib/securityLogger.js";
import type * as lib_validation from "../lib/validation.js";
import type * as lib_webhookVerification from "../lib/webhookVerification.js";
import type * as marketing from "../marketing.js";
import type * as marketingActions from "../marketingActions.js";
import type * as messages from "../messages.js";
import type * as migrations from "../migrations.js";
import type * as paymentEmails from "../paymentEmails.js";
import type * as paymentMutations from "../paymentMutations.js";
import type * as payments from "../payments.js";
import type * as providers from "../providers.js";
import type * as reports from "../reports.js";
import type * as sms_queries from "../sms/queries.js";
import type * as sms_send from "../sms/send.js";
import type * as sms_webhooks from "../sms/webhooks.js";
import type * as storage from "../storage.js";
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
  ai: typeof ai;
  aiAssistants: typeof aiAssistants;
  aiAssistantsActions: typeof aiAssistantsActions;
  aiHandoverActions: typeof aiHandoverActions;
  analytics: typeof analytics;
  apiKeys: typeof apiKeys;
  apiKeysActions: typeof apiKeysActions;
  automation: typeof automation;
  bulk: typeof bulk;
  campaignReports: typeof campaignReports;
  campaignReportsQueries: typeof campaignReportsQueries;
  clients: typeof clients;
  compliance: typeof compliance;
  contactForm: typeof contactForm;
  contactGroups: typeof contactGroups;
  contacts: typeof contacts;
  conversations: typeof conversations;
  credits: typeof credits;
  documentActions: typeof documentActions;
  documents: typeof documents;
  emailAssistantActions: typeof emailAssistantActions;
  http: typeof http;
  httpHelpers: typeof httpHelpers;
  incomingMessages: typeof incomingMessages;
  "lib/encryption": typeof lib_encryption;
  "lib/keyGeneration": typeof lib_keyGeneration;
  "lib/rateLimiter": typeof lib_rateLimiter;
  "lib/secureKey": typeof lib_secureKey;
  "lib/securityLogger": typeof lib_securityLogger;
  "lib/validation": typeof lib_validation;
  "lib/webhookVerification": typeof lib_webhookVerification;
  marketing: typeof marketing;
  marketingActions: typeof marketingActions;
  messages: typeof messages;
  migrations: typeof migrations;
  paymentEmails: typeof paymentEmails;
  paymentMutations: typeof paymentMutations;
  payments: typeof payments;
  providers: typeof providers;
  reports: typeof reports;
  "sms/queries": typeof sms_queries;
  "sms/send": typeof sms_send;
  "sms/webhooks": typeof sms_webhooks;
  storage: typeof storage;
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
