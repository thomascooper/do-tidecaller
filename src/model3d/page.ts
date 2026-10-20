// The 3D character on content pages (/bis): finds each sheet figure marked with data-model3d and mounts the
// viewer, with the same lazy loading, fallback, hint, race and gender buttons and storage as the calculator.
// Plain TypeScript with no React; the calculator's sheet does the same job in CharacterSheet.tsx.
import { modelId, racesFor, type Gender, type ViewerItem } from "./data";
import { raceFor, readLook, saveLook, type Look } from "./look";
import { createViewer, hasWebGL, type ViewerHandle } from "./viewer";

interface Marked {
  faction: string;
  items: ViewerItem[];
}

function mount(fig: HTMLElement, { faction, items }: Marked): void {
  const box = fig.querySelector<HTMLElement>(".viewer");
  if (!box) return;
  let look = readLook();
  let handle: ViewerHandle | undefined;
  let controls: HTMLElement[] = [];
  let turn = 0;

  const clear = () => {
    for (const c of controls) c.remove();
    controls = [];
    fig.classList.remove("live");
  };

  const paint = () => {
    const race = raceFor(faction, look);
    const group = controls[0];
    for (const b of group?.querySelectorAll("button") ?? []) {
      const on = b.dataset.race ? b.dataset.race === race.race : b.dataset.gender === look.gender;
      b.setAttribute("aria-pressed", String(on));
    }
  };

  const choose = (next: Look) => {
    look = next;
    saveLook(next);
    paint();
    build();
  };

  const controlsFor = () => {
    const group = document.createElement("div");
    group.className = "look";
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", "Race and gender");
    const add = (label: string, data: "race" | "gender", value: string) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      if (data === "race") b.title = label;
      b.dataset[data] = value;
      b.addEventListener("click", () => choose(data === "race" ? { ...look, race: value } : { ...look, gender: value as Gender }));
      group.appendChild(b);
    };
    for (const r of racesFor(faction)) add(r.race, "race", r.race);
    for (const g of ["male", "female"] as Gender[]) add(g === "male" ? "Male" : "Female", "gender", g);
    const hint = document.createElement("p");
    hint.className = "hint";
    hint.textContent = "Drag to turn. Ctrl + scroll to zoom.";
    fig.append(group, hint);
    controls = [group, hint];
    paint();
  };

  // Draws (or redraws) the model for the current look; a failure puts the totem art back.
  const build = () => {
    const mine = ++turn;
    handle?.destroy();
    handle = undefined;
    createViewer(box, modelId(raceFor(faction, look), look.gender), items).then(
      (h) => {
        if (mine !== turn) return h.destroy();
        handle = h;
        h.setItems(items);
        fig.classList.add("live");
        if (!controls.length) controlsFor();
      },
      (e) => {
        if (mine !== turn) return;
        clear();
        console.warn("3D character unavailable:", e);
      },
    );
  };

  const watch = new IntersectionObserver(
    (seen) => {
      if (!seen.some((e) => e.isIntersecting)) return;
      watch.disconnect();
      build();
    },
    { rootMargin: "200px" },
  );
  watch.observe(box);
}

if (hasWebGL() && window.matchMedia("(min-width: 761px)").matches) {
  for (const fig of document.querySelectorAll<HTMLElement>("[data-model3d]")) {
    try {
      mount(fig, JSON.parse(fig.dataset.model3d ?? "") as Marked);
    } catch (e) {
      console.warn("3D character unavailable:", e);
    }
  }
}
