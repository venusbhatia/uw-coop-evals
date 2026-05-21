/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as evaluations from "../evaluations.js";
import type * as lib_demoSeed from "../lib/demoSeed.js";
import type * as lib_evaluationFields from "../lib/evaluationFields.js";
import type * as lib_requireAuth from "../lib/requireAuth.js";
import type * as lib_workflow from "../lib/workflow.js";
import type * as seedData from "../seedData.js";
import type * as students from "../students.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  evaluations: typeof evaluations;
  "lib/demoSeed": typeof lib_demoSeed;
  "lib/evaluationFields": typeof lib_evaluationFields;
  "lib/requireAuth": typeof lib_requireAuth;
  "lib/workflow": typeof lib_workflow;
  seedData: typeof seedData;
  students: typeof students;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
