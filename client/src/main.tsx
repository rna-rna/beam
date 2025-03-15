import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { ClerkProvider } from "@clerk/clerk-react";
import { dark } from "@clerk/themes";
import { ThemeProvider } from "@/hooks/use-theme";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import App from './App';
import "./index.css";

// Validate environment variable
if (!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) {
  throw new Error("VITE_CLERK_PUBLISHABLE_KEY is required. Please add it to your environment variables.");
}

console.log("Initializing Clerk with publishable key...");

import { useTheme } from "@/hooks/use-theme";

// This function will provide the theme to ClerkProvider
function ClerkWithTheme({ children }) {
  const { isDark } = useTheme();
  return (
    <ClerkProvider 
      publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
      appearance={{
        baseTheme: isDark ? dark : undefined,
        elements: {
          formButtonPrimary: 'bg-primary text-primary-foreground hover:bg-primary/90',
          card: 'bg-background shadow-none',
          otpCodeField: 'dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-500 dark:focus:ring-1 dark:focus:ring-zinc-500',
          headerTitle: 'text-foreground',
          socialButtonsBlockButton: 'bg-background border border-input hover:bg-accent hover:text-accent-foreground',
          socialButtonsBlockButtonText: 'text-foreground',
          footerActionLink: 'text-primary hover:text-primary/90',
          navbar: 'bg-background',
          navbarButton: 'bg-transparent hover:bg-transparent',
          headerSubtitle: 'text-muted-foreground',
          dividerLine: 'bg-border',
          dividerText: 'text-muted-foreground',
          formFieldLabel: 'text-foreground',
          formFieldInput: 'bg-background border border-input',
          formButtonReset: 'text-muted-foreground hover:text-foreground',
          userButtonPopoverCard: 'bg-background border border-border shadow-md',
          userButtonPopoverActionButton: 'text-foreground hover:bg-accent hover:text-accent-foreground',
          userButtonPopoverActionButtonText: 'text-foreground',
          avatarBox: 'text-foreground'
        }
      }}
    >
      {children}
    </ClerkProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <ClerkWithTheme>
          <QueryClientProvider client={queryClient}>
            <App />
            <Toaster />
          </QueryClientProvider>
        </ClerkWithTheme>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
);
