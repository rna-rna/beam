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
  }, [width, height]);

  // Update drawing when savedPaths change
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all saved paths
    savedPaths.forEach(({ pathData }) => {
      const path = new Path2D(pathData);
      context.stroke(path);
    });
  }, [savedPaths]);

  const getCanvasPoint = (event: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    
    return { x, y };
  };

  const convertToCanvasPoint = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const canvasX = (x / 100) * rect.width;
    const canvasY = (y / 100) * rect.height;
    
    return { x: canvasX, y: canvasY };
  };

  const startDrawing = (event: React.MouseEvent) => {
    if (!isDrawing) return;
    const { x, y } = getCanvasPoint(event);
    const canvasPoint = convertToCanvasPoint(x, y);
    
    setCurrentPath({
      points: [{ x, y }]
    });
    
    if (contextRef.current) {
      contextRef.current.beginPath();
      contextRef.current.moveTo(canvasPoint.x, canvasPoint.y);
    }
  };

  const draw = (event: React.MouseEvent) => {
    if (!isDrawing || !currentPath) return;
    const { x, y } = getCanvasPoint(event);
    const canvasPoint = convertToCanvasPoint(x, y);
    
    setCurrentPath(prev => {
      if (!prev) return null;
      return {
        ...prev,
        points: [...prev.points, { x, y }]
      };
    });
    
    if (contextRef.current) {
      contextRef.current.lineTo(canvasPoint.x, canvasPoint.y);
      contextRef.current.stroke();
    }
  };

  const stopDrawing = () => {
    if (!currentPath) return;
    
    const pathData = currentPath.points.reduce((acc, point, i) => {
      const command = i === 0 ? 'M' : 'L';
      return `${acc} ${command} ${point.x} ${point.y}`;
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