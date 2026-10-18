import { describe, expect, it } from "vitest";
import { DEFAULT_READINGS, DEFAULTS, castingShare, fitSpirit, parseReadings } from "./model";
import { decodeShare, encodeShare, MAX_SHARE_LENGTH } from "./share";
import { KEY, loadSaved, save } from "./storage";
import type { Item } from "./types";

const round = (x: number, step: number) => Math.round(x / step) * step;

describe("Spirit calibration", () => {
  it("fits the eleven default readings", () => {
    const readings = parseReadings(DEFAULT_READINGS);
    expect(readings).toHaveLength(11);
    const fit = fitSpirit(readings)!;
    expect(round(fit.line.base, 0.1)).toBeCloseTo(30.5, 3);
    expect(round(fit.line.rate, 0.001)).toBeCloseTo(0.626, 3);
    expect(fit.line.worst).toBeLessThan(0.6);
    expect(round(fit.curve.cap, 0.1)).toBeCloseTo(115.1, 3);
    expect(Math.round(fit.curve.B)).toBe(2750);
    expect(fit.curve.worst.toFixed(1)).toBe("2.4");
  });

  it("fits all twelve readings to the curve defaults", () => {
    const fit = fitSpirit(parseReadings(DEFAULT_READINGS.replace("# 43 53", "43 53")))!;
    expect(fit.curve.cap).toBeCloseTo(113.95, 2);
    expect(Math.round(fit.curve.B)).toBe(2666);
    expect(fit.curve.worst.toFixed(2)).toBe("2.67");
  });

  it("needs two distinct Spirit values", () => {
    expect(fitSpirit(parseReadings("60 68"))).toBeNull();
    expect(fitSpirit(parseReadings("60 68\n60 69"))).toBeNull();
  });

  it("parses comments, separators and junk", () => {
    expect(parseReadings("# 1 2\n50, 60\n55;62\nabc\n0 5\n-3 4\n70 x")).toEqual([
      { spirit: 50, mp5: 60 },
      { spirit: 55, mp5: 62 },
    ]);
  });

  it("derives the casting share", () => {
    expect(castingShare(87, 53.5, 10)).toBeCloseTo(43.5 / 77, 6);
    expect(Math.round(castingShare(87, 53.5, 10)! * 100)).toBe(56);
    expect(castingShare(10, 20, 10)).toBeNull();
    expect(castingShare(5, 20, 10)).toBeNull();
  });
});

function memory(initial?: string) {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(KEY, initial);
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
}

const throwing = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("quota");
  },
};

describe("storage", () => {
  it("returns defaults when nothing is saved or storage is missing", () => {
    expect(loadSaved(memory()).state).toEqual(DEFAULTS);
    expect(loadSaved(undefined)).toEqual({ state: DEFAULTS, items: [] });
  });

  it("merges saved state over defaults", () => {
    const { state } = loadSaved(memory(JSON.stringify({ state: { t: 300, ws: false, bogus: 1 } })));
    expect(state.t).toBe(300);
    expect(state.ws).toBe(false);
    expect(state.level).toBe(30);
    expect("bogus" in state).toBe(false);
  });

  it.each([
    { sbase: 37.5, sper: 0.5 },
    { sbase: 32.4, sper: 0.6 },
    { sA: 105.5, sB: 2223 },
    { sA: 107.9, sB: 2347 },
  ])("migrates the old Spirit default %j", (old) => {
    const raw = { smodel: "curve", sA: 90, sB: 1000, sbase: 20, sper: 0.9, t: 77, ...old };
    const { state } = loadSaved(memory(JSON.stringify({ state: raw })));
    expect(state.smodel).toBe("line");
    expect(state.sA).toBe(DEFAULTS.sA);
    expect(state.sB).toBe(DEFAULTS.sB);
    expect(state.sbase).toBe(DEFAULTS.sbase);
    expect(state.sper).toBe(DEFAULTS.sper);
    expect(state.t).toBe(77);
  });

  it("a saved typed pool keeps manaAuto false; the old default 2223 or no pool becomes calculated", () => {
    const load = (st: object) => loadSaved(memory(JSON.stringify({ state: st }))).state;
    const typed = load({ pool: 1800 });
    expect(typed.manaAuto).toBe(false);
    expect(typed.pool).toBe(1800);
    expect(load({ pool: 2223 }).manaAuto).toBe(true);
    expect(load({ t: 300 }).manaAuto).toBe(true);
    expect(load({ pool: 1800, manaAuto: true }).manaAuto).toBe(true);
  });

  it("drops a saved maxlvl", () => {
    const { state } = loadSaved(memory(JSON.stringify({ state: { maxlvl: 25, t: 300 } })));
    expect("maxlvl" in state).toBe(false);
    expect(state.t).toBe(300);
  });

  it("keeps a current custom Spirit setting", () => {
    const { state } = loadSaved(memory(JSON.stringify({ state: { smodel: "curve", sA: 115.1, sB: 2750 } })));
    expect(state.smodel).toBe("curve");
    expect(state.sA).toBe(115.1);
  });

  it("keeps only user items and fills their fields", () => {
    const saved = {
      state: {},
      items: [
        { id: "u123", name: "My Ring", slot: "Finger", heal: 10, mp5: 3 },
        { id: "db4", name: "Not Mine", slot: "Head" },
        { id: "u9", name: "Bad Slot", slot: "Nope" },
      ],
    };
    const { items } = loadSaved(memory(JSON.stringify(saved)));
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: "u123",
      slug: "my-ring",
      faction: "Both",
      req: 0,
      source: "Added by you",
      custom: true,
      heal: 10,
      mp5: 3,
      sp: 0,
    });
  });

  it("survives garbage and throwing storage", () => {
    for (const junk of ["{not json", "42", "null", '"x"', "[]", '{"state":5,"items":"x"}']) {
      expect(loadSaved(memory(junk))).toEqual({ state: DEFAULTS, items: [] });
    }
    expect(loadSaved(throwing)).toEqual({ state: DEFAULTS, items: [] });
    expect(() => save(throwing, DEFAULTS, [])).not.toThrow();
    expect(() => save(undefined, DEFAULTS, [])).not.toThrow();
  });

  it("round trips through save and load", () => {
    const store = memory();
    save(store, { ...DEFAULTS, t: 300 }, []);
    expect(loadSaved(store).state.t).toBe(300);
  });
});

