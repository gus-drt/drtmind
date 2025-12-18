import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Note, NoteLink, GraphNode } from '@/types/note';

interface NoteGraphProps {
  notes: Note[];
  links: NoteLink[];
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
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

  // Memoize links for stable reference
  const stableLinks = useMemo(() => links, [JSON.stringify(links)]);

  // Initialize/update nodes when notes change
  useEffect(() => {
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const radius = Math.min(dimensions.width, dimensions.height) * 0.35;
    
    const existingNodes = nodesRef.current;
    
    nodesRef.current = notes.map((note, i) => {
      const existingNode = existingNodes.find(n => n.id === note.id);
      const angle = (i / Math.max(notes.length, 1)) * Math.PI * 2;
      
      return {
        id: note.id,
        title: note.title,
        x: existingNode?.x ?? centerX + Math.cos(angle) * radius + (Math.random() - 0.5) * 50,
        y: existingNode?.y ?? centerY + Math.sin(angle) * radius + (Math.random() - 0.5) * 50,
        vx: existingNode?.vx ?? 0,
        vy: existingNode?.vy ?? 0,
      };
    });
    
    forceRender(n => n + 1);
  }, [notes, dimensions]);

  // Handle resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setDimensions({ width: rect.width, height: rect.height });
        }
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    // Also check after a short delay for layout settling
    const timer = setTimeout(updateDimensions, 100);
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
      clearTimeout(timer);
    };
  }, []);

  // Force simulation and rendering loop
  useEffect(() => {
    const nodes = nodesRef.current;
    if (nodes.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const simulate = () => {
      const currentNodes = nodesRef.current;
      if (currentNodes.length === 0) {
        animationRef.current = requestAnimationFrame(simulate);
        return;
      }

      // Physics simulation
      // Repulsion between all nodes
      for (let i = 0; i < currentNodes.length; i++) {
        for (let j = i + 1; j < currentNodes.length; j++) {
          const nodeA = currentNodes[i];
          const nodeB = currentNodes[j];
          const dx = nodeB.x - nodeA.x;
          const dy = nodeB.y - nodeA.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 2500 / (distance * distance);
          
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;
          
          if (nodeA.id !== draggingNode) {
            nodeA.vx -= fx;
            nodeA.vy -= fy;
          }
          if (nodeB.id !== draggingNode) {
            nodeB.vx += fx;
            nodeB.vy += fy;
          }
        }
      }

      // Attraction for linked nodes
      stableLinks.forEach(link => {
        const source = currentNodes.find(n => n.id === link.source);
        const target = currentNodes.find(n => n.id === link.target);
        
        if (source && target) {
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (distance - 150) * 0.03;
          
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;
          
          if (source.id !== draggingNode) {
            source.vx += fx;
            source.vy += fy;
          }
          if (target.id !== draggingNode) {
            target.vx -= fx;
            target.vy -= fy;
          }
        }
      });

      // Center gravity
      const centerX = dimensions.width / 2;
      const centerY = dimensions.height / 2;
      
      currentNodes.forEach(node => {
        if (node.id !== draggingNode) {
          node.vx += (centerX - node.x) * 0.002;
          node.vy += (centerY - node.y) * 0.002;
          
          // Apply velocity with damping
          node.vx *= 0.85;
          node.vy *= 0.85;
          node.x += node.vx;
          node.y += node.vy;
          
          // Bounds
          const padding = 50;
          node.x = Math.max(padding, Math.min(dimensions.width - padding, node.x));
          node.y = Math.max(padding, Math.min(dimensions.height - padding, node.y));
        }
      });

      // Draw
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      // Draw links with thicker lines
      stableLinks.forEach(link => {
        const source = currentNodes.find(n => n.id === link.source);
        const target = currentNodes.find(n => n.id === link.target);
        
        if (source && target) {
          const isHighlighted = selectedNoteId === source.id || selectedNoteId === target.id;
          
          ctx.beginPath();
          ctx.strokeStyle = isHighlighted ? 'hsl(0, 0%, 20%)' : 'hsl(0, 0%, 60%)';
          ctx.lineWidth = isHighlighted ? 3 : 2;
          ctx.moveTo(source.x, source.y);
          ctx.lineTo(target.x, target.y);
          ctx.stroke();
        }
      });

      // Draw nodes
      currentNodes.forEach(node => {
        const isSelected = node.id === selectedNoteId;
        const isHovered = node.id === hoveredNode;
        const isConnected = stableLinks.some(
          l => (l.source === selectedNoteId && l.target === node.id) ||
               (l.target === selectedNoteId && l.source === node.id)
        );
        
        // Node circle
        const nodeRadius = isSelected ? 14 : isHovered ? 12 : 10;
        
        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeRadius, 0, Math.PI * 2);
        
        if (isSelected) {
          ctx.fillStyle = 'hsl(0, 0%, 0%)';
        } else if (isConnected) {
          ctx.fillStyle = 'hsl(0, 0%, 25%)';
        } else {
          ctx.fillStyle = 'hsl(0, 0%, 45%)';
        }
        
        ctx.fill();
        
        if (isSelected || isHovered) {
          ctx.strokeStyle = 'hsl(0, 0%, 0%)';
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        // Label with background for better readability
        const label = node.title.length > 18 ? node.title.slice(0, 18) + '...' : node.title;
        ctx.font = isSelected ? 'bold 13px Space Grotesk' : '12px Space Grotesk';
        
        const textWidth = ctx.measureText(label).width;
        const textX = node.x;
        const textY = node.y + nodeRadius + 8;
        
        // Text background
        ctx.fillStyle = 'hsla(0, 0%, 100%, 0.85)';
        ctx.fillRect(textX - textWidth / 2 - 4, textY - 2, textWidth + 8, 16);
        
        // Text
        ctx.fillStyle = 'hsl(0, 0%, 0%)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(label, textX, textY);
      });

      animationRef.current = requestAnimationFrame(simulate);
    };

    animationRef.current = requestAnimationFrame(simulate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [stableLinks, draggingNode, dimensions, selectedNoteId, hoveredNode]);

  const getNodeAtPosition = useCallback((x: number, y: number): GraphNode | null => {
    const nodes = nodesRef.current;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      const dx = x - node.x;
      const dy = y - node.y;
      if (dx * dx + dy * dy < 400) {
        return node;
      }
    }
    return null;
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const node = getNodeAtPosition(x, y);
    
    if (node) {
      setDraggingNode(node.id);
    }
  }, [getNodeAtPosition]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (draggingNode) {
      const node = nodesRef.current.find(n => n.id === draggingNode);
      if (node) {
        node.x = x;
        node.y = y;
        node.vx = 0;
        node.vy = 0;
      }
    } else {
      const node = getNodeAtPosition(x, y);
      setHoveredNode(node?.id || null);
    }
  }, [draggingNode, getNodeAtPosition]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (draggingNode) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const node = getNodeAtPosition(x, y);
        if (node && node.id === draggingNode) {
          onSelectNote(node.id);
        }
      }
      setDraggingNode(null);
    }
  }, [draggingNode, getNodeAtPosition, onSelectNote]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (draggingNode) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const node = getNodeAtPosition(x, y);
    
    if (node) {
      onSelectNote(node.id);
    }
  }, [draggingNode, getNodeAtPosition, onSelectNote]);

  const handleMouseLeave = useCallback(() => {
    setDraggingNode(null);
    setHoveredNode(null);
  }, []);

  if (notes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>Crie uma nota para ver o grafo</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full min-h-[300px] relative">
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="cursor-pointer"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      />
      {/* Debug info */}
      <div className="absolute bottom-2 left-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 border border-border">
        {notes.length} notas • {stableLinks.length} conexões
      </div>
    </div>
  );
};
