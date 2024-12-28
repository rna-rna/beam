import { useAuth, useUser } from "@clerk/clerk-react";

interface GalleryPermissions {
  canView: boolean;
  canEdit: boolean;
  canComment: boolean;
  canStar: boolean;
  isAuthenticated: boolean;
  isOwner: boolean;
  requiresAuth: (action: 'comment' | 'star') => boolean;
  currentPath: string;
}

export function useGalleryPermissions(galleryUserId?: string) {
  const { isSignedIn } = useAuth();
  const { user } = useUser();

  const isOwner = !!user && !!galleryUserId && user.id === galleryUserId;
  const isAuthenticated = !!isSignedIn;
  const currentPath = window.location.pathname;

  const requiresAuth = (action: 'comment' | 'star') => {
    if (isAuthenticated) return false;
    return true;
  };

  return {
    canView: true, // Always allow viewing
    canEdit: isAuthenticated && isOwner,
    canComment: isAuthenticated,
    canStar: isAuthenticated,
    isAuthenticated,
    isOwner,
    requiresAuth,
    currentPath
  };
}