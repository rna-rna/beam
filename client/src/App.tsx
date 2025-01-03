import { Switch, Route, useLocation } from "wouter";
import { SignedIn, SignedOut, useUser, useAuth } from "@clerk/clerk-react";
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
  const [location] = useLocation();
  
  // Get gallery slug from URL if we're on a gallery page
  const gallerySlug = location.startsWith('/g/') ? location.split('/')[2] : null;

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
          throw new Error('Gallery not found');
        }
        if (res.status === 403) {
          throw new Error('This gallery is private');
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

  // Handle redirect on auth state change - only redirect from root path
  useEffect(() => {
    if (isSignedIn && location === "/") {
      setLocation("/dashboard");
    }
  }, [isSignedIn, location, setLocation]);

  if (gallerySlug && isGalleryLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
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
    <Switch>
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

      <Route path="/settings">
        <ProtectedRoute>
          <Layout>
            <Settings />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/dashboard">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>

      <Route path="/g/:slug">
        {(params) => (
          <Layout
            title={gallery?.title || "Loading Gallery..."}
            actions={headerActions}
            onTitleChange={(newTitle) => handleTitleUpdate(newTitle)}
          >
            <Gallery
              slug={params.slug}
              onHeaderActionsChange={setHeaderActions}
              title={gallery?.title || "Loading Gallery..."}
              onTitleChange={(newTitle) => handleTitleUpdate(newTitle)}
            />
          </Layout>
        )}
      </Route>
    </Switch>
  );
}

export default function App() {
  const { isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <AppContent />;
}