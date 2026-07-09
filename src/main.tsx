import { createRoot } from "react-dom/client";
import ErrorBoundary from "./components/ErrorBoundary";
import App from "./App.tsx";
import "./index.css";
import { initStore } from "@/lib/store";


const render = () => {
  createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
};

const timeout = new Promise<void>((resolve) => setTimeout(resolve, 3000));

// Always render the app — never block on initStore. Catch any init error silently.
Promise.race([initStore().catch((e) => console.error("initStore failed:", e)), timeout])
  .then(render)
  .catch((e) => {
    console.error("Bootstrap error:", e);
    render();
  });
