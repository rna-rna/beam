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

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (!container) return;

      // Match canvas display size to container
      const rect = container.getBoundingClientRect();
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      // Scale canvas for high DPI displays
      const scale = window.devicePixelRatio;
      canvas.width = rect.width * scale;
      canvas.height = rect.height * scale;

      const context = canvas.getContext("2d");
      if (!context) return;

      // Clear and reset context
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.scale(scale, scale);
      context.lineCap = "round";
      context.strokeStyle = "rgba(0, 0, 0, 0.8)";
      context.lineWidth = 2;
      contextRef.current = context;

      // Redraw saved paths
      drawSavedPaths();
    };

    const drawSavedPaths = () => {
      const context = contextRef.current;
      if (!context || !canvas) return;

      context.clearRect(0, 0, canvas.width, canvas.height);
      savedPaths.forEach(({ pathData }) => {
        const path = new Path2D(pathData);
        context.stroke(path);
      });
    };

    // Initial setup
    resizeCanvas();

    // Add resize listener
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas.parentElement as Element);

    return () => {
      resizeObserver.disconnect();
    };
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
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (event.clientX - rect.left) * scaleX / window.devicePixelRatio;
    const y = (event.clientY - rect.top) * scaleY / window.devicePixelRatio;
    
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