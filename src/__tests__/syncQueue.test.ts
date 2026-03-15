import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getDb,
  putNote,
  _resetDb,
} from '@/lib/indexedDb';
import {
  enqueue,
  processQueue,
  getPendingCount,
  getFailedOps,
  clearQueue,
  retryFailed,
} from '@/lib/syncQueue';
import type { IDBNote } from '@/types/note';

const TEST_USER = 'test-user-sync';

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    }),
  },
}));

describe('Sync Queue', () => {
  beforeEach(async () => {
    _resetDb();
    const db = await getDb();

    // Clear stores
    const tx1 = db.transaction('syncQueue', 'readwrite');
    await tx1.store.clear();
    await tx1.done;

    const tx2 = db.transaction('notes', 'readwrite');
    await tx2.store.clear();
    await tx2.done;
  });

  describe('Enqueue', () => {
    it('should enqueue a create operation', async () => {
      await enqueue('note-1', TEST_USER, 'create', { title: 'Test', content: 'Hello' });
      const count = await getPendingCount(TEST_USER);
      expect(count).toBe(1);
    });

    it('should enqueue multiple different operations', async () => {
      await enqueue('note-1', TEST_USER, 'create', { title: 'A' });
      await enqueue('note-2', TEST_USER, 'create', { title: 'B' });
      await enqueue('note-1', TEST_USER, 'pin', { pinned: true });

      const count = await getPendingCount(TEST_USER);
      expect(count).toBe(3);
    });

    it('should deduplicate update operations for same note', async () => {
      await enqueue('note-1', TEST_USER, 'update', { title: 'First' });
      await enqueue('note-1', TEST_USER, 'update', { content: 'Updated content' });

      const count = await getPendingCount(TEST_USER);
      expect(count).toBe(1);

      // The merged op should contain both changes
      const db = await getDb();
      const all = await db.getAll('syncQueue');
      const updateOp = all.find(op => op.noteId === 'note-1' && op.type === 'update');
      expect(updateOp!.payload).toEqual({ title: 'First', content: 'Updated content' });
    });

    it('should replace pin operations for same note', async () => {
      await enqueue('note-1', TEST_USER, 'pin', { pinned: true, pinnedAt: '2025-01-01' });
      await enqueue('note-1', TEST_USER, 'pin', { pinned: false, pinnedAt: null });

      const count = await getPendingCount(TEST_USER);
      expect(count).toBe(1);

      const db = await getDb();
      const all = await db.getAll('syncQueue');
      const pinOp = all.find(op => op.noteId === 'note-1' && op.type === 'pin');
      expect(pinOp!.payload.pinned).toBe(false);
    });

    it('should clear all ops when delete is enqueued for same note', async () => {
      await enqueue('note-1', TEST_USER, 'create', { title: 'A' });
      await enqueue('note-1', TEST_USER, 'update', { title: 'B' });

      // Delete should remove previous ops
      await enqueue('note-1', TEST_USER, 'delete', {});

      const db = await getDb();
      const all = await db.getAll('syncQueue');
      const noteOps = all.filter(op => op.noteId === 'note-1');

      // Should have the create, update cleared + delete added
      // Actually: delete removes all, then adds delete = 1
      expect(noteOps.length).toBe(1);
      expect(noteOps[0].type).toBe('delete');
    });
  });

  describe('Process Queue', () => {
    it('should process all pending operations', async () => {
      await enqueue('note-1', TEST_USER, 'create', { title: 'A', content: 'C' });
      await enqueue('note-2', TEST_USER, 'update', { title: 'B' });

      const result = await processQueue(TEST_USER);
      expect(result.processed).toBe(2);
      expect(result.failed).toBe(0);

      // Queue should be empty
      const count = await getPendingCount(TEST_USER);
      expect(count).toBe(0);
    });

    it('should handle empty queue gracefully', async () => {
      const result = await processQueue(TEST_USER);
      expect(result.processed).toBe(0);
      expect(result.failed).toBe(0);
    });
  });

  describe('Utilities', () => {
    it('clearQueue should remove all ops for a user', async () => {
      await enqueue('n1', TEST_USER, 'create', {});
      await enqueue('n2', TEST_USER, 'update', {});
      expect(await getPendingCount(TEST_USER)).toBe(2);

      await clearQueue(TEST_USER);
      expect(await getPendingCount(TEST_USER)).toBe(0);
    });

    it('retryFailed should reset failed ops to pending', async () => {
      // Manually insert a failed op
      const db = await getDb();
      await db.add('syncQueue', {
        noteId: 'n1',
        userId: TEST_USER,
        type: 'update',
        payload: {},
        status: 'failed',
        retryCount: 3,
        createdAt: new Date().toISOString(),
      });

      const failed = await getFailedOps(TEST_USER);
      expect(failed).toHaveLength(1);

      await retryFailed(TEST_USER);

      const failedAfter = await getFailedOps(TEST_USER);
      expect(failedAfter).toHaveLength(0);
      expect(await getPendingCount(TEST_USER)).toBe(1);
    });
  });
});
