
import { useCallback, useState, useMemo } from "react";
import { useUser } from "@clerk/clerk-react";
import { useDropzone } from "react-dropzone";
import { Progress } from "@/components/ui/progress";
import { ArrowUpFromLine } from "lucide-react";
import { SignUpModal } from "@/components/SignUpModal";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

interface UploadDropzoneProps {
  onUpload: (files: File[]) => void;
  imageCount?: number;
}

export default function UploadDropzone({ onUpload, imageCount = 0 }: UploadDropzoneProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useUser();
  const { isDark } = useTheme();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (isUploading) return;

    // Prevent empty upload
    if (acceptedFiles.length === 0) {
      toast({
        title: "Invalid Upload",
        description: "No valid image files were selected. Please upload JPG, PNG, GIF, or WEBP.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      acceptedFiles.forEach(file => {
        formData.append('images', file);
      });

      const currentPath = window.location.pathname;
      let gallerySlug = currentPath.split('/').pop();

      if (!gallerySlug || gallerySlug === '') {
        const createRes = await fetch('/api/galleries/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            title: 'Untitled Project',
            userId: user?.id || 'guest'
          })
        });

        if (!createRes.ok) throw new Error('Gallery creation failed');
        const galleryData = await createRes.json();
        gallerySlug = galleryData.slug;
      }

      const controller = new AbortController();
      const signal = controller.signal;

      const response = await fetch(`/api/galleries/${gallerySlug}/images`, {
        method: 'POST',
        body: formData,
        signal,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      console.log("Upload successful:", data);
      
      toast({
        title: "Success",
        description: "Images uploaded successfully!",
      });
      
      queryClient.invalidateQueries({ queryKey: [`/api/galleries/${gallerySlug}`] });

      if (!currentPath.includes('/g/')) {
        setLocation(`/g/${gallerySlug}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: "Failed to upload images. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [isUploading, user, setLocation, toast, onUpload]);

  const isClickDisabled = useMemo(() => imageCount > 0, [imageCount]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    disabled: isUploading,
    noClick: isClickDisabled,
    noKeyboard: false,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
    onDropRejected: (rejectedFiles) => {
      const unsupportedFiles = rejectedFiles.filter(file =>
        !file.file.type.startsWith('image/')
      );

      if (unsupportedFiles.length > 0) {
        toast({
          title: "Invalid File Type",
          description: `Some files were rejected. Only image files (JPG, PNG, GIF, WEBP) are allowed.`,
          variant: "destructive",
        });
      }
    }
  });

  return (
    <>
      <SignUpModal isOpen={showSignUpModal} onClose={() => setShowSignUpModal(false)} />
      <div
        {...getRootProps()}
        className={cn(
          "w-full min-h-[calc(100vh-4rem)] flex items-center justify-center cursor-pointer relative",
          isDark ? "bg-black/90" : "hover:bg-background",
          isUploading && (isDark ? "bg-black/50" : "bg-gray-100")
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center h-full gap-6">
          {isUploading ? (
            <div className="w-[80vw] max-w-xl space-y-4">
              <Progress value={uploadProgress} className="w-full h-2" />
              <p className={cn("text-sm text-center", isDark ? "text-muted-foreground" : "text-muted-foreground")}>
                Uploading... {uploadProgress}%
              </p>
            </div>
          ) : (
            <div className="text-center">
              <div className="flex flex-col items-center">
                <ArrowUpFromLine className={cn("w-16 h-16 mb-4", isDark ? "text-muted-foreground" : "text-muted-foreground")} />
                <p className={cn("text-lg font-medium mb-2", isDark ? "text-foreground" : "text-foreground")}>
                  {isDragActive ? "Drop them!" : "Upload Your Assets"}
                </p>
                <p className={cn("text-sm mb-6", isDark ? "text-muted-foreground" : "text-muted-foreground")}>
                  Drag and drop any image file to start.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
