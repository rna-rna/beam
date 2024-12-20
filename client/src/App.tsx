import { Switch, Route, useLocation } from "wouter";
import Home from "@/pages/Home";
import Gallery from "@/pages/Gallery";
import { AnimatePresence } from "framer-motion";
import { Layout } from "@/components/Layout";
import { useState, ReactNode } from "react";

function App() {
  const [location] = useLocation();
  const [title, setTitle] = useState("Untitled Project");
  const [headerActions, setHeaderActions] = useState<ReactNode>(null);

  return (
    <Layout title={title} onTitleChange={setTitle} actions={headerActions}>
      <AnimatePresence mode="wait" initial={false}>
        <Switch key={location} location={location}>
          <Route path="/" component={() => <Home title={title} onTitleChange={setTitle} />} />
          <Route path="/gallery/:slug">
            {(params) => (
              <Gallery 
                slug={params.slug} 
                title={title} 
                onTitleChange={setTitle}
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