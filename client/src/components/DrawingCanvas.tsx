import { useRef, useEffect } from "react";

interface DrawingCanvasProps {
  width: number;
  height: number;
  isDrawing: boolean;
  className?: string;
}

export function DrawingCanvas({ width, height, isDrawing, className = "" }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Scale canvas for better resolution on high DPI displays
    const scale = window.devicePixelRatio;
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

    // Clear canvas when drawing mode is disabled
    if (!isDrawing) {
      context.clearRect(0, 0, width, height);
    }
  }, [width, height, isDrawing]);

  const startDrawing = ({ nativeEvent }: React.MouseEvent) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = nativeEvent;
    contextRef.current?.beginPath();
    contextRef.current?.moveTo(offsetX, offsetY);
    isDrawingRef.current = true;
  };

  const draw = ({ nativeEvent }: React.MouseEvent) => {
    if (!isDrawing || !isDrawingRef.current) return;
    const { offsetX, offsetY } = nativeEvent;
    contextRef.current?.lineTo(offsetX, offsetY);
    contextRef.current?.stroke();
  };

  const stopDrawing = () => {
    contextRef.current?.closePath();
    isDrawingRef.current = false;
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
