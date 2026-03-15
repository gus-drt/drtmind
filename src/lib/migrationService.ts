import { supabase } from '@/integrations/supabase/client';
import { getAllNotes, putNotesBatch, noteToIDB, idbToNote } from '@/lib/indexedDb';
import { clearQueue } from '@/lib/syncQueue';
import type { IDBNote } from '@/types/note';

const MIGRATION_FLAG = (uid: string) => `gn_cloud_migration_${uid}`;

// ─── Local → Cloud (Upgrade) ────────────────────────────────

/**
 * Migrates all local IndexedDB notes to Supabase cloud.
 * Uses upsert to avoid duplicates. Does NOT delete local notes
 * (they serve as cache for offline-first).
 */
export async function migrateLocalToCloud(userId: string): Promise<{ migrated: number; errors: number }> {
  const localNotes = await getAllNotes(userId);
  if (localNotes.length === 0) return { migrated: 0, errors: 0 };

  let migrated = 0;
  let errors = 0;

  // Batch upsert in chunks of 50
  const BATCH_SIZE = 50;
  for (let i = 0; i < localNotes.length; i += BATCH_SIZE) {
    const batch = localNotes.slice(i, i + BATCH_SIZE);
    const rows = batch.map(n => ({
      id: n.id,
      user_id: userId,
      title: n.title,
      content: n.content,
      pinned: n.pinned,
      pinned_at: n.pinnedAt,
      created_at: n.createdAt,
      updated_at: n.updatedAt,
    }));

    const { error } = await supabase.from('notes').upsert(rows, {
      onConflict: 'id',
    });

    if (error) {
      console.error(`[Migration] Batch ${i / BATCH_SIZE + 1} failed:`, error);
      errors += batch.length;
    } else {
      migrated += batch.length;
    }
  }

  // Clear the sync queue since everything is now in cloud
  await clearQueue(userId);

  console.log(`[Migration] Local → Cloud: ${migrated} migrated, ${errors} errors`);
  localStorage.setItem(MIGRATION_FLAG(userId), new Date().toISOString());

  return { migrated, errors };
}

// ─── Cloud → Local (Initial Sync / Downgrade) ───────────────

/**
 * Pulls all cloud notes to IndexedDB.
 * Used for initial sync or when downgrading from paid to free.
 */
export async function pullCloudToLocal(userId: string): Promise<{ pulled: number }> {
  try {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) return { pulled: 0 };

    const idbNotes: IDBNote[] = data.map(row => ({
      id: row.id,
      userId,
      title: row.title,
      content: row.content,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      pinned: row.pinned,
      pinnedAt: row.pinned_at,
    }));

    await putNotesBatch(idbNotes);

    console.log(`[Migration] Cloud → Local: ${idbNotes.length} notes pulled`);
    return { pulled: idbNotes.length };
  } catch (e) {
    console.error('[Migration] pullCloudToLocal failed:', e);
    return { pulled: 0 };
  }
}

// ─── Helpers ─────────────────────────────────────────────────

export function getLastMigrationDate(userId: string): string | null {
  return localStorage.getItem(MIGRATION_FLAG(userId));
}
