import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Note, NoteLink, GraphNode } from '@/types/note';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

interface NoteGraphProps {
  notes: Note[];
  links: NoteLink[];
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
}

interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export const NoteGraph = ({ notes, links, selectedNoteId, onSelectNote }: NoteGraphProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
  const animationRef = useRef<number>();
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [, forceRender] = useState(0);

  // Camera state for pan/zoom
  const cameraRef = useRef<Camera>({ x: 0, y: 0, zoom: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, camX: 0, camY: 0 });
  const pinchStartRef = useRef<{ dist: number; zoom: number } | null>(null);

  const stableLinks = useMemo(() => links, [JSON.stringify(links)]);

  // Convert screen coords to world coords
  const screenToWorld = useCallback((sx: number, sy: number) => {
    const cam = cameraRef.current;
    return {
      x: (sx - dimensions.width / 2) / cam.zoom + cam.x,
      y: (sy - dimensions.height / 2) / cam.zoom + cam.y,
    };
  }, [dimensions]);

  // Detect index note
  const indexNoteId = useMemo(() => {
    const idx = notes.find(n =>
      /^[ií]ndice$/i.test(n.title.trim()) || /^index$/i.test(n.title.trim())
    );
    return idx?.id ?? null;
  }, [notes]);

  // Initialize/update nodes
  useEffect(() => {
    const radius = Math.min(dimensions.width, dimensions.height) * 0.35;
    const existingNodes = nodesRef.current;

    nodesRef.current = notes.map((note, i) => {
      const existingNode = existingNodes.find(n => n.id === note.id);
      const isIndex = note.id === indexNoteId;
      const angle = (i / Math.max(notes.length, 1)) * Math.PI * 2;

      return {
        id: note.id,
        title: note.title,
        x: isIndex ? 0 : (existingNode?.x ?? Math.cos(angle) * radius + (Math.random() - 0.5) * 50),
        y: isIndex ? 0 : (existingNode?.y ?? Math.sin(angle) * radius + (Math.random() - 0.5) * 50),
        vx: existingNode?.vx ?? 0,
        vy: existingNode?.vy ?? 0,
      };
    });

    forceRender(n => n + 1);
  }, [notes, dimensions]);

  // Handle resize with ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width: Math.floor(width), height: Math.floor(height) });
        }
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Fit all nodes in view
  const fitToView = useCallback(() => {
    const nodes = nodesRef.current;
    if (nodes.length === 0) return;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodes.forEach(n => {
      minX = Math.min(minX, n.x);
      maxX = Math.max(maxX, n.x);
      minY = Math.min(minY, n.y);
      maxY = Math.max(maxY, n.y);
    });

    const padding = 80;
    const rangeX = maxX - minX + padding * 2;
    const rangeY = maxY - minY + padding * 2;
    const zoom = Math.min(
      dimensions.width / rangeX,
      dimensions.height / rangeY,
      2
    );

    cameraRef.current = {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
      zoom: Math.max(0.2, zoom),
    };
    forceRender(n => n + 1);
  }, [dimensions]);

  // Auto-fit on first load or when notes count changes significantly
  const prevNoteCountRef = useRef(0);
  useEffect(() => {
    if (notes.length > 0 && (prevNoteCountRef.current === 0 || Math.abs(notes.length - prevNoteCountRef.current) > 2)) {
      setTimeout(fitToView, 300);
    }
    prevNoteCountRef.current = notes.length;
  }, [notes.length, fitToView]);

  // Zoom helper
  const applyZoom = useCallback((delta: number, centerX?: number, centerY?: number) => {
    const cam = cameraRef.current;
    const factor = delta > 0 ? 1.15 : 1 / 1.15;
    const newZoom = Math.max(0.1, Math.min(5, cam.zoom * factor));

    if (centerX !== undefined && centerY !== undefined) {
      // Zoom toward pointer
      const worldBefore = {
        x: (centerX - dimensions.width / 2) / cam.zoom + cam.x,
        y: (centerY - dimensions.height / 2) / cam.zoom + cam.y,
      };
      const worldAfter = {
        x: (centerX - dimensions.width / 2) / newZoom + cam.x,
        y: (centerY - dimensions.height / 2) / newZoom + cam.y,
      };
      cam.x += worldBefore.x - worldAfter.x;
      cam.y += worldBefore.y - worldAfter.y;
    }

    cam.zoom = newZoom;
    forceRender(n => n + 1);
  }, [dimensions]);

  // Physics + render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const simulate = () => {
      const currentNodes = nodesRef.current;
      const cam = cameraRef.current;

      if (currentNodes.length > 0) {
        // Repulsion
        for (let i = 0; i < currentNodes.length; i++) {
          for (let j = i + 1; j < currentNodes.length; j++) {
            const a = currentNodes[i], b = currentNodes[j];
            const dx = b.x - a.x, dy = b.y - a.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = 2500 / (dist * dist);
            const fx = (dx / dist) * force, fy = (dy / dist) * force;
            if (a.id !== draggingNode) { a.vx -= fx; a.vy -= fy; }
            if (b.id !== draggingNode) { b.vx += fx; b.vy += fy; }
          }
        }

        // Attraction for links
        stableLinks.forEach(link => {
          const s = currentNodes.find(n => n.id === link.source);
          const t = currentNodes.find(n => n.id === link.target);
          if (s && t) {
            const dx = t.x - s.x, dy = t.y - s.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = (dist - 150) * 0.03;
            const fx = (dx / dist) * force, fy = (dy / dist) * force;
            if (s.id !== draggingNode) { s.vx += fx; s.vy += fy; }
            if (t.id !== draggingNode) { t.vx -= fx; t.vy -= fy; }
          }
        });

        // Center gravity + velocity
        currentNodes.forEach(node => {
          // Index node is always pinned at center
          if (node.id === indexNoteId && node.id !== draggingNode) {
            node.x = 0;
            node.y = 0;
            node.vx = 0;
            node.vy = 0;
            return;
          }
          if (node.id !== draggingNode) {
            node.vx += (0 - node.x) * 0.002;
            node.vy += (0 - node.y) * 0.002;
            node.vx *= 0.85;
            node.vy *= 0.85;
            node.x += node.vx;
            node.y += node.vy;
          }
        });
      }

      // Draw
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);
      ctx.save();
      ctx.translate(dimensions.width / 2, dimensions.height / 2);
      ctx.scale(cam.zoom, cam.zoom);
      ctx.translate(-cam.x, -cam.y);

      // Get computed styles for theming
      const rootStyle = getComputedStyle(document.documentElement);
      const isDark = document.documentElement.classList.contains('dark');

      const linkColor = isDark ? 'hsl(0, 0%, 50%)' : 'hsl(0, 0%, 60%)';
      const linkHighlight = isDark ? 'hsl(0, 0%, 75%)' : 'hsl(0, 0%, 20%)';
      const nodeDefault = isDark ? 'hsl(0, 0%, 60%)' : 'hsl(0, 0%, 45%)';
      const nodeConnected = isDark ? 'hsl(0, 0%, 75%)' : 'hsl(0, 0%, 25%)';
      const nodeSelected = isDark ? 'hsl(0, 0%, 90%)' : 'hsl(0, 0%, 0%)';
      const textColor = isDark ? 'hsl(0, 0%, 90%)' : 'hsl(0, 0%, 0%)';
      const textBg = isDark ? 'hsla(0, 0%, 10%, 0.85)' : 'hsla(0, 0%, 100%, 0.85)';

      // Links
      stableLinks.forEach(link => {
        const s = currentNodes.find(n => n.id === link.source);
        const t = currentNodes.find(n => n.id === link.target);
        if (s && t) {
          const hl = selectedNoteId === s.id || selectedNoteId === t.id;
          ctx.beginPath();
          ctx.strokeStyle = hl ? linkHighlight : linkColor;
          ctx.lineWidth = (hl ? 3 : 2) / cam.zoom;
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(t.x, t.y);
          ctx.stroke();
        }
      });

      // Nodes
      const baseFontSize = 12 / cam.zoom;
      currentNodes.forEach(node => {
        const isSelected = node.id === selectedNoteId;
        const isHovered = node.id === hoveredNode;
        const isConnected = stableLinks.some(
          l => (l.source === selectedNoteId && l.target === node.id) ||
               (l.target === selectedNoteId && l.source === node.id)
        );

        const nodeRadius = ((isSelected ? 14 : isHovered ? 12 : 10)) / Math.sqrt(cam.zoom);

        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeRadius, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? nodeSelected : isConnected ? nodeConnected : nodeDefault;
        ctx.fill();

        if (isSelected || isHovered) {
          ctx.strokeStyle = nodeSelected;
          ctx.lineWidth = 3 / cam.zoom;
          ctx.stroke();
        }

        // Label
        const label = node.title.length > 18 ? node.title.slice(0, 18) + '...' : node.title;
        ctx.font = `${isSelected ? 'bold ' : ''}${baseFontSize}px Space Grotesk`;
        const textWidth = ctx.measureText(label).width;
        const textX = node.x;
        const textY = node.y + nodeRadius + 4 / cam.zoom;

        ctx.fillStyle = textBg;
        const pad = 3 / cam.zoom;
        ctx.fillRect(textX - textWidth / 2 - pad, textY - 1 / cam.zoom, textWidth + pad * 2, baseFontSize + 4 / cam.zoom);

        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(label, textX, textY);
      });

      ctx.restore();

      animationRef.current = requestAnimationFrame(simulate);
    };

    animationRef.current = requestAnimationFrame(simulate);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [stableLinks, draggingNode, dimensions, selectedNoteId, hoveredNode, indexNoteId]);

  const getNodeAtPosition = useCallback((sx: number, sy: number): GraphNode | null => {
    const world = screenToWorld(sx, sy);
    const cam = cameraRef.current;
    const hitRadius = ('ontouchstart' in window ? 30 : 20) / cam.zoom;
    const nodes = nodesRef.current;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const dx = world.x - n.x, dy = world.y - n.y;
      if (dx * dx + dy * dy < hitRadius * hitRadius) return n;
    }
    return null;
  }, [screenToWorld]);

  const getEventPosition = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      if (!touch) return null;
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    applyZoom(e.deltaY < 0 ? 1 : -1, e.nativeEvent.offsetX, e.nativeEvent.offsetY);
  }, [applyZoom]);

  const handlePointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    // Pinch zoom
    if ('touches' in e && e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartRef.current = { dist: Math.sqrt(dx * dx + dy * dy), zoom: cameraRef.current.zoom };
      return;
    }

    const pos = getEventPosition(e);
    if (!pos) return;

    const node = getNodeAtPosition(pos.x, pos.y);
    if (node) {
      setDraggingNode(node.id);
    } else {
      // Start panning
      setIsPanning(true);
      panStartRef.current = { x: pos.x, y: pos.y, camX: cameraRef.current.x, camY: cameraRef.current.y };
    }
  }, [getEventPosition, getNodeAtPosition]);

  const handlePointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    // Pinch
    if ('touches' in e && e.touches.length === 2 && pinchStartRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const newZoom = Math.max(0.1, Math.min(5, pinchStartRef.current.zoom * (dist / pinchStartRef.current.dist)));
      cameraRef.current.zoom = newZoom;
      forceRender(n => n + 1);
      return;
    }

    const pos = getEventPosition(e);
    if (!pos) return;

    if (draggingNode) {
      const world = screenToWorld(pos.x, pos.y);
      const node = nodesRef.current.find(n => n.id === draggingNode);
      if (node) {
        node.x = world.x;
        node.y = world.y;
        node.vx = 0;
        node.vy = 0;
      }
    } else if (isPanning) {
      const cam = cameraRef.current;
      const dx = (pos.x - panStartRef.current.x) / cam.zoom;
      const dy = (pos.y - panStartRef.current.y) / cam.zoom;
      cam.x = panStartRef.current.camX - dx;
      cam.y = panStartRef.current.camY - dy;
      forceRender(n => n + 1);
    } else if (!('touches' in e)) {
      const node = getNodeAtPosition(pos.x, pos.y);
      setHoveredNode(node?.id || null);
    }
  }, [draggingNode, isPanning, getEventPosition, getNodeAtPosition, screenToWorld]);

  const handlePointerUp = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    pinchStartRef.current = null;

    if (draggingNode) {
      const pos = getEventPosition(e);
      if (pos) {
        const node = getNodeAtPosition(pos.x, pos.y);
        if (node && node.id === draggingNode) {
          onSelectNote(node.id);
        }
      }
      setDraggingNode(null);
    }
    setIsPanning(false);
  }, [draggingNode, getEventPosition, getNodeAtPosition, onSelectNote]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (draggingNode || isPanning) return;
    const pos = getEventPosition(e);
    if (!pos) return;
    const node = getNodeAtPosition(pos.x, pos.y);
    if (node) onSelectNote(node.id);
  }, [draggingNode, isPanning, getEventPosition, getNodeAtPosition, onSelectNote]);

  const handlePointerLeave = useCallback(() => {
    setDraggingNode(null);
    setIsPanning(false);
    setHoveredNode(null);
  }, []);

  if (notes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground p-4 text-center">
        <p>Crie uma nota para ver o grafo</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full relative touch-none overflow-hidden">
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="cursor-grab active:cursor-grabbing touch-none block"
        style={{ width: '100%', height: '100%' }}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerLeave}
        onClick={handleClick}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
        onWheel={handleWheel}
      />

      {/* Zoom controls */}
      <div className="absolute top-2 right-2 flex flex-col gap-1">
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 border-2"
          onClick={() => applyZoom(1, dimensions.width / 2, dimensions.height / 2)}
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 border-2"
          onClick={() => applyZoom(-1, dimensions.width / 2, dimensions.height / 2)}
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 border-2"
          onClick={fitToView}
        >
          <Maximize className="w-4 h-4" />
        </Button>
      </div>

      {/* Info */}
      <div className="absolute bottom-2 left-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 border border-border rounded-sm">
        {notes.length} notas • {stableLinks.length} conexões
      </div>
    </div>
  );
};
