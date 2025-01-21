import { useState } from 'react';
import { Button, SignedIn, Tooltip, TooltipTrigger, Toggle } from '@/components/ui';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { GalleryRole } from '@/types/gallery';


// ... other imports ...

function Gallery({gallery, ...props}: any) { // Assuming the original props are passed
  const [userRole, setUserRole] = useState<GalleryRole>("View"); // Update: Changed initial state and type
  const [selectMode, setSelectMode] = useState(false);
  const [isCommentPlacementMode, setIsCommentPlacementMode] = useState(false);
  const [isDark, setIsDark] = useState(false);


  const toggleSelectMode = () => {
    setSelectMode(!selectMode);
  };

  // Permission helper functions aligned with server logic
  const canManageGallery = (role: GalleryRole) => role === 'owner' || role === 'Edit';
  const canStar = (role: GalleryRole) => role === 'owner' || role === 'Edit' || role === 'Comment';
  const canComment = (role: GalleryRole) => role === 'owner' || role === 'Edit' || role === 'Comment';


  // ... other states and functions ...

  // ... fetch call to get userRole, example (replace with your actual logic):

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const response = await fetch(`/api/galleries/${gallery.slug}/permissions`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setUserRole(data.role); // Assuming the API response contains a 'role' field
      } catch (error) {
        console.error("Error fetching permissions:", error);
        // Handle error appropriately, maybe set userRole to a default value
      }
    };
    fetchPermissions();
  }, [gallery.slug]);

  return (
    <div>
      {/* ... other UI elements ... */}
      {!selectMode && canStar(userRole) && (
        <motion.div
          className="absolute bottom-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          animate={{ scale: 1 }}
          whileTap={{ scale: 0.8 }}
        >
          <Button
            variant="secondary"
            size="icon"
            className="h-7 w-7 bgbackground/80 hover:bg-background shadow-sm backdrop-blur-sm"
            onClick={(e) => {
              // ... your star button logic ...
            }}
          >
            {/* ...Star icon ... */}
          </Button>
        </motion.div>
      )}

      <SignedIn>
        {canComment(userRole) && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-9 w-9",
              isDark
                ? "text-white hover:bg-white/10"
                : "text-zinc-800 hover:bg-zinc-200",
              isCommentPlacementMode && "bg-primary/20",
            )}
            onClick={(e) => {
              // ... your comment button logic ...
            }}
          >
            {/* ...Comment icon... */}
          </Button>
        )}
      </SignedIn>

      {canManageGallery(userRole) && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              size="sm"
              pressed={selectMode}
              onPressedChange={toggleSelectMode}
            />
          </TooltipTrigger>
        </Tooltip>
      )}

      {/* ... rest of your Gallery component ... */}
    </div>
  );
}

export default Gallery;