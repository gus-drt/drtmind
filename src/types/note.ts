export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  linkedNotes: string[]; // IDs of linked notes
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
