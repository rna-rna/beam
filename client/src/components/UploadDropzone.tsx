import { useCallback, useState, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { queryClient } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';
import { Button } from './ui/button';
import { Loader2, Upload } from 'lucide-react';
import { Progress } from './ui/progress';
import { useUpload } from '../context/UploadContext';

interface Props {
  onUpload: () => void;
  imageCount?: number;
  gallerySlug: string;
}

export default function UploadDropzone({ onUpload, imageCount = 0, gallerySlug }: Props) {
  const { addBatch, updateBatchProgress, completeBatch } = useUpload();

  // Use ref to persist processed files across renders
  const processedFiles = useRef(new Set<string>());

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!acceptedFiles?.length) {
      console.log('[Upload] No valid files to process');
      return;
    }

    // Filter out duplicate files with enhanced logging
    const uniqueFiles = acceptedFiles.filter(file => {
      const uniqueKey = `${file.name}-${file.size}-${file.lastModified}`;
      if (processedFiles.current.has(uniqueKey)) {
        console.log('[Upload] Skipping duplicate:', {
          name: file.name,
          size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
          key: uniqueKey
        });
        return false;
      }
      processedFiles.current.add(uniqueKey);
      console.log('[Upload] Processing new file:', {
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
        key: uniqueKey
      });
      return true;
    });

    if (!uniqueFiles.length) {
      console.log('[Upload] No unique files to process');
      return;
    }

    // Use uniqueFiles instead of acceptedFiles for the rest of processing
    acceptedFiles = uniqueFiles;

    console.log('[Upload] Processing new batch:', {
      files: acceptedFiles.map(f => ({
        name: f.name,
        type: f.type,
        size: f.size
      }))
    });

    const uploadId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const totalSize = acceptedFiles.reduce((acc, file) => acc + file.size, 0);
    console.log('[Upload] Starting upload session:', { uploadId, totalSize, fileCount: acceptedFiles.length, gallerySlug });

    startUpload(uploadId, totalSize, acceptedFiles.length);

    try {
      if (!acceptedFiles?.length) {
        toast({
          title: 'No files selected',
          description: 'Please upload valid image files.',
          variant: 'destructive',
        });
        return;
      }

      const invalidFiles = acceptedFiles.filter(
        file => !file.type.startsWith('image/') || file.size > 60 * 1024 * 1024
      );

      if (invalidFiles.length) {
        toast({
          title: 'Invalid files detected',
          description: 'Please only upload images under 60MB in size.',
          variant: 'destructive',
        });
        return;
      }

      addBatch(uploadId, totalSize, acceptedFiles.length);

      // Request presigned URL
      const response = await fetch(`/api/galleries/${gallerySlug}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: acceptedFiles.map(file => ({
            name: file.name,
            type: file.type,
            size: file.size
          }))
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get upload URLs');
      }

      const { urls } = await response.json();
      let totalUploadedBytes = 0;
      const fileProgress = new Map<number, number>();

      // Upload directly to R2
      for (const [index, urlData] of urls.entries()) {
        const file = acceptedFiles[index];
        const { signedUrl, publicUrl } = urlData;

        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          fileProgress.set(index, 0);
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const currentProgress = event.loaded;
              const previousProgress = fileProgress.get(index) || 0;
              const incrementBytes = currentProgress - previousProgress;

              fileProgress.set(index, currentProgress);
              totalUploadedBytes += incrementBytes;
              updateBatchProgress(uploadId, incrementBytes);
            }
          };

          xhr.open('PUT', signedUrl, true);
          xhr.setRequestHeader('Content-Type', file.type);

          xhr.onload = () => {
            if (xhr.status === 200) {
              resolve(xhr.response);
            } else {
              reject(new Error(`Failed to upload ${file.name}`));
            }
          };

          xhr.onerror = () => reject(new Error(`Network error uploading ${file.name}`));
          xhr.send(file);
        });
      }

      // Only invalidate queries if this was the last batch
      const remainingUploads = activeUploads.filter(id => id !== uploadId);
      if (remainingUploads.length === 0) {
        if (gallerySlug) {
          await queryClient.invalidateQueries({ 
            queryKey: [`/api/galleries/${gallerySlug}`],
            refetchType: 'all'
          });
        }
        onUpload();
      } else {
        // Optimistically update the UI without refetching
        queryClient.setQueryData([`/api/galleries/${gallerySlug}`], (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            images: [...oldData.images, ...urls.map((u: any) => ({
              id: u.imageId,
              url: u.publicUrl,
              publicId: u.key,
              originalFilename: u.fileName
            }))]
          };
        });
      }

      toast({
        title: 'Upload complete',
        description: `Successfully added ${acceptedFiles.length} ${acceptedFiles.length === 1 ? 'image' : 'images'} to the gallery.`,
      });

    } catch (error) {
      console.error('[Upload Error]:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Upload failed. Please try again.',
        variant: 'destructive',
      });
    } finally {
      completeBatch(uploadId, true);
    }
  }, [onUpload, startUpload, updateProgress, completeUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    disabled: false
  });

  return (
    <div
      {...getRootProps()}
      className="flex-1 w-full h-full flex items-center justify-center p-8"
    >
      <input {...getInputProps()} />
      <div className="w-full max-w-xl mx-auto text-center">
        {false ? (
          <div className="space-y-4">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Drop files to upload</p>
          </div>
        ) : (
          <div className="space-y-4">
            <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
            <div>
              {isDragActive ? (
                <p className="text-lg">Drop images here...</p>
              ) : (
                <>
                  <p className="text-lg mb-2">Drag and drop images here, or click to select</p>
                  <p className="text-sm text-muted-foreground">
                    {imageCount === 0 ? 'No images uploaded yet' : `${imageCount} images uploaded`}
                  </p>
                </>
              )}
            </div>
            <Button variant="outline" className="mx-auto">
              Select Images
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}