export function jsonBlockUnder(spec: string, heading: string): unknown;
export function extract(spec: string): { spells: unknown[]; items: unknown[]; wowhead: Record<string, { id: number; icon: string }> };
