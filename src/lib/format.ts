export function fmt(x: number, d: number): string {
  if (!isFinite(x)) return "–";
  return x.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}
