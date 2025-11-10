import React from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { LockIcon } from 'lucide-react';

interface PrivateGalleryErrorProps {
  title?: string;
  message?: string;
  onLoginClick: () => void;
  onSignUpClick: () => void;
}

export function PrivateGalleryError({
  title = "Private Gallery",
  message = "This gallery is private. Please log in or sign up to view it.",
  onLoginClick,
  onSignUpClick
}: PrivateGalleryErrorProps) {
  return (
    <Alert className="max-w-lg mx-auto mt-12 border-primary">
      <LockIcon className="h-4 w-4 text-primary" />
      <AlertTitle className="text-primary">{title}</AlertTitle>
      <AlertDescription className="mt-2 mb-4">
        {message}
      </AlertDescription>
      <div className="flex gap-4">
        <Button variant="default" onClick={onLoginClick}>
          Log In
        </Button>
        <Button variant="outline" onClick={onSignUpClick}>
          Sign Up
        </Button>
      </div>
    </Alert>
  );
} 