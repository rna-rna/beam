
import type { GalleryRole } from '@/types/gallery';

export function canManageGallery(role: GalleryRole): boolean {
  if (!role) return false;
  return role === 'owner' || role === 'Edit';
}

export function canUpload(role: GalleryRole): boolean {
  return canManageGallery(role);
}

export function canStar(role: GalleryRole): boolean {
  return role === 'owner' || role === 'Edit' || role === 'Comment';
}
