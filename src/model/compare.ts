import { simulateBox3 } from "./box3";
import { simulateBV } from "./bv";
import { PARAMS_2026, type TaxParams } from "./params";
import type { Band, Decomposition, Inputs, Stelsel } from "./types";

/** Onder- en bovengrens van het vermogensbereik dat we afzoeken. */
export const V_MIN = 25_000;
export const V_MAX = 5_000_000;

function laatste<T>(rows: T[]): T {
  const r = rows[rows.length - 1];
  if (r === undefined) throw new Error("simulatie leverde geen rijen op (T moet >= 1 zijn)");
  return r;
}

/** Netto eindvermogen van de privé-route. */
export function finalBox3(
  V: number, s: Inputs, stelsel: Stelsel, p: TaxParams = PARAMS_2026,
): number {
  return laatste(simulateBox3(V, s, stelsel, p)).netto;
}

/** Netto eindvermogen van de BV-route, na liquidatie en uitkeren. */
export function finalBV(V: number, s: Inputs, p: TaxParams = PARAMS_2026): number {
  return laatste(simulateBV(V, s, p)).netto;
}

/** Positief = de BV levert meer op; negatief = box 3 wint. */
export function delta(
  V: number, s: Inputs, stelsel: Stelsel, p: TaxParams = PARAMS_2026,
): number {
  return finalBV(V, s, p) - finalBox3(V, s, stelsel, p);
}

/**
 * De vermogensintervallen waarin de BV wint.
 *
 * Het is niet per se één grens: bij hoge vermogens kan de BV weer verliezen
 * doordat de lage Vpb- en box 2-schijven wegvallen. We scannen daarom
 * logaritmisch over het hele bereik, zoeken elke tekenwissel op en verfijnen
 * die met bisectie in log-ruimte (het meetkundig gemiddelde als middelpunt).
 */
export function breakevenBands(
  s: Inputs, stelsel: Stelsel, p: TaxParams = PARAMS_2026,
): Band[] {
  const n = 80;
  const wint: boolean[] = [];
  const bedragen: number[] = [];

  for (let i = 0; i <= n; i += 1) {
    const V = V_MIN * Math.pow(V_MAX / V_MIN, i / n);
    bedragen.push(V);
    wint.push(delta(V, s, stelsel, p) > 0);
  }

  const eersteWint = wint[0];
  if (eersteWint === undefined) return [];

  const out: Band[] = [];
  let open: number | null = eersteWint ? V_MIN : null;

  for (let i = 1; i <= n; i += 1) {
    const nu = wint[i];
    const vorige = wint[i - 1];
    const bNu = bedragen[i];
    const bVorige = bedragen[i - 1];
    if (nu === undefined || vorige === undefined || bNu === undefined || bVorige === undefined) continue;
    if (nu === vorige) continue;

    let onder = bVorige;
    let boven = bNu;
    for (let k = 0; k < 32; k += 1) {
      const midden = Math.sqrt(onder * boven);
      if ((delta(midden, s, stelsel, p) > 0) === vorige) onder = midden;
      else boven = midden;
    }
    const grens = Math.sqrt(onder * boven);

    if (nu) {
      open = grens;
    } else if (open !== null) {
      out.push({ from: open, to: grens });
      open = null;
    }
  }

  if (open !== null) out.push({ from: open, to: null });
  return out;
}

/**
 * Trekt het verschil uit elkaar in drie stukken die exact optellen tot delta:
 *
 *  - uitstel: wat het uitstellen van belasting oplevert. Schaalt mee met het vermogen.
 *  - hvr:     het heffingsvrije bedrag dat box 3 wél heeft en de BV niet. Vast.
 *  - kosten:  wat de BV over de horizon kost. Vast.
 *
 * Omdat het eerste meeschaalt en de andere twee niet, is er een vermogen waar
 * ze elkaar opheffen — en dat is precies het kantelpunt.
 *
 * Het origineel deed dit door zijn globale parameter-object te muteren. Hier
 * bouwen we in plaats daarvan losse parameter-objecten, zodat er geen gedeelde
 * mutabele state is.
 */
export function decompose(
  V: number, s: Inputs, stelsel: Stelsel, p: TaxParams = PARAMS_2026,
): Decomposition {
  const kaal: Inputs = { ...s, kosten: 0, opricht: 0 };
  const zonderVrijstelling: TaxParams =
    stelsel === "nu" ? { ...p, hvv: 0 } : { ...p, hvr: 0 };

  const uitstel = delta(V, kaal, stelsel, zonderVrijstelling);
  const metVrijstelling = delta(V, kaal, stelsel, p);
  const totaal = delta(V, s, stelsel, p);

  return {
    uitstel,
    hvr: uitstel - metVrijstelling,
    kosten: metVrijstelling - totaal,
    vast: uitstel - totaal,
    totaal,
  };
}
