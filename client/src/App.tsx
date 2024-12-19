import { Switch, Route } from "wouter";
import Home from "@/pages/Home";
import Gallery from "@/pages/Gallery";

function App() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/gallery/:slug" component={Gallery} />
    </Switch>
  );
}

export default App;
