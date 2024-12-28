import { useAuth, useUser } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";

interface GalleryPermissions {
  canEdit: boolean;
  canComment: boolean;
  canStar: boolean;
  isAuthenticated: boolean;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
}

export function useGalleryPermissions(galleryUserId?: string) {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  
  const isOwner = !!user && !!galleryUserId && user.id === galleryUserId;
  const isAuthenticated = !!isSignedIn;

  return {
    canEdit: isAuthenticated && isOwner,
    canComment: isAuthenticated,
    canStar: isAuthenticated,
    isAuthenticated,
    isOwner,
  };
}
