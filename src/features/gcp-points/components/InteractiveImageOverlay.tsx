import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { GCP } from '../types';
import { DraggableImageControls } from './DraggableImageControls';

interface InteractiveImageOverlayProps {
  imageUrl: string;
  opacity: number;
  isInteractive: boolean;
  gcps: GCP[];
  transform: { x: number; y: number; scale: number };
  onTransformChange: (transform: { x: number; y: number; scale: number }) => void;
  onRemove: () => void;
  onLock: () => void;
  controlsPos?: { edge: 'top' | 'bottom' | 'left' | 'right'; percent: number };
  onControlsPosChange?: (pos: { edge: 'top' | 'bottom' | 'left' | 'right'; percent: number }) => void;
}

export const InteractiveImageOverlay = forwardRef<HTMLImageElement, InteractiveImageOverlayProps>(
  ({ imageUrl, opacity, isInteractive, gcps, transform, onTransformChange, onRemove, onLock, controlsPos, onControlsPosChange }, ref) => {
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0, initialTx: 0, initialTy: 0 });

    const handleMouseDown = (e: React.MouseEvent) => {
      if (!isInteractive) return;
      e.preventDefault();
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        initialTx: transform.x,
        initialTy: transform.y,
      };
    };

    useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging || !isInteractive) return;
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        onTransformChange({
          scale: transform.scale,
          x: dragStartRef.current.initialTx + dx,
          y: dragStartRef.current.initialTy + dy,
        });
      };

      const handleMouseUp = () => {
        setIsDragging(false);
      };

      if (isDragging) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
      }

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }, [isDragging, isInteractive]);

    const handleWheel = (e: React.WheelEvent) => {
      if (!isInteractive) return;
      e.preventDefault();
      
      const scaleSensitivity = 0.001;
      const delta = -e.deltaY * scaleSensitivity;
      const newScale = Math.max(0.1, Math.min(transform.scale * Math.exp(delta), 10));
      
      onTransformChange({
        ...transform,
        scale: newScale,
      });
    };

    return (
      <div 
        className="absolute inset-0 overflow-hidden flex items-center justify-center pointer-events-none"
        style={{ zIndex: 10 }}
      >
        <div 
          className="relative"
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: 'center center',
            pointerEvents: isInteractive ? 'auto' : 'none',
            cursor: isInteractive ? (isDragging ? 'grabbing' : 'grab') : 'default',
          }}
          onMouseDown={handleMouseDown}
          onWheel={handleWheel}
        >
          <img 
            ref={ref}
            src={imageUrl} 
            alt="Overlay" 
            className="max-w-[80vw] max-h-[80vh] object-contain shadow-lg border border-black/10"
            draggable={false}
            style={{ opacity: opacity }}
          />

          <DraggableImageControls 
            isLocked={false}
            onToggleLock={onLock}
            onRemove={onRemove}
            title="Active Image Controls"
            posState={controlsPos}
            onPosChange={onControlsPosChange}
          />
          
          {/* Render GCP markers on the image */}
          {gcps.map((gcp) => {
            const imgRef = ref as React.RefObject<HTMLImageElement | null>;
            if (!imgRef || !imgRef.current) return null;
            
            const leftPct = (gcp.pxcel_x / imgRef.current.naturalWidth) * 100;
            const topPct = (gcp.pxcel_y / imgRef.current.naturalHeight) * 100;
            
            return (
              <div
                key={gcp.id}
                className="absolute w-4 h-4 -ml-2 -mt-2 bg-blue-500 rounded-full border-2 border-white shadow-md pointer-events-none"
                style={{ left: `${leftPct}%`, top: `${topPct}%`, transform: `scale(${1 / transform.scale})` }}
              >
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white px-1.5 py-0.5 rounded text-xs font-bold shadow-sm text-blue-700 whitespace-nowrap">
                  {gcp.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

InteractiveImageOverlay.displayName = 'InteractiveImageOverlay';
