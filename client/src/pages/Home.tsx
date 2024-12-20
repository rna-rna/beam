import { useCallback, useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { useLocation } from "wouter";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Upload } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { v4 as uuidv4 } from 'uuid';

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [galleryId, setGalleryId] = useState<string | null>(null);
  const [title, setTitle] = useState("Untitled Project");
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isGalleryCreated, setIsGalleryCreated] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Generate a unique gallery ID and create gallery on mount
  useEffect(() => {
    const initializeGallery = async () => {
      if (!galleryId && !isGalleryCreated) {
        try {
          const newGalleryId = uuidv4();
          const res = await fetch('/api/galleries/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, slug: newGalleryId })
          });

          if (!res.ok) {
            throw new Error('Failed to create gallery');
          }

          const data = await res.json();
          console.log('Created gallery:', data);
          setGalleryId(newGalleryId);
          setIsGalleryCreated(true);
          setTitle(data.title);
        } catch (error) {
          console.error('Gallery creation error:', error);
          toast({
            title: "Error",
            description: "Failed to initialize gallery. Please refresh the page.",
            variant: "destructive"
          });
        }
      }
    };

    initializeGallery();
  }, []);

  // Update gallery title
  const updateTitleMutation = useMutation({
    mutationFn: async (newTitle: string) => {
      if (!galleryId || !isGalleryCreated) {
        throw new Error('Gallery not initialized');
      }

      const res = await fetch(`/api/galleries/${galleryId}/title`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle })
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || 'Failed to update title');
      }

      return res.json();
    },
    onSuccess: (data) => {
      setTitle(data.title);
      toast({
        title: "Success",
        description: "Gallery title updated",
      });
    },
    onError: (error) => {
      console.error('Title update error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update gallery title",
        variant: "destructive"
      });
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      setIsUploading(true);
      setUploadProgress(0);

      const formData = new FormData();
      files.forEach(file => {
        formData.append('images', file);
      });

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100;
            setUploadProgress(progress);
          }
        };

        xhr.open('POST', `/api/galleries/${galleryId}/images`);

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setUploadProgress(100);
            // Keep the progress indicator visible during transition
            setTimeout(() => {
              // Start navigation animation first
              setIsNavigating(true);
              // Short delay to ensure smooth transition
              setTimeout(() => {
                setLocation(`/gallery/${galleryId!}`);
              }, 300);
            }, 500);
            resolve(true);
          } else {
            setIsUploading(false);
            reject(new Error('Upload failed'));
          }
        };

        xhr.onerror = () => {
          setIsUploading(false);
          reject(new Error('Upload failed'));
        };
        xhr.send(formData);
      });
    },
    onError: () => {
      setIsUploading(false);
      setUploadProgress(0);
      toast({
        title: "Error",
        description: "Failed to upload images. Please try again.",
        variant: "destructive"
      });
    }
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    uploadMutation.mutate(acceptedFiles);
  }, [uploadMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    }
  });

  return (
    <Layout
      title={title}
      onTitleChange={(newTitle) => {
        if (isGalleryCreated && newTitle !== title) {
          updateTitleMutation.mutate(newTitle);
        }
      }}
    >
      <div 
        className={`transition-all duration-300 ${isNavigating ? 'opacity-0' : 'opacity-100'}`}
      >
        <div className="h-[calc(100vh-4rem)]">
          <Card
            {...getRootProps()}
            className={`w-full h-full flex flex-col items-center justify-center cursor-pointer border-2 border-dashed transition-colors rounded-none
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
          >
            <input {...getInputProps()} />

            {isUploading ? (
              <div className="w-full max-w-md flex flex-col items-center gap-4 p-8">
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-sm text-muted-foreground">
                  Uploading... {Math.round(uploadProgress)}%
                </p>
              </div>
            ) : (
              <>
                <Upload className="w-16 h-16 text-muted-foreground mb-4" />
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Drop images here
                </h2>
                <p className="text-muted-foreground text-center">
                  or click to select files
                </p>
              </>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  );
}