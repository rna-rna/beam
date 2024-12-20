import { Switch, Route } from "wouter";
import Home from "@/pages/Home";
import Gallery from "@/pages/Gallery";
import { Layout } from "@/components/Layout";
import { useState, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

function App() {
  const [headerActions, setHeaderActions] = useState<ReactNode>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query for current gallery
  const { data: gallery } = useQuery({
    queryKey: ['/api/galleries/current'],
    queryFn: async () => {
      const res = await fetch('/api/galleries/current');
      if (!res.ok) throw new Error('Failed to fetch current gallery');
      return res.json();
    },
    enabled: true,
    staleTime: 0,
  });

  // Mutation for updating title
  const titleMutation = useMutation({
    mutationFn: async (newTitle: string) => {
      if (!gallery?.slug) return newTitle;

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
    onSuccess: (newTitle) => {
      queryClient.invalidateQueries({ queryKey: ['/api/galleries/current'] });
      toast({
        title: "Success",
        description: "Gallery title updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update title",
        variant: "destructive"
      });
    }
  });

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
            />
          )}
        </Route>
      </Switch>
    </Layout>
  );
}

export default App;