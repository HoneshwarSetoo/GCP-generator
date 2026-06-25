import React, { useState, useRef, useEffect } from 'react';
import { Lock, Unlock, X } from 'lucide-react';

interface DraggableImageControlsProps {
  isLocked: boolean;
  onToggleLock: () => void;
  onRemove: () => void;
  title?: string;
  posState?: { edge: 'top' | 'bottom' | 'left' | 'right'; percent: number };
  onPosChange?: (pos: { edge: 'top' | 'bottom' | 'left' | 'right'; percent: number }) => void;
}

export function DraggableImageControls({ isLocked, onToggleLock, onRemove, title, posState, onPosChange }: DraggableImageControlsProps) {
  const [pos, setPos] = useState({ x: 0, y: -42 }); // Default top-left outside
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, initialX: 0, initialY: 0, scale: 1, edge: 'top' as 'top'|'bottom'|'left'|'right', percent: 0 });
  const hasDragged = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    hasDragged.current = false;
    let scale = 1;
    if (containerRef.current && containerRef.current.parentElement) {
      const parent = containerRef.current.parentElement;
      const rect = parent.getBoundingClientRect();
      if (parent.offsetWidth > 0) {
        scale = rect.width / parent.offsetWidth;
      }
    }
    dragStart.current = { x: e.clientX, y: e.clientY, initialX: pos.x, initialY: pos.y, scale, edge: posState?.edge || 'top', percent: posState?.percent || 50 };
  };

  useEffect(() => {
    if (isDragging || !containerRef.current || !containerRef.current.parentElement) return;

    const parent = containerRef.current.parentElement;
    const margin = 2;

    const updatePos = () => {
      if (!containerRef.current) return;
      const cw = containerRef.current.offsetWidth;
      const ch = containerRef.current.offsetHeight;
      const pW = parent.clientWidth;
      const pH = parent.clientHeight;
      
      const edge = posState?.edge || 'top';
      const pct = posState?.percent || 0;
      let nx = 0, ny = 0;
      
      if (edge === 'top') {
        ny = -(ch + margin); nx = pct * Math.max(0, pW - cw);
      } else if (edge === 'bottom') {
        ny = pH + margin; nx = pct * Math.max(0, pW - cw);
      } else if (edge === 'left') {
        nx = -(cw + margin); ny = pct * Math.max(0, pH - ch);
      } else {
        nx = pW + margin; ny = pct * Math.max(0, pH - ch);
      }
      setPos({ x: nx, y: ny });
    };

    updatePos();
    
    // Create an observer to track parent dimensions
    const resizeObserver = new ResizeObserver(() => {
      updatePos();
    });
    resizeObserver.observe(parent);
    
    return () => resizeObserver.disconnect();
  }, [posState, isDragging]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasDragged.current = true;
      }
      
      const scale = dragStart.current.scale || 1;
      let newX = dragStart.current.initialX + dx / scale;
      let newY = dragStart.current.initialY + dy / scale;

      if (containerRef.current && containerRef.current.parentElement) {
        const parent = containerRef.current.parentElement;
        const cw = containerRef.current.offsetWidth;
        const ch = containerRef.current.offsetHeight;
        const pW = parent.clientWidth;
        const pH = parent.clientHeight;
        
        // Offset slightly to be completely outside but attached to the border
        const margin = 2; // pixel gap
        
        const top = { x: Math.max(0, Math.min(newX, pW - cw)), y: -(ch + margin) };
        const bottom = { x: Math.max(0, Math.min(newX, pW - cw)), y: pH + margin };
        const left = { x: -(cw + margin), y: Math.max(0, Math.min(newY, pH - ch)) };
        const right = { x: pW + margin, y: Math.max(0, Math.min(newY, pH - ch)) };

        const points = [
          { p: top, edge: 'top' as const },
          { p: bottom, edge: 'bottom' as const },
          { p: left, edge: 'left' as const },
          { p: right, edge: 'right' as const }
        ];
        
        const dist = (p: {x: number, y: number}) => Math.pow(newX - p.x, 2) + Math.pow(newY - p.y, 2);
        const closest = points.reduce((prev, curr) => dist(curr.p) < dist(prev.p) ? curr : prev);
        
        newX = closest.p.x;
        newY = closest.p.y;

        let edge = closest.edge;
        let percent = 0;
        if (edge === 'top' || edge === 'bottom') {
          percent = pW > cw ? Math.max(0, Math.min(1, newX / (pW - cw))) : 0;
        } else {
          percent = pH > ch ? Math.max(0, Math.min(1, newY / (pH - ch))) : 0;
        }
        
        dragStart.current.edge = edge;
        dragStart.current.percent = percent;
      }

      setPos({ x: newX, y: newY });
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      if (hasDragged.current && onPosChange) {
        onPosChange({ edge: dragStart.current.edge, percent: dragStart.current.percent });
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div
      ref={containerRef}
      className={`absolute flex items-center bg-white/95 backdrop-blur-sm shadow-lg border border-black/10 pointer-events-auto transition-shadow ${
        isDragging ? 'shadow-xl cursor-grabbing' : 'cursor-grab'
      }`}
      style={{
        left: pos.x,
        top: pos.y,
        zIndex: 50,
        borderRadius: '8px',
        padding: '2px'
      }}
      onMouseDown={handleMouseDown}
      title={title || "Drag to move controls"}
    >
      <button
        onClick={(e) => { 
          e.stopPropagation(); 
          if (!hasDragged.current) onToggleLock(); 
        }}
        className={`p-2 hover:bg-black/5 rounded-l-md transition-colors flex items-center justify-center ${isLocked ? 'text-green-600' : 'text-amber-500'}`}
        title={isLocked ? "Unlock Image" : "Lock Image to Map"}
      >
        {isLocked ? <Lock size={18} /> : <Unlock size={18} />}
      </button>
      <div className="w-px h-6 bg-black/10 mx-1" />
      <button
        onClick={(e) => { 
          e.stopPropagation(); 
          if (!hasDragged.current) onRemove(); 
        }}
        className="p-2 hover:bg-red-50 hover:text-red-600 text-gray-600 rounded-r-md transition-colors flex items-center justify-center"
        title="Remove Image from Map"
      >
        <X size={18} />
      </button>
    </div>
  );
}
