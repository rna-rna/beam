import { Switch, Route, useLocation } from "wouter";
import Home from "@/pages/Home";
import Gallery from "@/pages/Gallery";
import { AnimatePresence } from "framer-motion";
import { Layout } from "@/components/Layout";
import { useState } from "react";

function App() {
  const [location] = useLocation();
  const [title, setTitle] = useState("Untitled Project");

  return (
    <Layout title={title} onTitleChange={setTitle}>
      <AnimatePresence mode="wait" initial={false}>
        <Switch key={location} location={location}>
          <Route path="/" component={() => <Home title={title} onTitleChange={setTitle} />} />
          <Route path="/gallery/:slug">
            {(params) => (
              <Gallery 
                slug={params.slug} 
                title={title} 
                onTitleChange={setTitle}
              />
            )}
          </Route>
        </Switch>
      </AnimatePresence>
    </Layout>
  );
}

export default App;