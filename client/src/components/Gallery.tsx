import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { SignedIn, useUser } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { GalleryRole } from '@/types/gallery';
import { PencilRuler } from 'lucide-react'; 
import GalleryActions from './GalleryActions';

function useIntersectionPreload(imageUrl) {
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = new Image();
            img.src = imageUrl;
            img.onload = () => {
              observer.unobserve(ref.current);
            };
          }
        });
      },
      { rootMargin: "200px" }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [imageUrl]);

  return ref;
}


function Gallery({gallery, userRole = 'View', ...props}: any) {
  const { user } = useUser();
  const [myColor, setMyColor] = useState<string>("#ccc");

  useEffect(() => {
    if (!user) return;

    async function fetchMyCachedUser() {
      try {
        const res = await fetch("/api/user/me", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to load cached user data");
        const data = await res.json();
        setMyColor(data.color || "#ccc");
      } catch (err) {
        console.error("Could not load cached user data:", err);
      }
    }

    fetchMyCachedUser();
  }, [user]);

  const renderImage = (image, index) => {
    const preloadRef = useIntersectionPreload(
      "localUrl" in image ? image.localUrl : getR2Image(image, "lightbox")
    );

    return (
      <div
        ref={preloadRef}
        key={image.id === -1 ? `pending-${index}` : image.id}
        className="mb-4 w-full"
        style={{ breakInside: "avoid", position: "relative" }}
      >
      </div>
    );
  };


  return (
    <div className="relative">
      <GalleryActions 
        gallery={gallery} 
        userRole={props.userRole} 
        isDark={props.isDark}
        userColor={myColor}
      />
    </div>
  );
}

export default Gallery;

// Dummy function to simulate getting R2 image URL - replace with your actual implementation
const getR2Image = (image, size) => `/optimized/${image.id}-${size}.jpg`;