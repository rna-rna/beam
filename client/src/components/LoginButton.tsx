
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LoginModal } from "@/components/LoginModal";

export function LoginButton() {
  const [showLoginModal, setShowLoginModal] = useState(false);

  return (
    <>
      <Button 
        variant="ghost" 
        className="hover:underline"
        onClick={() => setShowLoginModal(true)}
      >
        Login
      </Button>
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </>
  );
}
