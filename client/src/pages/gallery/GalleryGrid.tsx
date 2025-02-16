import React from "react";
import Masonry from "react-masonry-css";
import ImageCard from "./ImageCard";

interface GalleryGridProps {
  images: any[];
  onImageClick: (index: number) => void;
  isMasonry: boolean;
  selectMode: boolean;
  selectedImages: number[];
  onImageSelect: (imageId: number, event?: React.MouseEvent) => void;
  toggleStar: (imageId: number, isStarred: boolean) => void;
}

export default function GalleryGrid({
  images,
  onImageClick,
  isMasonry,
  selectMode,
  selectedImages,
  onImageSelect,
  toggleStar,
}: GalleryGridProps) {
  const breakpointCols = {
    default: 4,
    1024: 3,
    768: 2,
    480: 1,
  };

  return (
    <>
      {isMasonry ? (
        <Masonry
          breakpointCols={breakpointCols}
          className="flex -ml-4 w-auto"
          columnClassName="pl-4"
        >
          {images.map((image, index) => (
            <ImageCard
              key={image.id ? image.id : `pending-${index}`}
              image={image}
              index={index}
              onClick={() => onImageClick(index)}
              selectMode={selectMode}
              isSelected={selectedImages.includes(image.id)}
              onSelect={onImageSelect}
              toggleStar={toggleStar}
            />
          ))}
        </Masonry>
      ) : (
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: `repeat(${breakpointCols.default}, minmax(0, 1fr))`,
          }}
        >
          {images.map((image, index) => (
            <ImageCard
              key={image.id ? image.id : `pending-${index}`}
              image={image}
              index={index}
              onClick={() => onImageClick(index)}
              selectMode={selectMode}
              isSelected={selectedImages.includes(image.id)}
              onSelect={onImageSelect}
              toggleStar={toggleStar}
            />
          ))}
        </div>
      )}
    </>
  );
}
