import { useAuth, useUser } from "@clerk/clerk-react";

interface GalleryPermissions {
  canView: boolean;
  canEdit: boolean;
  canComment: boolean;
  canStar: boolean;
  isAuthenticated: boolean;
  isOwner: boolean;
  requiresAuth: (action: 'comment' | 'star' | 'edit') => { required: boolean; redirectPath: string };
  currentPath: string;
}

export function useGalleryPermissions(galleryUserId?: string) {
  const { isSignedIn } = useAuth();
  const { user } = useUser();

  const isOwner = !!user && !!galleryUserId && user.id === galleryUserId;
  const isAuthenticated = !!isSignedIn;
  const currentPath = window.location.pathname;

  const requiresAuth = (action: 'comment' | 'star' | 'edit') => {
    // Already authenticated users don't need redirection
    if (isAuthenticated) {
      return { required: false, redirectPath: currentPath };
    }

    // Store current path for post-login redirect
    return { 
      required: true, 
      redirectPath: currentPath
    };
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