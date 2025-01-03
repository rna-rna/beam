
import { useCallback, useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { useDropzone } from "react-dropzone";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

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
      const gallerySlug = currentPath.split('/').pop();

      if (!gallerySlug) {
        throw new Error('No gallery context found');
      }

      const res = await fetch(`/api/galleries/${gallerySlug}/images`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        throw new Error('Upload failed');
      }

      const data = await res.json();
      console.log("Images uploaded to existing gallery:", data);
      onUpload(acceptedFiles);
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
  }, [isUploading, setLocation, toast, onUpload]);

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
