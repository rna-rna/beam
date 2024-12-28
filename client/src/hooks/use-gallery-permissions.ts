import { useAuth, useUser } from "@clerk/clerk-react";

interface GalleryPermissions {
  canView: boolean;
  canEdit: boolean;
  canComment: boolean;
  canStar: boolean;
  isAuthenticated: boolean;
  isOwner: boolean;
}

export function useGalleryPermissions(galleryUserId?: string) {
  const { isSignedIn } = useAuth();
  const { user } = useUser();

  const isOwner = !!user && !!galleryUserId && user.id === galleryUserId;
  const isAuthenticated = !!isSignedIn;

  return {
    canView: true, // Always allow viewing
    canEdit: isAuthenticated && isOwner,
    canComment: isAuthenticated,
    canStar: isAuthenticated,
    isAuthenticated,
    isOwner,
  };
}