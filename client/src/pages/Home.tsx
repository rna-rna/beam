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
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  // Flag to track if gallery has been created
  const [isGalleryCreated, setIsGalleryCreated] = useState(false);

  // Generate a unique gallery ID and create gallery on mount
  useEffect(() => {
    if (!galleryId && !isGalleryCreated) {
      const newGalleryId = uuidv4();
      setGalleryId(newGalleryId);
      
      const createGallery = async () => {
        try {
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
          setIsGalleryCreated(true);
        } catch (error) {
          console.error('Gallery creation error:', error);
          toast({
            title: "Error",
            description: "Failed to initialize gallery. Please refresh the page.",
            variant: "destructive"
          });
        }
      };

      createGallery();
    }
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

  useEffect(() => {
    if (galleryId && title !== "Untitled Project") {
      updateTitleMutation.mutate(title);
    }
  }, [galleryId, title, updateTitleMutation, isGalleryCreated]);


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

      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          setUploadProgress((prev: Record<string, number>) => ({
            ...prev,
            ...Object.fromEntries(files.map(file => [file.name, progress]))
          }));
        }
      };

      return new Promise((resolve, reject) => {
        xhr.open('POST', `/api/galleries/${galleryId}/images`);
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(true);
          } else {
            reject(new Error('Upload failed'));
          }
        };

        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.send(formData);
      });
    },
    onSuccess: () => {
      // Cleanup preview URLs
      Object.values(previewUrls).forEach(URL.revokeObjectURL);
      setLocation(`/gallery/${galleryId}`);
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

  return (
    <div className="min-h-screen w-full bg-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="px-6 md:px-8 lg:px-12 py-4">
          <InlineEdit
            value={title}
            onSave={(newTitle) => updateTitleMutation.mutate(newTitle)}
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
            <Masonry
              breakpointCols={{
                default: 4,
                1536: 3,
                1024: 2,
                640: 1
              }}
              className="flex -ml-4 w-auto"
              columnClassName="pl-4 bg-background"
            >
              {Object.entries(previewUrls).map(([fileName, url]) => (
                <div key={fileName} className="mb-4 relative">
                  <div className="relative">
                    <img
                      src={url}
                      alt=""
                      className={`w-full h-auto object-cover rounded-md transition-all duration-300
                      ${uploadProgress[fileName] < 100 ? 'filter grayscale blur-sm' : ''}`}
                    />
                    {uploadProgress[fileName] < 100 && (
                      <div className="absolute inset-x-4 bottom-4">
                        <Progress value={uploadProgress[fileName]} className="w-full" />
                      </div>
                    )}
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