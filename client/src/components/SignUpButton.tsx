
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SignUpModal } from "@/components/SignUpModal";

export function SignUpButton() {
  const [showSignUpModal, setShowSignUpModal] = useState(false);

  return (
    <>
      <Button 
        variant="ghost" 
        className="hover:underline"
        onClick={() => setShowSignUpModal(true)}
      >
        Sign Up
      </Button>
      <SignUpModal isOpen={showSignUpModal} onClose={() => setShowSignUpModal(false)} />
    </>
  );
}
