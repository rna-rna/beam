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
  const scale = window.devicePixelRatio;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Scale canvas for better resolution on high DPI displays
    canvas.width = width * scale;
    canvas.height = height * scale;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.scale(scale, scale);
    context.lineCap = "round";
    context.strokeStyle = "rgba(0, 0, 0, 0.8)";
    context.lineWidth = 2;
    contextRef.current = context;

    // Draw saved paths
    savedPaths.forEach(({ pathData }) => {
      const path = new Path2D(pathData);
      context.stroke(path);
    });
  }, [width, height, scale, savedPaths]);

  const startDrawing = ({ nativeEvent }: React.MouseEvent) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = nativeEvent;
    const scaledX = offsetX * scale;
    const scaledY = offsetY * scale;
    
    setCurrentPath({
      points: [{ x: scaledX, y: scaledY }]
    });
    
    contextRef.current?.beginPath();
    contextRef.current?.moveTo(scaledX, scaledY);
  };

  const draw = ({ nativeEvent }: React.MouseEvent) => {
    if (!isDrawing || !currentPath) return;
    const { offsetX, offsetY } = nativeEvent;
    const scaledX = offsetX * scale;
    const scaledY = offsetY * scale;
    
    setCurrentPath(prev => {
      if (!prev) return null;
      return {
        ...prev,
        points: [...prev.points, { x: scaledX, y: scaledY }]
      };
    });
    
    contextRef.current?.lineTo(scaledX, scaledY);
    contextRef.current?.stroke();
  };

  const stopDrawing = () => {
    if (!currentPath) return;
    
    // Convert points to SVG path data
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
      className={`absolute inset-0 ${className} ${isDrawing ? 'cursor-crosshair' : 'pointer-events-none'}`}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={stopDrawing}
      onMouseLeave={stopDrawing}
    />
  );
}
