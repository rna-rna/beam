
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { queryClient } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';
import { Button } from './ui/button';
import { Loader2, Upload } from 'lucide-react';
import { Progress } from './ui/progress';
import { useUpload } from '../context/UploadContext';

interface Props {
  onUpload: (files: File[]) => void;
  imageCount?: number;
}

export default function UploadDropzone({ onUpload, imageCount = 0 }: Props) {
  const [isUploading, setIsUploading] = useState(false);
  const { startUpload, updateProgress, completeUpload, uploadProgress } = useUpload();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!acceptedFiles?.length) {
      console.log('[Upload] No valid files to process');
      return;
    }

    if (isUploading) {
      console.log('[Upload] Upload already in progress, skipping');
      return;
    }

    const uploadId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log('[Upload] Starting upload session:', { uploadId });

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
        file => !file.type.startsWith('image/') || file.size > 10 * 1024 * 1024
      );

      if (invalidFiles.length) {
        toast({
          title: 'Invalid files detected',
          description: 'Please only upload images under 10MB in size.',
          variant: 'destructive',
        });
        return;
      }

      setIsUploading(true);
      startUpload(uploadId);

      // Request presigned URL
      const response = await fetch(`/api/galleries/${window.location.pathname.split('/').pop()}/images`, {
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
        throw new Error('Failed to get upload URLs');
      }

      const { urls } = await response.json();

      // Upload directly to R2
      await Promise.all(urls.map(async (urlData: any, index: number) => {
        const file = acceptedFiles[index];
        const { signedUrl, publicUrl } = urlData;

        const uploadResponse = await fetch(signedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file
        });

        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        const progress = ((index + 1) / urls.length) * 100;
        updateProgress(progress);
      }));

      onUpload(acceptedFiles);

      const gallerySlug = window.location.pathname.split('/').pop();
      if (gallerySlug) {
        await queryClient.invalidateQueries({ queryKey: [`/api/galleries/${gallerySlug}`] });
        await queryClient.refetchQueries({ queryKey: [`/api/galleries/${gallerySlug}`] });
      }

      toast({
        title: 'Upload complete',
        description: 'All files were successfully uploaded.',
      });

    } catch (error) {
      console.error('[Upload Error]:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Upload failed. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      completeUpload(uploadId);
    }
  }, [onUpload, startUpload, updateProgress, completeUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    disabled: isUploading
  });

  return (
    <div
      {...getRootProps()}
      className="flex-1 w-full h-full flex items-center justify-center p-8"
    >
      <input {...getInputProps()} />
      <div className="w-full max-w-xl mx-auto text-center">
        {isUploading ? (
          <div className="space-y-4">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
            <Progress value={uploadProgress || 0} className="w-full" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
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
