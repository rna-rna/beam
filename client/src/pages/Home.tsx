import { useCallback, useState, useEffect } from "react";
import { useDropzone } from 'react-dropzone';
import { useLocation } from "wouter";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Upload } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserNav } from "@/components/UserNav";
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

const creativeQuotes = [
  "Art enables us to find ourselves and lose ourselves at the same time. - Thomas Merton",
  "Creativity takes courage. - Henri Matisse",
  "Every artist was first an amateur. - Ralph Waldo Emerson",
  "To create one's own world takes courage. - Georgia O'Keeffe",
  "The painter has the Universe in his mind and hands. - Leonardo da Vinci",
  "Imagination is everything. It is the preview of life's coming attractions. - Albert Einstein",
  "Every child is an artist. The problem is how to remain an artist once we grow up. - Pablo Picasso",
  "Art is not what you see, but what you make others see. - Edgar Degas",
  "Vision is the art of seeing what is invisible to others. - Jonathan Swift",
  "The artist is nothing without the gift, but the gift is nothing without work. - Émile Zola"
];

interface HomeProps {
  title: string;
  onTitleChange: (title: string) => void;
}

export default function Home({ title, onTitleChange }: HomeProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [galleryId, setGalleryId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { isDark } = useTheme();
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isGalleryCreated, setIsGalleryCreated] = useState(false);
  const [currentQuote, setCurrentQuote] = useState("");

  // Create gallery only once on mount
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
      setCurrentQuote(creativeQuotes[Math.floor(Math.random() * creativeQuotes.length)]);

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
      className="w-full h-screen"
    >
      <div className={cn("sticky top-0 z-10 backdrop-blur-sm border-b", isDark ? "bg-black/80" : "bg-background/80")}>
        <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <h1 className="text-l font-semibold">Image Gallery Hub</h1>
          <div className="ml-auto flex items-center gap-4">
            <ThemeToggle />
            <SignedIn>
              <UserNav />
            </SignedIn>
            <SignedOut>
              <div className="flex items-center gap-2">
                <Button 
                  variant="secondary" 
                  onClick={() => window.location.href = "/sign-up"}
                >
                  Sign Up
                </Button>
                <Button 
                  variant="link" 
                  onClick={() => window.location.href = "/sign-in"}
                  className={cn("hover:underline", isDark ? "text-white" : "text-black")}
                >
                  Login
                </Button>
              </div>
            </SignedOut>
          </div>
        </div>
      </div>
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
              <div className="w-full max-w-md flex flex-col items-center gap-6 p-8">
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-sm text-muted-foreground">
                  {isNavigating ? "Preparing gallery..." : `Uploading... ${Math.round(uploadProgress)}%`}
                </p>
                {currentQuote && (
                  <p
                    className="text-lg text-muted-foreground text-center max-w-lg mx-auto"
                    style={{ fontFamily: 'Times New Roman, serif', fontStyle: 'italic' }}
                  >
                    {currentQuote}
                  </p>
                )}
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