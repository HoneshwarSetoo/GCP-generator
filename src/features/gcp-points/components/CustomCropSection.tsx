import React, { useState, useRef, useEffect } from 'react';
import { UploadedImage } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '@/features/ui/card';
import { ArrowLeft, Save, Loader2, Eraser, Trash2, SunMoon, Pentagon } from 'lucide-react';
import { useSaveCustomCropMutation } from '@/store/api/gcpApi';
import { toast } from 'sonner';

interface CustomCropSectionProps {
  images: UploadedImage[];
  setImages: React.Dispatch<React.SetStateAction<UploadedImage[]>>;
  onBack: () => void;
  onProceed: () => void;
}

export function CustomCropSection({ images, setImages, onBack, onProceed }: CustomCropSectionProps) {
  const [activeTool, setActiveTool] = useState<'polygon' | 'eraser'>('polygon');
  const [brushSize, setBrushSize] = useState(30);
  const [eraserPaths, setEraserPaths] = useState<{x: number, y: number}[][]>([]);
  const [currentEraserPath, setCurrentEraserPath] = useState<{x: number, y: number}[] | null>(null);
  
  const [activeId, setActiveId] = useState<string>(images[0]?.id || '');
  const [points, setPoints] = useState<{x: number, y: number}[]>([]);
  const [isDrawingPoly, setIsDrawingPoly] = useState(false);
  const [draggedPointIndex, setDraggedPointIndex] = useState<number | null>(null);

  const [isDarkBg, setIsDarkBg] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const imageRef = useRef<HTMLImageElement>(null);
  
  const [saveCustomCrop] = useSaveCustomCropMutation();

  const activeImage = images.find(img => img.id === activeId);

  useEffect(() => {
    setPoints([]);
    setIsDrawingPoly(false);
    setEraserPaths([]);
    setCurrentEraserPath(null);
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
    
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
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
    e.currentTarget.releasePointerCapture(e.pointerId);
    
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
    if (activeTool === 'polygon' && !isDrawingPoly) {
      e.stopPropagation();
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
    bSize: number
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

    // Apply Polygon Mask (Destination In)
    if (polyPoints.length > 0 && !isDrawingPoly) {
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
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(tempCanvas, 0, 0);
      }
    }

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png', 1);
    });
  };

  const handleSaveCrop = async () => {
    if (!activeImage || !imageRef.current) return;
    
    if (points.length > 0 && isDrawingPoly) {
      toast.error('Please close the polygon path first by clicking the red starting point.');
      return;
    }

    if (points.length === 0 && eraserPaths.length === 0) {
      toast.info('No changes to apply.');
      return;
    }

    setIsSaving(true);
    try {
      const blob = await getMaskedImgBlob(imageRef.current, points, eraserPaths, brushSize);
      if (!blob) throw new Error('Failed to create crop blob');

      const result = await saveCustomCrop({ id: activeImage.id, blob }).unwrap();
      
      setImages(prev => prev.map(img => img.id === activeImage.id ? { ...img, processedUrl: result.url } : img));
      toast.success('Crop saved successfully');
      clearCrop();
    } catch (error) {
      console.error('Save crop error:', error);
      toast.error('Failed to save cropped image');
    } finally {
      setIsSaving(false);
    }
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
        <div className="w-64 border-r overflow-y-auto p-4 space-y-4 bg-muted/30 shrink-0">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4">Images</h3>
          {images.map(img => (
            <div 
              key={img.id}
              onClick={() => setActiveId(img.id)}
              className={`relative cursor-pointer rounded-md overflow-hidden border-2 transition-all ${activeId === img.id ? 'border-primary shadow-md' : 'border-transparent hover:border-muted-foreground/50'}`}
            >
              <img src={img.processedUrl || img.url} alt={img.name} className="w-full h-24 object-cover" />
              <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] truncate px-2 py-1">
                {img.name}
              </div>
            </div>
          ))}
        </div>

        {/* Main Crop Area */}
        <div className={`flex-1 flex flex-col p-4 relative transition-colors ${isDarkBg ? 'bg-zinc-900' : 'bg-zinc-100'}`}>
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 mb-4 shrink-0 bg-background p-2 rounded-md shadow-sm border">
            <button
              onClick={() => setIsDarkBg(!isDarkBg)}
              className={`p-2 rounded-md transition-colors tooltip ${isDarkBg ? 'bg-zinc-800 text-zinc-100' : 'hover:bg-muted text-muted-foreground'}`}
              title="Toggle Dark/Light Background Preview"
            >
              <SunMoon size={18} />
            </button>
            <div className="w-px h-6 bg-border mx-1" />
            
            {/* Tool Toggles */}
            <div className="flex bg-muted rounded-md p-1">
              <button
                onClick={() => setActiveTool('polygon')}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-sm transition-colors ${activeTool === 'polygon' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Pentagon size={16} />
                Polygon Crop
              </button>
              <button
                onClick={() => setActiveTool('eraser')}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-sm transition-colors ${activeTool === 'eraser' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Eraser size={16} />
                Brush Eraser
              </button>
            </div>

            {/* Brush Size Slider */}
            {activeTool === 'eraser' && (
              <div className="flex items-center gap-2 px-3 ml-2 border-l border-border">
                <span className="text-xs text-muted-foreground">Size:</span>
                <input 
                  type="range" 
                  min="5" 
                  max="100" 
                  value={brushSize} 
                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                  className="w-24 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                />
              </div>
            )}
            
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={clearCrop}
                disabled={points.length === 0 && eraserPaths.length === 0}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-red-50 text-red-600 text-sm font-medium rounded-md transition-colors disabled:opacity-50"
              >
                <Trash2 size={16} />
                Clear Selection
              </button>
              <button
                onClick={handleSaveCrop}
                disabled={isSaving || (points.length === 0 && eraserPaths.length === 0)}
                className="flex items-center gap-2 px-4 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium rounded-md transition-colors disabled:opacity-50 shadow-sm"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Apply Changes
              </button>
            </div>
          </div>

          <div 
            className="w-full flex items-center justify-center overflow-hidden border border-dashed border-muted-foreground/30 rounded-lg relative bg-transparent p-4"
            style={{ height: '80vh', minHeight: '500px', maxHeight: '90vh' }}
          >
            {activeImage ? (
              <div 
                className="relative w-full h-full"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
              >
                <img 
                  ref={imageRef}
                  src={activeImage.processedUrl || activeImage.url} 
                  alt="Editor" 
                  className="absolute inset-0 w-full h-full object-contain shadow-2xl"
                  style={{
                    cursor: activeTool === 'eraser' ? 'crosshair' : 'default',
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
                      fill={activeTool === 'polygon' ? "rgba(59, 130, 246, 0.15)" : "transparent"} 
                      stroke="#3b82f6" 
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
                      r={imageRef.current ? Math.max(imageRef.current.naturalWidth * 0.006, 6) : 6} 
                      fill={idx === 0 && isDrawingPoly ? '#ef4444' : '#ffffff'} 
                      stroke="#3b82f6"
                      strokeWidth={imageRef.current ? Math.max(imageRef.current.naturalWidth * 0.002, 1) : 1}
                      className="pointer-events-auto cursor-move hover:scale-150 transition-transform origin-center"
                      onPointerDown={(e) => {
                        if (idx === 0 && isDrawingPoly) {
                          handleClosePoly(e);
                        } else {
                          handleNodePointerDown(e, idx);
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
            ) : (
              <div className="text-muted-foreground">Select an image to edit</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
