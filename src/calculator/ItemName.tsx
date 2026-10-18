import { itemPath } from "../lib/slug";
import type { Item } from "../lib/types";
import { ItemIcon } from "./ItemIcon";

/** A database item's icon and name link to its page; an item the visitor added stays plain text, with no icon. */
export function ItemName({ item }: { item: Item }) {
  if (item.custom) return <>{item.name}</>;
  return (
    <span className="iname">
      <ItemIcon item={item} />
      <a href={itemPath(item)}>{item.name}</a>
    </span>
  );
}
