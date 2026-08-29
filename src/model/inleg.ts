/**
 * Maandelijkse inleg, gevouwen in de jaarlus van het model.
 *
 * Aanname: storting aan het begin van elke maand. Een storting in maand k
 * (1-based) rendeert dan nog (13 - k) maanden tot jaareinde, dus met factor
 * (1+r)^((13-k)/12). Gesommeerd over k = 1..12 is dat Σ_{j=1..12} (1+r)^(j/12).
 */

/** Waarde aan jaareinde van 12 stortingen van € 1, bij jaarrendement r.
 *  Bij r = 0 exact 12. */
export function inlegFactor(r: number): number {
  let som = 0;
  for (let j = 1; j <= 12; j += 1) som += (1 + r) ** (j / 12);
  return som;
}

export interface JaarInleg {
  /** Gestorte hoofdsom: 12 × maandbedrag. */
  hoofdsom: number;
  /** Rendement dat de stortingen in hun eigen jaar al maken. */
  groei: number;
}

/** Hoofdsom en eerstejaarsgroei van een jaar maandelijks inleggen.
 *  m = maandbedrag; levert nullen bij m = 0. */
export function jaarInleg(m: number, r: number): JaarInleg {
  if (m === 0) return { hoofdsom: 0, groei: 0 };
  return { hoofdsom: 12 * m, groei: m * (inlegFactor(r) - 12) };
}
