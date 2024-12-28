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

  // Query for current gallery
  const { data: gallery } = useQuery({
    queryKey: ['/api/galleries/current'],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch('/api/galleries/current', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch current gallery');
      return res.json();
    },
    enabled: isSignedIn && !!user,
  });

  // Mutation for updating title
  const titleMutation = useMutation({
    mutationFn: async (newTitle: string) => {
      if (!gallery?.slug) throw new Error("No gallery found");
      const token = await getToken();
      const res = await fetch(`/api/galleries/${gallery.slug}/title`, {
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
      await queryClient.cancelQueries({ queryKey: ['/api/galleries/current'] });
      const previousGallery = queryClient.getQueryData(['/api/galleries/current']);
      queryClient.setQueryData(['/api/galleries/current'], (old: any) => ({
        ...old,
        title: newTitle
      }));
      return { previousGallery };
    },
    onError: (err, newTitle, context) => {
      queryClient.setQueryData(['/api/galleries/current'], context?.previousGallery);
      toast({
        title: "Error",
        description: "Failed to update title",
        variant: "destructive"
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/galleries/current'], (old: any) => ({
        ...old,
        title: data
      }));
      toast({
        title: "Success",
        description: "Gallery title updated successfully",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/galleries/current'] });
    }
  });

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
            title={gallery?.title || "Gallery"}
            onTitleChange={(newTitle) => titleMutation.mutate(newTitle)}
            actions={headerActions}
          >
            <Gallery 
              slug={params.slug}
              onHeaderActionsChange={setHeaderActions}
              title={gallery?.title || "Gallery"}
            />
          </Layout>
        )}
      </Route>
    </Switch>
  );
}

export default App;