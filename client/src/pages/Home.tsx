import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useLocation } from "wouter";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Upload } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('images', file);
      });

      const res = await fetch('/api/galleries', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        throw new Error('Failed to upload images');
      }

      const data = await res.json();
      return data.galleryId;
    },
    onSuccess: (galleryId) => {
      setLocation(`/gallery/${galleryId}`);
    },
    onError: () => {
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
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card 
        {...getRootProps()}
        className={`w-full max-w-3xl h-96 flex flex-col items-center justify-center p-8 cursor-pointer border-2 border-dashed transition-colors
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
        
        {uploadMutation.isPending && (
          <div className="w-full max-w-md mt-8">
            <Progress value={undefined} className="w-full" />
            <p className="text-sm text-muted-foreground text-center mt-2">
              Uploading...
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
