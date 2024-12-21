// Define the base types for gallery items
export interface Image {
  id: number;
  url: string;
  starred?: boolean;
  commentCount?: number;
  position?: number;
  originalFilename?: string;
}

export interface Gallery {
  id: number;
  slug: string;
  title: string;
  images: Image[];
}

// Custom type for framer-motion variants
export interface SwipeDirection {
  direction: 1 | -1;
  immediate: boolean;
}
