export type Slot =
  | "Head"
  | "Neck"
  | "Shoulder"
  | "Back"
  | "Chest"
  | "Wrist"
  | "Hands"
  | "Waist"
  | "Legs"
  | "Feet"
  | "Finger"
  | "Trinket"
  | "Main hand"
  | "Off hand"
  | "Two-hand";

export type Faction = "Both" | "Horde" | "Alliance";

export type Profession = "Tailoring" | "Leatherworking" | "Enchanting" | "Engineering";

export type Armor = "-" | "Cloth" | "Leather" | "Shield";

export interface Item {
  id: string;
  slug: string;
  name: string;
  slot: Slot;
  req: number;
  heal: number;
  sp: number;
  mp5: number;
  int: number;
  spi: number;
  sta: number;
  source: string;
  faction: Faction;
  armor: Armor;
  other?: string;
  prof?: Profession;
  custom?: boolean;
}

export interface Spell {
  id: string;
  name: string;
  rank: number;
  lvl: number;
  base: number;
  cost: number;
  cast: number;
  src: string;
  warn?: boolean;
}
