import { useCallback, useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { useLocation } from "wouter";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { InlineEdit } from "@/components/InlineEdit";

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [galleryId, setGalleryId] = useState<string | null>(null);
  const [title, setTitle] = useState("Untitled Project");
  const [uploadState, setUploadState] = useState<{
    totalFiles: number;
    progress: number;
  }>({
    totalFiles: 0,
    progress: 0
  });
  const [isGalleryCreated, setIsGalleryCreated] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    const initializeGallery = async () => {
      if (!galleryId && !isGalleryCreated) {
        try {
          const res = await fetch('/api/galleries/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title })
          });

          if (!res.ok) {
            throw new Error('Failed to create gallery');
          }

          const data = await res.json();
          setGalleryId(data.slug);
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
  }, [galleryId, isGalleryCreated, title, toast]);

  const navigateToGallery = useCallback((slug: string) => {
    setIsNavigating(true);
    setTimeout(() => setLocation(`/gallery/${slug}`), 300);
  }, [setLocation]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0 && galleryId) {
      setUploadState({
        totalFiles: acceptedFiles.length,
        progress: 0
      });

      const formData = new FormData();
      acceptedFiles.forEach(file => {
        formData.append('images', file);
      });

      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          setUploadState(prev => ({
            ...prev,
            progress
          }));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setUploadState(prev => ({
            ...prev,
            progress: 100
          }));
          
          setTimeout(() => {
            if (galleryId) {
              navigateToGallery(galleryId);
            }
          }, 500);
        } else {
          toast({
            title: "Error",
            description: "Failed to upload images. Please try again.",
            variant: "destructive"
          });
        }
      };

      xhr.onerror = () => {
        toast({
          title: "Error",
          description: "Failed to upload images. Please try again.",
          variant: "destructive"
        });
      };

      xhr.open('POST', `/api/galleries/${galleryId}/images`);
      xhr.send(formData);
    }
  }, [galleryId, navigateToGallery, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    }
  });

  return (
    <div className={`min-h-screen w-full bg-background transition-opacity duration-300 ${isNavigating ? 'opacity-0' : 'opacity-100'}`}>
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="px-6 md:px-8 lg:px-12 py-4">
          <InlineEdit
            value={title}
            onSave={(newTitle) => {
              if (isGalleryCreated && newTitle !== title) {
                fetch(`/api/galleries/${galleryId}/title`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ title: newTitle })
                }).then((res) => {
                  if (res.ok) {
                    setTitle(newTitle);
                    toast({
                      title: "Success",
                      description: "Gallery title updated",
                    });
                  }
                }).catch(() => {
                  toast({
                    title: "Error",
                    description: "Failed to update gallery title",
                    variant: "destructive"
                  });
                });
              }
            }}
            className="text-xl font-semibold"
          />
        </div>
      </div>

      <div className="p-4">
        <Card
          {...getRootProps()}
          className={`w-full mx-auto max-w-6xl mb-8 flex flex-col items-center justify-center p-8 cursor-pointer border-2 border-dashed transition-colors
            ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
        >
          <input {...getInputProps()} />
          <Upload className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Drop images here
          </h2>
          <p className="text-muted-foreground text-center">
            or click to select files
          </p>
        </Card>

        {uploadState.totalFiles > 0 && (
          <div className="w-full max-w-6xl mx-auto">
            <div className="mb-8 bg-card rounded-lg p-6 border">
              <div className="flex items-center justify-end mb-4">
                <span className="text-sm text-muted-foreground">
                  {Math.round(uploadState.progress)}% complete
                </span>
              </div>
              <Progress value={uploadState.progress} className="w-full h-2" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
