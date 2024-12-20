import { Switch, Route, useLocation } from "wouter";
import Home from "@/pages/Home";
import Gallery from "@/pages/Gallery";
import { AnimatePresence } from "framer-motion";
import { Layout } from "@/components/Layout";
import { useState, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

function App() {
  const [location] = useLocation();
  const [headerActions, setHeaderActions] = useState<ReactNode>(null);
  const queryClient = useQueryClient();

  // Query for gallery title
  const { data: title = "Untitled Project" } = useQuery({
    queryKey: ['galleryTitle'],
    queryFn: () => "Untitled Project", // Initial title
    staleTime: Infinity,
  });

  // Mutation for updating title
  const titleMutation = useMutation({
    mutationFn: async (newTitle: string) => {
      // Update title in all open galleries
      const galleries = queryClient.getQueriesData(['gallery']);
      for (const [, data] of galleries) {
        if (data && 'slug' in data) {
          await fetch(`/api/galleries/${data.slug}/title`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: newTitle }),
          });
        }
      }
      return newTitle;
    },
    onMutate: async (newTitle) => {
      // Optimistically update title
      queryClient.setQueryData(['galleryTitle'], newTitle);
    },
  });

  return (
    <Layout 
      title={title} 
      onTitleChange={(newTitle) => titleMutation.mutate(newTitle)} 
      actions={headerActions}
    >
      <AnimatePresence mode="wait" initial={false}>
        <Switch key={location} location={location}>
          <Route 
            path="/" 
            component={() => (
              <Home 
                title={title} 
                onTitleChange={(newTitle) => titleMutation.mutate(newTitle)} 
              />
            )} 
          />
          <Route path="/gallery/:slug">
            {(params) => (
              <Gallery 
                slug={params.slug} 
                title={title}
                onTitleChange={(newTitle) => titleMutation.mutate(newTitle)}
                onHeaderActionsChange={setHeaderActions}
              />
            )}
          </Route>
        </Switch>
      </AnimatePresence>
    </Layout>
  );
}

export default App;