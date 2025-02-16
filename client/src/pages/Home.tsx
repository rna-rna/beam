import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { LoginButton } from "@/components/LoginButton";
import { SignUpButton } from "@/components/SignUpButton";
import { useState } from "react";
import UploadDropzone from "@/components/UploadDropzone";
import { UserNav } from "@/components/UserNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";
import { Logo } from "@/components/Logo";
import { WelcomeModal } from "@/components/WelcomeModal"; // Added import
import GuestUploadCard from "@/components/GuestUploadCard";

export default function Home() {
  const { isDark } = useTheme();
  const [guestGalleryCount, setGuestGalleryCount] = useState(
    Number(sessionStorage.getItem("guestGalleryCount")) || 0
  );
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(true); // Added state for modal

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
    <div className="flex-1">
      <div className="w-full flex">
        <SignedOut>
            <div className="flex items-center justify-center w-full py-8">
              <GuestUploadCard />
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
        <WelcomeModal isOpen={isWelcomeOpen} onOpenChange={setIsWelcomeOpen} /> {/*Added WelcomeModal*/}
      </div>
    </div>
  );
}