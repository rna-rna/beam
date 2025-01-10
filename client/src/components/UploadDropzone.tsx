
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

  const uploadFileMultipart = async (file: File) => {
    const chunks = createFileChunks(file);
    const fileName = file.name;
    
    try {
      // Step 1: Start Multipart Upload
      const startRes = await fetch('/api/multipart/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, contentType: file.type }),
      });
      const { uploadId, url } = await startRes.json();

      // Step 2: Upload Chunks
      const uploadedChunks = await Promise.all(
        chunks.map(async (chunk, index) => {
          const formData = new FormData();
          formData.append('chunk', new Blob([chunk]));
          formData.append('chunkIndex', index.toString());
          formData.append('fileName', fileName);

          const chunkRes = await fetch('/api/multipart/upload-chunk', {
            method: 'POST',
            body: formData,
          });
          
          setUploadProgress(Math.round(((index + 1) / chunks.length) * 100));
          return chunkRes.json();
        })
      );

      // Step 3: Complete Upload
      const completeRes = await fetch('/api/multipart/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fileName,
          totalChunks: chunks.length 
        }),
      });

      if (!completeRes.ok) throw new Error('Failed to complete upload');
      const finalResult = await completeRes.json();
      return finalResult.url;
    } catch (error) {
      console.error('Multipart upload failed:', error);
      throw error;
    }
  };

  const USE_MULTIPART_THRESHOLD = 5 * 1024 * 1024; // 5MB

  const uploadFile = async (file: File) => {
    if (file.size > USE_MULTIPART_THRESHOLD) {
      console.log('Using multipart upload for:', file.name, `(size: ${file.size} bytes)`);
      return uploadFileMultipart(file);
    } else {
      console.log('Using single PUT upload for:', file.name);
      console.log('File details:', {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: new Date(file.lastModified).toISOString()
      });
      
      // Get signed URL
      const startRes = await fetch('/api/single-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type }),
      });

      if (!startRes.ok) {
        throw new Error(`Failed to get signed URL: ${startRes.statusText}`);
      }

      const { url, key } = await startRes.json();
      
      console.log('Signed URL details:', {
        url,
        key,
        contentType: file.type
      });

      // Upload file using signed URL
      const uploadRes = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
          'Content-Length': file.size.toString()
        },
        body: file,
      });

      console.log('Upload response:', {
        status: uploadRes.status,
        statusText: uploadRes.statusText,
        headers: Object.fromEntries(uploadRes.headers.entries())
      });

      if (!uploadRes.ok) {
        const errorText = await uploadRes.text();
        throw new Error(`Upload failed: ${uploadRes.status} ${uploadRes.statusText}\n${errorText}`);
      }

      return `${process.env.VITE_R2_PUBLIC_URL}/${key}`;
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

      const uploadedUrls = await Promise.all(
        acceptedFiles.map(async (file, index) => {
          const url = await uploadFile(file);
          setUploadProgress(Math.round(((index + 1) / acceptedFiles.length) * 100));
          return {
            url,
            originalFilename: file.name
          };
        })
      );

      // Add images to gallery
      await fetch(`/api/galleries/${gallerySlug}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: uploadedUrls })
      });

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
