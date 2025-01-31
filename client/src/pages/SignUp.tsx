
import { SignUp } from "@clerk/clerk-react";
import { Card } from "@/components/ui/card";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function SignUpPage() {
  const navigate = useNavigate();

  const handleSignUpComplete = async () => {
    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get("inviteToken");
    const gallerySlug = params.get("gallery");
    const email = params.get("email");

    if (inviteToken && email) {
      try {
        const response = await fetch("/auth/verify-magic-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            inviteToken, 
            email,
            userId: sessionStorage.getItem("userId") 
          }),
        });

        if (response.ok) {
          navigate(`/g/${gallerySlug}`);
          return;
        }
      } catch (error) {
        console.error("Failed to verify magic link:", error);
      }
    }
    
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center p-4">
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
          afterSignUpUrl="/dashboard"
          redirectUrl="/dashboard"
          afterSignInUrl="/dashboard"
          signUpUrl={window.location.href}
          afterSignUpComplete={handleSignUpComplete}
        />
      </Card>
    </div>
  );
}
