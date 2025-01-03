
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { LoginButton } from "@/components/LoginButton";
import { useState } from "react";
import UploadDropzone from "@/components/UploadDropzone";
import { UserNav } from "@/components/UserNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";

export default function Home() {
  const { isDark } = useTheme();
  const [guestGalleryCount, setGuestGalleryCount] = useState(
    Number(sessionStorage.getItem("guestGalleryCount")) || 0
  );

  const handleGuestUpload = async (files: File[]) => {
    if (guestGalleryCount >= 1) {
      window.location.href = "/sign-up";
      return;
    }
    console.log("Uploading guest gallery with guestUpload flag...");
    setGuestGalleryCount(1);
    sessionStorage.setItem("guestGalleryCount", "1");
  };

  return (
    <div className="min-h-screen">
      <div className={cn("sticky top-0 z-10 backdrop-blur-sm border-b", isDark ? "bg-black/80" : "bg-background/80")}>
        <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <h1 className="text-l font-semibold">Image Gallery Hub</h1>
          <div className="ml-auto flex items-center gap-4">
            <ThemeToggle />
            <SignedIn>
              <UserNav />
            </SignedIn>
            <SignedOut>
              <div className="flex items-center gap-2">
                <LoginButton />
              </div>
            </SignedOut>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <SignedOut>
          <div className="flex flex-col items-center justify-center min-h-[80vh]">
            <UploadDropzone onUpload={handleGuestUpload} />
            <p className="text-sm text-muted-foreground mt-4">
              Create one gallery as a guest. Sign up to upload more.
            </p>
          </div>
        </SignedOut>

        <SignedIn>
          <div className="flex flex-col items-center justify-center min-h-[80vh]">
            <h1 className="text-2xl font-semibold mb-4">Welcome back!</h1>
            <p className="text-muted-foreground">
              Head to your <a href="/dashboard" className="text-primary hover:underline">dashboard</a> to manage your galleries.
            </p>
          </div>
        </SignedIn>
      </div>
    </div>
  );
}
