import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { LoginButton } from "@/components/LoginButton";
import { SignUpButton } from "@/components/SignUpButton";
import { useState, useEffect } from "react";
import UploadDropzone from "@/components/UploadDropzone";
import { UserNav } from "@/components/UserNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";
import { Logo } from "@/components/Logo";
import { WelcomeModal } from "@/components/WelcomeModal";
import GuestUploadCard from "@/components/GuestUploadCard";

interface TypewriterProps {
  text: string | string[];
  speed?: number;
  cursor?: string;
  loop?: boolean;
  deleteSpeed?: number;
  delay?: number;
  className?: string;
}

function Typewriter({
  text,
  speed = 100,
  cursor = "|",
  loop = false,
  deleteSpeed = 50,
  delay = 1500,
  className,
}: TypewriterProps) {
  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [textArrayIndex, setTextArrayIndex] = useState(0);

  const prefix = "Beam for ";
  const suffixes = Array.isArray(text) ? text.map(t => t.replace(prefix, "")) : [text.replace(prefix, "")];
  const currentSuffix = suffixes[textArrayIndex] || "";

  useEffect(() => {
    if (!currentSuffix) return;

    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          if (currentIndex < currentSuffix.length) {
            setDisplayText((prev) => prev + currentSuffix[currentIndex]);
            setCurrentIndex((prev) => prev + 1);
          } else if (loop) {
            setTimeout(() => setIsDeleting(true), delay);
          }
        } else {
          if (displayText.length > 0) {
            setDisplayText((prev) => prev.slice(0, -1));
          } else {
            setIsDeleting(false);
            setCurrentIndex(0);
            setTextArrayIndex((prev) => (prev + 1) % suffixes.length);
          }
        }
      },
      isDeleting ? deleteSpeed : speed,
    );

    return () => clearTimeout(timeout);
  }, [
    currentIndex,
    isDeleting,
    currentSuffix,
    loop,
    speed,
    deleteSpeed,
    delay,
    displayText,
    text,
  ]);

  return (
    <span className={className}>
      {prefix}
      {displayText}
      <span className="animate-pulse">{cursor}</span>
    </span>
  );
}

export default function Home() {
  const { isDark } = useTheme();
  const [guestGalleryCount, setGuestGalleryCount] = useState(
    Number(sessionStorage.getItem("guestGalleryCount")) || 0
  );
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(true);

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
      <div className="w-full h-full flex relative">
        <SignedOut>
          <div className="flex flex-col items-center justify-center w-full min-h-[calc(100vh-4rem)] space-y-8">
            <div className="text-center space-y-8">
              <Logo size="sm" className="mx-auto mb-8" />
              <Typewriter
                text={[
                  "real-time feedback",
                  "team collaboration",
                  "bulk photo delivery",
                  "streamlined approvals",
                  "quick file sharing",
                  "client-friendly galleries",
                  "secure image access"
                ]}
                className="text-4xl font-bold tracking-tight"
                speed={80}
                deleteSpeed={40}
                delay={2000}
                loop={true}
              />
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Beam supercharges creativity. Trusted by the world's leading brands, Beam is the platform to share, review, and deliver your creative work—all in real-time.
              </p>
              <div className="mt-8">
                <SignUpButton variant="default" size="lg" />
              </div>
            </div>
          </div>
          <div className="absolute bottom-4 right-4 space-x-4 text-sm text-muted-foreground">
            <a href="/terms" className="hover:text-primary transition-colors">Terms of Service</a>
            <a href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="/contact" className="hover:text-primary transition-colors">Contact</a>
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
        <WelcomeModal isOpen={isWelcomeOpen} onOpenChange={setIsWelcomeOpen} />
      </div>
    </div>
  );
}