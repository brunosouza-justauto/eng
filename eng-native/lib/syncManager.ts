import { supabase } from './supabase';
import {
  getQueueAsync,
  removeFromQueue,
  incrementRetry,
  addFailedOperation,
  QueuedOperation,
} from './syncQueue';
import { CacheKeys, setCache } from './storage';

const MAX_RETRIES = 3;

// Mapping of local offline session IDs to real server session IDs
// This is populated when processing workout_session create operations
const localToServerSessionMap = new Map<string, string>();

export interface SyncResult {
  processed: number;
  failed: number;
  errors: Array<{ operationId: string; error: string }>;
}

/**
 * Get operation priority for sorting
 * Lower numbers = higher priority (processed first)
 */
function getOperationPriority(op: QueuedOperation): number {
  // workout_session creates must come first (to get real session ID)
  if (op.type === 'workout_session' && op.action === 'create') return 0;
  // workout_set creates need the session ID, so come second
  if (op.type === 'workout_set' && op.action === 'create') return 1;
  // workout_session updates (completion) come after sets
  if (op.type === 'workout_session' && op.action === 'update') return 2;
  // All other operations have normal priority
  return 3;
}

/**
 * Process all queued operations
 */
export async function processQueue(): Promise<SyncResult> {
  const queue = await getQueueAsync();
  let processed = 0;
  let failed = 0;
  const errors: Array<{ operationId: string; error: string }> = [];

  console.log(`[SyncManager] Processing ${queue.length} queued operations`);

  // Sort queue to ensure workout_session creates are processed before sets and updates
  const sortedQueue = [...queue].sort((a, b) => {
    const priorityA = getOperationPriority(a);
    const priorityB = getOperationPriority(b);
    if (priorityA !== priorityB) return priorityA - priorityB;
    // If same priority, maintain original order (by createdAt)
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  for (const operation of sortedQueue) {
    // Skip operations that have exceeded max retries
    if (operation.retryCount >= MAX_RETRIES) {
      const errorMsg = `Exceeded max retries (${MAX_RETRIES})`;
      console.warn(
        `[SyncManager] Operation ${operation.id} exceeded max retries, moving to failed queue`
      );
      // Move to failed operations queue for user visibility
      await addFailedOperation(operation, errorMsg);
      await removeFromQueue(operation.id);
      failed++;
      errors.push({
        operationId: operation.id,
        error: errorMsg,
      });
      continue;
    }

    try {
      await processOperation(operation);
      await removeFromQueue(operation.id);
      processed++;
      console.log(
        `[SyncManager] Successfully processed operation ${operation.id}`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(
        `[SyncManager] Failed to process operation ${operation.id}:`,
        errorMessage
      );

      // If this was the last retry, move to failed queue
      if (operation.retryCount >= MAX_RETRIES - 1) {
        await addFailedOperation(operation, errorMessage);
        await removeFromQueue(operation.id);
      } else {
        await incrementRetry(operation.id);
      }

      failed++;
      errors.push({ operationId: operation.id, error: errorMessage });
    }
  }

  // Update last sync time
  await setCache(CacheKeys.lastSyncTime, new Date().toISOString());

  console.log(
    `[SyncManager] Sync complete: ${processed} processed, ${failed} failed`
  );

  return { processed, failed, errors };
}

/**
 * Process a single operation
 */
async function processOperation(operation: QueuedOperation): Promise<void> {
  const { type, action, payload } = operation;

  switch (type) {
    case 'meal_log':
      await processMealLog(action, payload);
      break;

    case 'water_log':
      await processWaterLog(action, payload);
      break;

    case 'step_log':
      await processStepLog(action, payload);
      break;

    case 'supplement_log':
      await processSupplementLog(action, payload);
      break;

    case 'workout_session':
      await processWorkoutSession(action, payload);
      break;

    case 'workout_set':
      await processWorkoutSet(action, payload);
      break;

    default:
      throw new Error(`Unknown operation type: ${type}`);
  }
}

/**
 * Process meal log operations
 */
async function processMealLog(
  action: string,
  payload: Record<string, any>
): Promise<void> {
  if (action === 'create') {
    // Support both 'date' and 'log_date' field names for compatibility
    const dateValue = payload.date || payload.log_date;
    if (!dateValue) {
      throw new Error('Missing date field in meal_log payload');
    }
    const { error } = await supabase.from('meal_logs').insert({
      user_id: payload.user_id,
      meal_id: payload.meal_id,
      date: dateValue,
      is_extra_meal: payload.is_extra_meal || false,
      notes: payload.notes,
    });
    if (error) throw error;
  } else if (action === 'delete') {
    const { error } = await supabase
      .from('meal_logs')
      .delete()
      .eq('id', payload.id);
    if (error) throw error;
  }
}

/**
 * Process water log operations
 */
async function processWaterLog(
  action: string,
  payload: Record<string, any>
): Promise<void> {
  if (action === 'create' || action === 'update') {
    const { error } = await supabase.from('water_tracking').upsert(
      {
        user_id: payload.user_id,
        date: payload.date,
        amount_ml: payload.amount_ml,
      },
      { onConflict: 'user_id,date' }
    );
    if (error) throw error;
  }
}

/**
 * Process step log operations
 */
async function processStepLog(
  action: string,
  payload: Record<string, any>
): Promise<void> {
  if (action === 'create' || action === 'update') {
    const { error } = await supabase.from('step_entries').upsert(
      {
        user_id: payload.user_id,
        date: payload.date,
        step_count: payload.step_count,
      },
      { onConflict: 'user_id,date' }
    );
    if (error) throw error;
  }
}

/**
 * Process supplement log operations
 */
async function processSupplementLog(
  action: string,
  payload: Record<string, any>
): Promise<void> {
  if (action === 'create') {
    // Map field names from queue format to database format
    // Queue uses: assignment_id, logged_at
    // Database expects: athlete_supplement_id, taken_at, date
    const athleteSupplementId = payload.assignment_id || payload.athlete_supplement_id;
    const takenAt = payload.logged_at || payload.taken_at || new Date().toISOString();

    // Extract date from logged_at or use today
    const dateValue = payload.date || takenAt.split('T')[0];

    if (!athleteSupplementId) {
      throw new Error('Missing athlete_supplement_id in supplement_log payload');
    }

    const { error } = await supabase
      .from('supplement_logs')
      .upsert(
        {
          user_id: payload.user_id,
          athlete_supplement_id: athleteSupplementId,
          taken_at: takenAt,
          date: dateValue,
          notes: payload.notes || null,
        },
        { onConflict: 'athlete_supplement_id,date' }
      );
    if (error) throw error;
  } else if (action === 'delete') {
    const { error } = await supabase
      .from('supplement_logs')
      .delete()
      .eq('id', payload.id);
    if (error) throw error;
  }
}

/**
 * Process workout session operations
 */
async function processWorkoutSession(
  action: string,
  payload: Record<string, any>
): Promise<void> {
  if (action === 'create') {
    // Support both 'start_time' and 'started_at' field names
    const startTime = payload.start_time || payload.started_at || new Date().toISOString();

    const { data, error } = await supabase
      .from('workout_sessions')
      .insert({
        user_id: payload.user_id,
        workout_id: payload.workout_id,
        start_time: startTime,
        end_time: payload.end_time,
        notes: payload.notes,
      })
      .select('id')
      .single();

    if (error) throw error;

    // Store the mapping from local session ID to real server ID
    if (payload.local_session_id && data?.id) {
      localToServerSessionMap.set(payload.local_session_id, data.id);
      console.log(`[SyncManager] Mapped local session ${payload.local_session_id} to server ID ${data.id}`);
    }
  } else if (action === 'update') {
    // Handle update using either 'id' or 'local_session_id'
    let sessionId = payload.id;

    // If no direct id, look up by local_session_id
    if (!sessionId && payload.local_session_id) {
      sessionId = localToServerSessionMap.get(payload.local_session_id);
      if (!sessionId) {
        throw new Error(`No server session ID found for local session ${payload.local_session_id}`);
      }
    }

    if (!sessionId) {
      throw new Error('No session ID available for update');
    }

    // Map payload fields to database fields
    const updateData: Record<string, any> = {};

    if (payload.status === 'completed') {
      updateData.end_time = payload.completed_at || new Date().toISOString();
    }
    if (payload.duration_seconds !== undefined) {
      updateData.duration_seconds = payload.duration_seconds;
    }
    if (payload.notes !== undefined) {
      updateData.notes = payload.notes;
    }
    if (payload.end_time !== undefined) {
      updateData.end_time = payload.end_time;
    }

    const { error } = await supabase
      .from('workout_sessions')
      .update(updateData)
      .eq('id', sessionId);
    if (error) throw error;
  }
}

/**
 * Process workout set operations
 * Note: The actual table is 'completed_exercise_sets', not 'workout_sets'
 */
async function processWorkoutSet(
  action: string,
  payload: Record<string, any>
): Promise<void> {
  if (action === 'create') {
    // Get the session ID - either direct or via local session mapping
    let sessionId = payload.session_id || payload.workout_session_id;

    if (!sessionId && payload.local_session_id) {
      sessionId = localToServerSessionMap.get(payload.local_session_id);
      if (!sessionId) {
        throw new Error(`No server session ID found for local session ${payload.local_session_id}`);
      }
    }

    if (!sessionId) {
      throw new Error('No session ID available for workout set');
    }

    // Support both 'set_number' and 'set_order' field names
    const setOrder = payload.set_order || payload.set_number;

    // Weight is stored as TEXT in the database, convert if needed
    let weight = payload.weight;
    if (payload.weight_kg !== undefined) {
      weight = payload.weight_kg !== null ? String(payload.weight_kg) : null;
    }

    const { error } = await supabase.from('completed_exercise_sets').insert({
      workout_session_id: sessionId,
      exercise_instance_id: payload.exercise_instance_id,
      set_order: setOrder,
      reps: payload.reps,
      weight: weight,
      is_completed: true,
      set_type: payload.set_type,
      notes: payload.notes,
    });
    if (error) throw error;
  } else if (action === 'update') {
    const { id, ...updateData } = payload;
    const { error } = await supabase
      .from('completed_exercise_sets')
      .update(updateData)
      .eq('id', id);
    if (error) throw error;
  }
}

/**
 * Check if sync is needed (has pending operations)
 */
export async function needsSync(): Promise<boolean> {
  const queue = await getQueueAsync();
  return queue.length > 0;
}

/**
 * Get the last sync time
 */
export async function getLastSyncTime(): Promise<string | null> {
  const { getCache } = await import('./storage');
  const time = await getCache<string>(CacheKeys.lastSyncTime);
  return time;
}
