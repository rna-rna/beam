import { UserProfile } from '@clerk/clerk-react';
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useUser } from "@clerk/clerk-react";

export default function Settings() {
  const { isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-semibold mb-4">Account Settings</h1>
      <UserProfile
        appearance={{
          elements: {
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
    </Card>
  );
}