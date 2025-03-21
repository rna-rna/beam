// Define the base types for gallery items
export interface Image {
  id: number;
  url: string;
  starred?: boolean;
  commentCount?: number;
  approved?: boolean;
  position?: number;
  originalFilename?: string;
  width?: number;
  height?: number;
  createdAt?: string;
}

export interface PendingImage {
  id: string;
  localUrl: string;
  status: 'uploading' | 'finalizing' | 'complete' | 'error';
  progress: number;
  width?: number;
  height?: number;
  file?: File;
}

export type ImageOrPending = Image | PendingImage;

export interface Gallery {
  id: number;
  slug: string;
  title: string;
  images: Image[];
}

export interface Comment {
  id: number;
  content: string;
  xPosition: number;
  yPosition: number;
  author?: string;
  createdAt?: string;
}

export interface Annotation {
  id: number;
  pathData: string;
  createdAt?: string;
}

// Upload related types
export interface UploadProgress {
  [key: string]: number;
}

// Selection related types
export interface SelectionState {
  selectedIds: number[];
  isSelectMode: boolean;
}

// Custom type for framer-motion variants
export interface SwipeDirection {
  direction: 1 | -1;
  immediate: boolean;
}

export type GalleryRole = 'owner' | 'Edit' | 'Comment' | 'View' | null;