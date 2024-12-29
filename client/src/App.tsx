import { Switch, Route, useLocation } from "wouter";
import { SignedIn, SignedOut, useUser, useAuth } from "@clerk/clerk-react";
import Home from "@/pages/Home";
import Gallery from "@/pages/Gallery";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import { Layout } from "@/components/Layout";
import { useState, ReactNode, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// Protected route wrapper component
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded } = useUser();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setLocation("/");
    }
  }, [isLoaded, isSignedIn, setLocation]);

  // Show nothing while loading
  if (!isLoaded) return null;

  // Show children only when signed in
  return isSignedIn ? children : null;
}

function App() {
  const [headerActions, setHeaderActions] = useState<ReactNode>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { isSignedIn, user } = useUser();
  const { getToken } = useAuth();
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

  // Mutation for updating title with optimistic updates
  const titleMutation = useMutation({
    mutationFn: async (newTitle: string) => {
      if (!gallerySlug) throw new Error("No gallery found");
      const token = await getToken();
      const res = await fetch(`/api/galleries/${gallerySlug}/title`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify({ title: newTitle }),
      });

      if (!res.ok) {
        throw new Error("Failed to update title");
      }

      return (await res.json()).title;
    },
    onMutate: async (newTitle) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: [`/api/galleries/${gallerySlug}`] });
      await queryClient.cancelQueries({ queryKey: ['/api/galleries'] });

      // Snapshot the previous values
      const previousGallery = queryClient.getQueryData([`/api/galleries/${gallerySlug}`]);
      const previousGalleries = queryClient.getQueryData(['/api/galleries']);

      // Optimistically update the gallery title
      queryClient.setQueryData([`/api/galleries/${gallerySlug}`], (old: any) => ({
        ...old,
        title: newTitle
      }));

      // Also update the gallery in the list
      queryClient.setQueryData(['/api/galleries'], (old: any) => {
        if (!old) return old;
        return old.map((g: any) => 
          g.slug === gallerySlug ? { ...g, title: newTitle } : g
        );
      });

      return { previousGallery, previousGalleries };
    },
    onError: (err, newTitle, context) => {
      // Revert back to the previous values if there's an error
      if (context?.previousGallery) {
        queryClient.setQueryData([`/api/galleries/${gallerySlug}`], context.previousGallery);
      }
      if (context?.previousGalleries) {
        queryClient.setQueryData(['/api/galleries'], context.previousGalleries);
      }
      toast({
        title: "Error",
        description: "Failed to update title",
        variant: "destructive"
      });
    },
    onSettled: () => {
      // Invalidate and refetch to ensure our optimistic update matches the server state
      queryClient.invalidateQueries({ queryKey: [`/api/galleries/${gallerySlug}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/galleries'] });
    }
  });

  // Handle redirect on auth state change
  useEffect(() => {
    if (isSignedIn) {
      setLocation("/dashboard");
    }
  }, [isSignedIn, setLocation]);

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
          <Layout>
            <Dashboard />
          </Layout>
        </SignedIn>
        <SignedOut>
          <Landing />
        </SignedOut>
      </Route>

      <Route path="/dashboard">
        <ProtectedRoute>
          <Layout 
            title="My Galleries"
            actions={headerActions}
          >
            <Dashboard />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/g/:slug">
        {(params) => (
          <Layout 
            title={gallery?.title || "Loading Gallery..."}
            onTitleChange={(newTitle) => titleMutation.mutate(newTitle)}
            actions={headerActions}
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

export default App;