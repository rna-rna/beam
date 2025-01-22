import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { SignedIn } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { GalleryRole } from '@/types/gallery';
import { PencilRuler } from 'lucide-react'; 
import GalleryActions from './GalleryActions';

function Gallery({gallery, userRole = 'View', ...props}: any) {
  return (
    <div className="relative">
      <GalleryActions 
        gallery={gallery} 
        userRole={props.userRole} 
        isDark={props.isDark}
      />
    </div>
  );
}

export default Gallery;