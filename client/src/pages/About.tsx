
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { LoginButton } from "@/components/LoginButton";
import { SignUpButton } from "@/components/SignUpButton";
import { Layout } from "@/components/Layout";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserNav } from "@/components/UserNav";

export default function About() {
  const { isDark } = useTheme();

  return (
    <div className="min-h-screen">
      <div className={cn("sticky top-0 z-10 backdrop-blur-sm border-b", isDark ? "bg-black/80" : "bg-background/80")}>
        <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Logo size="sm" />
          </div>
          <div className="ml-auto flex items-center gap-4">
            <ThemeToggle />
            <SignedIn>
              <UserNav />
            </SignedIn>
            <SignedOut>
              <div className="flex items-center gap-2">
                <LoginButton />
                <SignUpButton />
              </div>
            </SignedOut>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="font-geist-sans text-4xl font-bold mb-8">Beam for all</h1>
        
        <h2 className="font-geist-sans text-l font-semibold mb-4 mt-8">Our Mission</h2>
        <p className="font-geist-mono text-sm leading-relaxed mb-6">
          To provide a seamless platform for organizing, sharing, and collaborating on image collections. We believe in making image management intuitive and enjoyable.
        </p>

        <h2 className="font-geist-sans text-l font-semibold mb-4 mt-8">Features</h2>
        <p className="font-geist-mono text-sm leading-relaxed mb-6">
          • Drag and drop image uploads
          • Smart organization with galleries
          • Real-time collaboration
          • Annotations and comments
          • Responsive design for all devices
        </p>

        <h2 className="font-geist-sans text-l font-semibold mb-4 mt-8">Technology</h2>
        <p className="font-geist-mono text-sm leading-relaxed mb-6">
          Built with modern web technologies including React, TypeScript, and Tailwind CSS. Our platform emphasizes performance, security, and user experience.
        </p>

        <h2 className="font-geist-sans text-l font-semibold mb-4 mt-8">Contact</h2>
        <p className="font-geist-mono text-sm leading-relaxed">
          Have questions or feedback? We'd love to hear from you. Reach out through our support channels or social media.
        </p>
      </div>
    </div>
  );
}
