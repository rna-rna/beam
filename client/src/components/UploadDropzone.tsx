import { useCallback, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useDropzone } from 'react-dropzone';
import { queryClient } from '@/lib/queryClient';
import { toast } from '@/components/ui/toast';
import type { GalleryRole } from '@/types/gallery';

interface UploadDropzoneProps {
  gallery: any;
  userRole: GalleryRole;
  canUpload: boolean;
  onUpload: () => void;
  imageCount?: number;
  gallerySlug: string;
}

export function UploadDropzone({ gallery, userRole, canUpload, onUpload, imageCount = 0, gallerySlug }: UploadDropzoneProps) {
  const { batches, addBatch, updateBatchProgress, completeBatch } = useUpload();
  const { getToken } = useAuth();

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

    // Create single batch ID for all files
    const batchId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const totalSize = acceptedFiles.reduce((acc, file) => acc + file.size, 0);
    console.log('[Upload] Starting upload session:', { batchId, totalSize, fileCount: acceptedFiles.length, gallerySlug });

    // Add single batch for all files
    addBatch(batchId, totalSize, acceptedFiles.length);

    // Create a single progress tracker for the entire batch
    const batchProgress = {
      uploadedBytes: 0
    };

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

      // Get auth token from Clerk
      const token = await getToken();

      // Request presigned URL with auth token
      const response = await fetch(`/api/galleries/${gallerySlug}/images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
      let uploadedBatchBytes = 0;

      // Upload directly to R2
      for (const [index, urlData] of urls.entries()) {
        const file = acceptedFiles[index];
        const { signedUrl, publicUrl } = urlData;
        const previousFilesSize = acceptedFiles.slice(0, index).reduce((acc, f) => acc + f.size, 0);

        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const currentFileProgress = event.loaded;
              const batchProgress = previousFilesSize + currentFileProgress;
              const incrementBytes = batchProgress - uploadedBatchBytes;
              uploadedBatchBytes = batchProgress;
              updateBatchProgress(batchId, incrementBytes);
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
      const remainingUploads = batches.filter(batch => batch.id !== batchId);
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
      completeBatch(batchId, true);
    }
  }, [onUpload, addBatch, updateBatchProgress, completeBatch, gallerySlug, getToken]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    disabled: !canUpload,
    noClick: true,
    noKeyboard: true,
    onDropRejected: () => {
      if (!canUpload) {
        toast({
          title: "Permission Denied",
          description: "You don't have permission to upload images to this gallery",
          variant: "destructive"
        });
      }
    }
  });

  return (
    <div {...getRootProps()} className="flex-1 w-full h-full flex items-center justify-center p-8">
      <input {...getInputProps()} />
      {isDragActive && canUpload && (
        <div className="absolute inset-0 bg-primary/10 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center">
            <h3 className="text-xl font-semibold">Drop images here</h3>
          </div>
        </div>
      )}
      {!isDragActive && (
        <div className="w-full max-w-xl mx-auto text-center">
          <div className="space-y-4">
            <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
            <div>
              <p className="text-lg mb-2">Drag and drop images here, or click to select</p>
              <p className="text-sm text-muted-foreground">
                {imageCount === 0 ? 'No images uploaded yet' : `${imageCount} images uploaded`}
              </p>
            </div>
            <Button variant="outline" className="mx-auto">
              Select Images
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useUpload } from '../context/UploadContext';
import { Button } from './ui/button';
import { Upload } from 'lucide-react';