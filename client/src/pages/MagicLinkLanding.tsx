
import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Card } from "@/components/ui/card";
import { SignUp } from "@clerk/clerk-react";
import { Lock } from "lucide-react";

interface GalleryInfo {
  title: string;
  thumbnailUrl: string | null;
}

export default function MagicLinkLanding() {
  console.log("MagicLinkLanding component rendered");
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const email = params.get("email");
  const inviteToken = params.get("inviteToken");
  const gallerySlug = params.get("gallery");
  
  // Log parameters from both hooks and window.location
  console.log("Magic link parameters:", {
    email,
    inviteToken,
    gallerySlug,
    fullSearch: search,
    windowSearch: {
      email: new URLSearchParams(window.location.search).get("email"),
      inviteToken: new URLSearchParams(window.location.search).get("inviteToken"),
      gallery: new URLSearchParams(window.location.search).get("gallery")
    }
  });
  
  const [gallery, setGallery] = useState<GalleryInfo | null>(null);

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
    <div className="min-h-screen w-full bg-background">
      <div className="container mx-auto p-4 grid lg:grid-cols-2 gap-8 items-center min-h-screen">
        {/* Left Column - Gallery Preview */}
        <div className="flex flex-col items-center justify-center">
          <Card className="w-full max-w-md p-6 space-y-4">
            <div className="relative">
              {gallery?.thumbnailUrl ? (
                <img
                  src={gallery.thumbnailUrl}
                  alt={gallery.title}
                  className="w-full aspect-video object-cover rounded-lg"
                />
              ) : (
                <div className="w-full aspect-video bg-secondary rounded-lg flex items-center justify-center">
                  <Lock className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              <div className="absolute top-4 right-4">
                <div className="bg-background/80 backdrop-blur-sm p-2 rounded-full">
                  <Lock className="h-4 w-4" />
                </div>
              </div>
            </div>
            
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold">{gallery?.title || "Loading Gallery..."}</h1>
              <p className="text-muted-foreground">
                You have been invited to view this private gallery
              </p>
            </div>
          </Card>
        </div>

        {/* Right Column - Sign Up Form */}
        <div className="flex flex-col items-center justify-center">
          <Card className="w-full max-w-md">
            <SignUp
              appearance={{
                elements: {
                  formButtonPrimary: 'bg-primary text-primary-foreground hover:bg-primary/90',
                  card: 'bg-background',
                  headerTitle: 'text-foreground',
                  headerSubtitle: 'text-muted-foreground',
                }
              }}
              afterSignUpUrl={window.location.href}
              afterSignUpComplete={handleSignUpComplete}
              redirectUrl={window.location.href}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
