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
    const [showCtrlMessage, setShowCtrlMessage] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0, initialTx: 0, initialTy: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const imageContainerRef = useRef<HTMLDivElement>(null);
    const localTransformRef = useRef(transform);
    const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
      localTransformRef.current = transform;
      if (imageContainerRef.current) {
        imageContainerRef.current.style.transform = `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`;
      }
    }, [transform]);

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
        
        localTransformRef.current = {
          ...localTransformRef.current,
          x: dragStartRef.current.initialTx + dx,
          y: dragStartRef.current.initialTy + dy,
        };

        if (imageContainerRef.current) {
          imageContainerRef.current.style.transform = `translate(${localTransformRef.current.x}px, ${localTransformRef.current.y}px) scale(${localTransformRef.current.scale})`;
        }
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        onTransformChange(localTransformRef.current);
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

    useEffect(() => {
      const container = containerRef.current;
      if (!container || !isInteractive) return;

      let messageTimeout: NodeJS.Timeout;

      const handleNativeWheel = (e: WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault(); // Prevent page scroll
          setShowCtrlMessage(false);
          const scaleSensitivity = 0.001;
          const delta = -e.deltaY * scaleSensitivity;
          const currentTransform = localTransformRef.current;
          const newScale = Math.max(0.1, Math.min(currentTransform.scale * Math.exp(delta), 10));
          
          localTransformRef.current = {
            ...currentTransform,
            scale: newScale,
          };

          if (imageContainerRef.current) {
            imageContainerRef.current.style.transform = `translate(${localTransformRef.current.x}px, ${localTransformRef.current.y}px) scale(${localTransformRef.current.scale})`;
          }

          if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
          debounceTimeoutRef.current = setTimeout(() => {
            onTransformChange(localTransformRef.current);
          }, 150);
        } else {
          // Not holding Ctrl, show message and let page scroll normally
          setShowCtrlMessage(true);
          clearTimeout(messageTimeout);
          messageTimeout = setTimeout(() => setShowCtrlMessage(false), 2000);
        }
      };

      // Native event listener required to reliably preventDefault for scroll
      container.addEventListener('wheel', handleNativeWheel, { passive: false });
      return () => {
        container.removeEventListener('wheel', handleNativeWheel);
        clearTimeout(messageTimeout);
        if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
      };
    }, [isInteractive, onTransformChange]);

    return (
      <div 
        ref={containerRef}
        className="absolute inset-0 overflow-hidden flex items-center justify-center pointer-events-none"
        style={{ zIndex: 1 }}
      >
        {/* Ctrl Message Overlay */}
        <div 
          className={`absolute inset-0 z-50 flex items-center justify-center bg-black/40 transition-opacity duration-300 ${showCtrlMessage ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        >
          <div className="bg-background px-6 py-3 rounded-lg shadow-lg text-lg font-medium">
            Use ctrl + scroll to zoom the map
          </div>
        </div>

        <div 
          ref={imageContainerRef}
          className="relative"
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: 'center center',
            pointerEvents: isInteractive ? 'auto' : 'none',
            cursor: isInteractive ? (isDragging ? 'grabbing' : 'grab') : 'default',
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            willChange: 'transform'
          }}
          onMouseDown={handleMouseDown}
        >
          <img 
            ref={ref}
            src={imageUrl} 
            alt="Overlay" 
            className="max-w-[80vw] max-h-[80vh] object-contain shadow-lg border border-black/10"
            draggable={false}
            style={{ opacity: opacity }}
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
