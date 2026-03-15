import { describe, it, expect, beforeEach } from 'vitest';
import {
  getDb,
  getAllNotes,
  getNote,
  putNote,
  putNotesBatch,
  deleteNoteFromIDB,
  migrateFromLocalStorage,
  noteToIDB,
  idbToNote,
  _resetDb,
} from '@/lib/indexedDb';
import type { IDBNote } from '@/types/note';

const TEST_USER = 'test-user-001';

function makeNote(overrides: Partial<IDBNote> = {}): IDBNote {
  return {
    id: crypto.randomUUID(),
    userId: TEST_USER,
    title: 'Test Note',
    content: '# Test\n\nHello [[World]]',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pinned: false,
    pinnedAt: null,
    ...overrides,
  };
}

describe('IndexedDB Layer', () => {
  beforeEach(async () => {
    // Clear database between tests
    _resetDb();
    const db = await getDb();
    const tx = db.transaction('notes', 'readwrite');
    await tx.store.clear();
    await tx.done;

    // Clear localStorage
    localStorage.clear();
  });

  describe('CRUD Operations', () => {
    it('should put and get a single note', async () => {
      const note = makeNote({ title: 'My Note' });
      await putNote(note);

      const retrieved = await getNote(note.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.title).toBe('My Note');
      expect(retrieved!.userId).toBe(TEST_USER);
    });

    it('should list all notes for a user sorted by updatedAt desc', async () => {
      const old = makeNote({ title: 'Old', updatedAt: '2024-01-01T00:00:00Z' });
      const recent = makeNote({ title: 'Recent', updatedAt: '2025-06-01T00:00:00Z' });
      await putNote(old);
      await putNote(recent);

      const all = await getAllNotes(TEST_USER);
      expect(all).toHaveLength(2);
      expect(all[0].title).toBe('Recent');
      expect(all[1].title).toBe('Old');
    });

    it('should not return notes from other users', async () => {
      await putNote(makeNote({ userId: TEST_USER }));
      await putNote(makeNote({ userId: 'other-user' }));

      const all = await getAllNotes(TEST_USER);
      expect(all).toHaveLength(1);
    });

    it('should delete a note', async () => {
      const note = makeNote();
      await putNote(note);
      expect(await getNote(note.id)).toBeDefined();

      await deleteNoteFromIDB(note.id);
      expect(await getNote(note.id)).toBeUndefined();
    });

    it('should upsert (overwrite) existing note on put', async () => {
      const note = makeNote({ title: 'Original' });
      await putNote(note);

      await putNote({ ...note, title: 'Updated' });
      const retrieved = await getNote(note.id);
      expect(retrieved!.title).toBe('Updated');
    });
  });

  describe('Batch Operations', () => {
    it('should write multiple notes in a single transaction', async () => {
      const notes = Array.from({ length: 5 }, (_, i) =>
        makeNote({ title: `Note ${i}` })
      );
      await putNotesBatch(notes);

      const all = await getAllNotes(TEST_USER);
      expect(all).toHaveLength(5);
    });
  });

  describe('localStorage Migration', () => {
    it('should migrate notes from localStorage to IndexedDB', async () => {
      // Setup localStorage data mimicking the old format
      const lsNotes = [
        {
          id: 'ls-note-1',
          title: 'LS Note 1',
          content: '# LS Note 1',
          createdAt: '2024-06-01T00:00:00.000Z',
          updatedAt: '2024-06-15T00:00:00.000Z',
          pinned: true,
          pinnedAt: '2024-06-01T00:00:00.000Z',
        },
        {
          id: 'ls-note-2',
          title: 'LS Note 2',
          content: '# LS Note 2\n\nSee [[LS Note 1]]',
          createdAt: '2024-07-01T00:00:00.000Z',
          updatedAt: '2024-07-10T00:00:00.000Z',
          pinned: false,
          pinnedAt: null,
        },
      ];
      localStorage.setItem(`gn_notes_${TEST_USER}`, JSON.stringify(lsNotes));

      const migrated = await migrateFromLocalStorage(TEST_USER);
      expect(migrated).toBe(true);

      // Verify all notes are in IndexedDB
      const all = await getAllNotes(TEST_USER);
      expect(all).toHaveLength(2);
      expect(all.map(n => n.title).sort()).toEqual(['LS Note 1', 'LS Note 2']);

      // Verify pinned data preserved
      const pinnedNote = all.find(n => n.id === 'ls-note-1');
      expect(pinnedNote!.pinned).toBe(true);
      expect(pinnedNote!.pinnedAt).toBe('2024-06-01T00:00:00.000Z');
    });

    it('should not migrate twice', async () => {
      localStorage.setItem(
        `gn_notes_${TEST_USER}`,
        JSON.stringify([{ id: 'n1', title: 'T', content: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), pinned: false, pinnedAt: null }])
      );

      await migrateFromLocalStorage(TEST_USER);
      // Second migration should return false
      const second = await migrateFromLocalStorage(TEST_USER);
      expect(second).toBe(false);
    });

    it('should handle empty localStorage gracefully', async () => {
      const result = await migrateFromLocalStorage(TEST_USER);
      expect(result).toBe(false);
    });

    it('should handle corrupted localStorage gracefully', async () => {
      localStorage.setItem(`gn_notes_${TEST_USER}`, 'not valid json');
      const result = await migrateFromLocalStorage(TEST_USER);
      expect(result).toBe(false);
    });
  });

  describe('Conversion Helpers', () => {
    it('noteToIDB should convert Date objects to ISO strings', () => {
      const now = new Date('2025-03-14T12:00:00Z');
      const idb = noteToIDB(
        {
          id: 'x',
          title: 'T',
          content: 'C',
          createdAt: now,
          updatedAt: now,
          pinned: true,
          pinnedAt: now,
        },
        TEST_USER
      );

      expect(idb.createdAt).toBe('2025-03-14T12:00:00.000Z');
      expect(idb.updatedAt).toBe('2025-03-14T12:00:00.000Z');
      expect(idb.pinnedAt).toBe('2025-03-14T12:00:00.000Z');
      expect(idb.userId).toBe(TEST_USER);
    });

    it('idbToNote should convert ISO strings to Date objects', () => {
      const idb: IDBNote = {
        id: 'x',
        userId: TEST_USER,
        title: 'T',
        content: 'C',
        createdAt: '2025-03-14T12:00:00.000Z',
        updatedAt: '2025-03-14T12:00:00.000Z',
        pinned: false,
        pinnedAt: null,
      };

      const note = idbToNote(idb);
      expect(note.createdAt).toBeInstanceOf(Date);
      expect(note.updatedAt).toBeInstanceOf(Date);
      expect(note.pinnedAt).toBeNull();
    });
  });
});
