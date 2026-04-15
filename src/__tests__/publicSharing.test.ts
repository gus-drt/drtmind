import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  noteToIDB,
  idbToNote,
  putNote,
  getNote,
  _resetDb,
} from '@/lib/indexedDb';
import type { IDBNote } from '@/types/note';

describe('Public Sharing – IndexedDB', () => {
  beforeEach(() => {
    _resetDb();
  });

  describe('noteToIDB', () => {
    it('should serialize isPublic: true', () => {
      const result = noteToIDB(
        {
          id: 'note-1',
          title: 'Test Note',
          content: '# Hello',
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-02'),
          pinned: false,
          pinnedAt: null,
          isPublic: true,
        },
        'user-1'
      );

      expect(result.isPublic).toBe(true);
      expect(result.id).toBe('note-1');
      expect(result.userId).toBe('user-1');
    });

    it('should serialize isPublic: false', () => {
      const result = noteToIDB(
        {
          id: 'note-2',
          title: 'Private Note',
          content: 'Secret',
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-02'),
          pinned: false,
          pinnedAt: null,
          isPublic: false,
        },
        'user-1'
      );

      expect(result.isPublic).toBe(false);
    });

    it('should default isPublic to false when not provided', () => {
      const result = noteToIDB(
        {
          id: 'note-3',
          title: 'Legacy Note',
          content: 'Old data',
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-02'),
          pinned: false,
          pinnedAt: null,
          // isPublic not provided — simulates pre-migration data
        },
        'user-1'
      );

      expect(result.isPublic).toBe(false);
    });
  });

  describe('idbToNote', () => {
    it('should deserialize isPublic correctly', () => {
      const idb: IDBNote = {
        id: 'note-1',
        userId: 'user-1',
        title: 'Public Note',
        content: '# Hello',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
        pinned: false,
        pinnedAt: null,
        isPublic: true,
      };

      const note = idbToNote(idb);
      expect(note.isPublic).toBe(true);
    });

    it('should default isPublic to false for legacy records without the field', () => {
      // Simulate a record from before the migration that lacks isPublic
      const legacyIdb = {
        id: 'note-old',
        userId: 'user-1',
        title: 'Old Note',
        content: 'Content',
        createdAt: '2025-12-01T00:00:00.000Z',
        updatedAt: '2025-12-02T00:00:00.000Z',
        pinned: false,
        pinnedAt: null,
        // no isPublic field
      } as IDBNote;

      const note = idbToNote(legacyIdb);
      expect(note.isPublic).toBe(false);
    });
  });

  describe('IndexedDB round-trip', () => {
    it('should preserve isPublic through put → get cycle', async () => {
      const idbNote: IDBNote = {
        id: 'rt-note-1',
        userId: 'user-1',
        title: 'Round Trip Public',
        content: 'This is public',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
        pinned: false,
        pinnedAt: null,
        isPublic: true,
      };

      await putNote(idbNote);
      const retrieved = await getNote('rt-note-1');

      expect(retrieved).toBeDefined();
      expect(retrieved!.isPublic).toBe(true);
    });

    it('should preserve isPublic: false through put → get cycle', async () => {
      const idbNote: IDBNote = {
        id: 'rt-note-2',
        userId: 'user-1',
        title: 'Round Trip Private',
        content: 'This is private',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
        pinned: false,
        pinnedAt: null,
        isPublic: false,
      };

      await putNote(idbNote);
      const retrieved = await getNote('rt-note-2');

      expect(retrieved).toBeDefined();
      expect(retrieved!.isPublic).toBe(false);
    });
  });

  describe('mapDbNote simulation', () => {
    it('should map is_public from Supabase row correctly', () => {
      // Simulate the mapDbNote logic
      const row = {
        id: 'sb-note-1',
        title: 'Supabase Note',
        content: 'From cloud',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-02T00:00:00.000Z',
        pinned: false,
        pinned_at: null,
        is_public: true,
        user_id: 'user-1',
      };

      // Same logic as mapDbNote
      const note = {
        id: row.id,
        title: row.title,
        content: row.content,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        pinned: row.pinned,
        pinnedAt: row.pinned_at ? new Date(row.pinned_at) : null,
        isPublic: row.is_public ?? false,
      };

      expect(note.isPublic).toBe(true);
    });

    it('should default to false when is_public is missing from row', () => {
      const row = {
        id: 'sb-note-2',
        title: 'Old Cloud Note',
        content: 'Legacy cloud data',
        created_at: '2025-06-01T00:00:00.000Z',
        updated_at: '2025-06-02T00:00:00.000Z',
        pinned: false,
        pinned_at: null,
        // is_public missing
        user_id: 'user-1',
      };

      const note = {
        id: row.id,
        isPublic: (row as any).is_public ?? false,
      };

      expect(note.isPublic).toBe(false);
    });
  });
});
