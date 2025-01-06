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
  const [uploadProgress, setUploadProgress] = useState({}); // Changed to object for per-file progress
  const [isDragging, setIsDragging] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);

  const uploadLargeFile = async (file: File) => {
    const CHUNK_SIZE = 6 * 1024 * 1024;  // 6MB per chunk
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    let offset = 0;

    for (let i = 0; i < totalChunks; i++) {
      const chunk = file.slice(offset, offset + CHUNK_SIZE);
      const formData = new FormData();
      formData.append('chunk', chunk);
      formData.append('chunkIndex', i.toString());
      formData.append('totalChunks', totalChunks.toString());
      formData.append('filename', file.name);

      try {
        const res = await fetch('/api/upload/chunk', {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) {
          throw new Error('Chunk upload failed');
        }
        
        // Update progress for this file
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: Math.round(((i + 1) / totalChunks) * 100)
        }));
      } catch (error) {
        throw new Error(`Failed to upload chunk ${i + 1} of ${totalChunks}: ${error.message}`);
      }

      offset += CHUNK_SIZE;
    }
  };

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
    setUploadProgress({}); // Clear progress on new upload

    try {
      for (const file of acceptedFiles) {
        if (file.size > 10 * 1024 * 1024) { // For files larger than 10MB
          await uploadLargeFile(file);
        } else {
          // Regular upload for smaller files
          const formData = new FormData();
          formData.append('file', file);
          // Update progress immediately for small files
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: 0
          }));
          await fetch('/api/galleries/create', {
            method: 'POST',
            body: formData
          });
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: 100
          }));
        }
      }

      toast({
        title: "Success",
        description: "Files uploaded successfully",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload files",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      setUploadProgress({});
    }

    const CHUNK_SIZE = 6 * 1024 * 1024; // 6MB chunks

    const uploadChunks = async (file: File) => {
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      let offset = 0;

      for (let i = 0; i < totalChunks; i++) {
        const chunk = file.slice(offset, offset + CHUNK_SIZE);
        const formData = new FormData();
        formData.append('chunk', chunk);
        formData.append('chunkIndex', i.toString());
        formData.append('totalChunks', totalChunks.toString());
        formData.append('filename', file.name);

        try {
          const uploadRes = await fetch(`/api/upload/chunk`, {
            method: 'POST',
            body: formData
          });

          if (!uploadRes.ok) {
            throw new Error(`Chunk upload failed: ${uploadRes.statusText}`);
          }

          // Update progress based on chunks
          const progress = Math.round(((i + 1) / totalChunks) * 100);
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: progress
          }));
        } catch (error) {
          console.error(`Failed to upload chunk ${i + 1}/${totalChunks}:`, error);
          throw error;
        }

        offset += CHUNK_SIZE;
      }
    };

    try {
      for (const file of acceptedFiles) {
        await uploadChunks(file);
      }
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
      setUploadProgress({});
    }
  }, [isUploading, user, setLocation, toast, onUpload]);

  const isClickDisabled = useMemo(() => imageCount > 0, [imageCount]);

  const handleLargeFileUpload = async (acceptedFiles: File[]) => {
    if (isUploading) return;

    setIsUploading(true);
    setUploadProgress({}); // Clear progress on new upload

    try {
      for (const file of acceptedFiles) {
        if (file.size > 10 * 1024 * 1024) { // For files larger than 10MB
          await uploadLargeFile(file);
        } else {
          // Regular upload for smaller files
          onUpload([file]);
        }
      }
      toast({
        title: "Success",
        description: "Files uploaded successfully",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload files",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      setUploadProgress({});
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleLargeFileUpload,
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
              <Progress value={uploadProgress} className="w-full h-2" /> {/* Progress bar now handles object */}
              <p className={cn("text-sm text-center", isDark ? "text-muted-foreground" : "text-muted-foreground")}>
                Uploading...
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