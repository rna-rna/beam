import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Image } from "@/types/gallery";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Toolbar } from "./Toolbar";
import { useUser, useAuth } from "@clerk/clerk-react";

interface MobileGalleryViewProps {
  images: Image[];
  initialIndex: number;
  onClose: () => void;
}

export function MobileGalleryView({ images: initialImages, initialIndex, onClose }: MobileGalleryViewProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isDragging, setIsDragging] = useState(false);
  const [images, setImages] = useState(initialImages);
  const startDistanceRef = useRef(0);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useUser();
  const { getToken } = useAuth();

  // Motion values for gestures
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const scaleValue = useMotionValue(1);
  const offsetX = useMotionValue(0);
  const offsetY = useMotionValue(0);

  // Transform values for animations
  const imageOpacity = useTransform(scaleValue, [1, 3], [1, 1], { clamp: true });
  const swipeOpacity = useTransform(dragY, [-400, 0, 400], [1, 1, 0], { clamp: true });
  const dragScale = useTransform(dragY, [0, 400], [1, 0.7]);
  const revealOpacity = useTransform(dragY, [-600, 0, 400], [0.1, 1, 0]);

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
      if ('vibrate' in navigator) {
        navigator.vibrate(30);
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
  };

  const handleComment = () => {
    if (!user) {
      toast({
        title: "Please sign in to comment",
        variant: "destructive",
        duration: 2000
      });
      return;
    }

    const comment = prompt('Add a comment:');
    if (comment) {
      commentMutation.mutate(comment);
    }
  };

  // Comment mutation
  const commentMutation = useMutation({
    mutationFn: async (comment: string) => {
      if (!user) {
        throw new Error('Please sign in to add comments');
      }

      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }

      const response = await fetch(`/api/images/${images[currentIndex].id}/comments`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          content: comment,
          xPosition: 50, 
          yPosition: 50
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add comment');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/galleries'] });
      toast({
        title: "Comment added",
        duration: 2000
      });
    },
    onError: (error: Error) => {
      toast({
        title: error.message || "Failed to add comment",
        variant: "destructive",
        duration: 2000
      });
    }
  });

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

      <Toolbar
        isStarred={images[currentIndex]?.starred ?? false}
        onStarToggle={toggleStarImage}
        onComment={handleComment}
        scaleValue={scaleValue}
      />
    </motion.div>
  );
}