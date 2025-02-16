
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Globe } from "lucide-react";
import { useState } from "react";
import { SignUpModal } from "@/components/SignUpModal";

export default function GuestUploadCard() {
  const [showSignUpModal, setShowSignUpModal] = useState(false);

  return (
    <>
      <Card className="w-96 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Try Beam Now
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="font-geist-mono text-sm">Sign up as an early access account.</p>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Create a free account to:</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Enable comments and feedback</li>
              <li>• Bulk download files</li>
              <li>• Organize your projects</li>
            </ul>
            <button 
              onClick={() => setShowSignUpModal(true)} 
              className="text-sm font-medium text-primary hover:underline cursor-pointer dark:text-primary-foreground"
            >
              Unlock all features – Sign up for free
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Modal for sign-up */}
      <SignUpModal isOpen={showSignUpModal} onClose={() => setShowSignUpModal(false)} />
    </>
  );
}
