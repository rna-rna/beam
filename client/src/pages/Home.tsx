import { useCallback, useState, useEffect } from "react";
import Masonry from "react-masonry-css";
import { useDropzone } from "react-dropzone";
import { useLocation } from "wouter";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Upload } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { InlineEdit } from "@/components/InlineEdit";
import { v4 as uuidv4 } from 'uuid'; // Import uuid library

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [galleryId, setGalleryId] = useState<string | null>(null);
  const [title, setTitle] = useState("Untitled Project");
  const [uploadState, setUploadState] = useState<{
    totalFiles: number;
    uploadedFiles: number;
    progress: number;
  }>({
    totalFiles: 0,
    uploadedFiles: 0,
    progress: 0
  });
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  // Flag to track if gallery has been created
  const [isGalleryCreated, setIsGalleryCreated] = useState(false);

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
          setTitle(data.title); // Set initial title from server response
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
  }, []); // Empty dependency array since this should only run once on mount


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

  // Remove the automatic title update effect as we'll only update when the user explicitly changes the title


  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      // Create preview URLs
      const previews: Record<string, string> = {};
      files.forEach(file => {
        previews[file.name] = URL.createObjectURL(file);
      });
      setPreviewUrls(previews);

      const formData = new FormData();
      files.forEach(file => {
        formData.append('images', file);
      });

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Initialize upload state with total number of files
        setUploadState({
          totalFiles: files.length,
          uploadedFiles: 0,
          progress: 0
        });

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100;
            setUploadState(prev => ({
              ...prev,
              progress
            }));
          }
        };

        xhr.open('POST', `/api/galleries/${galleryId}/images`);
        
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setUploadState(prev => ({
              ...prev,
              uploadedFiles: prev.totalFiles,
              progress: 100
            }));
            
            // Clean up preview URLs
            Object.values(previewUrls).forEach(URL.revokeObjectURL);
            
            // Short delay before navigation to show completion
            setTimeout(() => {
              navigateToGallery(galleryId);
            }, 500);
            
            resolve(true);
          } else {
            reject(new Error('Upload failed'));
          }
        };

        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.send(formData);
      });
    },
    onError: () => {
      // Cleanup preview URLs
      Object.values(previewUrls).forEach(URL.revokeObjectURL);
      toast({
        title: "Error",
        description: "Failed to upload images. Please try again.",
        variant: "destructive"
      });
    }
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    uploadMutation.mutate(acceptedFiles);
  }, [uploadMutation, galleryId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    }
  });

  // Track if we're transitioning away
  const [isNavigating, setIsNavigating] = useState(false);

  // Wrap setLocation to include transition
  const navigateToGallery = useCallback((galleryId: string) => {
    setIsNavigating(true);
    // Small delay to allow fade out animation
    setTimeout(() => setLocation(`/gallery/${galleryId}`), 300);
  }, [setLocation]);

  return (
    <div className={`min-h-screen w-full bg-background transition-opacity duration-300 ${isNavigating ? 'opacity-0' : 'opacity-100'}`}>
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="px-6 md:px-8 lg:px-12 py-4">
          <InlineEdit
            value={title}
            onSave={(newTitle) => {
              if (isGalleryCreated && newTitle !== title) {
                updateTitleMutation.mutate(newTitle);
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

        {Object.keys(previewUrls).length > 0 && (
          <div className="w-full max-w-6xl mx-auto">
            {uploadState.totalFiles > 0 && (
              <div className="mb-8 bg-card rounded-lg p-6 border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">
                    Uploading {uploadState.uploadedFiles} of {uploadState.totalFiles} images
                  </h3>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(uploadState.progress)}% complete
                  </span>
                </div>
                <Progress value={uploadState.progress} className="w-full h-2" />
              </div>
            )}
            <Masonry
              breakpointCols={{
                default: 6,
                2560: 5,
                1920: 4,
                1536: 3,
                1024: 2,
                640: 1
              }}
              className="flex -ml-4 w-[calc(100%+1rem)]"
              columnClassName="pl-4 bg-background"
            >
              {Object.entries(previewUrls).map(([fileName, url]) => (
                <div key={fileName} className="mb-4 cursor-pointer transition-transform hover:scale-[1.02]">
                  <div className="relative bg-card rounded-lg overflow-hidden border border-border/50">
                    <img
                      src={url}
                      alt=""
                      className="w-full h-auto object-contain rounded-md"
                      loading="lazy"
                    />
                    {/* Images are shown without individual progress indicators */}
                  </div>
                </div>
              ))}
            </Masonry>
          </div>
        )}
      </div>
    </div>
  );
}