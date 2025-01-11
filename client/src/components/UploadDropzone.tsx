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
    try {
      if (!acceptedFiles.length) {
        toast({
          title: 'No files selected',
          description: 'Please upload valid image files.',
          variant: 'destructive',
        });
        return;
      }

      setIsUploading(true);
      setUploadProgress(0);

      // Request pre-signed URLs for the accepted files
      const { urls } = await requestSignedUrls(acceptedFiles);

      // Upload files directly to R2
      await Promise.all(
        acceptedFiles.map(async (file, index) => {
          const { signedUrl, publicUrl } = urls[index];
          const uploadResponse = await fetch(signedUrl, {
            method: 'PUT',
            headers: { 'Content-Type': file.type },
            body: file,
          });

          if (!uploadResponse.ok) {
            throw new Error(`Failed to upload file: ${file.name}`);
          }

          console.log(`Uploaded file: ${file.name} -> ${publicUrl}`);
          setUploadProgress(((index + 1) / acceptedFiles.length) * 100);
        })
      );

      toast({
        title: 'Upload complete',
        description: 'All images were successfully uploaded!',
      });

      onUpload(acceptedFiles);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload files',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [onUpload]);

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