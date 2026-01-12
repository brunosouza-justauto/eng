import { CacheKeys, getCache, setCache, getCacheSync } from './storage';

// Types of operations that can be queued
export type OperationType =
  | 'meal_log'
  | 'water_log'
  | 'step_log'
  | 'supplement_log'
  | 'workout_session'
  | 'workout_set';

// Actions for each operation type
export type OperationAction = 'create' | 'update' | 'delete';

// A queued operation waiting to be synced
export interface QueuedOperation {
  id: string;
  type: OperationType;
  action: OperationAction;
  payload: Record<string, any>;
  createdAt: string;
  retryCount: number;
  userId: string;
}

// Failed operation with error details
export interface FailedOperation {
  operation: QueuedOperation;
  error: string;
  failedAt: string;
}

// In-memory queue for sync operations
let inMemoryQueue: QueuedOperation[] = [];
let failedOperationsQueue: FailedOperation[] = [];
let queueLoaded = false;

// Cache key for failed operations
const FAILED_OPS_KEY = '@sync/failed-operations';

/**
 * Load queue from storage into memory
 */
export async function loadQueue(): Promise<void> {
  if (queueLoaded) return;
  const stored = await getCache<QueuedOperation[]>(CacheKeys.syncQueue);
  inMemoryQueue = stored || [];

  // Also load failed operations
  const storedFailed = await getCache<FailedOperation[]>(FAILED_OPS_KEY);
  failedOperationsQueue = storedFailed || [];

  queueLoaded = true;
}

/**
 * Get all queued operations
 */
export function getQueue(): QueuedOperation[] {
  return [...inMemoryQueue];
}

/**
 * Get all queued operations (async - ensures loaded)
 */
export async function getQueueAsync(): Promise<QueuedOperation[]> {
  await loadQueue();
  return [...inMemoryQueue];
}

/**
 * Save queue to storage
 */
async function saveQueue(): Promise<void> {
  await setCache(CacheKeys.syncQueue, inMemoryQueue);
}

/**
 * Add an operation to the queue
 */
export async function addToQueue(
  operation: Omit<QueuedOperation, 'id' | 'createdAt' | 'retryCount'>
): Promise<string> {
  await loadQueue();

  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  inMemoryQueue.push({
    ...operation,
    id,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  });

  await saveQueue();
  console.log(`[SyncQueue] Added operation ${id} (${operation.type}:${operation.action})`);

  return id;
}

/**
 * Remove an operation from the queue
 */
export async function removeFromQueue(id: string): Promise<void> {
  inMemoryQueue = inMemoryQueue.filter((op) => op.id !== id);
  await saveQueue();
  console.log(`[SyncQueue] Removed operation ${id}`);
}

/**
 * Increment the retry count for an operation
 */
export async function incrementRetry(id: string): Promise<void> {
  inMemoryQueue = inMemoryQueue.map((op) =>
    op.id === id ? { ...op, retryCount: op.retryCount + 1 } : op
  );
  await saveQueue();
}

/**
 * Clear all queued operations
 */
export async function clearQueue(): Promise<void> {
  inMemoryQueue = [];
  await saveQueue();
  console.log('[SyncQueue] Queue cleared');
}

/**
 * Get the count of pending operations
 */
export function getQueueLength(): number {
  return inMemoryQueue.length;
}

/**
 * Get operations by type
 */
export function getOperationsByType(type: OperationType): QueuedOperation[] {
  return inMemoryQueue.filter((op) => op.type === type);
}

/**
 * Get operations by user
 */
export function getOperationsByUser(userId: string): QueuedOperation[] {
  return inMemoryQueue.filter((op) => op.userId === userId);
}

/**
 * Check if there are any pending operations
 */
export function hasPendingOperations(): boolean {
  return inMemoryQueue.length > 0;
}

/**
 * Update the payload of a queued operation
 * (useful for coalescing multiple updates to the same entity)
 */
