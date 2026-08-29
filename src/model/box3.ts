import { PARAMS_2026, type TaxParams } from "./params";
import type { Box3Year, Inputs, Stelsel } from "./types";
import { jaarInleg } from "./inleg";

/**
 * Simuleert de privé-route in box 3 over `s.T` jaren.
 *
 * Nieuw stelsel (2028): vermogensaanwasbelasting. 36% over het werkelijke
 * resultaat — rente, dividend én de jaarlijkse waardestijging, ook als je
 * niets verkocht hebt — boven een heffingsvrij resultaat per jaar. Verlies
 * wordt niet belast maar gaat naar een verliespot die voorwaarts verrekend
 * wordt met latere winst.
 *
 * Huidig stelsel (2026): forfaitair. 36% over een verondersteld rendement
 * over de grondslag aan het begin van het jaar, boven het heffingsvrij
 * vermogen. Je betaalt dus ook in verliesjaren, en niets extra's in jaren
 * waarin je meer verdient dan het forfait.
 *
 * De heffing wordt uit het vermogen zelf betaald; er wordt niet bijgestort.
 * Maandelijkse deposits worden in 2028 direct belast (inclusief hun
 * eerstejaarsgroei), maar in het huidige stelsel pas op de volgende peildatum.
 */
export function simulateBox3(
  V: number,
  s: Inputs,
  stelsel: Stelsel,
  p: TaxParams = PARAMS_2026,
): Box3Year[] {
  const hvr = p.hvr * s.mult;
  const hvv = p.hvv * s.mult;
  const forfait = s.soort === "spaar" ? p.forfSpaar : p.forfBeleg;

  const rows: Box3Year[] = [];
  let vermogen = V;
  let verliespot = 0;

  for (let i = 0; i < s.T; i += 1) {
    const begin = vermogen;
    const storting =
      i < s.inlegJaren ? jaarInleg(s.inleg, s.r) : { hoofdsom: 0, groei: 0 };
    const rend = begin * s.r + storting.groei;
    vermogen = begin + rend + storting.hoofdsom;

    let tax: number;
    if (stelsel === "2028") {
      let grondslag = rend;
      if (grondslag < 0) {
        verliespot += -grondslag;
        grondslag = 0;
      } else {
        const verrekend = Math.min(grondslag, verliespot);
        grondslag -= verrekend;
        verliespot -= verrekend;
      }
      tax = Math.max(0, grondslag - hvr) * p.wrTarief;
    } else {
      tax = Math.max(0, begin - hvv) * forfait * p.b3Tarief;
    }

    vermogen -= tax;
    rows.push({ begin, inleg: storting.hoofdsom, rend, tax, netto: vermogen });
  }

  return rows;
}
