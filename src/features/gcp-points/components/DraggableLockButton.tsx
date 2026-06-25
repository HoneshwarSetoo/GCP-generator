import React, { useState, useRef, useEffect } from 'react';
import { Lock, Unlock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DraggableLockButtonProps {
  isLocked: boolean;
  onToggle: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function DraggableLockButton({ isLocked, onToggle, containerRef }: DraggableLockButtonProps) {
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragRef.current || !containerRef.current) return;
    
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    
    // Bounds check relative to container
    const rect = containerRef.current.getBoundingClientRect();
    const btnSize = 40; // Approx size
    
    let newX = dragRef.current.initialX - dx; // right aligned, so subtract dx
    let newY = dragRef.current.initialY + dy;
    
    // Rough constraints
    newX = Math.max(0, Math.min(newX, rect.width - btnSize));
    newY = Math.max(0, Math.min(newY, rect.height - btnSize));

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <button
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={(e) => { e.stopPropagation(); onToggle(); }}
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      style={{ right: position.x, top: position.y }}
      className={cn(
        "absolute z-50 flex items-center justify-center w-10 h-10 rounded-full shadow-lg border-2 transition-colors cursor-grab active:cursor-grabbing",
        isLocked 
          ? "bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200" 
          : "bg-green-100 text-green-800 border-green-300 hover:bg-green-200"
      )}
      title="Click to toggle lock, Drag to move"
    >
      {isLocked ? <Unlock size={18} /> : <Lock size={18} />}
    </button>
  );
}
