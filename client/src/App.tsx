import { Switch, Route, useLocation } from "wouter";
import { SignedIn, SignedOut, useUser, useAuth } from "@clerk/clerk-react";
import Home from "@/pages/Home";
import Gallery from "@/pages/Gallery";
import Landing from "@/pages/Landing";
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
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMasonry, setIsMasonry] = useState(true);
  const [isOpenShareModal, setIsOpenShareModal] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [showWithComments, setShowWithComments] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const [location] = useLocation();

  // Get gallery slug from URL if we're on a gallery page
  const gallerySlug = location.startsWith('/g/') ? location.split('/')[2] : null;

  // Title update mutation
  const titleUpdateMutation = useMutation({
    mutationFn: async (newTitle: string) => {
      const token = await getToken();
      if (!token) throw new Error('Authentication required');

      const res = await fetch(`/api/galleries/${gallerySlug}/title`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify({ title: newTitle }),
        credentials: 'include'
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to update title');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/galleries/${gallerySlug}`] });
      toast({
        title: "Success",
        description: "Gallery title updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update title",
        variant: "destructive",
      });
    },
  });

  // Query for specific gallery when on gallery page
  const { data: gallery, isLoading: isGalleryLoading, error: galleryError } = useQuery({
    queryKey: gallerySlug ? [`/api/galleries/${gallerySlug}`] : null,
    enabled: !!gallerySlug,
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
        credentials: 'include'
      });
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('This gallery is private');
        }
        if (res.status === 404) {
          throw new Error('Gallery not found');
        }
        throw new Error('Failed to fetch gallery');
      }
      return res.json();
    }
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">
            {galleryError instanceof Error ? galleryError.message : 'An error occurred'}
          </h1>
          <button
            className="text-primary hover:underline"
            onClick={() => setLocation('/dashboard')}
          >
            Return to Dashboard
          </button>
        </div>
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
          <Landing />
        </SignedOut>
      </Route>

      <Route path="/settings">
        <ProtectedRoute>
          <Layout title="Settings">
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
            gallery={gallery}
            isDarkMode={isDarkMode}
            toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
            openShareModal={() => setIsOpenShareModal(true)}
            toggleSelectionMode={() => {
              if (selectMode) {
                // Reset selection mode state
                setSelectMode(false);
              } else {
                setSelectMode(true);
              }
            }}
            onFilterSelect={(filter) => {
              if (filter === 'starred') {
                setShowStarredOnly(true);
                setShowWithComments(false);
              } else if (filter === 'comments') {
                setShowStarredOnly(false);
                setShowWithComments(true);
              } else {
                setShowStarredOnly(false);
                setShowWithComments(false);
              }
            }}
            toggleGridView={() => setIsMasonry(!isMasonry)}
            isMasonry={isMasonry}
            selectMode={selectMode}
            showStarredOnly={showStarredOnly}
            showWithComments={showWithComments}
            onTitleChange={(newTitle) => titleUpdateMutation.mutate(newTitle)}
          >
            <Gallery
              slug={params.slug}
              onHeaderActionsChange={setHeaderActions}
              title={gallery?.title || "Loading Gallery..."}
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