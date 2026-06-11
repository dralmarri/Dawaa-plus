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

Promise.race([initStore(), timeout]).then(render).catch(render);

// Remove any Lovable badge elements injected into the DOM
const removeLovableElements = (root: ParentNode) => {
  const selectors = [
    'iframe[src*="lovable"]',
    '[id*="lovable"]',
    '[src*="lovable"]',
    'a[href*="lovable"]',
  ];
  selectors.forEach((sel) => {
    root.querySelectorAll(sel).forEach((el) => el.remove());
  });
};

const checkNode = (node: Node) => {
  if (node.nodeType !== 1) return;
  const el = node as Element;
  const src = el.getAttribute?.("src") || "";
  const id = el.getAttribute?.("id") || "";
  const href = el.getAttribute?.("href") || "";
  if (
    src.toLowerCase().includes("lovable") ||
    id.toLowerCase().includes("lovable") ||
    href.toLowerCase().includes("lovable")
  ) {
    el.remove();
    return;
  }
  removeLovableElements(el);
};

if (typeof window !== "undefined" && typeof MutationObserver !== "undefined") {
  removeLovableElements(document);
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach(checkNode);
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
