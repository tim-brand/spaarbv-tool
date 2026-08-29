import { describe, expect, it } from "vitest";
import { simulateBox3 } from "../../src/model/box3";
import type { Inputs } from "../../src/model/types";
import { inlegFactor } from "../../src/model/inleg";

const basis: Inputs = {
  V: 200_000, T: 20, r: 0.07, d: 0, g: 0.07,
  kosten: 1200, opricht: 600, liqJaren: 1, mult: 1, soort: "beleggen",
  inleg: 0, inlegJaren: 0,
};

describe("simulateBox3 — nieuw stelsel (2028)", () => {
  it("heft 36% over het werkelijke resultaat boven het heffingsvrij resultaat", () => {
    const rows = simulateBox3(200_000, basis, "2028");
    const eerste = rows[0];
    expect(eerste).toBeDefined();
    if (eerste === undefined) return;
    // 200.000 x 7% = 14.000 resultaat; (14.000 - 1.800) x 36% = 4.392
    expect(eerste.begin).toBeCloseTo(200_000, 6);
    expect(eerste.rend).toBeCloseTo(14_000, 6);
    expect(eerste.tax).toBeCloseTo(4_392, 6);
    // 200.000 + 14.000 - 4.392
    expect(eerste.netto).toBeCloseTo(209_608, 6);
  });

  it("verdubbelt het heffingsvrij resultaat met een fiscale partner", () => {
    const rows = simulateBox3(200_000, { ...basis, mult: 2 }, "2028");
    const eerste = rows[0];
    expect(eerste).toBeDefined();
    if (eerste === undefined) return;
    // (14.000 - 3.600) x 36% = 3.744
    expect(eerste.tax).toBeCloseTo(3_744, 6);
  });

  it("belast een verliesjaar niet", () => {
    const verlies: Inputs = { ...basis, T: 2, r: -0.1, g: -0.1 };
    const rows = simulateBox3(100_000, verlies, "2028");
    const [jaar1, jaar2] = rows;
    expect(jaar1).toBeDefined();
    expect(jaar2).toBeDefined();
    if (jaar1 === undefined || jaar2 === undefined) return;
    // jaar 1: -10.000 resultaat, geen heffing, verliespot 10.000
    expect(jaar1.tax).toBe(0);
    expect(jaar1.netto).toBeCloseTo(90_000, 6);
    // jaar 2: opnieuw verlies, dus opnieuw geen heffing
    expect(jaar2.tax).toBe(0);
  });

  it("houdt de heffing op nul zolang het verlies aanhoudt", () => {
    const rows = simulateBox3(100_000, { ...basis, T: 3, r: -0.05, g: -0.05 }, "2028");
    expect(rows).toHaveLength(3);
    expect(rows.every((rij) => rij.tax === 0)).toBe(true);
  });

  it("heft niets zolang het resultaat onder het heffingsvrij resultaat blijft", () => {
    // 100.000 x 1% = 1.000 resultaat, onder de 1.800 vrijstelling
    const rows = simulateBox3(100_000, { ...basis, T: 1, r: 0.01, g: 0.01 }, "2028");
    const eerste = rows[0];
    expect(eerste).toBeDefined();
    if (eerste === undefined) return;
    expect(eerste.tax).toBe(0);
  });
});

describe("simulateBox3 — huidig stelsel (2026)", () => {
  it("heft forfaitair over de grondslag boven het heffingsvrij vermogen", () => {
    const rows = simulateBox3(200_000, basis, "nu");
    const eerste = rows[0];
    expect(eerste).toBeDefined();
    if (eerste === undefined) return;
    // (200.000 - 59.357) x 6,00% x 36% = 3.037,89
    expect(eerste.tax).toBeCloseTo(3_037.89, 2);
    expect(eerste.netto).toBeCloseTo(210_962.11, 2);
  });

  it("gebruikt het spaarforfait bij spaargeld", () => {
    const spaar: Inputs = { ...basis, r: 0.02, d: 0.02, g: 0, soort: "spaar" };
    const rows = simulateBox3(200_000, spaar, "nu");
    const eerste = rows[0];
    expect(eerste).toBeDefined();
    if (eerste === undefined) return;
    // (200.000 - 59.357) x 1,28% x 36% = 648,08
    expect(eerste.rend).toBeCloseTo(4_000, 6);
    expect(eerste.tax).toBeCloseTo(648.08, 2);
    expect(eerste.netto).toBeCloseTo(203_351.92, 2);
  });

  it("heft ook in een verliesjaar, want het forfait staat los van het resultaat", () => {
    const rows = simulateBox3(200_000, { ...basis, T: 1, r: -0.1, g: -0.1 }, "nu");
    const eerste = rows[0];
    expect(eerste).toBeDefined();
    if (eerste === undefined) return;
    expect(eerste.tax).toBeGreaterThan(0);
  });

  it("heft niets onder het heffingsvrij vermogen", () => {
    const rows = simulateBox3(50_000, { ...basis, T: 1 }, "nu");
    const eerste = rows[0];
    expect(eerste).toBeDefined();
    if (eerste === undefined) return;
    expect(eerste.tax).toBe(0);
  });
});

