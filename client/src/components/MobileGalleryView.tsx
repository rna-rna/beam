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
  const scale = useTransform(dragY, [0, 200], [1, 0.95]);

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

    // Close if vertical swipe exceeds threshold
    if (Math.abs(yOffset) > 120 && Math.abs(xOffset) < 60) {
      onClose();
      return;
    }

    const swipeThreshold = window.innerWidth * 0.45;
    const velocityThreshold = 0.3;

    const shouldChangeImage =
      Math.abs(velocity) > velocityThreshold || Math.abs(xOffset) > swipeThreshold;

    if (shouldChangeImage) {
      const nextIndex = currentIndex + (xOffset > 0 ? -1 : 1);
      const clampedIndex = Math.max(0, Math.min(nextIndex, images.length - 1));
      setCurrentIndex(clampedIndex);
    } 

    // Smooth return if swipe doesn't meet threshold
    dragX.set(0, { type: "spring", stiffness: 150, damping: 20 });
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
        <div className="w-full h-full flex items-center justify-center">
          <AnimatePresence initial={false} mode="popLayout">
            {images.map((image, index) => {
              if (Math.abs(index - currentIndex) > 1) return null;

              const isActive = index === currentIndex;
              const zIndex = isActive ? 10 : 5;

              return (
                <motion.div
                  key={image.id}
                  className="absolute inset-0 w-full h-full flex items-center justify-center"
                  style={{
                    zIndex,
                    scrollSnapAlign: 'start',
                    scrollSnapStop: 'always',
                    pointerEvents: isActive ? 'auto' : 'none',
                  }}
                  initial={{
                    x: index > currentIndex ? '100%' : '-100%',
                    opacity: 1,
                    scale: 0.98,
                  }}
                  animate={{
                    x: isActive ? dragX.get() : index > currentIndex ? '100%' : '-100%',
                    opacity: isActive ? 1 : 0.85,  // Keep non-active images more visible
                    scale: isActive ? 1 : 0.98,
                    filter: isActive ? 'blur(0px)' : 'blur(2px)',  // Subtle blur for non-active
                    transition: {
                      type: "spring",
                      stiffness: 150,
                      damping: 20,
                      opacity: { duration: 0.2 }
                    }
                  }}
                  exit={{
                    x: index > currentIndex ? '100%' : '-100%',
                    opacity: 0.8,  // Keep high visibility during exit
                    scale: 0.98,
                    filter: 'blur(4px)',  // Blur effect on exit
                    transition: { duration: 0.15 }
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
                        scale: isActive ? 1 : 0.98,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 150,
                        damping: 20,
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