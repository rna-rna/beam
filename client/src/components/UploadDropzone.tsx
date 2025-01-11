import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from '@/hooks/use-toast';
import { Button } from './ui/button';
import { Loader2, Upload } from 'lucide-react';
import { Progress } from './ui/progress';

interface Props {
  onUpload: (files: File[]) => void;
  imageCount?: number;
}

export default function UploadDropzone({ onUpload, imageCount = 0 }: Props) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const requestSignedUrls = async (files: File[]) => {
    if (!files.length) {
      throw new Error('No files provided for upload');
    }

    const response = await fetch(`/api/galleries/${window.location.pathname.split('/').pop()}/images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        files: files.map((file) => ({
          name: file.name,
          type: file.type,
          size: file.size,
        })),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get signed URLs');
    }

    return response.json();
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (isUploading) {
      console.log('[Upload] Upload already in progress, skipping.');
      return;
    }

    try {
      if (!acceptedFiles?.length) {
        toast({
          title: 'No files selected',
          description: 'Please upload valid image files.',
          variant: 'destructive',
        });
        return;
      }

      // Validate file types and sizes
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
      setUploadProgress(0);

      // Request pre-signed URLs with validation
      const { urls } = await requestSignedUrls(acceptedFiles);

      console.log('[Upload] Starting upload attempt:', {
        files: acceptedFiles.map(f => ({
          name: f.name,
          size: `${Math.round(f.size / 1024)}KB`,
          type: f.type,
        })),
        timestamp: new Date().toISOString(),
      });

      if (!urls || !Array.isArray(urls)) {
        throw new Error('Failed to get upload URLs from server');
      }

      // Upload files without retries
      for (let i = 0; i < acceptedFiles.length; i++) {
        const file = acceptedFiles[i];
        const { signedUrl } = urls[i];

        if (!signedUrl) {
          throw new Error(`Missing upload URL for file: ${file.name}`);
        }

        const response = await fetch(signedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}: ${response.status} ${response.statusText}`);
        }

        console.log(`[Upload] Successfully uploaded: ${file.name}`);
        setUploadProgress(((i + 1) / acceptedFiles.length) * 100);
      }

      toast({
        title: 'Upload complete',
        description: 'All files were successfully uploaded.',
      });

      onUpload(acceptedFiles);
    } catch (error) {
      console.error('[Upload Error]:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Upload failed. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [onUpload, isUploading]);

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
            <Progress value={uploadProgress} className="w-full" />
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