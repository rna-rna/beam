import { Switch, Route, useLocation } from "wouter";
import { SignedIn, SignedOut, useUser, useAuth, useClerk } from "@clerk/clerk-react";
import { AnimatePresence } from "framer-motion";
import Home from "@/pages/Home";
import Gallery from "@/pages/Gallery";
import Landing from "@/pages/Landing";
import SignUpPage from "@/pages/SignUp";
import Dashboard from "@/pages/Dashboard";
import Settings from "@/pages/Settings";
import { Layout } from "@/components/Layout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useState, ReactNode, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import About from "@/pages/About"; // Added import for About page
import NewGallery from "@/pages/NewGallery";
import { UploadProvider } from "./context/UploadContext"; // Import UploadProvider
import GlobalUploadProgress from "./components/GlobalUploadProgress";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card"; // Added import for Card and CardContent
import { AlertCircle } from "lucide-react";
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { FolderPage } from "./pages/FolderPage"; // Added import for FolderPage
import RecentsPage from "@/pages/RecentsPage"; //Added import for RecentsPage
import TrashPage from "@/pages/TrashPage"; // Added import for TrashPage
import { NotificationProvider } from "@/context/NotificationContext"; // Added import for NotificationProvider
import MagicLinkLanding from "@/pages/MagicLinkLanding"; // Added import for MagicLinkLanding
import ProjectsPage from '@/pages/ProjectsPage'; // Added import for ProjectsPage
import React from 'react';
import Intercom from '@intercom/messenger-js-sdk';
import { initMixpanel, mixpanel } from "@/lib/analytics"; //Added import for Mixpanel

if (!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) {
  throw new Error("Missing Clerk Publishable Key");
}

// Protected route wrapper component
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded } = useUser();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setLocation("/");
    }
  }, [isLoaded, isSignedIn, setLocation]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return isSignedIn ? children : null;
}

