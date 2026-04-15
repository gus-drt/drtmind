import { getDb } from '@/lib/indexedDb';
import { supabase } from '@/integrations/supabase/client';
import type { SyncOperation, SyncOperationType } from '@/types/note';

const MAX_RETRIES = 3;

// ─── Enqueue ─────────────────────────────────────────────────

/**
 * Adds an operation to the sync queue with deduplication.
 * - Sequential updates to the same note are merged.
 * - A delete supersedes any pending create/update for the same note.
 */
export async function enqueue(
  noteId: string,
  userId: string,
  type: SyncOperationType,
  payload: Record<string, any> = {}
): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('syncQueue', 'readwrite');
  const index = tx.store.index('by-noteId-type');

  if (type === 'delete') {
    // Remove all pending ops for this note (dedup: delete wins)
    const allOps = await db.getAllFromIndex('syncQueue', 'by-noteId-type', IDBKeyRange.bound(
      [noteId, ''],
      [noteId, '\uffff']
    ));
    const delTx = db.transaction('syncQueue', 'readwrite');
    for (const op of allOps) {
      if (op.id !== undefined) await delTx.store.delete(op.id);
    }
    await delTx.done;
  }

  if (type === 'update') {
    // Merge with existing pending update for same note
    const existing = await db.getAllFromIndex('syncQueue', 'by-noteId-type', [noteId, 'update']);
    const pending = existing.find(op => op.status === 'pending');
    if (pending && pending.id !== undefined) {
      await db.put('syncQueue', {
        ...pending,
        payload: { ...pending.payload, ...payload },
        createdAt: new Date().toISOString(),
      });
      return;
    }
  }

  if (type === 'pin') {
    // Replace existing pending pin for same note
    const existing = await db.getAllFromIndex('syncQueue', 'by-noteId-type', [noteId, 'pin']);
    const pending = existing.find(op => op.status === 'pending');
    if (pending && pending.id !== undefined) {
      await db.put('syncQueue', {
        ...pending,
        payload,
        createdAt: new Date().toISOString(),
      });
      return;
    }
  }

  // Insert new operation
  await db.add('syncQueue', {
    noteId,
    userId,
    type,
    payload,
    status: 'pending',
    retryCount: 0,
    createdAt: new Date().toISOString(),
  });
}

// ─── Process Queue ───────────────────────────────────────────

export async function processQueue(userId: string): Promise<{ processed: number; failed: number }> {
  if (!supabase) {
    // Cannot process queue without Supabase — ops remain queued for later
    return { processed: 0, failed: 0 };
  }

  const db = await getDb();
  const allOps = await db.getAllFromIndex('syncQueue', 'by-userId', userId);
  const pending = allOps.filter(op => op.status === 'pending' || op.status === 'failed');

  // Sort by creation time (FIFO)
  pending.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  let processed = 0;
  let failed = 0;

  for (const op of pending) {
    if (op.id === undefined) continue;

    // Mark as processing
    await db.put('syncQueue', { ...op, status: 'processing' });

    try {
      await executeSyncOp(op);
      // Success → remove from queue
      await db.delete('syncQueue', op.id);
      processed++;
    } catch (error) {
      const retryCount = op.retryCount + 1;
      if (retryCount >= MAX_RETRIES) {
        await db.put('syncQueue', { ...op, status: 'failed', retryCount });
        failed++;
        console.error(`[SyncQueue] Op ${op.type} for note ${op.noteId} failed permanently:`, error);
      } else {
        // Backoff: put back as pending for next cycle
        await db.put('syncQueue', { ...op, status: 'pending', retryCount });
        console.warn(`[SyncQueue] Op ${op.type} for note ${op.noteId} retry ${retryCount}/${MAX_RETRIES}`);
      }
    }
  }

  return { processed, failed };
}

// ─── Execute a single sync operation against Supabase ────────

async function executeSyncOp(op: SyncOperation): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured');

  switch (op.type) {
    case 'create': {
      const { error } = await supabase.from('notes').upsert({
        id: op.noteId,
        user_id: op.userId,
        title: op.payload.title,
        content: op.payload.content,
        pinned: op.payload.pinned ?? false,
        pinned_at: op.payload.pinnedAt ?? null,
        created_at: op.payload.createdAt,
        updated_at: op.payload.updatedAt,
      });
      if (error) throw error;
      break;
    }

    case 'update': {
      const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
      if (op.payload.title !== undefined) updateData.title = op.payload.title;
      if (op.payload.content !== undefined) updateData.content = op.payload.content;
      if (op.payload.is_public !== undefined) updateData.is_public = op.payload.is_public;

      const { error } = await supabase
        .from('notes')
        .update(updateData)
        .eq('id', op.noteId)
        .eq('user_id', op.userId);
      if (error) throw error;
      break;
    }

    case 'delete': {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', op.noteId)
        .eq('user_id', op.userId);
      if (error) throw error;
      break;
    }

    case 'pin': {
      const { error } = await supabase
        .from('notes')
        .update({
          pinned: op.payload.pinned,
          pinned_at: op.payload.pinnedAt ?? null,
        })
        .eq('id', op.noteId)
        .eq('user_id', op.userId);
      if (error) throw error;
      break;
    }
  }
}

// ─── Utilities ───────────────────────────────────────────────

export async function getPendingCount(userId: string): Promise<number> {
  const db = await getDb();
  const all = await db.getAllFromIndex('syncQueue', 'by-userId', userId);
  return all.filter(op => op.status === 'pending').length;
}

export async function getFailedOps(userId: string): Promise<SyncOperation[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex('syncQueue', 'by-userId', userId);
  return all.filter(op => op.status === 'failed');
}

export async function clearQueue(userId: string): Promise<void> {
  const db = await getDb();
  const all = await db.getAllFromIndex('syncQueue', 'by-userId', userId);
  const tx = db.transaction('syncQueue', 'readwrite');
  for (const op of all) {
    if (op.id !== undefined) await tx.store.delete(op.id);
  }
  await tx.done;
}

export async function retryFailed(userId: string): Promise<void> {
  const db = await getDb();
  const all = await db.getAllFromIndex('syncQueue', 'by-userId', userId);
  const failed = all.filter(op => op.status === 'failed');
  const tx = db.transaction('syncQueue', 'readwrite');
  for (const op of failed) {
    if (op.id !== undefined) {
      await tx.store.put({ ...op, status: 'pending', retryCount: 0 });
    }
  }
  await tx.done;
}
