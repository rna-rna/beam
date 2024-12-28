import { SignIn } from "@clerk/clerk-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Image as ImageIcon } from "lucide-react";
import { motion } from "framer-motion";

export default function Landing() {
  return (
    <div className="min-h-screen w-full bg-background">
      {/* Hero Section */}
      <div className="relative isolate px-6 pt-14 lg:px-8">
        <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="flex justify-center mb-8"
            >
              <div className="rounded-full bg-primary/10 p-4">
                <ImageIcon className="h-12 w-12 text-primary" />
              </div>
            </motion.div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl mb-6">
              Image Gallery Hub
            </h1>
            <p className="text-lg leading-8 text-muted-foreground mb-12">
              A collaborative platform for managing and sharing image galleries with powerful features and intuitive design.
            </p>

            <Card className="w-full max-w-md mx-auto bg-card">
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl text-center">Welcome back</CardTitle>
                <CardDescription className="text-center">
                  Sign in to your account to continue
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SignIn
                  appearance={{
                    elements: {
                      formButtonPrimary: 'bg-primary text-primary-foreground hover:bg-primary/90',
                      card: 'bg-transparent shadow-none',
                      headerTitle: 'hidden',
                      headerSubtitle: 'hidden',
                      dividerLine: 'bg-border',
                      dividerText: 'text-muted-foreground',
                      formFieldLabel: 'text-foreground',
                      formFieldInput: 'bg-background border-input',
                      footerAction: 'text-primary hover:text-primary/90',
                      socialButtonsBlockButton: 'border-border text-foreground hover:bg-accent',
                      socialButtonsBlockButtonText: 'text-foreground',
                      socialButtonsBlockButtonArrow: 'text-foreground'
                    },
                    layout: {
                      socialButtonsPlacement: 'bottom'
                    }
                  }}
                  afterSignInUrl="/gallery"
                  redirectUrl="/gallery"
                />
              </CardContent>
              <CardFooter className="flex flex-col space-y-4 mt-4">
                <div className="text-sm text-muted-foreground text-center">
                  By signing in, you agree to our Terms of Service and Privacy Policy
                </div>
              </CardFooter>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}