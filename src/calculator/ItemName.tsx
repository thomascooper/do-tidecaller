import { itemPath } from "../lib/slug";
import type { Item } from "../lib/types";

/** A database item's name links to its page; an item the visitor added stays plain text. */
export function ItemName({ item }: { item: Item }) {
  return item.custom ? <>{item.name}</> : <a href={itemPath(item)}>{item.name}</a>;
}
