
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useSearch } from "wouter/use-location";
import { Card } from "@/components/ui/card";
import { SignUp } from "@clerk/clerk-react";

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

  useEffect(() => {
    if (gallerySlug) {
      fetch(`/api/galleries/${gallerySlug}`)
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
    <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto mb-4">
        <div className="p-6 text-center">
          <h1 className="text-2xl font-bold mb-4">Welcome!</h1>
          {gallery && (
            <>
              <p className="mb-4">
                Please sign up or log in to access "{gallery.title}"
              </p>
              {gallery.thumbnailUrl && (
                <img
                  src={gallery.thumbnailUrl}
                  alt={gallery.title}
                  className="mx-auto mb-4 rounded-lg max-w-[200px] h-auto"
                />
              )}
              <p className="text-muted-foreground">
                You have been invited to view this gallery.
              </p>
            </>
          )}
        </div>
      </Card>

      <Card className="w-full max-w-md mx-auto">
        <SignUp
          appearance={{
            elements: {
              formButtonPrimary: 'bg-primary text-primary-foreground hover:bg-primary/90',
              card: 'bg-background',
              headerTitle: 'text-foreground',
              headerSubtitle: 'text-muted-foreground',
            }
          }}
          afterSignUpComplete={handleSignUpComplete}
        />
      </Card>
    </div>
  );
}
