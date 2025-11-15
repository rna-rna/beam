import React from "react";
import Masonry from "react-masonry-css";
import { motion, AnimatePresence } from "framer-motion";
import { Image as ImageType, ImageOrPending } from "@/types/gallery";
import { filterGalleryImages, calculateBreakpointCols } from "./gallery-utils";

interface GalleryImageGridProps {
  images: ImageOrPending[];
  isMasonry: boolean;
  scale: number;
  showStarredOnly: boolean;
  showWithComments: boolean;
  selectedStarredUsers: string[];
  selectedImages: number[];
  selectMode: boolean;
  onImageClick: (index: number) => void;
  onImageSelect?: (imageId: number) => void;
  renderImage: (image: ImageOrPending, index: number) => React.ReactNode;
  masonryRef?: React.RefObject<any>;
}

export const GalleryImageGrid: React.FC<GalleryImageGridProps> = ({
  images,
  isMasonry,
  scale,
  showStarredOnly,
  showWithComments,
  selectedStarredUsers,
  selectedImages,
  selectMode,
  onImageClick,
  onImageSelect,
  renderImage,
  masonryRef,
}) => {
  const breakpointCols = calculateBreakpointCols(scale);
  
  // Filter images based on current criteria
  const filteredImages = filterGalleryImages(images, {
    showStarredOnly,
    showWithComments,
    selectedStarredUsers,
  });

  return (
    <AnimatePresence mode="wait">
      {isMasonry ? (
        <motion.div
          key="masonry"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Masonry
            ref={masonryRef}
            breakpointCols={breakpointCols}
            className="flex -ml-4 w-[calc(100%+1rem)] masonrygrid gallery-container"
            columnClassName="pl-4 bg-transparent"
          >
            {filteredImages.map((image: any, index: number) =>
              renderImage(image, index)
            )}
          </Masonry>
        </motion.div>
      ) : (
        <motion.div
          key="grid"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="grid gap-4 gallery-container"
          style={{
            gridTemplateColumns: `repeat(${breakpointCols.default}, minmax(0, 1fr))`,
          }}
        >
          {filteredImages.map((image: any, index: number) =>
            renderImage(image, index)
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};