function AppContent() {
  const [headerActions, setHeaderActions] = useState<ReactNode>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const { signOut, session } = useClerk();

  useEffect(() => {
    if (session?.status === "expired") {
      session.refresh()
        .then(() => {
          console.log("Session refreshed successfully");
          queryClient.invalidateQueries();
        })
        .catch((error) => {
          console.error("Session refresh failed:", error);
          toast({
            title: "Session Expired",
            description: "Please sign in again",
            variant: "destructive"
          });
          signOut();
          setLocation("/");
        });
    }
  }, [session, signOut, setLocation, queryClient, toast]);
  const [location] = useLocation();

  // Get gallery slug from URL if we're on a gallery page
  const gallerySlug = location.startsWith('/g/') ? location.split('/')[2] : null;

  // Query for specific gallery when on gallery page
  const { data: gallery, isLoading: isGalleryLoading, error: galleryError } = useQuery({
    queryKey: gallerySlug ? [`/api/galleries/${gallerySlug}`] : null,
    queryFn: async () => {
      if (!gallerySlug) return null;
      const token = await getToken();
      const headers: HeadersInit = {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`/api/galleries/${gallerySlug}`, {
        headers,
        cache: 'no-store',
        credentials: 'include'
      });
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Private Gallery');
        }
        if (res.status === 403) {
          throw new Error('Request access from the owner');
        }
        throw new Error('Failed to fetch gallery');
      }
      return res.json();
    },
    enabled: !!gallerySlug,
    staleTime: 0,
    retry: false,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  useEffect(() => {
    if (gallerySlug && gallery?.title) {
      document.title = `${gallery.title} | Beam`;
    } else {
      document.title = 'Beam';
    }

    return () => {
      document.title = 'Beam';
    };
  }, [gallerySlug, gallery?.title]);

  // Title update mutation
  const handleTitleUpdate = async (newTitle: string) => {
    if (!gallerySlug) return;

    try {
      const token = await getToken();
      const res = await fetch(`/api/galleries/${gallerySlug}/title`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify({ title: newTitle }),
      });

      if (!res.ok) {
        throw new Error('Failed to update title');
      }

      queryClient.invalidateQueries({ queryKey: [`/api/galleries/${gallerySlug}`] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update title. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle redirect on auth state change - only redirect from root path
  useEffect(() => {
    if (isSignedIn && location === "/") {
      setLocation("/dashboard");
    }
  }, [isSignedIn, location, setLocation]);

  if (gallerySlug && isGalleryLoading) {
    return (
      <Layout
        title="Loading Gallery..."
        onTitleChange={handleTitleUpdate}
        actions={headerActions}
      >
        <div className="min-h-[50vh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (gallerySlug && galleryError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <h1 className="text-2xl font-semibold">Gallery Not Found</h1>
              <p className="text-muted-foreground">
                {galleryError instanceof Error ? galleryError.message : 'The gallery you are looking for does not exist or has been removed.'}
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setLocation('/dashboard')}
              >
                Return to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Layout
      title={gallery?.title}
      onTitleChange={(newTitle) => handleTitleUpdate(newTitle)}
      actions={headerActions}
    >
      <div className="w-full flex-1">
          <AnimatePresence mode="wait">
            <Switch>
        <Route path="/new">
          <SignedIn>
            <NewGallery />
          </SignedIn>
          <SignedOut>
            <Home />
          </SignedOut>
          </Route>
      <Route path="/">
        <SignedIn>
          <Dashboard />
        </SignedIn>
        <SignedOut>
          <Home />
        </SignedOut>
      </Route>

      <Route path="/sign-up">
        <SignedOut>
          <SignUpPage />
        </SignedOut>
        <SignedIn>
          <Dashboard />
        </SignedIn>
      </Route>
      <Route path="/sign-up/magic-link" component={MagicLinkLanding} />

      <Route path="/settings">
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      </Route>

      <Route path="/dashboard">
        <ProtectedRoute>
          <RecentsPage />
        </ProtectedRoute>
      </Route>

      <Route path="/dashboard/recents" component={RecentsPage} />
        <Route path="/dashboard/projects" component={ProjectsPage} />
        <Route path="/dashboard/trash" component={TrashPage} />

      <Route path="/g/:slug">
        {(params) => (
          <Gallery
            slug={params.slug}
            onHeaderActionsChange={setHeaderActions}
            title={gallery?.title || "Loading Gallery..."}
            onTitleChange={(newTitle) => handleTitleUpdate(newTitle)}
          />
        )}
      </Route>
      <Route path="/f/:folderSlug" component={FolderPage} />
      <Route path="/about">
        <About />
      </Route>


        </Switch>
          </AnimatePresence>
      </div>
    </Layout>
  );
}

function IntercomProvider() {
  const { isSignedIn, user } = useUser();

  useEffect(() => {
    if (isSignedIn && user) {
      Intercom({
        app_id: 'nddy1kg6',
        user_id: user.id,
        name: user.name,
        email: user.email,
        created_at: Math.floor(user.createdAt.getTime() / 1000) // Convert Date to Unix timestamp
      });
    }
  }, [isSignedIn, user]);

  return null;
}

function MixpanelProvider() {
  const { isSignedIn, user } = useUser();

  useEffect(() => {
    // Initialize Mixpanel for all users
    initMixpanel();

    // Identify user if they're signed in
    if (isSignedIn && user) {
      mixpanel.identify(user.id);
      
      // Set complete user profile information
      mixpanel.people.set({
        $first_name: user.firstName,
        $last_name: user.lastName,
        $name: [user.firstName, user.lastName].filter(Boolean).join(" "),
        $email: user.primaryEmailAddress?.emailAddress,
        $created: user.createdAt,
        username: user.username,
        imageUrl: user.imageUrl
      });
    }
  }, [isSignedIn, user]);

  return null;
}

function App() {
  const { isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <UploadProvider>
        <NotificationProvider>
          <AppContent />
          <GlobalUploadProgress />
          <IntercomProvider />
          <MixpanelProvider />
        </NotificationProvider>
      </UploadProvider>
    </DndProvider>
  );
}
import { ClerkProvider } from "@clerk/clerk-react";
import { dark } from "@clerk/themes";
import { useTheme } from "@/hooks/use-theme";

function AppRoot() {
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
        }
      }}
    >
      {/* Rest of your application */}
    </ClerkProvider>
  );
}

export default AppRoot;
