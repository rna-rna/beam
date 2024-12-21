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

  // Horizontal drag for image switching
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);

  // Transform for vertical dismissal
  const dismissProgress = useTransform(dragY, [0, 200], [1, 0.5]);
  const borderRadius = useTransform(dragY, [0, 100], [0, 20]);

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

    // Handle horizontal image switching with velocity and threshold
    const swipeThreshold = window.innerWidth * 0.3; // 30% of screen width
    const velocityThreshold = 0.7;

    if (Math.abs(xOffset) > swipeThreshold || Math.abs(velocity) > velocityThreshold) {
      if ((xOffset > 0 || velocity > velocityThreshold) && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      } else if ((xOffset < 0 || velocity < -velocityThreshold) && currentIndex < images.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    }

    dragX.set(0);
    dragY.set(0);
    setIsDragging(false);
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black touch-none z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full h-full relative"
        style={{ 
          scale: dismissProgress,
          borderRadius
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
        <AnimatePresence initial={false} custom={dragX}>
          {images.map((image, index) => {
            const isActive = index === currentIndex;
            const isPrev = index === currentIndex - 1;
            const isNext = index === currentIndex + 1;

            if (!isActive && !isPrev && !isNext) return null;

            const xOffset = dragX.get();
            const distance = window.innerWidth + 20; // Add gap between images

            return (
              <motion.div
                key={image.id}
                className="absolute inset-0 w-full h-full"
                style={{
                  x: isActive ? dragX : undefined,
                  zIndex: isActive ? 1 : 0
                }}
                initial={{ 
                  x: index > currentIndex ? distance : -distance,
                  opacity: 0 
                }}
                animate={{ 
                  x: isActive ? 0 : index > currentIndex ? distance : -distance,
                  opacity: 1,
                  transition: {
                    x: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.2 }
                  }
                }}
                exit={{ 
                  x: index > currentIndex ? distance : -distance,
                  opacity: 0,
                  transition: { duration: 0.2 }
                }}
                custom={{
                  direction: xOffset < 0 ? 1 : -1,
                  immediate: isDragging
                }}
              >
                <motion.img
                  src={image.url}
                  alt=""
                  className="w-full h-full object-contain select-none"
                  draggable={false}
                  style={{ 
                    pointerEvents: isDragging ? 'none' : 'auto',
                    // Add subtle scale effect during swipe
                    scale: isActive ? 1 : 0.95
                  }}
                  animate={{
                    scale: isActive ? 1 : 0.95,
                    opacity: isActive ? 1 : 0.5,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30
                  }}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}