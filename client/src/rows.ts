import { CountryPricing, Purchase } from './api';

export interface Row {
  key: string;
  label: string;
  prices: Record<string, Purchase>;
}

const amount = (x: Purchase) => x.value ?? 0;

/**
 * One row per distinct purchase, sorted by label. Items sharing a name (e.g. several subscription tiers) are told apart by
 * their price rank inside the country, which stays consistent across storefronts.
 */
export function buildRows(pricing: CountryPricing[]): Row[] {
  const rows = new Map<string, Row>();
  const counts = new Map<string, number>();
  for (const p of pricing) for (const [n, c] of countBy(p.purchases.map((x) => x.name))) counts.set(n, Math.max(counts.get(n) ?? 0, c));

  for (const p of pricing) {
    const sorted = [...p.purchases].sort((a, b) => amount(a) - amount(b));
    const byName = new Map<string, typeof sorted>();
    for (const x of sorted) byName.set(x.name, [...(byName.get(x.name) ?? []), x]);
    for (const x of p.purchases) {
      const group = byName.get(x.name)!;
      const n = group.indexOf(x);
      const key = `${x.name}#${n}`;
      const row = rows.get(key) ?? { key, label: counts.get(x.name)! > 1 ? `${x.name} (option ${n + 1})` : x.name, prices: {} };
      row.prices[p.country] = x;
      rows.set(key, row);
    }
  }
  return [...rows.values()].sort((a, b) => a.label.localeCompare(b.label, 'en', { numeric: true }));
}

function countBy(xs: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
  return m;
}
