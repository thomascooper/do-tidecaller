import { useEffect, useReducer, useRef } from "react";
import { DEFAULTS, PRESETS } from "../lib/model";
import type { PresetId, State } from "../lib/model";
import { decodeShare } from "../lib/share";
import { loadSaved, save } from "../lib/storage";
import type { Item } from "../lib/types";

export interface CalcModel {
  state: State;
  items: Item[];
}

export type Action =
  | { type: "set"; patch: Partial<State> }
  | { type: "preset"; id: PresetId }
  | { type: "items"; items: Item[] }
  | { type: "load"; state: State; items: Item[] };

export function reducer(model: CalcModel, action: Action): CalcModel {
  switch (action.type) {
    case "set":
      return { ...model, state: { ...model.state, ...action.patch } };
    case "preset": {
      const { t, f } = PRESETS[action.id];
      return { ...model, state: { ...model.state, t, f } };
    }
    case "items":
      return { ...model, items: action.items };
    case "load":
      return { state: action.state, items: action.items };
  }
}

export const INITIAL: CalcModel = { state: DEFAULTS, items: [] };

/** One reducer for the whole calculator. The first render uses DEFAULTS so the
 *  server HTML and the first client render agree; saved settings load after mount. */
export function useCalculator() {
  const [model, dispatch] = useReducer(reducer, INITIAL);
  const loaded = useRef(false);

  useEffect(() => {
    let shared = null;
    try {
      // A valid ?s= link replaces the saved settings (and is then saved by the effect below);
      // an invalid one is ignored. Either way it leaves the address bar.
      const url = new URL(window.location.href);
      const code = url.searchParams.get("s");
      if (code !== null) {
        shared = decodeShare(code);
        url.searchParams.delete("s");
        window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
      }
    } catch {
      // no usable address: nothing to apply
    }
    if (shared) {
      dispatch({ type: "load", state: shared.state, items: shared.items });
    } else {
      try {
        const saved = loadSaved(window.localStorage);
        dispatch({ type: "load", state: saved.state, items: saved.items });
      } catch {
        // storage unavailable: keep the defaults
      }
    }
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current || model === INITIAL) return;
    try {
      save(window.localStorage, model.state, model.items);
    } catch {
      // storage unavailable or full: the page still works
    }
  }, [model]);

  return { state: model.state, items: model.items, dispatch };
}
