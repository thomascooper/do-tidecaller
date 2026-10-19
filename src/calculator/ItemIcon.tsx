import { itemIconSrc, itemQuality } from "../lib/itemIcon";
import type { Item } from "../lib/types";

/** The item's in-game icon. The name beside it is the label, so the image has no alt text. */
export function ItemIcon({ item, size = 20 }: { item: Pick<Item, "name">; size?: number }) {
  return (
    <img
      className="icon"
      data-q={itemQuality(item) ?? "none"}
      src={itemIconSrc(item)}
      width={size}
      height={size}
      alt=""
      loading="lazy"
      decoding="async"
    />
  );
}
