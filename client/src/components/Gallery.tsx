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
import { CommentBubble } from './CommentBubble'; // Import CommentBubble component
import { useRef } from 'react'; // Import useRef hook
import { useQueryClient } from '@tanstack/react-query'; // Assuming you are using react-query

function Gallery({gallery, userRole = 'View', ...props}: any) {
  const { user } = useUser();
  const [myColor, setMyColor] = useState<string>("#ccc");
  const [isCommentPlacementMode, setIsCommentPlacementMode] = useState(false); // State for comment placement mode
  const [newCommentPos, setNewCommentPos] = useState<{ x: number; y: number } | null>(null); // State for new comment position
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false); // State for comment modal
  const containerRef = useRef<HTMLDivElement>(null); // Ref for the container element
  const queryClient = useQueryClient(); // Hook for react-query

  const [draftComment, setDraftComment] = useState<{ x: number; y: number; visible: boolean } | null>(null);
  const [selectedImage, setSelectedImage] = useState(null); // Assuming you have selectedImage state

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

  const handleImageComment = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isCommentPlacementMode) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    setDraftComment({ x, y, visible: true });
    setIsCommentPlacementMode(false);
  };


  return (
    <div className="relative" ref={containerRef}> {/* Added ref to the container */}
      <GalleryActions 
        gallery={gallery} 
        userRole={props.userRole} 
        isDark={props.isDark}
        userColor={myColor}
        setIsCommentPlacementMode={setIsCommentPlacementMode} // Pass function to enable comment placement
      />
      {/* Draft comment */}
      {draftComment?.visible && selectedImage && (
        <CommentBubble
          x={draftComment.x}
          y={draftComment.y}
          isNew={true}
          containerRef={containerRef}
          imageId={Number(selectedImage.id)}
          replies={[]}
          onSubmit={() => {
            setDraftComment(null);
            queryClient.invalidateQueries({ queryKey: ["/api/galleries"] });
          }}
        />
      )}
    </div>
  );
}

export default Gallery;