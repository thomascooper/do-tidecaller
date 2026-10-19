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

if (import.meta.env.DEV) {
  // Dev has no prerender: render whichever route matches the URL, with the site header and footer.
  const [{ routes }, { Layout }] = await Promise.all([import("./routes"), import("./components/Layout")]);
  const path = location.pathname.replace(/(.)\/$/, "$1");
  const route = routes.find((r) => r.path === path) ?? routes.find((r) => r.path === "/404")!;
  const paths = routes.filter((r) => !r.noindex).map((r) => r.path);
  void import("./tips/tips");
  document.getElementById("main")!.replaceWith(root);
  createRoot(root).render(
    <Layout path={route.path} paths={paths}>
      {route.render()}
    </Layout>,
  );
} else {
  // Production: the HTML was prerendered, so hydrate it. Only the calculator page ships this script.
  hydrateRoot(root, <Calculator />);
}
