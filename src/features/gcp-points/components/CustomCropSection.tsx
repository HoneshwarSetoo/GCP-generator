import React, { useState, useRef, useEffect, useCallback } from 'react';
import { UploadedImage } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '@/features/ui/card';
import { ArrowLeft, Save, Loader2, Eraser, Trash2, SunMoon, Pentagon, ZoomIn, ZoomOut, Move, RotateCcw, ChevronLeft, ChevronRight, RotateCw } from 'lucide-react';
import { useSaveCustomCropMutation } from '@/store/api/gcpApi';
import { toast } from 'sonner';

interface CustomCropSectionProps {
  images: UploadedImage[];
  setImages: React.Dispatch<React.SetStateAction<UploadedImage[]>>;
  onBack: () => void;
  onProceed: () => void;
  initialImageId?: string;
}

export function CustomCropSection({ images, setImages, onBack, onProceed, initialImageId }: CustomCropSectionProps) {
  const [activeTool, setActiveTool] = useState<'polygon' | 'eraser' | 'pan'>('pan');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [brushSize, setBrushSize] = useState(30);
  const [eraserPaths, setEraserPaths] = useState<{x: number, y: number}[][]>([]);
  const [currentEraserPath, setCurrentEraserPath] = useState<{x: number, y: number}[] | null>(null);
  
  const [activeId, setActiveId] = useState<string>(initialImageId || images[0]?.id || '');
  const [points, setPoints] = useState<{x: number, y: number}[]>([]);
  const [isDrawingPoly, setIsDrawingPoly] = useState(false);
  const [draggedPointIndex, setDraggedPointIndex] = useState<number | null>(null);
  const [cropMode, setCropMode] = useState<'keep' | 'remove'>('remove');

  const [isDarkBg, setIsDarkBg] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [visualRotation, setVisualRotation] = useState(0);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const stateRef = useRef({ zoom, pan });
  stateRef.current = { zoom, pan };

  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const dragStateRef = useRef({ startX: 0, startY: 0 });

  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [saveCustomCrop] = useSaveCustomCropMutation();

  const doZoom = useCallback((zoomDelta: number, cx?: number, cy?: number) => {
    if (!containerRef.current) return;
    
    const prevZoom = stateRef.current.zoom;
    const newZoom = Math.min(Math.max(0.1, prevZoom * zoomDelta), 10);
    
    if (newZoom !== prevZoom) {
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = cx !== undefined ? cx : rect.width / 2;
      const centerY = cy !== undefined ? cy : rect.height / 2;
      
      const prevPan = stateRef.current.pan;
      const newPan = {
        x: centerX - (centerX - prevPan.x) * (newZoom / prevZoom),
        y: centerY - (centerY - prevPan.y) * (newZoom / prevZoom)
      };

      stateRef.current = { zoom: newZoom, pan: newPan };
      setZoom(newZoom);
      setPan(newPan);
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const rect = container.getBoundingClientRect();
        doZoom(e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX - rect.left, e.clientY - rect.top);
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [doZoom]);

  const activeImage = images.find(img => img.id === activeId);

  useEffect(() => {
    setPoints([]);
    setIsDrawingPoly(false);
    setEraserPaths([]);
    setCurrentEraserPath(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setVisualRotation(0);
  }, [activeId, activeImage?.processedUrl]);

  const getMappedCoords = (e: React.MouseEvent | React.PointerEvent) => {
    if (!imageRef.current) return null;
    const rect = e.currentTarget.getBoundingClientRect();
    const containerW = rect.width;
    const containerH = rect.height;
    
    const imgW = imageRef.current.naturalWidth;
    const imgH = imageRef.current.naturalHeight;
    
    if (!imgW || !imgH) return null;

    const scale = Math.min(containerW / imgW, containerH / imgH);
    const renderedW = imgW * scale;
    const renderedH = imgH * scale;
    
    const offsetX = (containerW - renderedW) / 2;
    const offsetY = (containerH - renderedH) / 2;
    
    let clickX = e.clientX - rect.left;
    let clickY = e.clientY - rect.top;
    
    if (visualRotation !== 0) {
      const cx = containerW / 2;
      const cy = containerH / 2;
      const rad = -(visualRotation * Math.PI) / 180;
      const dx = clickX - cx;
      const dy = clickY - cy;
      clickX = cx + (dx * Math.cos(rad) - dy * Math.sin(rad));
      clickY = cy + (dx * Math.sin(rad) + dy * Math.cos(rad));
    }
    
    const padding = 40; 
    if (clickX < offsetX - padding || clickX > offsetX + renderedW + padding || 
        clickY < offsetY - padding || clickY > offsetY + renderedH + padding) {
      return null;
    }

    const x = (clickX - offsetX) / scale;
    const y = (clickY - offsetY) / scale;
    return { x, y };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeTool === 'pan' || e.button === 1) {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      setIsPanning(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (e.button !== 0) return;
    
    if (activeTool === 'eraser') {
      e.currentTarget.setPointerCapture(e.pointerId);
      const coords = getMappedCoords(e);
      if (coords) {
        setCurrentEraserPath([coords]);
      }
      return;
    }
    
    if (activeTool === 'polygon') {
      if (draggedPointIndex !== null) return;

      const coords = getMappedCoords(e);
      if (!coords) return;

      if (!isDrawingPoly && points.length === 0) {
        setIsDrawingPoly(true);
        setPoints([coords]);
      } else if (isDrawingPoly) {
        setPoints(prev => [...prev, coords]);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPanning) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
      return;
    }

    if (activeTool === 'eraser' && currentEraserPath) {
      const coords = getMappedCoords(e);
      if (coords) {
        setCurrentEraserPath(prev => prev ? [...prev, coords] : [coords]);
      }
    } else if (activeTool === 'polygon' && draggedPointIndex !== null) {
      const coords = getMappedCoords(e);
      if (coords) {
        setPoints(prev => {
          const newPoints = [...prev];
          newPoints[draggedPointIndex] = coords;
          return newPoints;
        });
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch (err) {}
    
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (activeTool === 'eraser' && currentEraserPath) {
      setEraserPaths(prev => [...prev, currentEraserPath]);
      setCurrentEraserPath(null);
    } else if (activeTool === 'polygon' && draggedPointIndex !== null) {
      setDraggedPointIndex(null);
    }
  };

  const handleClosePoly = (e: React.PointerEvent | React.MouseEvent) => {
    e.stopPropagation();
    if (points.length > 2) {
      setIsDrawingPoly(false);
    } else {
      toast.error('You need at least 3 points to close a polygon.');
    }
  };

  const handleNodePointerDown = (e: React.PointerEvent, idx: number) => {
    if (activeTool === 'polygon') {
      e.stopPropagation();
      dragStateRef.current = { startX: e.clientX, startY: e.clientY };
      setDraggedPointIndex(idx);
    }
  };

  const clearCrop = () => {
    setPoints([]);
    setIsDrawingPoly(false);
    setEraserPaths([]);
    setCurrentEraserPath(null);
  };

  const getMaskedImgBlob = async (
    image: HTMLImageElement, 
    polyPoints: {x: number, y: number}[],
    pathsToErase: {x: number, y: number}[][],
    bSize: number,
    forceClosePoly: boolean = false,
    mode: 'keep' | 'remove' = 'keep'
  ): Promise<Blob | null> => {
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    ctx.drawImage(image, 0, 0);

    // Apply Eraser Paths (Destination Out)
    if (pathsToErase.length > 0) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = bSize;
      
      pathsToErase.forEach(path => {
        if (path.length === 0) return;
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) {
          ctx.lineTo(path[i].x, path[i].y);
        }
        ctx.stroke();
      });
      // Reset composite operation
      ctx.globalCompositeOperation = 'source-over';
    }

    // Apply Polygon Mask
    if (polyPoints.length > 0 && (!isDrawingPoly || forceClosePoly)) {
      if (mode === 'keep') {
        const minX = Math.max(0, Math.floor(Math.min(...polyPoints.map(p => p.x))));
        const maxX = Math.min(image.naturalWidth, Math.ceil(Math.max(...polyPoints.map(p => p.x))));
        const minY = Math.max(0, Math.floor(Math.min(...polyPoints.map(p => p.y))));
        const maxY = Math.min(image.naturalHeight, Math.ceil(Math.max(...polyPoints.map(p => p.y))));
        
        const cropWidth = maxX - minX;
        const cropHeight = maxY - minY;

        if (cropWidth <= 0 || cropHeight <= 0) return null;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = image.naturalWidth;
        tempCanvas.height = image.naturalHeight;
        const tCtx = tempCanvas.getContext('2d');
        if (tCtx) {
          tCtx.beginPath();
          tCtx.moveTo(polyPoints[0].x, polyPoints[0].y);
          for (let i = 1; i < polyPoints.length; i++) {
            tCtx.lineTo(polyPoints[i].x, polyPoints[i].y);
          }
          tCtx.closePath();
          tCtx.fill();
          
          tCtx.globalCompositeOperation = 'source-in';
          tCtx.drawImage(canvas, 0, 0);
          
          const finalCanvas = document.createElement('canvas');
          finalCanvas.width = cropWidth;
          finalCanvas.height = cropHeight;
          const fCtx = finalCanvas.getContext('2d');
          if (fCtx) {
            fCtx.drawImage(tempCanvas, minX, minY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
            return new Promise((resolve) => {
              finalCanvas.toBlob((blob) => resolve(blob), 'image/png', 1);
            });
          }
        }
      } else {
        // mode === 'remove'
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.moveTo(polyPoints[0].x, polyPoints[0].y);
        for (let i = 1; i < polyPoints.length; i++) {
          ctx.lineTo(polyPoints[i].x, polyPoints[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        
        return new Promise((resolve) => {
          canvas.toBlob((blob) => resolve(blob), 'image/png', 1);
        });
      }
    }

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png', 1);
    });
  };

  const handleSaveCrop = async () => {
    if (!activeImage || !imageRef.current) return;
    
    let forceClose = false;
    if (points.length > 0 && isDrawingPoly) {
      if (points.length < 3) {
        toast.error('You need at least 3 points to define a polygon crop.');
        return;
      }
      // Auto-close if user forgot
      forceClose = true;
      setIsDrawingPoly(false);
    }

    if (points.length === 0 && eraserPaths.length === 0) {
      toast.info('No changes to apply.');
      return;
    }

    setIsSaving(true);
    try {
      const blob = await getMaskedImgBlob(imageRef.current, points, eraserPaths, brushSize, forceClose, cropMode);
      if (!blob) throw new Error('Failed to create crop blob. The selected area might be invalid.');

      const result = await saveCustomCrop({ id: activeImage.id, blob }).unwrap();
      
      setImages(prev => prev.map(img => img.id === activeImage.id ? { ...img, processedUrl: result.url } : img));
      toast.success('Crop applied! You can now proceed or edit another image.');
      clearCrop();
    } catch (error: any) {
      console.error('Save crop error:', error);
      toast.error(error.message || 'Failed to save cropped image');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRotate = () => {
    setVisualRotation(prev => (prev + 90) % 360);
  };

  const renderEraserPaths = (paths: {x: number, y: number}[][], isCurrent = false) => {
    return paths.map((path, idx) => {
      if (path.length === 0) return null;
      const d = `M ${path[0].x} ${path[0].y} ` + path.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
      return (
        <path 
          key={isCurrent ? 'current' : idx}
          d={d}
          stroke="black"
          strokeWidth={brushSize}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      );
    });
  };

  return (
    <Card className="w-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-4 border-b shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-muted rounded-full transition-colors">
            <ArrowLeft size={20} />
          </button>
          <CardTitle className="text-xl">Advanced Custom Crop</CardTitle>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onProceed}
            className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium rounded-md transition-colors shadow-sm"
          >
            Proceed to Align
          </button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 flex flex-1 min-h-0">
        {/* Sidebar */}
        <div 
          className={`border-r overflow-y-auto overflow-x-hidden bg-muted/30 shrink-0 transition-all duration-300 relative flex flex-col ${isSidebarOpen ? 'w-48' : 'w-16'}`}
        >
          <div className={`p-3 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'w-48 gap-4' : 'w-16 gap-4 items-center'}`}>
            <h3 className={`text-sm font-semibold text-muted-foreground transition-opacity whitespace-nowrap overflow-hidden ${isSidebarOpen ? 'opacity-100 mb-0' : 'opacity-0 h-0 m-0'}`}>
              Images
            </h3>
            {images.map(img => (
              <div 
                key={img.id}
                onClick={() => setActiveId(img.id)}
                className={`relative flex-shrink-0 cursor-pointer overflow-hidden border-2 transition-all duration-300 ${
                  activeId === img.id ? 'border-primary shadow-md' : 'border-transparent hover:border-muted-foreground/50'
                } ${isSidebarOpen ? 'w-full h-24 rounded-md' : 'w-10 h-10 rounded-full'}`}
                title={!isSidebarOpen ? img.name : undefined}
              >
                <img src={img.processedUrl || img.url} alt={img.name} className="w-full h-full object-contain" />
                {isSidebarOpen && (
                  <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] truncate px-2 py-1">
                    {img.name}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Crop Area */}
        <div className={`flex-1 flex flex-col p-4 relative transition-colors ${isDarkBg ? 'bg-zinc-900' : 'bg-zinc-100'}`}>
          {/* Sidebar Toggle Button */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 p-1.5 bg-background border rounded-full shadow-md text-muted-foreground hover:text-foreground"
          >
            {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
          <div 
            ref={containerRef}
            className="w-full flex items-center justify-center overflow-hidden border border-dashed border-muted-foreground/30 rounded-lg relative bg-transparent flex-1"
            style={{ minHeight: '500px' }}
          >
            {/* Floating Toolbar */}
            <div 
              className="absolute bottom-0 w-[95%] flex flex-wrap items-center justify-between gap-y-2 gap-x-2 bg-background/95 backdrop-blur-sm shadow-[0_-4px_15px_rgba(0,0,0,0.05)] border-t border-border p-2 rounded-b-lg z-50"
              onPointerDown={e => e.stopPropagation()}
              onWheel={e => e.stopPropagation()}
            >
              {/* Left Tools */}
              <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => setIsDarkBg(!isDarkBg)}
                className={`p-2 rounded-md transition-colors tooltip ${isDarkBg ? 'bg-zinc-800 text-zinc-100' : 'hover:bg-muted text-muted-foreground'}`}
                title="Toggle Dark/Light Background Preview"
              >
                <SunMoon size={18} />
              </button>
              <div className="w-px h-6 bg-border mx-1 hidden sm:block" />
              
              {/* Tool Toggles */}
              <div className="flex bg-muted rounded-md p-1">
                <button
                  onClick={() => setActiveTool('pan')}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-sm transition-colors ${activeTool === 'pan' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Move size={16} />
                  Pan
                </button>
                <button
                  onClick={() => setActiveTool('polygon')}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-sm transition-colors ${activeTool === 'polygon' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Pentagon size={16} />
                  Polygon Crop
                </button>
              </div>

              {activeTool === 'polygon' && (
                <>
                  <div className="w-px h-6 bg-border mx-1 hidden sm:block" />
                  <div className="flex bg-muted rounded-md p-1">
                    <button
                      onClick={() => setCropMode('keep')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${cropMode === 'keep' ? 'bg-background shadow-sm text-blue-600' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Keep Inside
                    </button>
                    <button
                      onClick={() => setCropMode('remove')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${cropMode === 'remove' ? 'bg-background shadow-sm text-red-600' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Remove Inside
                    </button>
                  </div>
                </>
              )}

              <div className="w-px h-6 bg-border mx-1 hidden sm:block" />

              {/* Zoom Controls */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => doZoom(1.2)}
                  className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn size={18} />
                </button>
                <button
                  onClick={() => doZoom(1 / 1.2)}
                  className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut size={18} />
                </button>
                <button
                  onClick={() => { setZoom(1); setPan({x: 0, y: 0}); }}
                  className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
                  title="Reset View"
                >
                  <RotateCcw size={18} />
                </button>
                <span className="text-xs text-muted-foreground ml-1 font-mono w-10">{Math.round(zoom * 100)}%</span>
              </div>
            </div>
            
            {/* Right Tools */}
            <div className="flex flex-wrap items-center justify-center gap-2 ml-auto">
              {activeImage?.processedUrl && (
                <button
                  onClick={() => {
                    setImages(prev => prev.map(img => img.id === activeImage.id ? { ...img, processedUrl: undefined } : img));
                    toast.success('Reverted to original image');
                    clearCrop();
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-orange-50 text-orange-600 text-sm font-medium rounded-md transition-colors"
                >
                  <RotateCcw size={16} />
                  Discard
                </button>
              )}
              <button
                onClick={clearCrop}
                disabled={points.length === 0 && eraserPaths.length === 0}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-red-50 text-red-600 text-sm font-medium rounded-md transition-colors disabled:opacity-50"
              >
                <Trash2 size={16} />
                Clear
              </button>
              <button
                onClick={handleRotate}
                className="flex items-center gap-2 px-4 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium rounded-md transition-colors shadow-sm"
              >
                <RotateCw size={16} />
                Rotate 90°
              </button>
              <button
                onClick={handleSaveCrop}
                disabled={isSaving || (points.length === 0 && eraserPaths.length === 0)}
                className="flex items-center gap-2 px-4 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium rounded-md transition-colors disabled:opacity-50 shadow-sm"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save
              </button>
            </div>
            </div>

            {activeImage ? (
              <div 
                className="relative w-full h-full touch-none"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: '0 0',
                  transition: isPanning ? 'none' : 'transform 0.1s ease-out'
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
              >
                <div 
                  className="absolute inset-0 w-full h-full flex items-center justify-center transition-transform duration-300"
                  style={{ transform: `rotate(${visualRotation}deg)` }}
                >
                  <img 
                    ref={imageRef}
                    src={activeImage.processedUrl || activeImage.url} 
                    alt="Editor" 
                    crossOrigin="anonymous"
                    className="absolute inset-0 w-full h-full object-contain shadow-2xl"
                    style={{
                      cursor: activeTool === 'pan' ? (isPanning ? 'grabbing' : 'grab') : activeTool === 'eraser' ? 'crosshair' : 'crosshair',
                      maskImage: (eraserPaths.length > 0 || currentEraserPath) ? 'url(#eraserMask)' : 'none',
                      WebkitMaskImage: (eraserPaths.length > 0 || currentEraserPath) ? 'url(#eraserMask)' : 'none',
                    }}
                    draggable={false}
                  />
                  
                {/* SVG Overlay for Mask Definition & Polygon Drawing */}
                <svg 
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    viewBox={imageRef.current ? `0 0 ${imageRef.current.naturalWidth} ${imageRef.current.naturalHeight}` : '0 0 100 100'}
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <defs>
                      <mask id="eraserMask">
                        {/* Everything white is visible */}
                        <rect width="100%" height="100%" fill="white" />
                        {/* Everything black is transparent */}
                        {renderEraserPaths(eraserPaths)}
                        {currentEraserPath && renderEraserPaths([currentEraserPath], true)}
                      </mask>
                    </defs>

                    {points.length > 0 && (
                      <polygon 
                        points={points.map(p => `${p.x},${p.y}`).join(' ')} 
                        fill={activeTool === 'polygon' ? (cropMode === 'keep' ? "rgba(59, 130, 246, 0.15)" : "rgba(239, 68, 68, 0.15)") : "transparent"} 
                        stroke={cropMode === 'keep' ? "#3b82f6" : "#ef4444"} 
                        strokeWidth={imageRef.current ? Math.max(imageRef.current.naturalWidth * 0.002, 2) : 2}
                        strokeDasharray={isDrawingPoly ? "10,10" : "0"}
                        opacity={activeTool === 'polygon' ? 1 : 0.3}
                      />
                    )}
                    {activeTool === 'polygon' && points.map((p, idx) => (
                      <circle 
                        key={idx} 
                        cx={p.x} 
                        cy={p.y} 
                        r={imageRef.current ? Math.max(imageRef.current.naturalWidth * 0.005, 6) : 6} 
                        fill={idx === 0 && isDrawingPoly ? '#ef4444' : '#ffffff'} 
                        stroke={cropMode === 'keep' ? "#3b82f6" : "#ef4444"}
                        strokeWidth={imageRef.current ? Math.max(imageRef.current.naturalWidth * 0.001, 1) : 1}
                        className="pointer-events-auto cursor-move hover:scale-150 transition-transform origin-center"
                        onPointerDown={(e) => {
                          e.currentTarget.setPointerCapture(e.pointerId);
                          handleNodePointerDown(e, idx);
                        }}
                        onPointerUp={(e) => {
                          try { e.currentTarget.releasePointerCapture(e.pointerId); } catch(err) {}
                          setDraggedPointIndex(null);
                        }}
                      onClick={(e) => {
                        const dist = Math.hypot(e.clientX - dragStateRef.current.startX, e.clientY - dragStateRef.current.startY);
                        if (dist > 5) return;
                        
                        if (idx === 0 && isDrawingPoly) {
                          handleClosePoly(e);
                        }
                      }}
                      style={{ transformBox: 'fill-box' }}
                    />
                  ))}

                  {/* Brush Preview Cursor */}
                  {activeTool === 'eraser' && !currentEraserPath && imageRef.current && (
                    <circle 
                      cx="-1000" cy="-1000" r={brushSize / 2} 
                      fill="rgba(255, 255, 255, 0.5)" 
                      stroke="black" strokeWidth="1"
                      className="eraser-cursor pointer-events-none"
                    />
                  )}
                </svg>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground">Select an image to edit</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
