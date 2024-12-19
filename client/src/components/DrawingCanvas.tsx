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

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio;

      // Set display size (CSS pixels)
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      // Calculate physical pixel dimensions
      const physicalWidth = Math.floor(rect.width * dpr);
      const physicalHeight = Math.floor(rect.height * dpr);

      // Only update if dimensions have changed
      if (canvas.width !== physicalWidth || canvas.height !== physicalHeight) {
        // Set actual size in memory (scaled for retina displays)
        canvas.width = physicalWidth;
        canvas.height = physicalHeight;

        const context = canvas.getContext("2d");
        if (!context) return;

        // Scale all drawing operations by the dpr
        context.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Set drawing style
        context.lineCap = "round";
        context.strokeStyle = "rgba(255, 105, 180, 0.8)"; // Hot pink with some transparency
        context.lineWidth = 3; // Increased line width for better visibility
        contextRef.current = context;

        // Redraw saved paths after resize
        drawSavedPaths();
      }
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
      // Convert percentage coordinates back to canvas coordinates
      const pixelPathData = pathData.replace(/([ML])\s*(\d*\.?\d+)\s*(\d*\.?\d+)/g, (_, command, x, y) => {
        const rect = canvas.getBoundingClientRect();
        const canvasX = (parseFloat(x) / 100) * rect.width;
        const canvasY = (parseFloat(y) / 100) * rect.height;
        return `${command} ${canvasX} ${canvasY}`;
      });
      const path = new Path2D(pixelPathData);
      context.stroke(path);
    });
  }, [savedPaths]);

  const getCanvasPoint = (event: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;
    
    // Convert mouse position to canvas coordinates
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    
    return { x, y };
  };

  const convertToCanvasPoint = (percentX: number, percentY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    // Convert percentage to canvas coordinates
    const x = (percentX / 100) * rect.width;
    const y = (percentY / 100) * rect.height;
    
    return { x, y };
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
      const context = contextRef.current;
      context.lineTo(canvasPoint.x, canvasPoint.y);
      // Clear the current path
      context.stroke();
      // Begin a new path to ensure continuous line visibility
      context.beginPath();
      context.moveTo(canvasPoint.x, canvasPoint.y);
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