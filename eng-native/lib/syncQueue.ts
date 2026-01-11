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

// In-memory queue for sync operations
let inMemoryQueue: QueuedOperation[] = [];
let queueLoaded = false;

/**
 * Load queue from storage into memory
 */
export async function loadQueue(): Promise<void> {
  if (queueLoaded) return;
  const stored = await getCache<QueuedOperation[]>(CacheKeys.syncQueue);
  inMemoryQueue = stored || [];
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
