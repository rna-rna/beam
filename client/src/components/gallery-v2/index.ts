/**
 * Gallery V2 Components
 * 
 * This is the refactored version of the Gallery component, split into
 * smaller, more maintainable pieces. The original Gallery.tsx remains
 * completely untouched as a safety backup.
 */

export { GalleryImageGrid } from './GalleryImageGrid';
export { GalleryToolbar } from './GalleryToolbar';
export { GalleryUploader, useGalleryDropzone } from './GalleryUploader';
export { GalleryCommentSystem, useCommentPositioning } from './GalleryCommentSystem';
export { GalleryRealtime, useRealtimeStatus } from './GalleryRealtime';

export * from './gallery-utils';