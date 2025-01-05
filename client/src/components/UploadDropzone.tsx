
import { useCallback, useState, useMemo } from "react";
import { useUser } from "@clerk/clerk-react";
import { useDropzone } from "react-dropzone";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowUpFromLine } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

interface UploadDropzoneProps {
  onUpload: (files: File[]) => void;
  imageCount: number;
}

export default function UploadDropzone({ onUpload, imageCount }: UploadDropzoneProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useUser();
  const { isDark } = useTheme();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (isUploading) return;
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

      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `/api/galleries/${gallerySlug}/images`);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(progress);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const response = JSON.parse(xhr.response);
            console.log("Upload successful:", response);
            toast({
              title: "Success",
              description: "Images uploaded successfully!",
            });
            queryClient.invalidateQueries({ queryKey: [`/api/galleries/${gallerySlug}`] });
            resolve(response);
          } else {
            reject(new Error('Upload failed'));
          }
        };

        xhr.onerror = () => {
          reject(new Error('Network error during upload'));
        };

        xhr.send(formData);
      });

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
  });

  return (
    <Card
      {...getRootProps()}
      className={cn(
        "w-full min-h-[calc(100vh-4rem)] flex items-center justify-center cursor-pointer",
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
          <div className="text-center space-y-4">
            <div className="flex flex-col items-center">
              <ArrowUpFromLine className={cn("w-16 h-16 mb-4", isDark ? "text-muted-foreground" : "text-muted-foreground")} />
              <p className={cn("text-lg font-medium", isDark ? "text-foreground" : "text-foreground")}>
                {isDragActive ? "Drop them!" : "Upload Your Assets"}
              </p>
              <p className={cn("text-sm mt-2", isDark ? "text-muted-foreground" : "text-muted-foreground")}>
                Drag and drop any image file to start.
              </p>
            </div>
            {imageCount === 0 && (
              <div className="mt-6 space-y-4 text-center">
                <p className={cn("text-sm font-medium", isDark ? "text-foreground" : "text-foreground")}>
                  Guest Upload – Limited access.
                </p>
                <div className={cn("text-sm space-y-2", isDark ? "text-muted-foreground" : "text-muted-foreground")}>
                  <p>Create a free account to:</p>
                  <ul className="space-y-1">
                    <li>• Enable comments and feedback</li>
                    <li>• Bulk download files</li>
                    <li>• Share projects</li>
                  </ul>
                  <p className="mt-4 font-medium">Unlock full features – Sign up for free.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
