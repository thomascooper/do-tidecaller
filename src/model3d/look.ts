// The visitor's chosen race and gender for the 3D character, kept in localStorage only.
// Not part of the calculator's saved state or share link. No React, so the /bis script can use it.
import { racesFor, type Gender, type Race } from "./data";

const KEY = "tidecaller-look-v1";

export interface Look {
  race: string;
  gender: Gender;
}

/** The stored look; anything missing or unreadable is the Horde default (first race, male). */
export function readLook(): Look {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<Look> | null;
    return {
      race: typeof raw?.race === "string" ? raw.race : "",
      gender: raw?.gender === "female" ? "female" : "male",
    };
  } catch {
    return { race: "", gender: "male" };
  }
}

export function saveLook(look: Look): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(look));
  } catch {
    // Storage blocked: the choice lasts until the page closes.
  }
}

/** The race a faction can actually show: the stored one if it is on that faction's list, else its first. */
export function raceFor(faction: string, look: Look): Race {
  const list = racesFor(faction);
  return list.find((r) => r.race === look.race) ?? list[0];
}
