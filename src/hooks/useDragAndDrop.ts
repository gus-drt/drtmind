import { useState, useCallback, useRef } from 'react';

export interface DragItem<T> {
  id: string;
  data: T;
  index: number;
}

export interface DropResult<T> {
  draggedItem: DragItem<T>;
  targetItem: DragItem<T> | null;
  dropPosition: 'before' | 'after' | 'on';
}

interface UseDragAndDropOptions<T> {
  items: T[];
  getItemId: (item: T) => string;
  onDragEnd?: (result: DropResult<T>) => void;
  onReorder?: (newOrder: T[]) => void;
}

interface UseDragAndDropReturn<T> {
  draggedItem: DragItem<T> | null;
  dropTarget: { id: string; position: 'before' | 'after' | 'on' } | null;
  isDragging: boolean;
  handleDragStart: (item: T, index: number) => (e: React.DragEvent) => void;
  handleDragOver: (item: T, index: number) => (e: React.DragEvent) => void;
  handleDragLeave: () => void;
  handleDrop: (item: T, index: number) => (e: React.DragEvent) => void;
  handleDragEnd: () => void;
  getDragItemProps: (item: T, index: number) => {
    draggable: boolean;
    onDragStart: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: () => void;
    onDrop: (e: React.DragEvent) => void;
    onDragEnd: () => void;
    'data-dragging': boolean;
    'data-drop-target': boolean;
    'data-drop-position': string | undefined;
  };
}

/**
 * Custom hook for drag-and-drop functionality with reordering support
 */
export function useDragAndDrop<T>({
  items,
  getItemId,
  onDragEnd,
  onReorder,
}: UseDragAndDropOptions<T>): UseDragAndDropReturn<T> {
  const [draggedItem, setDraggedItem] = useState<DragItem<T> | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; position: 'before' | 'after' | 'on' } | null>(null);
  const dragCounter = useRef(0);

  const handleDragStart = useCallback((item: T, index: number) => (e: React.DragEvent) => {
    const id = getItemId(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    
    // Set drag item after a small delay to allow the drag ghost to be created
    setTimeout(() => {
      setDraggedItem({ id, data: item, index });
    }, 0);
  }, [getItemId]);

  const handleDragOver = useCallback((item: T, index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedItem) return;
    
    const targetId = getItemId(item);
    if (targetId === draggedItem.id) {
      setDropTarget(null);
      return;
    }

    // Determine drop position based on mouse position
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const midpoint = rect.height / 2;
    
    const position: 'before' | 'after' = y < midpoint ? 'before' : 'after';
    setDropTarget({ id: targetId, position });
  }, [draggedItem, getItemId]);

  const handleDragLeave = useCallback(() => {
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDropTarget(null);
    }
  }, []);

  const handleDrop = useCallback((item: T, index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedItem || !dropTarget) {
      setDraggedItem(null);
      setDropTarget(null);
      return;
    }

    const targetId = getItemId(item);
    if (targetId === draggedItem.id) {
      setDraggedItem(null);
      setDropTarget(null);
      return;
    }

    // Calculate new order
    if (onReorder) {
      const newItems = [...items];
      const fromIndex = draggedItem.index;
      let toIndex = index;
      
      // Adjust target index based on drop position
      if (dropTarget.position === 'after') {
        toIndex = fromIndex < index ? index : index + 1;
      } else {
        toIndex = fromIndex > index ? index : index - 1;
      }

      // Reorder
      const [removed] = newItems.splice(fromIndex, 1);
      newItems.splice(toIndex > fromIndex ? toIndex - 1 : toIndex, 0, removed);
      
      onReorder(newItems);
    }

    if (onDragEnd) {
      onDragEnd({
        draggedItem,
        targetItem: { id: targetId, data: item, index },
        dropPosition: dropTarget.position,
      });
    }

    setDraggedItem(null);
    setDropTarget(null);
  }, [draggedItem, dropTarget, items, getItemId, onDragEnd, onReorder]);

  const handleDragEndCleanup = useCallback(() => {
    setDraggedItem(null);
    setDropTarget(null);
    dragCounter.current = 0;
  }, []);

  const getDragItemProps = useCallback((item: T, index: number) => {
    const id = getItemId(item);
    const isDragged = draggedItem?.id === id;
    const isDropTarget = dropTarget?.id === id;

    return {
      draggable: true,
      onDragStart: handleDragStart(item, index),
      onDragOver: handleDragOver(item, index),
      onDragLeave: handleDragLeave,
      onDrop: handleDrop(item, index),
      onDragEnd: handleDragEndCleanup,
      'data-dragging': isDragged,
      'data-drop-target': isDropTarget,
      'data-drop-position': isDropTarget ? dropTarget?.position : undefined,
    };
  }, [draggedItem, dropTarget, getItemId, handleDragStart, handleDragOver, handleDragLeave, handleDrop, handleDragEndCleanup]);

  return {
    draggedItem,
    dropTarget,
    isDragging: draggedItem !== null,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd: handleDragEndCleanup,
    getDragItemProps,
  };
}

