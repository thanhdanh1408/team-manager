// src/lib/db.ts
/**
 * Firestore data-access layer (server-side only).
 *
 * Provides a high-level API used by API routes:
 * - getDocuments<T>()  → array of plain data objects (with `id`)
 * - getDocument<T>()   → plain data object (with `id`) or null
 * - createDocument()   → the created data object (with `id` + `createdAt`)
 * - countDocuments()   → number of matching docs
 *
 * The underlying Firestore instance comes from `@/lib/firebase-admin`.
 * `initializeDb()` can override it (useful for tests).
 */
import type {
  Firestore,
  Query,
  WhereFilterOp,
} from "firebase-admin/firestore";
import { db as adminDb } from "@/lib/firebase-admin";

// ─── Collection names ────────────────────────────────────────────────────────
export const COLLECTIONS = {
  USERS: "users",
  TASKS: "tasks",
  EVALUATIONS: "evaluations",
  NOTIFICATIONS: "notifications",
  ACTIVITY_LOGS: "activityLogs",
  CONVERSATIONS: "conversations",
  MESSAGES: "messages",
  TASK_COMMENTS: "taskComments",
  TASK_REPORTS: "taskReports",
  AI_TASK_PLANS: "aiTaskPlans",
  PENDING_REGISTRATIONS: "pendingRegistrations",
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

// ─── Query types ─────────────────────────────────────────────────────────────
export interface WhereFilter {
  field: string;
  op: WhereFilterOp;
  value: unknown;
}

export interface QueryOptions {
  orderByField?: string;
  orderDirection?: "asc" | "desc";
  limitCount?: number;
  offset?: number;
}

// ─── Firestore instance ──────────────────────────────────────────────────────
let dbOverride: Firestore | undefined;

/** Override the Firestore instance (mainly for tests). */
export function initializeDb(firebaseDb: Firestore) {
  dbOverride = firebaseDb;
}

export function getDb(): Firestore {
  return dbOverride ?? adminDb;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function applyFilters(collection: string, filters: WhereFilter[] = []): Query {
  let query: Query = getDb().collection(collection);
  for (const f of filters) {
    query = query.where(f.field, f.op, f.value);
  }
  return query;
}

// ─── CRUD ────────────────────────────────────────────────────────────────────

/** Fetch documents matching `filters`, returned as plain data objects with `id`. */
export async function getDocuments<T = Record<string, unknown>>(
  collection: string,
  filters: WhereFilter[] = [],
  options: QueryOptions = {}
): Promise<Array<T & { id: string }>> {
  let query = applyFilters(collection, filters);
  if (options.orderByField) {
    query = query.orderBy(options.orderByField, options.orderDirection ?? "asc");
  }
  if (options.offset) query = query.offset(options.offset);
  if (options.limitCount) query = query.limit(options.limitCount);

  const snap = await query.get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as T) }));
}

/** Fetch a single document by id. Returns null when it does not exist. */
export async function getDocument<T = Record<string, unknown>>(
  collection: string,
  id: string
): Promise<(T & { id: string }) | null> {
  const snap = await getDb().collection(collection).doc(id).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...(snap.data() as T) };
}

/** Remove keys with `undefined` values — Firestore rejects them at write time. */
function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as T;
}

/** Create a document. Auto-fills `createdAt` when absent. Returns the created data with `id`. */
export async function createDocument<T extends Record<string, unknown>>(
  collection: string,
  data: T
): Promise<T & { id: string; createdAt: string }> {
  const payload = stripUndefined({
    createdAt: new Date().toISOString(),
    ...data,
  });
  const ref = await getDb().collection(collection).add(payload);
  return { id: ref.id, ...(payload as T & { createdAt: string }) };
}

/** Create or replace a document using a caller-provided id. */
export async function setDocument<T extends Record<string, unknown>>(
  collection: string,
  id: string,
  data: T
): Promise<T & { id: string; createdAt: string }> {
  const payload = stripUndefined({
    createdAt: new Date().toISOString(),
    ...data,
  });
  await getDb().collection(collection).doc(id).set(payload);
  return { id, ...(payload as T & { createdAt: string }) };
}

/** Update a document by id. Auto-fills `updatedAt`. */
export async function updateDocument(
  collection: string,
  id: string,
  data: Record<string, unknown>
): Promise<void> {
  await getDb()
    .collection(collection)
    .doc(id)
    .update(
      stripUndefined({ ...data, updatedAt: new Date().toISOString() })
    );
}

/** Delete a document by id. */
export async function deleteDocument(
  collection: string,
  id: string
): Promise<void> {
  await getDb().collection(collection).doc(id).delete();
}

/** Batch-update every document matching `filters` with `data`. */
export async function updateDocuments(
  collection: string,
  filters: WhereFilter[],
  data: Record<string, unknown>
): Promise<void> {
  const snap = await applyFilters(collection, filters).get();
  if (snap.empty) return;
  const batch = getDb().batch();
  const payload = { ...data, updatedAt: new Date().toISOString() };
  snap.docs.forEach((d) => batch.update(d.ref, payload));
  await batch.commit();
}

/** Count documents matching `filters` (uses Firestore aggregation query). */
export async function countDocuments(
  collection: string,
  filters: WhereFilter[] = []
): Promise<number> {
  const snap = await applyFilters(collection, filters).count().get();
  return snap.data().count;
}
