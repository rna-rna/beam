import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Upload,
  Grid,
  LayoutGrid,
  MessageSquare,
  Star,
  CheckCircle,
  Share,
  PencilRuler,
  Eye,
  EyeOff,
  Lock,
  SquareScissors,
  X,
  MessageSquarePlus,
  Download,
} from "lucide-react";
import { Gallery } from "@/types/gallery";

interface GalleryToolbarProps {
  gallery: Gallery | null;
  userRole: string;
  isMasonry: boolean;
  showStarredOnly: boolean;
  showWithComments: boolean;
  selectMode: boolean;
  selectedImages: number[];
  showAnnotations: boolean;
  isAnnotationMode: boolean;
  isCommentPlacementMode: boolean;
  onToggleGrid: () => void;
  onToggleStarredOnly: () => void;
  onToggleWithComments: () => void;
  onToggleSelectMode: () => void;
  onToggleAnnotations: () => void;
  onToggleAnnotationMode: () => void;
  onToggleCommentPlacement: () => void;
  onUploadClick: () => void;
  onShareClick: () => void;
  onDownloadSelected: () => void;
  onDeleteSelected: () => void;
  onDeselectAll: () => void;
  isAuthenticated: boolean;
}

export const GalleryToolbar: React.FC<GalleryToolbarProps> = ({
  gallery,
  userRole,
  isMasonry,
  showStarredOnly,
  showWithComments,
  selectMode,
  selectedImages,
  showAnnotations,
  isAnnotationMode,
  isCommentPlacementMode,
  onToggleGrid,
  onToggleStarredOnly,
  onToggleWithComments,
  onToggleSelectMode,
  onToggleAnnotations,
  onToggleAnnotationMode,
  onToggleCommentPlacement,
  onUploadClick,
  onShareClick,
  onDownloadSelected,
  onDeleteSelected,
  onDeselectAll,
  isAuthenticated,
}) => {
  const canEdit = userRole === "Editor" || userRole === "Owner";
  const canUpload = canEdit;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <TooltipProvider>
        {/* Upload button */}
        {canUpload && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onUploadClick}
                size="sm"
                variant="outline"
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Upload new images to gallery</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Grid/Masonry toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onToggleGrid}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              {isMasonry ? (
                <>
                  <Grid className="h-4 w-4" />
                  Grid
                </>
              ) : (
                <>
                  <LayoutGrid className="h-4 w-4" />
                  Masonry
                </>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Toggle between grid and masonry layout</p>
          </TooltipContent>
        </Tooltip>

        {/* Filter toggles */}
        <Toggle
          pressed={showStarredOnly}
          onPressedChange={onToggleStarredOnly}
          size="sm"
          aria-label="Toggle starred only"
        >
          <Star className="h-4 w-4" />
        </Toggle>

        <Toggle
          pressed={showWithComments}
          onPressedChange={onToggleWithComments}
          size="sm"
          aria-label="Toggle images with comments"
        >
          <MessageSquare className="h-4 w-4" />
        </Toggle>

        {/* Select mode */}
        {canEdit && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onToggleSelectMode}
                size="sm"
                variant={selectMode ? "default" : "outline"}
                className="gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                {selectMode ? "Cancel" : "Select"}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Select multiple images for bulk actions</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Selection actions */}
        {selectMode && selectedImages.length > 0 && (
          <>
            <Badge variant="secondary" className="ml-2">
              {selectedImages.length} selected
            </Badge>
            
            <Button
              onClick={onDownloadSelected}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>

            {canEdit && (
              <Button
                onClick={onDeleteSelected}
                size="sm"
                variant="destructive"
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Delete
              </Button>
            )}

            <Button
              onClick={onDeselectAll}
              size="sm"
              variant="ghost"
            >
              Deselect All
            </Button>
          </>
        )}

        {/* Annotation controls */}
        <div className="ml-auto flex gap-2">
          <Toggle
            pressed={showAnnotations}
            onPressedChange={onToggleAnnotations}
            size="sm"
            aria-label="Toggle annotations"
          >
            {showAnnotations ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </Toggle>

          {isAuthenticated && (
            <>
              <Toggle
                pressed={isAnnotationMode}
                onPressedChange={onToggleAnnotationMode}
                size="sm"
                aria-label="Toggle annotation mode"
              >
                <PencilRuler className="h-4 w-4" />
              </Toggle>

              <Toggle
                pressed={isCommentPlacementMode}
                onPressedChange={onToggleCommentPlacement}
                size="sm"
                aria-label="Toggle comment placement mode"
              >
                <MessageSquarePlus className="h-4 w-4" />
              </Toggle>
            </>
          )}

          {/* Share button */}
          <Button
            onClick={onShareClick}
            size="sm"
            variant="outline"
            className="gap-2"
          >
            {gallery?.isPublic ? (
              <Share className="h-4 w-4" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
            Share
          </Button>
        </div>
      </TooltipProvider>
    </div>
  );
};