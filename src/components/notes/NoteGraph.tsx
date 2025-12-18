import { useEffect, useRef, useState, useCallback } from 'react';
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
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
  const animationRef = useRef<number>();
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Initialize nodes with positions
  useEffect(() => {
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const radius = Math.min(dimensions.width, dimensions.height) * 0.35;
    
    setNodes(notes.map((note, i) => {
      const angle = (i / notes.length) * Math.PI * 2;
      const existingNode = nodes.find(n => n.id === note.id);
      
      return {
        id: note.id,
        title: note.title,
        x: existingNode?.x ?? centerX + Math.cos(angle) * radius + (Math.random() - 0.5) * 50,
        y: existingNode?.y ?? centerY + Math.sin(angle) * radius + (Math.random() - 0.5) * 50,
        vx: 0,
        vy: 0,
      };
    }));
  }, [notes, dimensions]);

  // Handle resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Force simulation
  useEffect(() => {
    if (nodes.length === 0) return;

    const simulate = () => {
      setNodes(prevNodes => {
        const newNodes = prevNodes.map(node => ({ ...node }));
        
        // Repulsion between all nodes
        for (let i = 0; i < newNodes.length; i++) {
          for (let j = i + 1; j < newNodes.length; j++) {
            const dx = newNodes[j].x - newNodes[i].x;
            const dy = newNodes[j].y - newNodes[i].y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = 2000 / (distance * distance);
            
            const fx = (dx / distance) * force;
            const fy = (dy / distance) * force;
            
            if (newNodes[i].id !== draggingNode) {
              newNodes[i].vx -= fx;
              newNodes[i].vy -= fy;
            }
            if (newNodes[j].id !== draggingNode) {
              newNodes[j].vx += fx;
              newNodes[j].vy += fy;
            }
          }
        }

        // Attraction for linked nodes
        links.forEach(link => {
          const source = newNodes.find(n => n.id === link.source);
          const target = newNodes.find(n => n.id === link.target);
          
          if (source && target) {
            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = (distance - 120) * 0.02;
            
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
        
        newNodes.forEach(node => {
          if (node.id !== draggingNode) {
            node.vx += (centerX - node.x) * 0.001;
            node.vy += (centerY - node.y) * 0.001;
            
            // Apply velocity with damping
            node.vx *= 0.9;
            node.vy *= 0.9;
            node.x += node.vx;
            node.y += node.vy;
            
            // Bounds
            const padding = 40;
            node.x = Math.max(padding, Math.min(dimensions.width - padding, node.x));
            node.y = Math.max(padding, Math.min(dimensions.height - padding, node.y));
          }
        });

        return newNodes;
      });

      animationRef.current = requestAnimationFrame(simulate);
    };

    animationRef.current = requestAnimationFrame(simulate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [links, draggingNode, dimensions, nodes.length]);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    // Draw links
    ctx.strokeStyle = 'hsl(0, 0%, 70%)';
    ctx.lineWidth = 2;
    
    links.forEach(link => {
      const source = nodes.find(n => n.id === link.source);
      const target = nodes.find(n => n.id === link.target);
      
      if (source && target) {
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
      }
    });

    // Draw nodes
    nodes.forEach(node => {
      const isSelected = node.id === selectedNoteId;
      const isHovered = node.id === hoveredNode;
      const isConnected = links.some(
        l => (l.source === selectedNoteId && l.target === node.id) ||
             (l.target === selectedNoteId && l.source === node.id)
      );
      
      // Node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, isSelected ? 12 : isHovered ? 10 : 8, 0, Math.PI * 2);
      
      if (isSelected) {
        ctx.fillStyle = 'hsl(0, 0%, 0%)';
      } else if (isConnected) {
        ctx.fillStyle = 'hsl(0, 0%, 30%)';
      } else {
        ctx.fillStyle = 'hsl(0, 0%, 50%)';
      }
      
      ctx.fill();
      
      if (isSelected || isHovered) {
        ctx.strokeStyle = 'hsl(0, 0%, 0%)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Label
      ctx.font = isSelected ? 'bold 12px Space Grotesk' : '11px Space Grotesk';
      ctx.fillStyle = 'hsl(0, 0%, 0%)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      
      const label = node.title.length > 20 ? node.title.slice(0, 20) + '...' : node.title;
      ctx.fillText(label, node.x, node.y + 16);
    });
  }, [nodes, links, selectedNoteId, hoveredNode, dimensions]);

  const getNodeAtPosition = useCallback((x: number, y: number): GraphNode | null => {
    for (const node of nodes) {
      const dx = x - node.x;
      const dy = y - node.y;
      if (dx * dx + dy * dy < 400) {
        return node;
      }
    }
    return null;
  }, [nodes]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const node = getNodeAtPosition(x, y);
    
    if (node) {
      setDraggingNode(node.id);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (draggingNode) {
      setNodes(prev => prev.map(node => 
        node.id === draggingNode 
          ? { ...node, x, y, vx: 0, vy: 0 }
          : node
      ));
    } else {
      const node = getNodeAtPosition(x, y);
      setHoveredNode(node?.id || null);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
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
  };

  const handleClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const node = getNodeAtPosition(x, y);
    
    if (node) {
      onSelectNote(node.id);
    }
  };

  if (notes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>Crie uma nota para ver o grafo</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full min-h-[300px]">
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="cursor-pointer"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setDraggingNode(null);
          setHoveredNode(null);
        }}
        onClick={handleClick}
      />
    </div>
  );
};