const ring: Item = {
  id: "u1700000000000",
  slug: "my-ring",
  name: "My Ring é",
  slot: "Finger",
  req: 0,
  heal: 12,
  sp: 0,
  mp5: 2,
  int: 0,
  spi: 4,
  sta: 0,
  source: "Added by you",
  faction: "Both",
  armor: "-",
  custom: true,
};

describe("share encoding", () => {
  it("round trips edits, professions and an item", () => {
    const state = {
      ...DEFAULTS,
      t: 300,
      f: 100,
      faction: "Alliance" as const,
      profs: { Tailoring: true },
      edits: { hw4: { base: 250 } },
    };
    const { code, itemsOmitted } = encodeShare(state, [ring]);
    expect(itemsOmitted).toBe(false);
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    const back = decodeShare(code)!;
    expect(back.state).toEqual(state);
    expect(back.items).toEqual([ring]);
  });

  it("encodes only keys that differ from defaults", () => {
    const { code } = encodeShare({ ...DEFAULTS, t: 300 }, []);
    const json = JSON.parse(atob(code.replace(/-/g, "+").replace(/_/g, "/")));
    expect(json).toEqual({ v: 1, s: { t: 300 }, i: [] });
  });

  it("round trips int and manaAuto, and migrates an old link with a typed pool", () => {
    const text = (o: unknown) => btoa(JSON.stringify(o)).replace(/=+$/, "");
    const typed = { ...DEFAULTS, int: 40, manaAuto: false, pool: 1000 };
    expect(decodeShare(encodeShare(typed, []).code)!.state).toEqual(typed);
    const calc = decodeShare(encodeShare({ ...DEFAULTS, int: 40, pool: 1000 }, []).code)!.state;
    expect(calc.manaAuto).toBe(true);
    expect(calc.int).toBe(40);
    expect(decodeShare(text({ v: 1, s: { pool: 1800 }, i: [] }))!.state.manaAuto).toBe(false);
    expect(decodeShare(text({ v: 1, s: { t: 300 }, i: [] }))!.state.manaAuto).toBe(true);
  });

  it("drops a shared maxlvl", () => {
    const code = btoa(JSON.stringify({ v: 1, s: { maxlvl: 25, t: 300 }, i: [] })).replace(/=+$/, "");
    const got = decodeShare(code)!;
    expect("maxlvl" in got.state).toBe(false);
    expect(got.state.t).toBe(300);
  });

  it("drops unknown keys and mismatched types", () => {
    const text = (o: unknown) => btoa(JSON.stringify(o)).replace(/=+$/, "");
    const back = decodeShare(text({ v: 1, s: { t: "x", zzz: 1, w: 40, smodel: "cube", faction: 3 }, i: [] }))!;
    expect(back.state).toEqual({ ...DEFAULTS, w: 40 });
  });

  it("leaves items out past the length limit and says so", () => {
    const many = Array.from({ length: 80 }, (_, n) => ({ ...ring, id: `u${n}`, name: `Ring number ${n}` }));
    const { code, itemsOmitted } = encodeShare({ ...DEFAULTS, t: 300 }, many);
    expect(itemsOmitted).toBe(true);
    expect(code.length).toBeLessThanOrEqual(MAX_SHARE_LENGTH);
    const back = decodeShare(code)!;
    expect(back.items).toEqual([]);
    expect(back.state.t).toBe(300);
  });

  it.each(["", "!!!", "e30", "bm90LWpzb24", "W10", "bnVsbA", btoa('{"v":2,"s":{}}'), btoa('{"v":1,"s":5}'), "a".repeat(40)])(
    "rejects malformed share %j",
    (text) => {
      expect(decodeShare(text)).toBeNull();
    },
  );
});
