
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SignUpModal } from "@/components/SignUpModal";

export function SignUpButton() {
  const [showSignUpModal, setShowSignUpModal] = useState(false);

  return (
    <>
      <Button 
        variant="ghost" 
        className="hover:bg-[#A7DE43] bg-[#BEF853] text-black"
        onClick={() => setShowSignUpModal(true)}
      >
        Sign Up
      </Button>
      <SignUpModal isOpen={showSignUpModal} onClose={() => setShowSignUpModal(false)} />
    </>
  );
}
