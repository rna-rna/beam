
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { SignedIn, useUser } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { GalleryRole } from '@/types/gallery';
import { PencilRuler } from 'lucide-react'; 
import GalleryActions from './GalleryActions';

interface GalleryProps {
  gallery: any;
  userRole?: string;
  isDark?: boolean;
  onImageHover?: (name: string | undefined) => void;
  zoom?: number;
  layoutMode?: 'masonry' | 'grid';
}

function Gallery({
  gallery, 
  userRole = 'View',
  onImageHover,
  zoom = 1,
  layoutMode = 'masonry',
  ...props
}: GalleryProps) {
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

  return (
    <div className="relative pb-[35px]">
      <GalleryActions 
        gallery={gallery} 
        userRole={props.userRole} 
        isDark={props.isDark}
        userColor={myColor}
      />
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
        {gallery.images?.map((image: any) => (
          <div
            key={image.id}
            onMouseEnter={() => setHoveredImageName(image.name)}
            onMouseLeave={() => setHoveredImageName(undefined)}
            style={{ transform: `scale(${zoom})` }}
            className="transition-transform duration-200"
          >
            <img
              src={image.url}
              alt={image.name}
              className="w-full h-auto rounded-lg"
            />
          </div>
        ))}
      </div>

      <GalleryBottomBar
        totalImages={gallery.images?.length || 0}
        hoveredImageName={hoveredImageName}
        zoom={zoom}
        onZoomChange={setZoom}
        layoutMode={layoutMode}
        onLayoutModeChange={() => setLayoutMode(mode => mode === 'masonry' ? 'grid' : 'masonry')}
      />
    </div>
  );
}

export default Gallery;
