
import { useCallback, useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { useDropzone } from "react-dropzone";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";

interface UploadDropzoneProps {
  onUpload: (files: File[]) => void;
}

export default function UploadDropzone({ onUpload }: UploadDropzoneProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useUser();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    console.log('UploadDropzone - User:', user);
    console.log('UploadDropzone - isSignedIn:', user?.isSignedIn);
    console.log('UploadDropzone - Disabled:', isUploading || (user && !user.isSignedIn));
  }, [user, isUploading]);

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

      // Create gallery if slug is missing
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

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `/api/galleries/${gallerySlug}/images`);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100;
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
      
      // Navigate to the gallery if newly created
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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    disabled: isUploading,
    noClick: false,
    noKeyboard: false
  });

  return (
    <Card
      {...getRootProps()}
      className="w-full max-w-md p-8 cursor-pointer border-2 border-dashed transition-colors hover:border-primary/50"
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-4">
        <Upload className="w-12 h-12 text-muted-foreground" />
        {isUploading ? (
          <div className="w-full space-y-4">
            <Progress value={uploadProgress} className="w-full" />
            <p className="text-sm text-center text-muted-foreground">
              Uploading... {Math.round(uploadProgress)}%
            </p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-lg font-medium">
              {isDragActive ? "Drop images here" : "Drag & drop images here"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              or click to select files
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
