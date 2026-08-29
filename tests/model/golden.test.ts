import { describe, expect, it } from "vitest";
import golden from "../fixtures/golden.json";
import { simulateBox3 } from "../../src/model/box3";
import { simulateBV } from "../../src/model/bv";
import { breakevenBands, decompose, delta } from "../../src/model/compare";
import type { Inputs, Soort, Stelsel } from "../../src/model/types";

interface GoldenInput {
  V: number; T: number; rendPct: number; kosten: number;
  opricht: number; liq: number; partner: boolean; soort: string;
}
interface GoldenYearB3 { begin: number; rend: number; tax: number; netto: number }
interface GoldenYearBv {
  begin: number; rend: number; kosten: number; vpb: number;
  stand: number; latent: number; netto: number;
}
interface GoldenStelsel {
  eindBox3: number; eindBV: number; delta: number;
  /** Elk element is [ondergrens, bovengrens]; bovengrens null betekent oneindig.
   *  Bewust geen tuple-type: het JSON-import leidt arrays af, geen tuples. */
  bands: Array<Array<number | null>>;
  ontleed: { uitstel: number; hvr: number; kosten: number; vast: number; totaal: number };
  box3Jaren: GoldenYearB3[];
  bvJaren: GoldenYearBv[];
}
interface GoldenCase { name: string; input: GoldenInput; nu: GoldenStelsel; "2028": GoldenStelsel }

function isSoort(v: string): v is Soort {
  return v === "beleggen" || v === "spaar";
}

function toInputs(g: GoldenInput): Inputs {
  if (!isSoort(g.soort)) throw new Error(`onbekend soort: ${g.soort}`);
  const r = g.rendPct / 100;
  const d = g.soort === "spaar" ? r : 0;
  return {
    V: g.V, T: g.T, r, d, g: r - d,
    kosten: g.kosten, opricht: g.opricht, liqJaren: g.liq,
    mult: g.partner ? 2 : 1, soort: g.soort,
  };
}

/** Geen cast: de interfaces hierboven zijn opzettelijk zo geschreven dat de
 *  vorm die TypeScript uit golden.json afleidt er rechtstreeks op past. Wijkt
 *  de fixture af, dan loopt deze regel stuk — precies wat je wilt. */
const cases: GoldenCase[] = golden;
const stelsels: Stelsel[] = ["nu", "2028"];

describe("golden values tegen de referentie-implementatie", () => {
  it("dekt twaalf scenario's", () => {
    expect(cases).toHaveLength(12);
  });

  for (const c of cases) {
    for (const stelsel of stelsels) {
      const verwacht = c[stelsel];
      const s = toInputs(c.input);

      describe(`${c.name} — ${stelsel}`, () => {
        it("reproduceert elke box 3-jaarrij", () => {
          const rows = simulateBox3(c.input.V, s, stelsel);
          expect(rows).toHaveLength(verwacht.box3Jaren.length);
          rows.forEach((rij, i) => {
            const w = verwacht.box3Jaren[i];
            expect(w).toBeDefined();
            if (w === undefined) return;
            expect(rij.begin).toBeCloseTo(w.begin, 6);
            expect(rij.rend).toBeCloseTo(w.rend, 6);
            expect(rij.tax).toBeCloseTo(w.tax, 6);
            expect(rij.netto).toBeCloseTo(w.netto, 6);
          });
        });

        it("reproduceert elke BV-jaarrij", () => {
          const rows = simulateBV(c.input.V, s);
          expect(rows).toHaveLength(verwacht.bvJaren.length);
          rows.forEach((rij, i) => {
            const w = verwacht.bvJaren[i];
            expect(w).toBeDefined();
            if (w === undefined) return;
            expect(rij.begin).toBeCloseTo(w.begin, 6);
            expect(rij.rend).toBeCloseTo(w.rend, 6);
            expect(rij.kosten).toBeCloseTo(w.kosten, 6);
            expect(rij.vpb).toBeCloseTo(w.vpb, 6);
            expect(rij.stand).toBeCloseTo(w.stand, 6);
            expect(rij.latent).toBeCloseTo(w.latent, 6);
            expect(rij.netto).toBeCloseTo(w.netto, 6);
          });
        });

        it("reproduceert het verschil", () => {
          expect(delta(c.input.V, s, stelsel)).toBeCloseTo(verwacht.delta, 6);
        });

        it("reproduceert de kantelpunten", () => {
          const bands = breakevenBands(s, stelsel);
          expect(bands).toHaveLength(verwacht.bands.length);
          bands.forEach((b, i) => {
            const w = verwacht.bands[i];
            expect(w).toBeDefined();
            if (w === undefined) return;
            const onder = w[0];
            const boven = w[1];
            expect(typeof onder).toBe("number");
            if (typeof onder !== "number") return;
            expect(b.from).toBeCloseTo(onder, 6);
            if (boven === null || boven === undefined) {
              expect(b.to).toBeNull();
            } else {
              expect(b.to).not.toBeNull();
              if (b.to === null) return;
              expect(b.to).toBeCloseTo(boven, 6);
            }
          });
        });

        it("reproduceert de uitsplitsing", () => {
          const o = decompose(c.input.V, s, stelsel);
          expect(o.uitstel).toBeCloseTo(verwacht.ontleed.uitstel, 6);
          expect(o.hvr).toBeCloseTo(verwacht.ontleed.hvr, 6);
          expect(o.kosten).toBeCloseTo(verwacht.ontleed.kosten, 6);
          expect(o.vast).toBeCloseTo(verwacht.ontleed.vast, 6);
          expect(o.totaal).toBeCloseTo(verwacht.ontleed.totaal, 6);
        });
      });
    }
  }
});
