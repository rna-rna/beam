
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Logo } from "@/components/Logo";

export function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const visitCount = Number(sessionStorage.getItem("guestVisitCount") || 0);
    const hasSeenModal = sessionStorage.getItem("hasSeenWelcomeModal");

    if (visitCount < 2 && !hasSeenModal) {
      setIsOpen(true);
      sessionStorage.setItem("guestVisitCount", String(visitCount + 1));
      sessionStorage.setItem("hasSeenWelcomeModal", "true");
    }
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-center">
            Welcome to Beam
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="flex justify-center">
            <Logo size="lg" />
          </div>
          <DialogDescription className="text-base">
            Share and review photos faster and easier with Beam. Create an account to unlock all features!
          </DialogDescription>
          <Separator />
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Get Started</h3>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
              <li>Upload and share images instantly</li>
              <li>Create unlimited galleries</li>
              <li>Add comments and annotations</li>
            </ul>
          </div>
          <Button className="w-full" onClick={() => setIsOpen(false)}>
            Start Exploring
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
