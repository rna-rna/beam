import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Image } from "@/types/gallery";
import { Star, MessageCircle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface MobileGalleryViewProps {
  images: Image[];
  initialIndex: number;
  onClose: () => void;
}

export function MobileGalleryView({ images: initialImages, initialIndex, onClose }: MobileGalleryViewProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isDragging, setIsDragging] = useState(false);
  const [toolbarExpanded, setToolbarExpanded] = useState(false);
  const [images, setImages] = useState(initialImages);
  const startDistanceRef = useRef(0);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Motion values for gestures
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const scaleValue = useMotionValue(1);
  const offsetX = useMotionValue(0);
  const offsetY = useMotionValue(0);
  const toolbarY = useMotionValue(0);

  // Transform values for animations
  const imageOpacity = useTransform(scaleValue, [1, 3], [1, 1], { clamp: true });
  const swipeOpacity = useTransform(dragY, [-400, 0, 400], [1, 1, 0], { clamp: true });
  const dragScale = useTransform(dragY, [0, 400], [1, 0.7]);
  const revealOpacity = useTransform(dragY, [-600, 0, 400], [0.1, 1, 0]);
  const toolbarOpacity = useTransform(scaleValue, [1, 2], [1, 0.3], { clamp: true });

  // Star mutation
  const starMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/images/${images[currentIndex].id}/star`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to star image');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/galleries'] });
      toast({
        title: images[currentIndex].starred ? "Removed from favorites" : "Added to favorites",
        duration: 2000
      });
      // Add haptic feedback for mobile
      if ('vibrate' in navigator) {
        navigator.vibrate(30);  // Subtle haptic feedback
      }
    },
    onError: () => {
      toast({
        title: "Failed to update favorite status",
        variant: "destructive",
        duration: 2000
      });
    }
  });

  // Comment mutation
  const commentMutation = useMutation({
    mutationFn: async (comment: string) => {
      const response = await fetch(`/api/images/${images[currentIndex].id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: comment }),
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to add comment');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/galleries'] });
      toast({
        title: "Comment added",
        duration: 2000
      });
    },
    onError: () => {
      toast({
        title: "Failed to add comment",
        variant: "destructive",
        duration: 2000
      });
    }
  });

  // Handle toolbar actions
  const toggleStarImage = () => {
    const isCurrentlyStarred = images[currentIndex].starred;

    // Optimistically update UI
    const updatedImages = [...images];
    updatedImages[currentIndex] = {
      ...updatedImages[currentIndex],
      starred: !isCurrentlyStarred
    };
    setImages(updatedImages);  // Update local state immediately

    // Trigger mutation
    starMutation.mutate(undefined, {
      onError: () => {
        // Revert on error
        const revertedImages = [...images];
        revertedImages[currentIndex] = {
          ...revertedImages[currentIndex],
          starred: isCurrentlyStarred
        };
        setImages(revertedImages);
      }
    });

    // Add haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }
  };

  const handleComment = () => {
    const comment = prompt('Add a comment:');
    if (comment) {
      commentMutation.mutate(comment);
    }
  };

  const clampPan = (value: number, maxDistance: number) => {
    return Math.max(Math.min(value, maxDistance), -maxDistance);
  };

  const handleToolbarDrag = (event: any, info: PanInfo) => {
    const newY = toolbarY.get() + info.delta.y;
    if (newY < -80) {
      setToolbarExpanded(true);
      toolbarY.set(-80);
    } else if (newY > 0) {
      setToolbarExpanded(false);
      toolbarY.set(0);
    } else {
      toolbarY.set(newY);
    }
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

    // If zoomed in, disable snapping to next image
    if (scale > 1) {
      offsetX.set(clampPan(newX, maxX));
      offsetY.set(clampPan(newY, maxY));
      return;
    }

    // Only allow swipe transitions when not zoomed
    const overflowX = Math.abs(newX) - maxX;
    if (overflowX > 150) {
      const nextIndex = currentIndex + (newX < 0 ? 1 : -1);
      const clampedIndex = Math.max(0, Math.min(nextIndex, images.length - 1));

      // Reset zoom and position before switching images
      scaleValue.set(1);
      offsetX.set(0);
      offsetY.set(0);

      setCurrentIndex(clampedIndex);
    } else {
      offsetX.set(clampPan(newX, maxX));
      offsetY.set(clampPan(newY, maxY));
    }
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const xOffset = info.offset.x;
    const yOffset = info.offset.y;
    const velocity = info.velocity.x;
    const scale = scaleValue.get();

    // Handle vertical swipe to close
    if (Math.abs(yOffset) > 150 && Math.abs(xOffset) < 50) {
      onClose();
      return;
    }

    // Prevent image transitions when zoomed
    if (scale > 1) {
      const maxX = (window.innerWidth / 2) * (scale - 1);
      const maxY = (window.innerHeight / 2) * (scale - 1);

      offsetX.set(clampPan(offsetX.get(), maxX));
      offsetY.set(clampPan(offsetY.get(), maxY));
      return;
    }

    const swipeThreshold = window.innerWidth * 0.25;
    const velocityThreshold = 0.25;

    const shouldChangeImage =
      Math.abs(velocity) > velocityThreshold || Math.abs(xOffset) > swipeThreshold;

    if (shouldChangeImage) {
      const nextIndex = currentIndex + (xOffset > 0 ? -1 : 1);
      const clampedIndex = Math.max(0, Math.min(nextIndex, images.length - 1));

      // Reset zoom and position before transition
      scaleValue.set(1);
      offsetX.set(0);
      offsetY.set(0);

      setCurrentIndex(clampedIndex);
    }

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
      style={{ opacity: revealOpacity }}
    >
      <motion.div
        className="absolute inset-0 w-full h-full"
        style={{ opacity: swipeOpacity }}
        drag={scaleValue.get() === 1}
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
                        opacity: imageOpacity,
                      }}
                      drag={scaleValue.get() > 1}
                      dragElastic={0.1}
                      dragMomentum={true}
                      transition={{
                        type: "spring",
                        stiffness: 250,
                        damping: 20,
                      }}
                      onPan={handlePan}
                    />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Compact, centered toolbar */}
      <motion.div
        className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-black/70 backdrop-blur-md rounded-full shadow-lg transition-all duration-200 ${
          toolbarExpanded ? 'h-24' : 'h-12'
        }`}
        style={{
          width: '40%',
          opacity: toolbarOpacity,
          y: toolbarY,
          pointerEvents: scaleValue.get() > 1 ? 'none' : 'auto',
          x: '-50%',
          margin: '0 auto',
        }}
        drag="y"
        dragConstraints={{ top: -80, bottom: 0 }}
        dragElastic={0.2}
        onDrag={handleToolbarDrag}
        onDragEnd={(event, info) => {
          if (info.offset.y < -40) {
            setToolbarExpanded(true);
            toolbarY.set(-80);
          } else {
            setToolbarExpanded(false);
            toolbarY.set(0);
          }
        }}
      >
        {/* Primary toolbar actions */}
        <div className="flex justify-center gap-8 items-center h-12">
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              toggleStarImage();
            }}
            whileTap={{ scale: 0.85 }}
            animate={{ scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 20,
            }}
            style={{ 
              pointerEvents: 'auto',
              touchAction: 'manipulation'
            }}
            className={`transition-colors ${
              images[currentIndex].starred
                ? 'text-yellow-400 hover:text-yellow-300'
                : 'text-white/90 hover:text-white'
            }`}
          >
            <Star 
              className="w-6 h-6"
              fill={images[currentIndex].starred ? "currentColor" : "none"}
            />
          </motion.button>
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              handleComment();
            }}
            whileTap={{ scale: 0.85 }}
            style={{ 
              pointerEvents: 'auto',
              touchAction: 'manipulation'
            }}
            className="text-white/90 hover:text-white transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Expanded toolbar content */}
        {toolbarExpanded && (
          <motion.div
            className="h-12 flex justify-around items-center border-t border-white/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <span className="text-sm text-white/70">Swipe up for more options</span>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}