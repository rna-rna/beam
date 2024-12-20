import { useCallback, useState, useEffect } from "react";
import { useDropzone } from 'react-dropzone';
import { useLocation } from "wouter";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Upload } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { v4 as uuidv4 } from 'uuid';

interface HomeProps {
  title: string;
  onTitleChange: (title: string) => void;
}

export default function Home({ title, onTitleChange }: HomeProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [galleryId, setGalleryId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isGalleryCreated, setIsGalleryCreated] = useState(false);

  // Create gallery only once on mount
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
          setGalleryId(newGalleryId);
          setIsGalleryCreated(true);
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

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      if (!galleryId) return;
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
            setIsNavigating(true);
            setTimeout(() => {
              setLocation(`/gallery/${galleryId}`);
            }, 500);
            resolve(xhr.response);
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
      setIsNavigating(false);
      toast({
        title: "Error",
        description: "Failed to upload images. Please try again.",
        variant: "destructive"
      });
    }
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!isUploading && acceptedFiles.length > 0) {
      uploadMutation.mutate(acceptedFiles);
    }
  }, [isUploading, uploadMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    disabled: isUploading || isNavigating
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full h-[calc(100vh-4rem)]"
    >
      <div className="p-4 md:p-6 lg:p-8 h-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="h-full"
        >
          <Card
            {...getRootProps()}
            className={`w-full h-full flex flex-col items-center justify-center cursor-pointer border-2 border-dashed transition-colors rounded-lg
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
              ${isUploading || isNavigating ? 'pointer-events-none' : ''}
              ${isNavigating ? 'opacity-0 transition-opacity duration-300' : ''}`}
          >
            <input {...getInputProps()} />

            {isUploading || isNavigating ? (
              <div className="w-full max-w-md flex flex-col items-center gap-4 p-8">
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-sm text-muted-foreground">
                  {isNavigating ? "Preparing gallery..." : `Uploading... ${Math.round(uploadProgress)}%`}
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
        </motion.div>
      </div>
    </motion.div>
  );
}