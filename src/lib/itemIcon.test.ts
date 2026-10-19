import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { ITEMS } from "../data";
import { FALLBACK_ICON, itemIconSrc } from "./itemIcon";

describe("itemIconSrc", () => {
  it("names a file in public/icons for all 155 items", () => {
    expect(ITEMS).toHaveLength(155);
    for (const item of ITEMS) {
      const src = itemIconSrc(item);
      expect(existsSync(resolve(__dirname, "../../public", src.slice(1))), `${item.name}: ${src}`).toBe(true);
    }
  });
  it("uses the Wowhead icon, or the question mark without an entry", () => {
    expect(itemIconSrc({ name: "Holy Shroud" })).toBe("/icons/inv_helmet_16.jpg");
    expect(itemIconSrc({ name: "Red Wool Cloak" })).toBe(FALLBACK_ICON);
  });
});