describe("simulateBox3 — vorm", () => {
  it("geeft precies T rijen terug", () => {
    expect(simulateBox3(200_000, { ...basis, T: 7 }, "2028")).toHaveLength(7);
  });

  it("laat elke rij aansluiten op de volgende", () => {
    const rows = simulateBox3(200_000, basis, "2028");
    for (let i = 1; i < rows.length; i += 1) {
      const vorige = rows[i - 1];
      const huidige = rows[i];
      if (vorige === undefined || huidige === undefined) continue;
      expect(huidige.begin).toBeCloseTo(vorige.netto, 6);
    }
  });
});

describe("simulateBox3 — maandelijkse inleg", () => {
  const metInleg: Inputs = { ...basis, V: 100_000, T: 2, inleg: 500, inlegJaren: 2 };
  // Eerstejaarsgroei van € 500/maand bij 7%: 500 × (factor - 12).
  const groei = 500 * (inlegFactor(0.07) - 12);

  it("belast de inleggroei in het nieuwe stelsel in het jaar zelf", () => {
    const rows = simulateBox3(100_000, metInleg, "2028");
    const jaar1 = rows[0];
    expect(jaar1).toBeDefined();
    if (jaar1 === undefined) return;
    expect(jaar1.inleg).toBe(6000);
    expect(jaar1.rend).toBeCloseTo(7_000 + groei, 6);
    expect(jaar1.tax).toBeCloseTo((7_000 + groei - 1_800) * 0.36, 6);
    expect(jaar1.netto).toBeCloseTo(100_000 + 7_000 + groei + 6_000 - jaar1.tax, 6);
  });

  it("belast de inleg in het huidige stelsel pas op de volgende peildatum", () => {
    const rows = simulateBox3(100_000, metInleg, "nu");
    const zonder = simulateBox3(100_000, { ...metInleg, inleg: 0 }, "nu");
    const [jaar1, jaar2] = rows;
    expect(jaar1).toBeDefined();
    expect(jaar2).toBeDefined();
    if (jaar1 === undefined || jaar2 === undefined) return;
    // Forfait over de beginstand: (100.000 - 59.357) × 6% × 36% = 877,8888.
    // De inleg van dit jaar verandert daar niets aan.
    expect(jaar1.tax).toBeCloseTo(877.8888, 4);
    expect(jaar1.tax).toBeCloseTo(zonder[0]?.tax ?? Number.NaN, 10);
    // Jaar 2: de gestorte € 6.000 + groei staat nu wél in de grondslag.
    const begin2 = 100_000 + 7_000 + groei + 6_000 - jaar1.tax;
    expect(jaar2.begin).toBeCloseTo(begin2, 6);
    expect(jaar2.tax).toBeCloseTo((begin2 - 59_357) * 0.06 * 0.36, 6);
  });

  it("stopt met inleggen na het stopjaar", () => {
    const stop: Inputs = { ...basis, V: 100_000, T: 4, inleg: 500, inlegJaren: 2 };
    const rows = simulateBox3(100_000, stop, "2028");
    expect(rows[0]?.inleg).toBe(6000);
    expect(rows[1]?.inleg).toBe(6000);
    expect(rows[2]?.inleg).toBe(0);
    expect(rows[3]?.inleg).toBe(0);
    const jaar3 = rows[2];
    if (jaar3 === undefined) return;
    // Zonder inleg is het rendement weer zuiver begin × r.
    expect(jaar3.rend).toBeCloseTo(jaar3.begin * 0.07, 6);
  });

  it("houdt zonder inleg elk jaarveld op nul inleg", () => {
    const rows = simulateBox3(200_000, basis, "2028");
    expect(rows.every((rij) => rij.inleg === 0)).toBe(true);
  });
});
