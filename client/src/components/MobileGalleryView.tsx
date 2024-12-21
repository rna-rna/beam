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
  const swipeOpacity = useTransform(dragY, [-400, 0, 400], [1, 1, 0]);
  const dragScale = useTransform(dragY, [0, 400], [1, 0.7]);
  const revealOpacity = useTransform(dragY, [-600, 0, 400], [0.1, 1, 0]);
  const imageOpacity = useTransform(scaleValue, [1, 3], [1, 1], { clamp: true });

  // Utility function to clamp pan values
  const clampPan = (value: number, maxDistance: number) => {
    return Math.max(Math.min(value, maxDistance), -maxDistance);
  };

  useEffect(() => {
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
      dragX.set(0);
      dragY.set(0);
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

    const newX = offsetX.get() + info.delta.x;
    const newY = offsetY.get() + info.delta.y;
    const overflowX = Math.abs(newX) - maxX;

    if (overflowX > 100) {  // Increased threshold for snap
      offsetX.set(newX * 1.2);
      setTimeout(() => {
        const nextIndex = currentIndex + (newX < 0 ? 1 : -1);
        const clampedIndex = Math.max(0, Math.min(nextIndex, images.length - 1));
        setCurrentIndex(clampedIndex);

        // Reset zoom and position when transitioning
        scaleValue.set(1);
        offsetX.set(0);
        offsetY.set(0);
      }, 100);
    } else {
      offsetX.set(clampPan(newX, maxX), {
        type: "spring",
        stiffness: 250,
        damping: 20,
      });
      offsetY.set(clampPan(newY, maxY), {
        type: "spring",
        stiffness: 250,
        damping: 20,
      });
    }
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const xOffset = info.offset.x;
    const yOffset = info.offset.y;
    const velocity = info.velocity.x;

    if (Math.abs(yOffset) > 150 && Math.abs(xOffset) < 50) {
      onClose();
      return;
    }

    if (scaleValue.get() > 1) {
      const scale = scaleValue.get();
      const maxX = (window.innerWidth / 2) * (scale - 1);
      const maxY = (window.innerHeight / 2) * (scale - 1);

      offsetX.set(clampPan(offsetX.get(), maxX), {
        type: "spring",
        stiffness: 220,
        damping: 25
      });
      offsetY.set(clampPan(offsetY.get(), maxY), {
        type: "spring",
        stiffness: 220,
        damping: 25
      });
      return;
    }

    const swipeThreshold = window.innerWidth * 0.3;
    const velocityThreshold = 0.25;

    const shouldChangeImage =
      Math.abs(velocity) > velocityThreshold || Math.abs(xOffset) > swipeThreshold;

    if (shouldChangeImage) {
      const nextIndex = currentIndex + (xOffset > 0 ? -1 : 1);
      const clampedIndex = Math.max(0, Math.min(nextIndex, images.length - 1));
      setCurrentIndex(clampedIndex);

      // Reset zoom and position when changing images
      scaleValue.set(1);
      offsetX.set(0);
      offsetY.set(0);
    }

    dragX.set(0, {
      type: "spring",
      stiffness: 220,
      damping: 25
    });
    dragY.set(0, {
      type: "spring",
      stiffness: 220,
      damping: 25
    });
    setIsDragging(false);
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black touch-none z-50 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ opacity: revealOpacity }}
    >
      <motion.div
        className="absolute inset-0 w-full h-full"
        style={{ opacity: swipeOpacity }}
        drag={scaleValue.get() === 1}
        dragElastic={0.2}
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

              return (
                <motion.div
                  key={image.id}
                  className="absolute inset-0 w-full h-full flex items-center justify-center"
                  style={{
                    zIndex: isActive ? 15 : 10,
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
                      stiffness: 250,
                      damping: 20,
                    },
                  }}
                  exit={{
                    x: index > currentIndex ? '105%' : '-105%',
                    opacity: 1,
                    transition: { duration: 0.15 },
                  }}
                >
                  <div className="relative w-full h-full px-4">
                    <motion.img
                      src={image.url}
                      alt=""
                      className="w-full h-full object-contain select-none"
                      draggable={false}
                      style={{
                        scale: isActive ? (scaleValue.get() > 1 ? scaleValue : dragScale) : 1,
                        x: offsetX,
                        y: offsetY,
                        opacity: isActive ? imageOpacity : 1,
                      }}
                      drag={scaleValue.get() > 1}
                      dragElastic={0.2}
                      dragMomentum={true}  // Enable momentum for smoother panning
                      transition={{
                        type: "spring",
                        stiffness: 250,
                        damping: 20,
                      }}
                      onPan={handlePan}
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