import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { ClerkProvider } from "@clerk/clerk-react";
import { ThemeProvider } from "@/hooks/use-theme";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import App from './App';
import "./index.css";

// Validate environment variable
if (!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) {
  throw new Error("VITE_CLERK_PUBLISHABLE_KEY is required. Please add it to your environment variables.");
}

console.log("Initializing Clerk with publishable key...");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <ClerkProvider 
        publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
        appearance={{
          baseTheme: undefined, // ThemeProvider will handle this
          elements: {
            formButtonPrimary: 'bg-primary text-primary-foreground hover:bg-primary/90',
            card: 'bg-background shadow-none',
            otpCodeField: 'dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-500 dark:focus:ring-1 dark:focus:ring-zinc-500',
          }
        }}
      >
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <App />
            <Toaster />
          </QueryClientProvider>
        </ThemeProvider>
      </ClerkProvider>
    </ErrorBoundary>
  </StrictMode>,
);