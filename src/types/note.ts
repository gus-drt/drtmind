export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  linkedNotes: string[]; // IDs of linked notes
  pinned: boolean;
  pinnedAt: Date | null;
  isPublic: boolean;
}

export interface NoteLink {
  source: string;
  target: string;
}

export interface GraphNode {
  id: string;
  title: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

// ─── IndexedDB Types ────────────────────────────────────────

/** Serialized note for IndexedDB storage (ISO strings, includes userId). */
export interface IDBNote {
  id: string;
  userId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  pinned: boolean;
  pinnedAt: string | null;
  isPublic: boolean;
}

export type SyncOperationType = 'create' | 'update' | 'delete' | 'pin';

export interface SyncOperation {
  id?: number;
  noteId: string;
  userId: string;
  type: SyncOperationType;
  payload: Record<string, any>;
  status: 'pending' | 'processing' | 'failed';
  retryCount: number;
  createdAt: string;
}
