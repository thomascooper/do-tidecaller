import "@fontsource/marcellus-sc/400.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./styles/app.css";
import { createRoot } from "react-dom/client";
import { Calculator } from "./calculator/Calculator";

createRoot(document.getElementById("root")!).render(<Calculator />);
