import type { Inputs, Soort, Stelsel } from "./model/types";
import { parseNum } from "./model/format";

export interface FormState {
  soort: Soort;
  V: number;
  T: number;
  partner: boolean;
  /** Rendement als percentage, dus 7 voor 7%. */
  rendPct: number;
  /** Ruwe tekst uit het invoerveld; pas bij het rekenen geparsed. */
  kostenText: string;
  oprichtText: string;
  /** Ruwe tekst uit het inlegveld, zoals kostenText. */
  inlegText: string;
  /** Inlegperiode in jaren; null = de hele horizon. */
  inlegJaren: number | null;
  liqJaren: number;
  stelsel: Stelsel;
}

export const DEFAULT_KOSTEN = 1200;
export const DEFAULT_OPRICHT = 600;
export const MAX_BEDRAG = 50_000;

export const DEFAULTS: FormState = {
  soort: "beleggen",
  V: 200_000,
  T: 20,
  partner: false,
  rendPct: 7,
  kostenText: "1.200",
  oprichtText: "600",
  inlegText: "0",
  inlegJaren: null,
  liqJaren: 1,
  stelsel: "2028",
};

/** Standaardrendement per soort vermogen; wisselen zet het veld hierop terug. */
export function defaultRendement(soort: Soort): number {
  return soort === "spaar" ? 2 : 7;
}

/**
 * Vertaalt de formulierstaat naar de invoer van het rekenmodel.
 *
 * Bij spaargeld is het rendement direct rendement: rente wordt elk jaar
 * belast, ook in de BV, dus er valt niets uit te stellen. Bij beleggingen is
 * het volledig koersgroei, passend bij een herbeleggende ETF.
 */
export function toInputs(f: FormState): Inputs {
  const r = f.rendPct / 100;
  const d = f.soort === "spaar" ? r : 0;
  return {
    V: f.V,
    T: f.T,
    r,
    d,
    g: r - d,
    kosten: parseNum(f.kostenText, DEFAULT_KOSTEN, MAX_BEDRAG),
    opricht: parseNum(f.oprichtText, DEFAULT_OPRICHT, MAX_BEDRAG),
    liqJaren: f.liqJaren,
    inleg: parseNum(f.inlegText, 0, MAX_BEDRAG),
    inlegJaren: Math.min(Math.max(Math.floor(f.inlegJaren ?? f.T), 0), f.T),
    mult: f.partner ? 2 : 1,
    soort: f.soort,
  };
}
