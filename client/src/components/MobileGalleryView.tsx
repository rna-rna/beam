import { useEffect, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Image } from "@/types/gallery";

interface MobileGalleryViewProps {
  images: Image[];
  initialIndex: number;
  onClose: () => void;
}

export function MobileGalleryView({ images, initialIndex, onClose }: MobileGalleryViewProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isDragging, setIsDragging] = useState(false);
  const [direction, setDirection] = useState(0);

  // Motion values for gestures
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);

  // Transform for vertical dismissal
  const dismissProgress = useTransform(dragY, [0, 200], [1, 0.5]);
  const opacity = useTransform(dragY, [0, 200], [1, 0]);
  const scale = useTransform(dragY, [0, 200], [1, 0.9]);

  useEffect(() => {
    // Lock body scroll when gallery is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const xOffset = info.offset.x;
    const yOffset = info.offset.y;
    const velocity = info.velocity.x;

    // Handle vertical dismissal
    if (Math.abs(yOffset) > 100 && Math.abs(xOffset) < 50) {
      onClose();
      return;
    }

    // Constants for swipe behavior
    const swipeThreshold = window.innerWidth * 0.3; // 30% of screen width
    const velocityThreshold = 0.5; // Reduced from 0.7 for smoother feel

    // Calculate swipe direction based on velocity and offset
    const swipeDirection = 
      Math.abs(velocity) > velocityThreshold
        ? velocity > 0 ? -1 : 1
        : Math.abs(xOffset) > swipeThreshold
        ? xOffset > 0 ? -1 : 1
        : 0;

    // Only change index if we're not at the edges
    if (swipeDirection !== 0) {
      const nextIndex = currentIndex + swipeDirection;
      if (nextIndex >= 0 && nextIndex < images.length) {
        setDirection(swipeDirection);
        setCurrentIndex(nextIndex);
      }
    }

    // Reset motion values
    dragX.set(0);
    dragY.set(0);
    setIsDragging(false);
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black touch-none z-50 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="absolute inset-0 w-full h-full"
        style={{ 
          scale,
          opacity 
        }}
        drag
        dragElastic={0.1}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragDirectionLock
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        onDrag={(e, info) => {
          dragX.set(info.offset.x);
          dragY.set(info.offset.y);
        }}
      >
        <AnimatePresence initial={false} mode="popLayout" custom={direction}>
          {images.map((image, index) => {
            // Only render current, previous, and next images
            if (Math.abs(index - currentIndex) > 1) return null;

            const isActive = index === currentIndex;

            return (
              <motion.div
                key={image.id}
                className="absolute inset-0 w-full h-full flex items-center justify-center"
                custom={direction}
                initial={(custom) => ({
                  x: index === currentIndex ? 0 : custom > 0 ? '100%' : '-100%',
                  opacity: 0,
                  zIndex: isActive ? 1 : 0
                })}
                animate={{
                  x: isActive ? dragX.get() : index > currentIndex ? '100%' : '-100%',
                  opacity: isActive ? 1 : 0.3,
                  zIndex: isActive ? 1 : 0,
                  transition: {
                    x: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.2 }
                  }
                }}
                exit={(custom) => ({
                  x: custom > 0 ? '-100%' : '100%',
                  opacity: 0,
                  transition: { duration: 0.2 }
                })}
                style={{
                  x: isActive ? dragX : undefined
                }}
              >
                <div className="relative w-full h-full px-4">
                  <motion.img
                    src={image.url}
                    alt=""
                    className="w-full h-full object-contain select-none"
                    draggable={false}
                    initial={false}
                    animate={{
                      scale: isActive ? 1 : 0.9,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 30
                    }}
                  />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}