export async function updateOperationPayload(
  id: string,
  payload: Record<string, any>
): Promise<void> {
  inMemoryQueue = inMemoryQueue.map((op) =>
    op.id === id ? { ...op, payload: { ...op.payload, ...payload } } : op
  );
  await saveQueue();
}

/**
 * Find an existing operation for the same entity
 * (useful for coalescing updates)
 */
export function findExistingOperation(
  type: OperationType,
  entityId: string
): QueuedOperation | undefined {
  return inMemoryQueue.find(
    (op) => op.type === type && op.payload.id === entityId
  );
}

// ============================================
// FAILED OPERATIONS MANAGEMENT
// ============================================

/**
 * Save failed operations to storage
 */
async function saveFailedOperations(): Promise<void> {
  await setCache(FAILED_OPS_KEY, failedOperationsQueue);
}

/**
 * Get all failed operations
 */
export function getFailedOperations(): FailedOperation[] {
  return [...failedOperationsQueue];
}

/**
 * Get count of failed operations
 */
export function getFailedOperationsCount(): number {
  return failedOperationsQueue.length;
}

/**
 * Add a failed operation
 */
export async function addFailedOperation(
  operation: QueuedOperation,
  error: string
): Promise<void> {
  failedOperationsQueue.push({
    operation,
    error,
    failedAt: new Date().toISOString(),
  });
  await saveFailedOperations();
  console.log(`[SyncQueue] Operation ${operation.id} marked as failed: ${error}`);
}

/**
 * Clear all failed operations
 */
export async function clearFailedOperations(): Promise<void> {
  failedOperationsQueue = [];
  await saveFailedOperations();
  console.log('[SyncQueue] Failed operations cleared');
}

/**
 * Retry a failed operation (move back to main queue)
 */
export async function retryFailedOperation(failedOpIndex: number): Promise<void> {
  if (failedOpIndex < 0 || failedOpIndex >= failedOperationsQueue.length) return;

  const failedOp = failedOperationsQueue[failedOpIndex];
  // Reset retry count and add back to main queue
  inMemoryQueue.push({
    ...failedOp.operation,
    retryCount: 0,
  });

  // Remove from failed queue
  failedOperationsQueue.splice(failedOpIndex, 1);

  await saveQueue();
  await saveFailedOperations();
  console.log(`[SyncQueue] Retrying failed operation ${failedOp.operation.id}`);
}

/**
 * Remove all operations associated with a local session ID
 * (used when canceling an offline workout)
 */
export async function removeOperationsByLocalSessionId(localSessionId: string): Promise<number> {
  await loadQueue();

  const originalLength = inMemoryQueue.length;

  // Remove workout_session operations with this local_session_id
  // Remove workout_set operations with this local_session_id
  inMemoryQueue = inMemoryQueue.filter((op) => {
    if (op.type === 'workout_session' && op.payload.local_session_id === localSessionId) {
      return false;
    }
    if (op.type === 'workout_set' && op.payload.local_session_id === localSessionId) {
      return false;
    }
    return true;
  });

  const removedCount = originalLength - inMemoryQueue.length;

  if (removedCount > 0) {
    await saveQueue();
    console.log(`[SyncQueue] Removed ${removedCount} operations for session ${localSessionId}`);
  }

  return removedCount;
}

/**
 * Get a human-readable description of an operation
 */
export function getOperationDescription(op: QueuedOperation): string {
  const typeLabels: Record<OperationType, string> = {
    meal_log: 'Meal',
    water_log: 'Water',
    step_log: 'Steps',
    supplement_log: 'Supplement',
    workout_session: 'Workout',
    workout_set: 'Exercise Set',
  };

  const actionLabels: Record<OperationAction, string> = {
    create: 'Log',
    update: 'Update',
    delete: 'Remove',
  };

  return `${actionLabels[op.action]} ${typeLabels[op.type]}`;
}
