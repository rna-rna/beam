
import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { AuthModal } from "@/components/AuthModal";

interface GalleryInfo {
  title: string;
  thumbnailUrl: string | null;
}

export default function MagicLinkLanding() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const email = params.get("email");
  const inviteToken = params.get("inviteToken");
  const gallerySlug = params.get("gallery");
  const [gallery, setGallery] = useState<GalleryInfo | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    if (gallerySlug) {
      fetch(`/api/public/galleries/${gallerySlug}`)
        .then(res => res.json())
        .then(data => {
          setGallery({
            title: data.title || "Untitled Gallery",
            thumbnailUrl: data.ogImageUrl || null
          });
        })
        .catch(console.error);
    }
  }, [gallerySlug]);

  const handleSignUpComplete = async () => {
    if (inviteToken && email && gallerySlug) {
      try {
        const response = await fetch("/auth/verify-magic-link", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${sessionStorage.getItem("clerk-db-jwt")}`
          },
          body: JSON.stringify({ inviteToken, email, gallerySlug })
        });

        if (response.ok) {
          setLocation(`/g/${gallerySlug}`);
          return;
        }
      } catch (error) {
        console.error("Failed to verify magic link:", error);
      }
    }
    setLocation("/dashboard");
  };

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-xl mx-auto overflow-hidden">
        <div className="p-8 space-y-6">
          <div className="relative rounded-lg overflow-hidden">
            {gallery?.thumbnailUrl ? (
              <img
                src={gallery.thumbnailUrl}
                alt={gallery.title}
                className="w-full aspect-video object-cover"
              />
            ) : (
              <div className="w-full aspect-video bg-secondary flex items-center justify-center">
                <Lock className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
            <div className="absolute top-4 right-4">
              <div className="bg-background/80 backdrop-blur-sm p-2 rounded-full">
                <Lock className="h-4 w-4" />
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight">
              {gallery?.title || "Loading Gallery..."}
            </h1>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Lock className="h-4 w-4" />
              <p>Private Gallery</p>
            </div>
            <p className="text-muted-foreground text-sm">
              You have been invited to view this private gallery. Please sign up or log in to continue.
            </p>
            <Button 
              size="lg" 
              className="w-full mt-4"
              onClick={() => setIsAuthModalOpen(true)}
            >
              Sign Up / Login
            </Button>
          </div>
        </div>
      </Card>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onComplete={handleSignUpComplete}
        redirectUrl={window.location.href}
      />
    </div>
  );
}
