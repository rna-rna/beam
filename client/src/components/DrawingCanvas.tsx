import { useRef, useEffect, useState } from "react";

interface Path {
  id?: number;
  points: { x: number; y: number }[];
}

interface DrawingCanvasProps {
  width: number;
  height: number;
  isDrawing: boolean;
  className?: string;
  onSavePath?: (pathData: string) => void;
  savedPaths?: { id: number; pathData: string }[];
}

export function DrawingCanvas({ 
  width, 
  height, 
  isDrawing, 
  className = "",
  onSavePath,
  savedPaths = []
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [currentPath, setCurrentPath] = useState<Path | null>(null);
  

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set initial dimensions
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    
    // Get the computed size
    const rect = canvas.getBoundingClientRect();
    const scale = window.devicePixelRatio;
    
    // Set canvas dimensions
    canvas.width = rect.width * scale;
    canvas.height = rect.height * scale;

    const context = canvas.getContext("2d");
    if (!context) return;

    // Scale context for high DPI displays
    context.scale(scale, scale);
    context.lineCap = "round";
    context.strokeStyle = "rgba(0, 0, 0, 0.8)";
    context.lineWidth = 2;
    contextRef.current = context;

    // Draw saved paths
    savedPaths.forEach(({ pathData }) => {
      // Convert percentage-based path data back to pixel coordinates
      const pixelPathData = pathData.replace(/([ML])\s*(\d*\.?\d+)\s*(\d*\.?\d+)/g, (_, command, x, y) => {
        const pixelX = (parseFloat(x) / 100) * canvas.width;
        const pixelY = (parseFloat(y) / 100) * canvas.height;
        return `${command} ${pixelX} ${pixelY}`;
      });
      const path = new Path2D(pixelPathData);
      context.stroke(path);
    });
  }, [width, height, savedPaths]);

  const getCanvasPoint = (event: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scale = window.devicePixelRatio;
    
    // Get the actual coordinates relative to the canvas
    const x = (event.clientX - rect.left) * (canvas.width / rect.width);
    const y = (event.clientY - rect.top) * (canvas.height / rect.height);
    return { x, y };
  };

  const startDrawing = (event: React.MouseEvent) => {
    if (!isDrawing) return;
    const { x, y } = getCanvasPoint(event);
    
    setCurrentPath({
      points: [{ x, y }]
    });
    
    contextRef.current?.beginPath();
    contextRef.current?.moveTo(x, y);
  };

  const draw = (event: React.MouseEvent) => {
    if (!isDrawing || !currentPath) return;
    const { x, y } = getCanvasPoint(event);
    
    setCurrentPath(prev => {
      if (!prev) return null;
      return {
        ...prev,
        points: [...prev.points, { x, y }]
      };
    });
    
    contextRef.current?.lineTo(x, y);
    contextRef.current?.stroke();
  };

  const stopDrawing = () => {
    if (!currentPath) return;
    
    // Convert points to SVG path data
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const pathData = currentPath.points.reduce((acc, point, i) => {
      const command = i === 0 ? 'M' : 'L';
      // Convert absolute coordinates to percentages for storage
      const x = (point.x / canvas.width) * 100;
      const y = (point.y / canvas.height) * 100;
      return `${acc} ${command} ${x} ${y}`;
    }, '');
    
    onSavePath?.(pathData);
    setCurrentPath(null);
    contextRef.current?.closePath();
  };

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className} ${isDrawing ? 'cursor-crosshair' : 'pointer-events-none'}`}
      style={{ 
        touchAction: 'none',
        pointerEvents: isDrawing ? 'auto' : 'none'
      }}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={stopDrawing}
      onMouseLeave={stopDrawing}
    />
  );
}