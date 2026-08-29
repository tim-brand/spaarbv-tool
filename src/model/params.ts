/** Belastingparameters. Peiljaar 2026; het nieuwe box 3-stelsel is een
 *  wetsvoorstel, beoogd 2028. Bedragen per persoon — met een fiscale partner
 *  verdubbelen hvv, hvr en abGrens (zie Inputs.mult). De Vpb-schijfgrens
 *  verdubbelt níet: die geldt per vennootschap. */
export interface TaxParams {
  /** Tarief vermogensaanwasbelasting, nieuw stelsel. */
  wrTarief: number;
  /** Heffingsvrij resultaat per jaar, nieuw stelsel. */
  hvr: number;
  /** Box 3-tarief, huidig stelsel. */
  b3Tarief: number;
  /** Heffingsvrij vermogen, huidig stelsel. */
  hvv: number;
  /** Forfaitair rendement beleggingen, huidig stelsel. */
  forfBeleg: number;
  /** Forfaitair rendement banktegoeden, huidig stelsel. */
  forfSpaar: number;
  vpbLaag: number;
  vpbHoog: number;
  vpbGrens: number;
  abLaag: number;
  abHoog: number;
  abGrens: number;
}

export const PARAMS_2026: TaxParams = {
  wrTarief: 0.36,
  hvr: 1800,
  b3Tarief: 0.36,
  hvv: 59_357,
  forfBeleg: 0.06,
  forfSpaar: 0.0128,
  vpbLaag: 0.19,
  vpbHoog: 0.258,
  vpbGrens: 200_000,
  abLaag: 0.245,
  abHoog: 0.31,
  abGrens: 68_843,
};

/** Vennootschapsbelasting over de winst. Verlies levert geen teruggaaf op —
 *  verliesverrekening gebeurt bij de aanroeper. */
export function vpb(winst: number, p: TaxParams): number {
  if (winst <= 0) return 0;
  if (winst <= p.vpbGrens) return winst * p.vpbLaag;
  return p.vpbGrens * p.vpbLaag + (winst - p.vpbGrens) * p.vpbHoog;
}

/** Box 2 (aanmerkelijk belang) over een uitkering boven de verkrijgingsprijs.
 *  `grens` wordt meegegeven omdat die met een fiscale partner verdubbelt. */
export function ab(basis: number, grens: number, p: TaxParams): number {
  if (basis <= 0) return 0;
  if (basis <= grens) return basis * p.abLaag;
  return grens * p.abLaag + (basis - grens) * p.abHoog;
}
