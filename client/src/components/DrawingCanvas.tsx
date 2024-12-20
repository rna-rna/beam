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
  imageWidth?: number;
  imageHeight?: number;
}

export function DrawingCanvas({ 
  width, 
  height, 
  isDrawing, 
  className = "",
  onSavePath,
  savedPaths = [],
  imageWidth,
  imageHeight
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [currentPath, setCurrentPath] = useState<Path | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (!container) return;

      // Get the image dimensions or container dimensions
      const targetWidth = imageWidth || container.clientWidth;
      const targetHeight = imageHeight || container.clientHeight;

      const dpr = window.devicePixelRatio;

      // Set display size (CSS pixels)
      canvas.style.width = `${targetWidth}px`;
      canvas.style.height = `${targetHeight}px`;

      // Calculate physical pixel dimensions
      const physicalWidth = Math.floor(targetWidth * dpr);
      const physicalHeight = Math.floor(targetHeight * dpr);

      // Update canvas size state
      setCanvasSize({ width: targetWidth, height: targetHeight });

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
      }
    };

    // Initial setup
    resizeCanvas();

    // Add resize listener
    const resizeObserver = new ResizeObserver(resizeCanvas);
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [imageWidth, imageHeight]);

  // Update drawing when savedPaths change
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context || !canvasSize.width || !canvasSize.height) return;

    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all saved paths
    savedPaths.forEach(({ pathData }) => {
      const path = new Path2D();
      const commands = pathData.split(' ');

      for (let i = 0; i < commands.length; i += 3) {
        const cmd = commands[i];
        const x = parseFloat(commands[i + 1]);
        const y = parseFloat(commands[i + 2]);

        // Convert percentage coordinates to canvas coordinates
        const canvasX = (x / 100) * canvasSize.width;
        const canvasY = (y / 100) * canvasSize.height;

        if (cmd === 'M') {
          path.moveTo(canvasX, canvasY);
        } else if (cmd === 'L') {
          path.lineTo(canvasX, canvasY);
        }
      }

      context.stroke(path);
    });
  }, [savedPaths, canvasSize]);

  const getCanvasPoint = (event: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || !canvasSize.width || !canvasSize.height) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();

    // Convert mouse position to percentage coordinates
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    return { x, y };
  };

  const startDrawing = (event: React.MouseEvent) => {
    if (!isDrawing || !contextRef.current) return;

    const { x, y } = getCanvasPoint(event);
    const canvas = canvasRef.current;
    if (!canvas || !canvasSize.width || !canvasSize.height) return;

    // Convert percentage to canvas coordinates for drawing
    const canvasX = (x / 100) * canvasSize.width;
    const canvasY = (y / 100) * canvasSize.height;

    setCurrentPath({
      points: [{ x, y }]
    });

    contextRef.current.beginPath();
    contextRef.current.moveTo(canvasX, canvasY);
  };

  const draw = (event: React.MouseEvent) => {
    if (!isDrawing || !currentPath || !contextRef.current) return;

    const { x, y } = getCanvasPoint(event);
    const canvas = canvasRef.current;
    if (!canvas || !canvasSize.width || !canvasSize.height) return;

    // Convert percentage to canvas coordinates for drawing
    const canvasX = (x / 100) * canvasSize.width;
    const canvasY = (y / 100) * canvasSize.height;

    setCurrentPath(prev => {
      if (!prev) return null;
      return {
        ...prev,
        points: [...prev.points, { x, y }]
      };
    });

    const context = contextRef.current;
    context.lineTo(canvasX, canvasY);
    context.stroke();
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