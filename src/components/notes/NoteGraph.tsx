import { useEffect, useRef, useState, useCallback, useMemo, useLayoutEffect } from 'react';
import { Note, NoteLink, GraphNode } from '@/types/note';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

interface NoteGraphProps {
  notes: Note[];
  links: NoteLink[];
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  isActive?: boolean;
  getTagsForNote?: (id: string) => { color: string }[];
}

interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export const NoteGraph = ({ notes, links, selectedNoteId, onSelectNote, isActive = true, getTagsForNote }: NoteGraphProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const dimensionsRef = useRef({ width: 0, height: 0 });
  const [, forceRender] = useState(0);
  const animationRef = useRef<number>();
  const draggingNodeRef = useRef<string | null>(null);
  const hoveredNodeRef = useRef<string | null>(null);

  // Camera state for pan/zoom
  const cameraRef = useRef<Camera>({ x: 0, y: 0, zoom: 1 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, camX: 0, camY: 0 });
  const pinchStartRef = useRef<{ dist: number; zoom: number } | null>(null);

  // Track drag distance to distinguish click from drag
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const didDragRef = useRef(false);

  // Track whether we've done the initial fit
  const hasInitialFitRef = useRef(false);
  const prevDimsRef = useRef({ width: 0, height: 0 });

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

  const stableLinks = useMemo(() => links, [JSON.stringify(links)]);

  // --- Robust measurement ---
  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const w = Math.floor(rect.width);
    const h = Math.floor(rect.height);
    if (w > 0 && h > 0) {
      const prev = dimensionsRef.current;
      if (prev.width !== w || prev.height !== h) {
        dimensionsRef.current = { width: w, height: h };
        forceRender(n => n + 1);
      }
    }
  }, []);

  // Measure on mount (useLayoutEffect for synchronous first paint)
  useLayoutEffect(() => {
    measure();
    // Also measure after 1-2 frames to catch layout settling
    const raf1 = requestAnimationFrame(() => {
      measure();
      const raf2 = requestAnimationFrame(measure);
      return () => cancelAnimationFrame(raf2);
    });
    return () => cancelAnimationFrame(raf1);
  }, [measure]);

  // ResizeObserver as reinforcement
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(container);
    return () => observer.disconnect();
  }, [measure]);

  // Global events: resize, orientationchange, visualViewport
  useEffect(() => {
    const handler = () => {
      measure();
      // Also re-measure after a short delay for orientation change settling
      requestAnimationFrame(measure);
    };
    window.addEventListener('resize', handler);
    window.addEventListener('orientationchange', handler);
    const vv = window.visualViewport;
    if (vv) vv.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('orientationchange', handler);
      if (vv) vv.removeEventListener('resize', handler);
    };
  }, [measure]);

  // Re-measure when isActive changes (view switched to graph)
  useEffect(() => {
    if (isActive) {
      // Measure immediately + after a couple of frames
      measure();
      const raf = requestAnimationFrame(() => {
        measure();
        requestAnimationFrame(measure);
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [isActive, measure]);

  // Convert screen coords to world coords
  const screenToWorld = useCallback((sx: number, sy: number) => {
    const cam = cameraRef.current;
    const dims = dimensionsRef.current;
    return {
      x: (sx - dims.width / 2) / cam.zoom + cam.x,
      y: (sy - dims.height / 2) / cam.zoom + cam.y,
    };
  }, []);

  // Detect index note
  const indexNoteId = useMemo(() => {
    const idx = notes.find(n =>
      /^[ií]ndice$/i.test(n.title.trim()) || /^index$/i.test(n.title.trim())
    );
    return idx?.id ?? null;
  }, [notes]);

  // Initialize/update nodes
  useEffect(() => {
    const dims = dimensionsRef.current;
    const radius = Math.min(dims.width || 300, dims.height || 300) * 0.3;
    const existingNodes = nodesRef.current;

    nodesRef.current = notes.map((note, i) => {
      const existingNode = existingNodes.find(n => n.id === note.id);
      const isIndex = note.id === indexNoteId;
      const angle = (i / Math.max(notes.length, 1)) * Math.PI * 2;

      return {
        id: note.id,
        title: note.title,
        x: isIndex ? 0 : (existingNode?.x ?? Math.cos(angle) * radius + (Math.random() - 0.5) * 40),
        y: isIndex ? 0 : (existingNode?.y ?? Math.sin(angle) * radius + (Math.random() - 0.5) * 40),
        vx: existingNode?.vx ?? 0,
        vy: existingNode?.vy ?? 0,
      };
    });

    forceRender(n => n + 1);
  }, [notes, indexNoteId]);

  // Fit all nodes in view
  const fitToView = useCallback(() => {
    const nodes = nodesRef.current;
    const dims = dimensionsRef.current;
    if (nodes.length === 0 || dims.width === 0 || dims.height === 0) return;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodes.forEach(n => {
      minX = Math.min(minX, n.x);
      maxX = Math.max(maxX, n.x);
      minY = Math.min(minY, n.y);
      maxY = Math.max(maxY, n.y);
    });

    const padding = 100;
    const rangeX = maxX - minX + padding * 2;
    const rangeY = maxY - minY + padding * 2;
    const zoom = Math.min(
      dims.width / rangeX,
      dims.height / rangeY,
      2.5
    );

    cameraRef.current = {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
      zoom: Math.max(0.15, zoom),
    };
    forceRender(n => n + 1);
  }, []);

  // Auto-fit: only after valid dimensions + notes loaded
  useEffect(() => {
    const dims = dimensionsRef.current;
    if (notes.length > 0 && dims.width > 0 && dims.height > 0 && !hasInitialFitRef.current) {
      hasInitialFitRef.current = true;
      // Small delay for physics to settle
      setTimeout(fitToView, 350);
    }
  }, [notes.length, fitToView]);

  // Re-fit when dimensions jump significantly (orientation change, view switch)
  useEffect(() => {
    const dims = dimensionsRef.current;
    const prev = prevDimsRef.current;
    if (prev.width > 0 && prev.height > 0 && dims.width > 0 && dims.height > 0) {
      const wRatio = dims.width / prev.width;
      const hRatio = dims.height / prev.height;
      if (wRatio > 1.3 || wRatio < 0.7 || hRatio > 1.3 || hRatio < 0.7) {
        setTimeout(fitToView, 100);
      }
    }
    prevDimsRef.current = { ...dims };
  });

  // Zoom helper
  const applyZoom = useCallback((delta: number, centerX?: number, centerY?: number) => {
    const cam = cameraRef.current;
    const dims = dimensionsRef.current;
    const factor = delta > 0 ? 1.12 : 1 / 1.12;
    const newZoom = Math.max(0.1, Math.min(5, cam.zoom * factor));

    if (centerX !== undefined && centerY !== undefined) {
      const worldBefore = {
        x: (centerX - dims.width / 2) / cam.zoom + cam.x,
        y: (centerY - dims.height / 2) / cam.zoom + cam.y,
      };
      const worldAfter = {
        x: (centerX - dims.width / 2) / newZoom + cam.x,
        y: (centerY - dims.height / 2) / newZoom + cam.y,
      };
      cam.x += worldBefore.x - worldAfter.x;
      cam.y += worldBefore.y - worldAfter.y;
    }

    cam.zoom = newZoom;
    forceRender(n => n + 1);
  }, []);

  // Physics + render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const simulate = () => {
      const currentNodes = nodesRef.current;
      const cam = cameraRef.current;
      const dims = dimensionsRef.current;
      const dragging = draggingNodeRef.current;

      if (currentNodes.length > 0) {
        // Repulsion
        for (let i = 0; i < currentNodes.length; i++) {
          for (let j = i + 1; j < currentNodes.length; j++) {
            const a = currentNodes[i], b = currentNodes[j];
            const dx = b.x - a.x, dy = b.y - a.y;
            const distSq = dx * dx + dy * dy;
            const dist = Math.sqrt(distSq) || 1;
            const force = 3000 / (distSq + 100);
            const fx = (dx / dist) * force, fy = (dy / dist) * force;
            if (a.id !== dragging) { a.vx -= fx; a.vy -= fy; }
            if (b.id !== dragging) { b.vx += fx; b.vy += fy; }
          }
        }

        // Attraction for links
        stableLinks.forEach(link => {
          const s = currentNodes.find(n => n.id === link.source);
          const t = currentNodes.find(n => n.id === link.target);
          if (s && t) {
            const dx = t.x - s.x, dy = t.y - s.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = (dist - 120) * 0.025;
            const fx = (dx / dist) * force, fy = (dy / dist) * force;
            if (s.id !== dragging) { s.vx += fx; s.vy += fy; }
            if (t.id !== dragging) { t.vx -= fx; t.vy -= fy; }
          }
        });

        // Center gravity + velocity
        currentNodes.forEach(node => {
          if (node.id === indexNoteId && node.id !== dragging) {
            node.x = 0; node.y = 0; node.vx = 0; node.vy = 0;
            return;
          }
          if (node.id !== dragging) {
            node.vx += (0 - node.x) * 0.001;
            node.vy += (0 - node.y) * 0.001;
            node.vx *= 0.88;
            node.vy *= 0.88;
            node.x += node.vx;
            node.y += node.vy;
          }
        });
      }

      // Use dimensions from ref (always fresh)
      const w = dims.width;
      const h = dims.height;
      
      // Skip rendering if dimensions are invalid
      if (w <= 0 || h <= 0) {
        animationRef.current = requestAnimationFrame(simulate);
        return;
      }

      // Only update canvas bitmap size (CSS handles visual size via w-full h-full)
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Background
      const isDark = document.documentElement.classList.contains('dark');
      ctx.fillStyle = isDark ? 'hsl(240, 5%, 8%)' : 'hsl(0, 0%, 98%)';
      ctx.fillRect(0, 0, w, h);

      // Subtle grid
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(cam.zoom, cam.zoom);
      ctx.translate(-cam.x, -cam.y);

      const gridSize = 60;
      const gridAlpha = isDark ? 0.06 : 0.08;
      ctx.strokeStyle = isDark ? `rgba(255,255,255,${gridAlpha})` : `rgba(0,0,0,${gridAlpha})`;
      ctx.lineWidth = 1 / cam.zoom;

      const viewLeft = cam.x - w / 2 / cam.zoom;
      const viewRight = cam.x + w / 2 / cam.zoom;
      const viewTop = cam.y - h / 2 / cam.zoom;
      const viewBottom = cam.y + h / 2 / cam.zoom;

      const startX = Math.floor(viewLeft / gridSize) * gridSize;
      const startY = Math.floor(viewTop / gridSize) * gridSize;

      for (let x = startX; x <= viewRight; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, viewTop); ctx.lineTo(x, viewBottom); ctx.stroke();
      }
      for (let y = startY; y <= viewBottom; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(viewLeft, y); ctx.lineTo(viewRight, y); ctx.stroke();
      }

      // Colors
      const linkColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)';
      const linkHighlight = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)';
      const hoveredNode = hoveredNodeRef.current;

      // Links with curves
      stableLinks.forEach(link => {
        const s = currentNodes.find(n => n.id === link.source);
        const t = currentNodes.find(n => n.id === link.target);
        if (s && t) {
          const hl = selectedNoteId === s.id || selectedNoteId === t.id;
          ctx.beginPath();
          ctx.strokeStyle = hl ? linkHighlight : linkColor;
          ctx.lineWidth = (hl ? 2.5 : 1.5) / cam.zoom;
          ctx.moveTo(s.x, s.y);
          const mx = (s.x + t.x) / 2;
          const my = (s.y + t.y) / 2;
          const dx = t.x - s.x;
          const dy = t.y - s.y;
          const offset = Math.min(15, Math.sqrt(dx*dx + dy*dy) * 0.05);
          ctx.quadraticCurveTo(mx - dy * offset / (Math.sqrt(dx*dx+dy*dy) || 1), my + dx * offset / (Math.sqrt(dx*dx+dy*dy) || 1), t.x, t.y);
          ctx.stroke();
        }
      });

      // Nodes
      const baseFontSize = 11 / cam.zoom;
      const isIndex = (id: string) => id === indexNoteId;

      currentNodes.forEach(node => {
        const isSelected = node.id === selectedNoteId;
        const isHovered = node.id === hoveredNode;
        const isIdx = isIndex(node.id);
        const isConnected = stableLinks.some(
          l => (l.source === selectedNoteId && l.target === node.id) ||
               (l.target === selectedNoteId && l.source === node.id)
        );

        const nodeTags = getTagsForNote ? getTagsForNote(node.id) : [];
        const customColor = nodeTags.length > 0 ? nodeTags[0].color : null;

        let baseRadius = isIdx ? 12 : 8;
        if (isSelected) baseRadius = isIdx ? 14 : 11;
        else if (isHovered) baseRadius = isIdx ? 13 : 10;
        const nodeRadius = baseRadius / Math.sqrt(cam.zoom);

        // Glow for selected/hovered
        if (isSelected || isHovered) {
          const glowColor = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)';
          ctx.beginPath();
          ctx.arc(node.x, node.y, nodeRadius * 2, 0, Math.PI * 2);
          ctx.fillStyle = glowColor;
          ctx.fill();
        }

        // Node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeRadius, 0, Math.PI * 2);

        // Gradient fill
        const grad = ctx.createRadialGradient(
          node.x - nodeRadius * 0.3, node.y - nodeRadius * 0.3, 0,
          node.x, node.y, nodeRadius
        );

        if (isIdx) {
          grad.addColorStop(0, isDark ? 'hsl(260, 60%, 70%)' : 'hsl(260, 50%, 55%)');
          grad.addColorStop(1, isDark ? 'hsl(260, 40%, 50%)' : 'hsl(260, 40%, 40%)');
        } else if (isSelected) {
          grad.addColorStop(0, isDark ? 'hsl(0, 0%, 95%)' : 'hsl(0, 0%, 15%)');
          grad.addColorStop(1, isDark ? 'hsl(0, 0%, 75%)' : 'hsl(0, 0%, 30%)');
        } else if (customColor) {
          grad.addColorStop(0, customColor);
          grad.addColorStop(1, customColor);
        } else if (isConnected) {
          grad.addColorStop(0, isDark ? 'hsl(0, 0%, 75%)' : 'hsl(0, 0%, 30%)');
          grad.addColorStop(1, isDark ? 'hsl(0, 0%, 55%)' : 'hsl(0, 0%, 45%)');
        } else {
          grad.addColorStop(0, isDark ? 'hsl(0, 0%, 55%)' : 'hsl(0, 0%, 55%)');
          grad.addColorStop(1, isDark ? 'hsl(0, 0%, 40%)' : 'hsl(0, 0%, 65%)');
        }

        ctx.fillStyle = grad;
        ctx.fill();

        // Ring
        if (isSelected || isHovered || isIdx) {
          ctx.strokeStyle = isIdx
            ? (isDark ? 'hsl(260, 50%, 65%)' : 'hsl(260, 40%, 50%)')
            : (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)');
          ctx.lineWidth = (isIdx ? 2.5 : 2) / cam.zoom;
          ctx.stroke();
        }

        // Label
        const label = node.title.length > 20 ? node.title.slice(0, 20) + '…' : node.title;
        const fontSize = (isSelected || isIdx ? baseFontSize * 1.05 : baseFontSize);
        ctx.font = `${isSelected || isIdx ? '600 ' : '400 '}${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
        const textWidth = ctx.measureText(label).width;
        const textX = node.x;
        const textY = node.y + nodeRadius + 6 / cam.zoom;

        // Label bg pill
        const pad = 4 / cam.zoom;
        const pillH = fontSize + pad * 2;
        const pillW = textWidth + pad * 2.5;
        const pillR = 3 / cam.zoom;

        ctx.fillStyle = isDark ? 'rgba(15,15,20,0.85)' : 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        const px = textX - pillW / 2;
        const py = textY - pad;
        ctx.moveTo(px + pillR, py);
        ctx.lineTo(px + pillW - pillR, py);
        ctx.arcTo(px + pillW, py, px + pillW, py + pillR, pillR);
        ctx.lineTo(px + pillW, py + pillH - pillR);
        ctx.arcTo(px + pillW, py + pillH, px + pillW - pillR, py + pillH, pillR);
        ctx.lineTo(px + pillR, py + pillH);
        ctx.arcTo(px, py + pillH, px, py + pillH - pillR, pillR);
        ctx.lineTo(px, py + pillR);
        ctx.arcTo(px, py, px + pillR, py, pillR);
        ctx.closePath();
        ctx.fill();

        // Label border
        if (isIdx) {
          ctx.strokeStyle = isDark ? 'rgba(160,120,255,0.3)' : 'rgba(100,60,200,0.2)';
          ctx.lineWidth = 1 / cam.zoom;
          ctx.stroke();
        }

        ctx.fillStyle = isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(label, textX, textY);
      });

      ctx.restore();

      animationRef.current = requestAnimationFrame(simulate);
    };

    animationRef.current = requestAnimationFrame(simulate);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [stableLinks, selectedNoteId, indexNoteId, dpr, getTagsForNote]);

  const getNodeAtPosition = useCallback((sx: number, sy: number): GraphNode | null => {
    const cam = cameraRef.current;
    const hitRadius = ('ontouchstart' in window ? 35 : 22) / cam.zoom;
    const world = screenToWorld(sx, sy);
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
    if ('touches' in e && e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartRef.current = { dist: Math.sqrt(dx * dx + dy * dy), zoom: cameraRef.current.zoom };
      return;
    }

    const pos = getEventPosition(e);
    if (!pos) return;

    dragStartPosRef.current = { x: pos.x, y: pos.y };
    didDragRef.current = false;

    const node = getNodeAtPosition(pos.x, pos.y);
    if (node) {
      draggingNodeRef.current = node.id;
    } else {
      isPanningRef.current = true;
      panStartRef.current = { x: pos.x, y: pos.y, camX: cameraRef.current.x, camY: cameraRef.current.y };
    }
  }, [getEventPosition, getNodeAtPosition]);

  const handlePointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
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

    // Check if we've moved enough to count as drag
    if (dragStartPosRef.current) {
      const dx = pos.x - dragStartPosRef.current.x;
      const dy = pos.y - dragStartPosRef.current.y;
      if (dx * dx + dy * dy > 25) {
        didDragRef.current = true;
      }
    }

    const dragging = draggingNodeRef.current;
    if (dragging) {
      const world = screenToWorld(pos.x, pos.y);
      const node = nodesRef.current.find(n => n.id === dragging);
      if (node) {
        node.x = world.x; node.y = world.y;
        node.vx = 0; node.vy = 0;
      }
    } else if (isPanningRef.current) {
      const cam = cameraRef.current;
      const dx = (pos.x - panStartRef.current.x) / cam.zoom;
      const dy = (pos.y - panStartRef.current.y) / cam.zoom;
      cam.x = panStartRef.current.camX - dx;
      cam.y = panStartRef.current.camY - dy;
      forceRender(n => n + 1);
    } else if (!('touches' in e)) {
      const node = getNodeAtPosition(pos.x, pos.y);
      hoveredNodeRef.current = node?.id || null;
    }
  }, [getEventPosition, getNodeAtPosition, screenToWorld]);

  const handlePointerUp = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    pinchStartRef.current = null;

    const pos = getEventPosition(e);

    // If we didn't drag far, treat as a click
    if (!didDragRef.current && pos) {
      const node = getNodeAtPosition(pos.x, pos.y);
      if (node) {
        onSelectNote(node.id);
      }
    }

    draggingNodeRef.current = null;
    isPanningRef.current = false;
    dragStartPosRef.current = null;
  }, [getEventPosition, getNodeAtPosition, onSelectNote]);

  const handlePointerLeave = useCallback(() => {
    draggingNodeRef.current = null;
    isPanningRef.current = false;
    hoveredNodeRef.current = null;
    dragStartPosRef.current = null;
  }, []);

  const dims = dimensionsRef.current;

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
        className="cursor-grab active:cursor-grabbing touch-none block w-full h-full"
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerLeave}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
        onWheel={handleWheel}
      />

      {/* Zoom controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="h-9 w-9 p-0 border backdrop-blur-sm bg-background/80 shadow-sm"
          onClick={() => applyZoom(1, dims.width / 2, dims.height / 2)}
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-9 w-9 p-0 border backdrop-blur-sm bg-background/80 shadow-sm"
          onClick={() => applyZoom(-1, dims.width / 2, dims.height / 2)}
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-9 w-9 p-0 border backdrop-blur-sm bg-background/80 shadow-sm"
          onClick={fitToView}
        >
          <Maximize className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
