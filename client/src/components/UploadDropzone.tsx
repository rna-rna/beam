import { useCallback, useState, useMemo } from "react";
import { useUser } from "@clerk/clerk-react";
import { useDropzone } from "react-dropzone";
import { Progress } from "@/components/ui/progress";
import { ArrowUpFromLine } from "lucide-react";
import { SignUpModal } from "@/components/SignUpModal";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

interface UploadDropzoneProps {
  onUpload: (files: File[]) => void;
  imageCount?: number;
}

export default function UploadDropzone({ onUpload, imageCount = 0 }: UploadDropzoneProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useUser();
  const { isDark } = useTheme();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);

  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

  const createFileChunks = (file: File) => {
    const chunks = [];
    for (let start = 0; start < file.size; start += CHUNK_SIZE) {
      const chunk = file.slice(start, start + CHUNK_SIZE);
      chunks.push(chunk);
    }
    console.log(`File size: ${file.size} bytes`);
    console.log(`Chunks created: ${chunks.length}`);
    return chunks;
  };

  const retryUploadChunk = async (chunk: Blob, index: number, fileName: string, maxRetries = 3) => {
    let retries = maxRetries;
    while (retries > 0) {
      try {
        const formData = new FormData();
        formData.append('chunk', new Blob([chunk]));
        formData.append('chunkIndex', index.toString());
        formData.append('fileName', fileName);

        const chunkRes = await fetch('/api/multipart/upload-chunk', {
          method: 'POST',
          body: formData,
        });

        if (!chunkRes.ok) throw new Error(`HTTP error! status: ${chunkRes.status}`);
        return await chunkRes.json();
      } catch (error) {
        console.error(`Chunk ${index} upload failed, retries left: ${retries - 1}`, error);
        retries--;
        if (retries === 0) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
      }
    }
  };

  const uploadFileMultipart = async (file: File) => {
    const chunks = createFileChunks(file);
    const fileName = file.name;

    console.log(`[Multipart] Created ${chunks.length} chunks for "${fileName}"`);

    try {
      // Step 1: Request pre-signed URLs for each chunk
      const startRes = await fetch(`/api/galleries/${gallerySlug}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: chunks.map((_, index) => ({
            name: `${fileName}-chunk-${index}`,
            type: 'application/octet-stream',
          })),
        }),
      });

      if (!startRes.ok) {
        throw new Error('Failed to get signed URLs for chunks');
      }

      const { urls } = await startRes.json();
      console.log(`[Multipart] Received ${urls.length} signed URLs for chunks`);

      // Step 2: Upload chunks to R2
      let completedChunks = 0;
      await Promise.all(
        chunks.map(async (chunk, index) => {
          try {
            const { signedUrl } = urls[index];
            const chunkRes = await fetch(signedUrl, {
              method: 'PUT',
              body: chunk,
            });

            if (!chunkRes.ok) {
              throw new Error(`Chunk ${index} upload failed: ${chunkRes.statusText}`);
            }

            completedChunks++;
            setUploadProgress(Math.round((completedChunks / chunks.length) * 100));
            console.log(`[Multipart] Chunk ${index + 1}/${chunks.length} uploaded successfully`);
          } catch (error) {
            console.error(`[Multipart] Chunk ${index} upload failed:`, error);
            throw error;
          }
        })
      );

      console.log(`[Multipart] All chunks uploaded successfully for "${fileName}"`);
      return true;
    } catch (error) {
      console.error(`[Multipart] Upload failed for "${fileName}":`, error);
      throw error;
    }
  };

  const uploadFileSingle = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    console.log(`[Single] Starting upload for "${file.name}"`);
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

        console.log('Upload response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} ${response.statusText}\n${errorText}`);
      }

      return response.json();
  };

  const USE_MULTIPART_THRESHOLD = 5 * 1024 * 1024; // 5MB threshold

  const uploadFile = async (file: File) => {
    console.log(`[Upload] Starting upload for "${file.name}"`, {
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified).toISOString()
    });

    if (file.size > USE_MULTIPART_THRESHOLD) {
      console.log(`[Upload] Using multipart upload for "${file.name}" (${file.size} bytes)`);
      return uploadFileMultipart(file);
    } else {
      console.log(`[Upload] Using single PUT upload for "${file.name}" (${file.size} bytes)`);
      return uploadFileSingle(file);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (isUploading) return;

    if (acceptedFiles.length === 0) {
      toast({
        title: "Invalid Upload",
        description: "No valid image files were selected. Please upload JPG, PNG, GIF, or WEBP.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const currentPath = window.location.pathname;
      let gallerySlug = currentPath.split('/').pop();

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

      const formData = new FormData();
      acceptedFiles.forEach((file) => {
        formData.append('images', file);
      });

      const response = await fetch(`/api/galleries/${gallerySlug}/images`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload images');
      }

      const result = await response.json();
      const uploadedUrls = result.images;

      toast({
        title: "Success",
        description: "Images uploaded successfully!",
      });

      queryClient.invalidateQueries({ queryKey: [`/api/galleries/${gallerySlug}`] });

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

  const isClickDisabled = useMemo(() => imageCount > 0, [imageCount]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    disabled: isUploading,
    noClick: isClickDisabled,
    noKeyboard: false,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
    onDropRejected: (rejectedFiles) => {
      const unsupportedFiles = rejectedFiles.filter(file =>
        !file.file.type.startsWith('image/')
      );

      if (unsupportedFiles.length > 0) {
        toast({
          title: "Invalid File Type",
          description: `Some files were rejected. Only image files (JPG, PNG, GIF, WEBP) are allowed.`,
          variant: "destructive",
        });
      }
    }
  });

  return (
    <>
      <SignUpModal isOpen={showSignUpModal} onClose={() => setShowSignUpModal(false)} />
      <div
        {...getRootProps()}
        className={cn(
          "w-full min-h-[calc(100vh-4rem)] flex items-center justify-center cursor-pointer relative",
          isDark ? "bg-black/90" : "hover:bg-background",
          isUploading && (isDark ? "bg-black/50" : "bg-gray-100")
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center h-full gap-6">
          {isUploading ? (
            <div className="w-[80vw] max-w-xl space-y-4">
              <Progress value={uploadProgress} className="w-full h-2" />
              <p className={cn("text-sm text-center", isDark ? "text-muted-foreground" : "text-muted-foreground")}>
                Uploading... {uploadProgress}%
              </p>
            </div>
          ) : (
            <div className="text-center">
              <div className="flex flex-col items-center">
                <ArrowUpFromLine className={cn("w-16 h-16 mb-4", isDark ? "text-muted-foreground" : "text-muted-foreground")} />
                <p className={cn("text-lg font-medium mb-2", isDark ? "text-foreground" : "text-foreground")}>
                  {isDragActive ? "Drop them!" : "Upload Your Assets"}
                </p>
                <p className={cn("text-sm mb-6", isDark ? "text-muted-foreground" : "text-muted-foreground")}>
                  Drag and drop any image file to start.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}