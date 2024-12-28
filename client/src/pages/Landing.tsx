import { SignIn } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function Landing() {
  return (
    <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Welcome to Image Gallery Hub</CardTitle>
          <CardDescription>
            A collaborative platform for managing and sharing image galleries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignIn
            appearance={{
              elements: {
                formButtonPrimary: 'bg-primary text-primary-foreground hover:bg-primary/90',
                card: 'bg-background',
                headerTitle: 'text-foreground',
                headerSubtitle: 'text-muted-foreground',
              }
            }}
            afterSignInUrl="/gallery"
            redirectUrl="/gallery"
          />
        </CardContent>
      </Card>
    </div>
  );
}