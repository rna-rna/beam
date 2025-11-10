import React from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface GalleryNotFoundErrorProps {
  message?: string;
  onBackToDashboard: () => void;
}

export function GalleryNotFoundError({
  message = "The gallery you are looking for does not exist or has been removed.",
  onBackToDashboard
}: GalleryNotFoundErrorProps) {
  return (
    <Alert variant="destructive" className="max-w-lg mx-auto mt-12">
      <X className="h-4 w-4" />
      <AlertTitle>Gallery not found</AlertTitle>
      <AlertDescription className="mt-2 mb-4">
        {message}
      </AlertDescription>
      <Button variant="outline" onClick={onBackToDashboard}>
        Return to Dashboard
      </Button>
    </Alert>
  );
} 