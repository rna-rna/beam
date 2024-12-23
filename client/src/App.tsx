import { Switch, Route } from "wouter";
import Home from "@/pages/Home";
import Gallery from "@/pages/Gallery";
import AuthPage from "@/pages/AuthPage";
import { Layout } from "@/components/Layout";
import { useState, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { Loader2 } from "lucide-react";

function App() {
  const [headerActions, setHeaderActions] = useState<ReactNode>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useUser();

  // Query for current gallery
  const { data: gallery, isLoading: galleryLoading } = useQuery({
    queryKey: ['/api/galleries/current'],
    queryFn: async () => {
      const res = await fetch('/api/galleries/current');
      if (!res.ok) throw new Error('Failed to fetch current gallery');
      return res.json();
    },
    enabled: !!user, // Only fetch when user is authenticated
  });

  // Mutation for updating title
  const titleMutation = useMutation({
    mutationFn: async (newTitle: string) => {
      if (!gallery?.slug) throw new Error("No gallery found");

      const res = await fetch(`/api/galleries/${gallery.slug}/title`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
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

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  // Show auth page if not logged in
  if (!user) {
    return <AuthPage />;
  }

  // Show loading while fetching initial gallery data
  if (galleryLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <Layout 
      title={gallery?.title || "Untitled Project"} 
      onTitleChange={(newTitle) => titleMutation.mutate(newTitle)}
      actions={headerActions}
    >
      <Switch>
        <Route 
          path="/" 
          component={() => (
            <Home 
              title={gallery?.title || "Untitled Project"}
              onTitleChange={(newTitle) => titleMutation.mutate(newTitle)}
            />
          )} 
        />
        <Route path="/gallery/:slug">
          {(params) => (
            <Gallery 
              slug={params.slug}
              onHeaderActionsChange={setHeaderActions}
              title={gallery?.title || "Untitled Project"}
            />
          )}
        </Route>
      </Switch>
    </Layout>
  );
}

export default App;