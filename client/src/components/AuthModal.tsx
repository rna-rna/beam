import { useState } from 'react';
import { SignIn, SignUp } from "@clerk/clerk-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AuthModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: 'sign-in' | 'sign-up';
  redirectUrl?: string;
}

export function AuthModal({ isOpen, onOpenChange, mode = 'sign-in', redirectUrl }: AuthModalProps) {
  const [authMode, setAuthMode] = useState<'sign-in' | 'sign-up'>(mode);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {authMode === 'sign-in' ? 'Welcome Back!' : 'Create an Account'}
          </DialogTitle>
          <DialogDescription>
            {authMode === 'sign-in'
              ? "Sign in to continue leaving comments"
              : "Sign up to start leaving comments"}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {authMode === 'sign-in' ? (
            <SignIn 
              afterSignInUrl={redirectUrl}
              routing="virtual"
              signUpUrl="#sign-up"
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "w-full shadow-none p-0",
                  footer: {
                    display: "none"
                  }
                }
              }}
            />
          ) : (
            <SignUp
              afterSignUpUrl={redirectUrl}
              routing="virtual"
              signInUrl="#sign-in"
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "w-full shadow-none p-0",
                  footer: {
                    display: "none"
                  }
                }
              }}
            />
          )}

          <div className="mt-4 text-center text-sm">
            {authMode === 'sign-in' ? (
              <p>
                Don't have an account?{' '}
                <button
                  onClick={() => setAuthMode('sign-up')}
                  className="text-primary hover:underline"
                >
                  Sign up
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  onClick={() => setAuthMode('sign-in')}
                  className="text-primary hover:underline"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
