// Loads Wowhead's model viewer and draws a character with it (PRD 006, "How the 3D character works").
// Plain TypeScript with no React, so the calculator sheet and the /bis script share it.
// The model files come from our own domain at /modelviewer/, which Vercel relays to Wowhead.
import type { ViewerItem } from "./data";

const BASE = "/modelviewer/classicplus/";

interface ViewerOptions {
  type: number;
  contentPath: string;
  container: unknown;
  aspect: number;
  hd: boolean;
  items: ViewerItem[];
  models: { id: number; type: number };
  charCustomization: { options: { optionId: number; choiceId: number }[] };
  wheelEventValidation: (e: { originalEvent?: { ctrlKey?: boolean; metaKey?: boolean } }) => boolean;
}

interface ZamViewer {
  method(name: string, arg: unknown): void;
}

declare global {
  interface Window {
    ZamModelViewer?: new (options: ViewerOptions) => ZamViewer;
    jQuery?: unknown;
    $?: unknown;
    WH?: Record<string, unknown>;
  }
}

export interface ViewerHandle {
  /** Clears and sets only the slots that differ from what is drawn now. */
  setItems(items: ViewerItem[]): void;
  destroy(): void;
}

/** Whether this browser can make a WebGL context at all. */
export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

let scriptReady: Promise<void> | undefined;

/** jQuery and the WH globals the viewer expects, then the viewer script itself, once per page. */
function loadScript(): Promise<void> {
  scriptReady ??= (async () => {
    const jq = (await import("jquery")).default;
    window.jQuery = jq;
    window.$ = jq;
    const wh = (window.WH ??= {});
    wh.debug ??= () => {};
    wh.defaultAnimation ??= "Stand";
    wh.WebP ??= { getImageExtension: () => ".webp" };
    const wow = (wh.Wow ??= {}) as Record<string, unknown>;
    wow.Item ??= { INVENTORY_TYPE_SHOULDERS: 3, INVENTORY_TYPE_CHEST: 5, INVENTORY_TYPE_ROBE: 20 };
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = `${BASE}viewer/viewer.min.js`;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("model viewer script did not load"));
      document.head.appendChild(s);
    });
    if (!window.ZamModelViewer) throw new Error("model viewer script defined no viewer");
  })();
  // A failure is not kept: the next try may succeed.
  scriptReady.catch(() => (scriptReady = undefined));
  return scriptReady;
}

/** Draws the character model into `el` wearing `items`, with the game's default look. */
export async function createViewer(el: HTMLElement, model: number, items: ViewerItem[]): Promise<ViewerHandle> {
  await loadScript();
  const res = await fetch(`${BASE}meta/charactercustomization/${model}.json`);
  if (!res.ok) throw new Error(`customization file ${res.status}`);
  const json = (await res.json()) as { data?: unknown } & Record<string, unknown>;
  const data = (json.data ?? json) as { Options?: { Id: number; Choices?: { Id: number }[] }[] };
  const options = (data.Options ?? []).flatMap((o) => (o.Choices?.length ? [{ optionId: o.Id, choiceId: o.Choices[0].Id }] : []));
  const jq = window.jQuery as (el: HTMLElement) => unknown;
  const Viewer = window.ZamModelViewer;
  if (!Viewer) throw new Error("model viewer missing");
  const viewer = new Viewer({
    type: 2,
    contentPath: `${location.origin}${BASE}`,
    container: jq(el),
    aspect: el.clientWidth / el.clientHeight,
    hd: true,
    items,
    models: { id: model, type: 16 },
    charCustomization: { options },
    wheelEventValidation: (e) => !!(e.originalEvent?.ctrlKey || e.originalEvent?.metaKey),
  });
  let worn = new Map(items.map(([slot, display]) => [slot, display]));
  let gone = false;
  return {
    setItems(next) {
      if (gone) return;
      const want = new Map(next.map(([slot, display]) => [slot, display]));
      for (const [slot, display] of worn) {
        if (want.get(slot) !== display) viewer.method("clearSlots", String(slot));
      }
      for (const [slot, display] of want) {
        if (worn.get(slot) !== display) viewer.method("setItems", [[{ slot, display, visual: 0 }]]);
      }
      worn = want;
    },
    destroy() {
      gone = true;
      el.replaceChildren();
    },
  };
}
