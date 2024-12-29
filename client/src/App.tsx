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
  const { data: gallery } = useQuery({
    queryKey: gallerySlug ? [`/api/galleries/${gallerySlug}`] : [],
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
        // Prevent browser caching
        cache: 'no-store'
      });
      if (!res.ok) throw new Error('Failed to fetch gallery');
      return res.json();
    },
    enabled: !!gallerySlug,
    // Ensure fresh data on each query
    staleTime: 0,
    cacheTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  // Mutation for updating title
  const titleMutation = useMutation({
    mutationFn: async (newTitle: string) => {
      if (!gallerySlug) throw new Error("No gallery found");
      const token = await getToken();
      const res = await fetch(`/api/galleries/${gallerySlug}/title`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: newTitle }),
      });

      if (!res.ok) {
        throw new Error("Failed to update title");
      }

      return (await res.json()).title;
    },
    onMutate: async (newTitle) => {
      await queryClient.cancelQueries({ queryKey: [`/api/galleries/${gallerySlug}`] });
      const previousGallery = queryClient.getQueryData([`/api/galleries/${gallerySlug}`]);
      queryClient.setQueryData([`/api/galleries/${gallerySlug}`], (old: any) => ({
        ...old,
        title: newTitle
      }));
      return { previousGallery };
    },
    onError: (err, newTitle, context) => {
      if (gallerySlug) {
        queryClient.setQueryData([`/api/galleries/${gallerySlug}`], context?.previousGallery);
      }
      toast({
        title: "Error",
        description: "Failed to update title",
        variant: "destructive"
      });
    },
    onSuccess: (data) => {
      if (gallerySlug) {
        queryClient.setQueryData([`/api/galleries/${gallerySlug}`], (old: any) => ({
          ...old,
          title: data
        }));
      }
      toast({
        title: "Success",
        description: "Gallery title updated successfully",
      });
    },
    onSettled: () => {
      if (gallerySlug) {
        queryClient.invalidateQueries({ queryKey: [`/api/galleries/${gallerySlug}`] });
      }
    }
  });

  // Handle redirect on auth state change
  useEffect(() => {
    if (isSignedIn) {
      setLocation("/dashboard");
    }
  }, [isSignedIn, setLocation]);

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
            title={gallery?.title || "Untitled Gallery"}
            onTitleChange={(newTitle) => titleMutation.mutate(newTitle)}
            actions={headerActions}
          >
            <Gallery 
              slug={params.slug}
              onHeaderActionsChange={setHeaderActions}
              title={gallery?.title || "Untitled Gallery"}
            />
          </Layout>
        )}
      </Route>
    </Switch>
  );
}

export default App;