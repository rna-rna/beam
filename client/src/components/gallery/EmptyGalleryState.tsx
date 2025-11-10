import React from 'react';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyGalleryStateProps {
  onUploadClick?: () => void;
  userRole?: string;
  canUpload?: boolean;
  title?: string;
  description?: string;
  className?: string;
}

export function EmptyGalleryState({
  onUploadClick,
  userRole = 'Viewer',
  canUpload = true,
  title = "No images yet",
  description = "Upload some images to get started.",
  className
}: EmptyGalleryStateProps) {
  const showUploadButton = canUpload && (userRole === 'Editor' || userRole === 'Owner');
  
  return (
    <div className={cn("flex flex-col items-center justify-center h-[calc(100vh-8rem)] text-center", className)}>
      <Upload className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
      <h2 className="text-2xl font-semibold tracking-tight mb-2">{title}</h2>
      <p className="text-muted-foreground mb-8">{description}</p>
      
      {showUploadButton && (
        <Button
          onClick={onUploadClick}
          size="lg"
          className="px-8 py-6 h-auto text-lg flex gap-2 items-center"
        >
          <Upload className="w-5 h-5" />
          Upload Images
        </Button>
      )}
    </div>
  );
} 