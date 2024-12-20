import { Switch, Route, useLocation } from "wouter";
import Home from "@/pages/Home";
import Gallery from "@/pages/Gallery";
import { AnimatePresence } from "framer-motion";

function App() {
  const [location] = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Switch key={location} location={location}>
        <Route path="/" component={Home} />
        <Route path="/gallery/:slug" component={Gallery} />
      </Switch>
    </AnimatePresence>
  );
}

export default App;