import { UserProfile } from '@clerk/clerk-react';
import { Card } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import { useState } from 'react';

export default function Settings() {
  const { isLoaded, isSignedIn } = useUser();
  const [error, setError] = useState<Error | null>(null);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-4" />
          <h2 className="text-lg font-semibold">Authentication Required</h2>
          <p className="text-sm text-muted-foreground">Please sign in to access settings.</p>
        </div>
      </div>
    );
  }

  return (
    <Card className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-semibold mb-4">Account Settings</h1>
      {error ? (
        <div className="text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <p>{error.message}</p>
        </div>
      ) : (
        <UserProfile
          appearance={{
            elements: {
              rootBox: 'w-full',
              card: 'shadow-none border-0 p-0',
              navbar: 'hidden',
              headerTitle: 'text-2xl font-bold',
              headerSubtitle: 'text-muted-foreground'
            },
            variables: {
              colorPrimary: 'hsl(var(--primary))',
              borderRadius: 'var(--radius)',
            }
          }}
        />
      )}
    </Card>
  );
}