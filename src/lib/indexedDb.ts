import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { IDBNote, SyncOperation } from '@/types/note';

// ─── Schema ──────────────────────────────────────────────────

const DB_NAME = 'graphnotes';
const DB_VERSION = 1;

interface GraphNotesDB extends DBSchema {
  notes: {
    key: string;
    value: IDBNote;
    indexes: {
      'by-userId': string;
      'by-updatedAt': string;
    };
  };
  syncQueue: {
    key: number;
    value: SyncOperation;
    indexes: {
      'by-userId': string;
      'by-status': string;
      'by-noteId-type': [string, string];
    };
  };
}

// ─── Singleton Connection ────────────────────────────────────

let dbInstance: IDBPDatabase<GraphNotesDB> | null = null;

export async function getDb(): Promise<IDBPDatabase<GraphNotesDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<GraphNotesDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Notes store
      if (!db.objectStoreNames.contains('notes')) {
        const notesStore = db.createObjectStore('notes', { keyPath: 'id' });
        notesStore.createIndex('by-userId', 'userId', { unique: false });
        notesStore.createIndex('by-updatedAt', 'updatedAt', { unique: false });
      }

      // Sync queue store
      if (!db.objectStoreNames.contains('syncQueue')) {
        const syncStore = db.createObjectStore('syncQueue', {
          keyPath: 'id',
          autoIncrement: true,
        });
        syncStore.createIndex('by-userId', 'userId', { unique: false });
        syncStore.createIndex('by-status', 'status', { unique: false });
        syncStore.createIndex('by-noteId-type', ['noteId', 'type'], { unique: false });
      }
    },
  });

  return dbInstance;
}

// ─── Notes CRUD ──────────────────────────────────────────────

export async function getAllNotes(userId: string): Promise<IDBNote[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex('notes', 'by-userId', userId);
  // Sort by updatedAt descending
  return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getNote(id: string): Promise<IDBNote | undefined> {
  const db = await getDb();
  return db.get('notes', id);
}

export async function putNote(note: IDBNote): Promise<void> {
  const db = await getDb();
  await db.put('notes', note);
}

export async function putNotesBatch(notes: IDBNote[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('notes', 'readwrite');
  await Promise.all([
    ...notes.map(note => tx.store.put(note)),
    tx.done,
  ]);
}

export async function deleteNoteFromIDB(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('notes', id);
}

export async function clearAllNotes(userId: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('notes', 'readwrite');
  const index = tx.store.index('by-userId');
  let cursor = await index.openCursor(userId);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

// ─── Migration from localStorage ────────────────────────────

const LS_MIGRATED_KEY = (uid: string) => `gn_idb_migrated_${uid}`;

export async function migrateFromLocalStorage(userId: string): Promise<boolean> {
  // Check if already migrated
  if (localStorage.getItem(LS_MIGRATED_KEY(userId)) === 'true') {
    return false;
  }

  const lsKey = `gn_notes_${userId}`;
  const raw = localStorage.getItem(lsKey);
  if (!raw) {
    localStorage.setItem(LS_MIGRATED_KEY(userId), 'true');
    return false;
  }

  try {
    const parsed = JSON.parse(raw) as any[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(LS_MIGRATED_KEY(userId), 'true');
      return false;
    }

    const idbNotes: IDBNote[] = parsed.map(n => ({
      id: n.id,
      userId,
      title: n.title,
      content: n.content,
      createdAt: typeof n.createdAt === 'string' ? n.createdAt : new Date(n.createdAt).toISOString(),
      updatedAt: typeof n.updatedAt === 'string' ? n.updatedAt : new Date(n.updatedAt).toISOString(),
      pinned: n.pinned ?? false,
      pinnedAt: n.pinnedAt
        ? (typeof n.pinnedAt === 'string' ? n.pinnedAt : new Date(n.pinnedAt).toISOString())
        : null,
    }));

    // Write all notes to IndexedDB in a single transaction (atomic)
    await putNotesBatch(idbNotes);

    // Only mark as migrated AFTER successful write — zero data loss guarantee
    localStorage.setItem(LS_MIGRATED_KEY(userId), 'true');

    console.log(`[IndexedDB] Migrated ${idbNotes.length} notes from localStorage`);
    return true;
  } catch (e) {
    console.error('[IndexedDB] Migration from localStorage failed:', e);
    // Do NOT mark as migrated on failure — retry next time
    return false;
  }
}

// ─── Helpers ─────────────────────────────────────────────────

export function noteToIDB(note: { id: string; title: string; content: string; createdAt: Date | string; updatedAt: Date | string; pinned: boolean; pinnedAt: Date | string | null }, userId: string): IDBNote {
  return {
    id: note.id,
    userId,
    title: note.title,
    content: note.content,
    createdAt: note.createdAt instanceof Date ? note.createdAt.toISOString() : note.createdAt,
    updatedAt: note.updatedAt instanceof Date ? note.updatedAt.toISOString() : note.updatedAt,
    pinned: note.pinned,
    pinnedAt: note.pinnedAt
      ? (note.pinnedAt instanceof Date ? note.pinnedAt.toISOString() : note.pinnedAt)
      : null,
  };
}

export function idbToNote(idb: IDBNote) {
  return {
    id: idb.id,
    title: idb.title,
    content: idb.content,
    createdAt: new Date(idb.createdAt),
    updatedAt: new Date(idb.updatedAt),
    linkedNotes: [] as string[],  // Will be recomputed by extractLinks
    pinned: idb.pinned,
    pinnedAt: idb.pinnedAt ? new Date(idb.pinnedAt) : null,
  };
}

/** Expose for testing / teardown */
export function _resetDb() {
  dbInstance = null;
}
