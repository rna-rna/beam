
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowRight } from "lucide-react";

interface OnboardingDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OnboardingDialog({ isOpen, onOpenChange }: OnboardingDialogProps) {
  const [step, setStep] = useState(1);

  // Content for each step in the onboarding process
  const stepContent = [
    {
      title: "Welcome to Beam",
      description:
        "A platform designed to make sharing and reviewing creative content faster, easier, and more collaborative.",
      image: "https://via.placeholder.com/382x216/4F46E5/FFFFFF?text=Welcome+to+Beam"
    },
    {
      title: "Upload your content",
      description:
        "Easily upload and organize your creative work for sharing with clients and team members.",
      image: "https://via.placeholder.com/382x216/4F46E5/FFFFFF?text=Upload+Content"
    },
    {
      title: "Collaborate with comments",
      description: "Get feedback directly on your work through our intuitive commenting system.",
      image: "https://via.placeholder.com/382x216/4F46E5/FFFFFF?text=Collaboration"
    },
    {
      title: "Ready to start?",
      description: "Let's begin creating and sharing your amazing work with Beam.",
      image: "https://via.placeholder.com/382x216/4F46E5/FFFFFF?text=Get+Started"
    },
  ];

  const totalSteps = stepContent.length;

  // Reset step when dialog is opened
  useEffect(() => {
    if (isOpen) {
      setStep(1);
    }
  }, [isOpen]);

  const handleContinue = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 [&>button:last-child]:text-white">
        <div className="p-2">
          <img
            className="w-full rounded-lg"
            src={stepContent[step - 1].image}
            width={382}
            height={216}
            alt="Onboarding illustration"
          />
        </div>
        <div className="space-y-6 px-6 pb-6 pt-3">
          <DialogHeader>
            <DialogTitle>{stepContent[step - 1].title}</DialogTitle>
            <DialogDescription>{stepContent[step - 1].description}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex justify-center space-x-1.5 max-sm:order-1">
              {[...Array(totalSteps)].map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    "h-1.5 w-1.5 rounded-full bg-primary",
                    index + 1 === step ? "bg-primary" : "opacity-20",
                  )}
                />
              ))}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  Skip
                </Button>
              </DialogClose>
              {step < totalSteps ? (
                <Button className="group" type="button" onClick={handleContinue}>
                  Next
                  <ArrowRight
                    className="-me-1 ms-2 opacity-60 transition-transform group-hover:translate-x-0.5"
                    size={16}
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                </Button>
              ) : (
                <DialogClose asChild>
                  <Button type="button">Get Started</Button>
                </DialogClose>
              )}
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
