import { useEffect, useState, useRef } from "react";
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
  const startDistanceRef = useRef(0);

  // Motion values for gestures
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const scaleValue = useMotionValue(1);
  const offsetX = useMotionValue(0);
  const offsetY = useMotionValue(0);

  // Transform values for animations
  const opacity = useTransform(dragY, [0, 200], [1, 0]);
  const scale = useTransform(dragY, [0, 200], [1, 0.95]);

  // Utility function to clamp pan values
  const clampPan = (value: number, maxDistance: number) => {
    return Math.max(Math.min(value, maxDistance), -maxDistance);
  };

  useEffect(() => {
    // Lock body scroll when gallery is open
    document.body.style.overflow = 'hidden';
    let startDistance = 0;

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        const dx = event.touches[0].pageX - event.touches[1].pageX;
        const dy = event.touches[0].pageY - event.touches[1].pageY;
        startDistance = Math.sqrt(dx * dx + dy * dy);
        startDistanceRef.current = startDistance;
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        event.preventDefault();
        const dx = event.touches[0].pageX - event.touches[1].pageX;
        const dy = event.touches[0].pageY - event.touches[1].pageY;
        const newDistance = Math.sqrt(dx * dx + dy * dy);

        if (startDistanceRef.current > 0) {
          const scaleFactor = Math.min(Math.max(newDistance / startDistanceRef.current, 1), 3);
          scaleValue.set(scaleFactor);
        }
      }
    };

    const resetZoom = () => {
      scaleValue.set(1);
      offsetX.set(0);
      offsetY.set(0);
    };

    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('dblclick', resetZoom);

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('dblclick', resetZoom);
    };
  }, []);

  const handlePan = (event: any, info: PanInfo) => {
    const scale = scaleValue.get();
    const maxX = (window.innerWidth / 2) * (scale - 1);
    const maxY = (window.innerHeight / 2) * (scale - 1);

    const newX = clampPan(offsetX.get() + info.delta.x, maxX);
    const newY = clampPan(offsetY.get() + info.delta.y, maxY);

    offsetX.set(newX);
    offsetY.set(newY);
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const xOffset = info.offset.x;
    const yOffset = info.offset.y;
    const velocity = info.velocity.x;

    // Only process horizontal swipes when not zoomed
    if (scaleValue.get() > 1) {
      // Check if we need to bounce back from edges
      const scale = scaleValue.get();
      const maxX = (window.innerWidth / 2) * (scale - 1);
      const maxY = (window.innerHeight / 2) * (scale - 1);

      offsetX.set(clampPan(offsetX.get(), maxX));
      offsetY.set(clampPan(offsetY.get(), maxY));
      return;
    }

    // Close if vertical swipe exceeds threshold
    if (Math.abs(yOffset) > 120 && Math.abs(xOffset) < 60) {
      onClose();
      return;
    }

    const swipeThreshold = window.innerWidth * 0.3;  // Lower threshold for quicker triggers
    const velocityThreshold = 0.2;  // Lower velocity threshold for faster reaction

    const shouldChangeImage =
      Math.abs(velocity) > velocityThreshold || Math.abs(xOffset) > swipeThreshold;

    if (shouldChangeImage) {
      const nextIndex = currentIndex + (xOffset > 0 ? -1 : 1);
      const clampedIndex = Math.max(0, Math.min(nextIndex, images.length - 1));
      setCurrentIndex(clampedIndex);
    }

    // Smooth return if swipe doesn't meet threshold
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
        drag={scaleValue.get() === 1}  // Lock gallery drag when zoomed
        dragElastic={0.1}  // Reduced for more precise control
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
              const zIndex = isActive ? 15 : 10;  // Ensure proper layering

              return (
                <motion.div
                  key={image.id}
                  className="absolute inset-0 w-full h-full flex items-center justify-center"
                  style={{
                    zIndex,
                    pointerEvents: isActive ? 'auto' : 'none',
                  }}
                  initial={{
                    x: index > currentIndex ? '100%' : '-100%',
                    opacity: 1,
                  }}
                  animate={{
                    x: isActive ? dragX.get() : index > currentIndex ? '100%' : '-100%',
                    opacity: 1,
                    transition: {
                      type: "spring",
                      stiffness: 300,
                      damping: 20,
                    },
                  }}
                  exit={{
                    x: index > currentIndex ? '105%' : '-105%',
                    opacity: 1,
                    transition: { duration: 0.12 },
                  }}
                >
                  <div className="relative w-full h-full px-4">
                    <motion.img
                      src={image.url}
                      alt=""
                      className="w-full h-full object-contain select-none"
                      draggable={false}
                      style={{
                        scale: scaleValue,
                        x: offsetX,
                        y: offsetY,
                      }}
                      drag={scaleValue.get() > 1}  // Only allow drag on zoom
                      dragElastic={0.2}
                      dragMomentum={false}
                      transition={{
                        type: "spring",
                        stiffness: 250,
                        damping: 20,
                        mass: 0.4
                      }}
                      onPan={(event, info) => {
                        const scale = scaleValue.get();
                        const maxX = (window.innerWidth / 2) * (scale - 1);
                        const maxY = (window.innerHeight / 2) * (scale - 1);

                        const newX = clampPan(offsetX.get() + info.delta.x, maxX);
                        const newY = clampPan(offsetY.get() + info.delta.y, maxY);

                        offsetX.set(newX);
                        offsetY.set(newY);
                      }}
                      onWheel={(event) => {
                        if (isActive) {
                          const deltaScale = event.deltaY * -0.001;
                          scaleValue.set(Math.min(Math.max(scaleValue.get() + deltaScale, 1), 3));
                        }
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