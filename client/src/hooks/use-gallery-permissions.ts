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

  console.log('[Permissions Debug]', {
    isSignedIn,
    userId: user?.id,
    galleryUserId,
    isOwner,
    currentPath,
    timestamp: new Date().toISOString()
  });

  const requiresAuth = (action: 'comment' | 'star' | 'edit') => {
    // Already authenticated users don't need redirection
    if (isAuthenticated) {
      return { required: false, redirectPath: currentPath };
    }

    // Different handling based on action type
    switch (action) {
      case 'edit':
        // Only owners can edit, and they need to be authenticated
        return { required: true, redirectPath: currentPath };
      case 'comment':
      case 'star':
        // These actions require auth but should trigger modal instead of redirect
        return { required: true, redirectPath: currentPath };
      default:
        return { required: false, redirectPath: currentPath };
    }
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