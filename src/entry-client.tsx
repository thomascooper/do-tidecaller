import "@fontsource/marcellus-sc/400.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./styles/app.css";
import { createRoot, hydrateRoot } from "react-dom/client";
import { Calculator } from "./calculator/Calculator";

const root = document.getElementById("root")!;

// Production: the HTML was prerendered, so hydrate it. Dev has no prerender, so render from scratch.
if (import.meta.env.DEV) {
  createRoot(root).render(<Calculator />);
} else {
  hydrateRoot(root, <Calculator />);
}
