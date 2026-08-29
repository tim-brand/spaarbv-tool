import { PARAMS_2026, ab, vpb, type TaxParams } from "./params";
import { jaarInleg } from "./inleg";
import type { BvYear, Inputs } from "./types";

export interface LiquidationResult {
  /** Wat er netto privé overblijft. */
  netto: number;
  /** De Vpb die daarbij wordt afgerekend over de stille reserve. */
  latVpb: number;
  /** De box 2-heffing over wat er boven de verkrijgingsprijs uitkomt. */
  latAb: number;
}

/**
 * Wat je netto privé overhoudt als je de BV nú liquideert en de opbrengst
 * over `s.liqJaren` jaar uitkeert.
 *
 * De stille reserve — marktwaarde min boekwaarde, plus nog niet verwerkte
 * gerealiseerde winst — wordt over de uitkeerperiode verdeeld en per tranche
 * tegen Vpb belast, zodat de lage Vpb-schijf meerdere keren wordt benut. Wat
 * daarna in kas zit boven de verkrijgingsprijs is box 2-belast, opnieuw in
 * tranches, zodat ook de lage box 2-schijf vaker meetelt.
 *
 * Tijdens de afwikkeling wordt geen rendement meer gerekend. Dat maakt de
 * uitkomst iets voorzichtig.
 *
 * @param A marktwaarde van de portefeuille
 * @param C boekwaarde (kostprijs)
 * @param VK verkrijgingsprijs: de oorspronkelijke inleg, komt onbelast terug
 * @param pending gerealiseerde winst die nog in de heffing moet vallen
 * @param verlies openstaande verliespot voor de Vpb
 */
export function netIfLiquidatedNow(
  A: number,
  C: number,
  VK: number,
  pending: number,
  verlies: number,
  s: Inputs,
  p: TaxParams = PARAMS_2026,
): LiquidationResult {
  const N = s.liqJaren;
  const reserve = A - C + pending;

  let verliespot = verlies;
  let kas = 0;
  let latVpb = 0;

  for (let j = 0; j < N; j += 1) {
    let winst = reserve / N;
    if (winst < 0) {
      verliespot += -winst;
      winst = 0;
    } else {
      const verrekend = Math.min(winst, verliespot);
      winst -= verrekend;
      verliespot -= verrekend;
    }
    const heffing = vpb(winst, p);
    latVpb += heffing;
    kas += A / N - heffing;
  }

  if (kas < 0) kas = 0;

  const abBasis = kas - VK;
  const abGrens = p.abGrens * s.mult;
  let latAb = 0;
  if (abBasis > 0) {
    for (let k = 0; k < N; k += 1) latAb += ab(abBasis / N, abGrens, p);
  }

  return { netto: kas - latAb, latVpb, latAb };
}

/**
 * Simuleert de BV-route over `s.T` jaren.
 *
 * Waardering op kostprijs of lagere marktwaarde: koerswinst raakt de
 * boekwaarde niet en valt pas in de heffing bij verkoop. Dát uitstel is waar
 * het BV-voordeel vandaan komt. Rente en dividend zijn wél direct belast.
 *
 * Kosten en Vpb worden uit de BV zelf betaald. Is er te weinig kas, dan wordt
 * er verkocht; de daarbij gerealiseerde winst schuift door naar het volgende
 * boekjaar en de boekwaarde daalt naar rato.
 *
 * Maandelijkse stortingen zijn agiostortingen: zij voeren de boekwaarde en
 * verkrijgingsprijs op met hun hoofdsom, zodat die onbelast terugkomen bij
 * liquidatie; hun directe rendement wordt in-jaar belast, hun koersgroei wordt
 * uitgesteld.
 *
 * `netto` per rij is wat je overhoudt als je de BV in dát jaar zou liquideren
 * en uitkeren — zo zijn beide routes elk jaar appels met appels.
 */
export function simulateBV(V: number, s: Inputs, p: TaxParams = PARAMS_2026): BvYear[] {
  let A = V; // marktwaarde
  let C = V; // boekwaarde
  let vk = V; // verkrijgingsprijs

  let verlies = 0;
  let pending = 0;
  const rows: BvYear[] = [];

  for (let i = 0; i < s.T; i += 1) {
    const begin = A;
    const storting =
      i < s.inlegJaren ? jaarInleg(s.inleg, s.r) : { hoofdsom: 0, groei: 0 };
    // Splitsing van de eerstejaarsgroei naar rato van d en g. Bij r = 0 is
    // de groei 0, dus valt er niets te splitsen.
    const inlegDiv = s.r === 0 ? 0 : storting.groei * (s.d / s.r);
    const inlegKoers = storting.groei - inlegDiv;

    const div = begin * s.d + inlegDiv;
    A = begin * (1 + s.g) + storting.hoofdsom + inlegKoers;
    C += storting.hoofdsom;
    vk += storting.hoofdsom;

    const gerealiseerd = pending;
    pending = 0;

    const kosten = s.kosten + (i === 0 ? s.opricht : 0);

    let winst = div + gerealiseerd - kosten;
    let betaaldeVpb = 0;
    if (winst < 0) {
      verlies += -winst;
    } else {
      const verrekend = Math.min(winst, verlies);
      winst -= verrekend;
      verlies -= verrekend;
      betaaldeVpb = vpb(winst, p);
    }

    const saldo = div - kosten - betaaldeVpb;
    if (saldo >= 0) {
      A += saldo;
      C += saldo;
    } else {
      const verkoop = -saldo;
      if (A > 0) {
        const boekdeel = C / A;
        pending += verkoop * (1 - boekdeel);
        C -= verkoop * boekdeel;
      }
      A -= verkoop;
    }
    if (A < 0) A = 0;
    if (C < 0) C = 0;

    const liq = netIfLiquidatedNow(A, C, vk, pending, verlies, s, p);
    rows.push({
      begin,
      inleg: storting.hoofdsom,
      rend: begin * s.r + storting.groei,
      kosten,
      vpb: betaaldeVpb,
      stand: A,
      latent: liq.latVpb + liq.latAb,
      netto: liq.netto,
    });
  }

  return rows;
}
