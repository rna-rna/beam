
import { useState, useEffect } from "react";
import { OnboardingDialog } from "@/components/OnboardingDialog";

export function DashboardOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  useEffect(() => {
    // Check if this is the user's first visit
    const hasSeenOnboarding = localStorage.getItem("beam_onboarding_seen");
    
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
      // Mark that user has seen onboarding
      localStorage.setItem("beam_onboarding_seen", "true");
    }
  }, []);

  return (
    <OnboardingDialog 
      isOpen={showOnboarding} 
      onOpenChange={(open) => setShowOnboarding(open)} 
    />
  );
}
