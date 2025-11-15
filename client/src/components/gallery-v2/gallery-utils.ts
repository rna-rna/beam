import { Image } from "@/types/gallery";
import { getR2Image } from "@/lib/r2";
import JSZip from "jszip";
import { saveAs } from "file-saver";

/**
 * Calculate breakpoint columns based on scale
 */
export const calculateBreakpointCols = (scale: number) => ({
  default: Math.max(1, Math.floor(6 * (100 / scale))),
  2560: Math.max(1, Math.floor(6 * (100 / scale))),
  1920: Math.max(1, Math.floor(5 * (100 / scale))),
  1536: Math.max(1, Math.floor(4 * (100 / scale))),
  1280: Math.max(1, Math.floor(3 * (100 / scale))),
  768: Math.max(1, Math.floor(2 * (100 / scale))),
  640: 1,
});

/**
 * Preload a range of images around the current index
 */
export const preloadImageRange = (
  images: Image[],
  currentIndex: number,
  range: number,
  quality: "thumb" | "optimized" | "lightbox" = "thumb"
) => {
  if (!images || images.length === 0) return;

  const totalImages = images.length;

  // Calculate range bounds with wrap-around
  for (let offset = -range; offset <= range; offset++) {
    if (offset === 0) continue; // Skip current image

    const targetIndex = (currentIndex + offset + totalImages) % totalImages;
    const targetImage = images[targetIndex];

    if (!targetImage) continue;

    // Preload the image by creating an Image object
    const img = new window.Image();
    img.src = getR2Image(targetImage, quality);
  }
};

/**
 * Download a single image with specified quality
 */
export const downloadSingleImage = async (
  image: Image | null,
  quality: 'original' | 'optimized'
): Promise<void> => {
  if (!image) {
    throw new Error("No image selected for download");
  }

  const imageUrl = quality === 'original'
    ? `https://cdn.beam.ms/uploads/originals/${image.url.split('/').pop()}`
    : `https://w.beam.ms/optimized/${image.url.split('/').pop()}`;

  const response = await fetch(imageUrl);
  const blob = await response.blob();

  const extension = image.url.split('.').pop() || 'jpg';
  const filename = image.originalFilename || `image-${image.id}.${extension}`;
  saveAs(blob, filename);
};

/**
 * Download multiple images as a ZIP file
 */
export const downloadImagesAsZip = async (
  images: Image[],
  title: string,
  quality: 'original' | 'optimized' = 'original',
  onProgress?: (progress: number) => void
) => {
  const zip = new JSZip();
  const folder = zip.folder(title || "gallery");
  
  if (!folder) {
    throw new Error("Failed to create ZIP folder");
  }

  let completed = 0;

  for (const image of images) {
    try {
      const imageUrl = quality === 'original'
        ? `https://cdn.beam.ms/uploads/originals/${image.url.split('/').pop()}`
        : `https://w.beam.ms/optimized/${image.url.split('/').pop()}`;

      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      const extension = image.url.split('.').pop() || 'jpg';
      const filename = image.originalFilename || `image-${image.id}.${extension}`;
      
      folder.file(filename, blob);
      completed++;
      
      if (onProgress) {
        onProgress((completed / images.length) * 100);
      }
    } catch (error) {
      console.error(`Failed to download image ${image.id}:`, error);
    }
  }

  const content = await zip.generateAsync({ type: "blob" });
  saveAs(content, `${title || "gallery"}.zip`);
};

/**
 * Filter images based on various criteria
 */
export const filterGalleryImages = (
  images: any[],
  filters: {
    showStarredOnly?: boolean;
    showWithComments?: boolean;
    selectedStarredUsers?: string[];
  }
) => {
  return images.filter((image: any) => {
    if (!image || !("localUrl" in image ? image.localUrl : image.url)) {
      return false;
    }
    
    // Always show pending uploads
    if ("localUrl" in image) return true;
    
    // Apply filters
    if (filters.showStarredOnly && !image.userStarred) return false;
    if (filters.showWithComments && (!image.commentCount || image.commentCount === 0)) {
      return false;
    }
    if (filters.selectedStarredUsers && filters.selectedStarredUsers.length > 0) {
      return image.stars?.some((star: any) =>
        filters.selectedStarredUsers!.includes(star.userId)
      ) || false;
    }
    
    return true;
  });
};

/**
 * Calculate optimal image dimensions for display
 */
export const calculateImageDimensions = (
  originalWidth: number,
  originalHeight: number,
  containerWidth: number,
  containerHeight: number
): { width: number; height: number } => {
  const aspectRatio = originalWidth / originalHeight;
  const containerAspectRatio = containerWidth / containerHeight;

  let width: number;
  let height: number;

  if (aspectRatio > containerAspectRatio) {
    // Image is wider than container
    width = containerWidth;
    height = containerWidth / aspectRatio;
  } else {
    // Image is taller than container
    height = containerHeight;
    width = containerHeight * aspectRatio;
  }

  return {
    width: Math.round(width),
    height: Math.round(height)
  };
};

/**
 * Get the appropriate image URL based on display context
 */
export const getOptimizedImageUrl = (
  image: Image | null | undefined,
  mode: 'thumb' | 'lightbox' | 'original' = 'thumb'
): string => {
  if (!image || !image.url) return "/fallback-image.jpg";
  
  const filename = image.url.split('/').pop();
  
  switch (mode) {
    case 'thumb':
      return `${import.meta.env.VITE_IMAGE_WORKER}/thumb/${filename}`;
    case 'lightbox':
      return `${import.meta.env.VITE_IMAGE_WORKER}/optimized/${filename}`;
    case 'original':
      return `https://cdn.beam.ms/uploads/originals/${filename}`;
    default:
      return image.url;
  }
};

/**
 * Calculate upload progress for multiple files
 */
export const calculateTotalProgress = (
  progresses: Record<string, number>
): number => {
  const values = Object.values(progresses);
  if (values.length === 0) return 0;
  
  const total = values.reduce((sum, progress) => sum + progress, 0);
  return Math.round(total / values.length);
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Check if an image is still uploading
 */
export const isImageUploading = (image: any): boolean => {
  return "localUrl" in image && image.status === "uploading";
};

/**
 * Check if any images are currently uploading
 */
export const hasActiveUploads = (images: any[]): boolean => {
  return images.some(isImageUploading);
};

/**
 * Sort images by various criteria
 */
export const sortImages = (
  images: Image[],
  sortBy: 'date' | 'name' | 'size' | 'stars' = 'date',
  order: 'asc' | 'desc' = 'desc'
): Image[] => {
  const sorted = [...images].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'name':
        return (a.originalFilename || '').localeCompare(b.originalFilename || '');
      case 'size':
        const sizeA = (a.width || 0) * (a.height || 0);
        const sizeB = (b.width || 0) * (b.height || 0);
        return sizeA - sizeB;
      case 'stars':
        return (a.stars?.length || 0) - (b.stars?.length || 0);
      default:
        return 0;
    }
  });
  
  return order === 'desc' ? sorted.reverse() : sorted;
};