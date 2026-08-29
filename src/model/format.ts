const euroFormatter = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const getalFormatter = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 });

/** Bedrag in hele euro's, nl-NL, met een typografisch minteken. */
export function eur(x: number): string {
  return euroFormatter.format(Math.round(x)).replace("-", "−");
}

/** Kort bedrag voor assen en labels: €750, €200k, €1,2M. */
export function kort(x: number): string {
  const a = Math.abs(x);
  const teken = x < 0 ? "−" : "";
  if (a >= 1e6) {
    return `${teken}€${(a / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(".", ",")}M`;
  }
  if (a >= 1e3) return `${teken}€${Math.round(a / 1e3)}k`;
  return `${teken}€${Math.round(a)}`;
}

/** Percentage met één decimaal. Verwacht 7 voor 7%, niet 0.07. */
export function pct(x: number): string {
  return `${x.toFixed(1).replace(".", ",")}%`;
}

/** Getal met nl-NL duizendtalscheiding, zonder valutateken. */
export function formatNumberNl(x: number): string {
  return getalFormatter.format(Math.round(x));
}

/**
 * Leest een bedrag uit een vrij tekstveld. Accepteert "1200", "1.200" en
 * "€ 1.200,50". Bij onzin of een negatief bedrag komt `fallback` terug; het
 * resultaat wordt afgekapt op `max`.
 */
export function parseNum(v: string, fallback: number, max: number): number {
  if (v.includes("-")) return fallback;

  let t = v.replace(/[^\d,.]/g, "");

  if (t.includes(",")) {
    // komma is de decimaalscheiding; punten zijn duizendtalscheiding
    t = t.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(t)) {
    // alleen punten, in een duizendtalpatroon: dus geen decimalen
    t = t.replace(/\./g, "");
  }

  const n = Number.parseFloat(t);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(n, max);
}
