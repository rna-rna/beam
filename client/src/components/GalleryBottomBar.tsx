
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Grid, Layout } from "lucide-react";

interface GalleryBottomBarProps {
  totalImages: number;
  hoveredImageName?: string;
  zoom: number;
  onZoomChange: (value: number) => void;
  layoutMode: 'masonry' | 'grid';
  onLayoutModeChange: () => void;
}

export function GalleryBottomBar({
  totalImages,
  hoveredImageName,
  zoom,
  onZoomChange,
  layoutMode,
  onLayoutModeChange
}: GalleryBottomBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 h-[35px] bg-background/80 backdrop-blur-sm border-t flex items-center justify-between px-4 z-50">
      <div className="text-sm text-muted-foreground">
        {hoveredImageName || `${totalImages} images`}
      </div>
      
      <div className="w-48">
        <Slider
          value={[zoom]}
          onValueChange={(values) => onZoomChange(values[0])}
          min={1}
          max={5}
          step={0.1}
          className="w-full"
        />
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onLayoutModeChange}
        className="h-7"
      >
        {layoutMode === 'masonry' ? (
          <Grid className="h-4 w-4" />
        ) : (
          <Layout className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
