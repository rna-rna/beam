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

  // Motion values for gestures
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);

  // Transform values for animations
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
    const swipeThreshold = window.innerWidth * 0.3; // 30% of screen width for distance-based swipe
    const velocityThreshold = 0.5; // Lower threshold for smoother swipes

    // Determine if we should change image based on velocity or distance
    const shouldChangeImage = 
      Math.abs(velocity) > velocityThreshold || 
      Math.abs(xOffset) > swipeThreshold;

    if (shouldChangeImage) {
      const nextIndex = currentIndex + (xOffset > 0 ? -1 : 1);
      if (nextIndex >= 0 && nextIndex < images.length) {
        setCurrentIndex(nextIndex);
      }
    }

    // Reset motion values with spring animation
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
        <div 
          className="w-full h-full flex overflow-hidden"
          style={{
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <AnimatePresence initial={false} mode="popLayout">
            {images.map((image, index) => {
              // Only render current, previous, and next images for performance
              if (Math.abs(index - currentIndex) > 1) return null;

              const isActive = index === currentIndex;

              return (
                <motion.div
                  key={image.id}
                  className="absolute inset-0 w-full h-full flex items-center justify-center"
                  style={{
                    scrollSnapAlign: 'start',
                    scrollSnapStop: 'always',
                    x: isActive ? dragX : undefined,
                  }}
                  initial={{
                    x: index > currentIndex ? '100%' : '-100%',
                    opacity: 0,
                  }}
                  animate={{
                    x: isActive ? dragX.get() : index > currentIndex ? '100%' : '-100%',
                    opacity: isActive ? 1 : 0.3,
                    transition: {
                      type: "spring",
                      stiffness: 300,
                      damping: 30,
                      opacity: { duration: 0.2 }
                    }
                  }}
                  exit={{
                    x: index > currentIndex ? '100%' : '-100%',
                    opacity: 0,
                    transition: { duration: 0.2 }
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
                        scale: isActive ? 1 : 0.95,
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
        </div>
      </motion.div>
    </motion.div>
  );
}