
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
