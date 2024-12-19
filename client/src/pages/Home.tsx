import { useCallback, useState } from "react";
import Masonry from "react-masonry-css";
import { useDropzone } from "react-dropzone";
import { useLocation } from "wouter";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Upload } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { InlineEdit } from "@/components/InlineEdit";

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  
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
        xhr.open('POST', '/api/galleries');
        
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const response = JSON.parse(xhr.responseText);
            resolve(response.galleryId);
          } else {
            reject(new Error('Upload failed'));
          }
        };
        
        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.send(formData);
      });
    },
    onSuccess: (galleryId) => {
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
  }, [uploadMutation]);

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
            value="Untitled Project"
            onSave={(newTitle) => {
              toast({
                title: "Info",
                description: "Title will be saved when you upload images",
              });
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
