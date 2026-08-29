import { describe, expect, it } from "vitest";
import { netIfLiquidatedNow, simulateBV } from "../../src/model/bv";
import { PARAMS_2026 } from "../../src/model/params";
import { inlegFactor } from "../../src/model/inleg";
import type { Inputs } from "../../src/model/types";

const basis: Inputs = {
  V: 200_000, T: 20, r: 0.07, d: 0, g: 0.07,
  kosten: 1200, opricht: 600, liqJaren: 1, mult: 1, soort: "beleggen",
  inleg: 0, inlegJaren: 0,
};

describe("netIfLiquidatedNow", () => {
  it("rekent niets af als er geen stille reserve en geen aangroei is", () => {
    const r = netIfLiquidatedNow(200_000, 200_000, 200_000, 0, 0, basis);
    expect(r.latVpb).toBe(0);
    expect(r.latAb).toBe(0);
    expect(r.netto).toBeCloseTo(200_000, 6);
  });

  it("belast de stille reserve met Vpb en de aangroei daarna met box 2", () => {
    // marktwaarde 300.000, boekwaarde 200.000 -> stille reserve 100.000
    // Vpb: 100.000 x 19% = 19.000; kas = 300.000 - 19.000 = 281.000
    // box 2-basis = 281.000 - 200.000 = 81.000
    //   68.843 x 24,5% + 12.157 x 31% = 16.866,535 + 3.768,67 = 20.635,205
    const r = netIfLiquidatedNow(300_000, 200_000, 200_000, 0, 0, basis);
    expect(r.latVpb).toBeCloseTo(19_000, 6);
    expect(r.latAb).toBeCloseTo(20_635.205, 6);
    expect(r.netto).toBeCloseTo(281_000 - 20_635.205, 6);
  });

  it("benut de lage box 2-schijf vaker bij gespreid uitkeren", () => {
    const ineens = netIfLiquidatedNow(300_000, 200_000, 200_000, 0, 0, basis);
    const gespreid = netIfLiquidatedNow(300_000, 200_000, 200_000, 0, 0, {
      ...basis, liqJaren: 5,
    });
    // dezelfde Vpb-som, maar minder box 2 doordat elke tranche in de lage schijf valt
    expect(gespreid.latAb).toBeLessThan(ineens.latAb);
    // 81.000 / 5 = 16.200 per jaar, ruim onder de grens -> volledig 24,5%
    expect(gespreid.latAb).toBeCloseTo(81_000 * PARAMS_2026.abLaag, 6);
  });

  it("telt pending mee in de stille reserve", () => {
    const zonder = netIfLiquidatedNow(300_000, 200_000, 200_000, 0, 0, basis);
    const met = netIfLiquidatedNow(300_000, 200_000, 200_000, 50_000, 0, basis);
    expect(met.latVpb).toBeGreaterThan(zonder.latVpb);
  });

  it("verrekent de verliespot met de stille reserve", () => {
    const r = netIfLiquidatedNow(300_000, 200_000, 200_000, 0, 100_000, basis);
    expect(r.latVpb).toBe(0);
  });

  it("verdubbelt de box 2-schijf met een fiscale partner", () => {
    const alleen = netIfLiquidatedNow(300_000, 200_000, 200_000, 0, 0, basis);
    const partner = netIfLiquidatedNow(300_000, 200_000, 200_000, 0, 0, {
      ...basis, mult: 2,
    });
    // box 2-basis 81.000 past dan volledig in de lage schijf
    expect(partner.latAb).toBeCloseTo(81_000 * PARAMS_2026.abLaag, 6);
    expect(partner.latAb).toBeLessThan(alleen.latAb);
  });
});

describe("simulateBV", () => {
  it("boekt de oprichtingskosten alleen in jaar 1", () => {
    const rows = simulateBV(200_000, basis);
    const [jaar1, jaar2] = rows;
    expect(jaar1).toBeDefined();
    expect(jaar2).toBeDefined();
    if (jaar1 === undefined || jaar2 === undefined) return;
    expect(jaar1.kosten).toBeCloseTo(1_800, 6); // 1.200 + 600
    expect(jaar2.kosten).toBeCloseTo(1_200, 6);
  });

  it("betaalt geen Vpb zolang er alleen ongerealiseerde koerswinst is", () => {
    // beleggen: d = 0, dus geen belastbare bate; de kosten maken juist verlies
    const rows = simulateBV(200_000, basis);
    expect(rows.every((rij) => rij.vpb === 0)).toBe(true);
  });

  it("reproduceert de referentiewaarden voor het eerste jaar", () => {
    const rows = simulateBV(200_000, basis);
    const eerste = rows[0];
    expect(eerste).toBeDefined();
    if (eerste === undefined) return;
    expect(eerste.begin).toBeCloseTo(200_000, 6);
    expect(eerste.rend).toBeCloseTo(14_000, 6);
    // 214.000 marktwaarde min 1.800 kosten die uit de portefeuille komen
    expect(eerste.stand).toBeCloseTo(212_200, 2);
    expect(eerste.latent).toBeCloseTo(4_739.09, 2);
    expect(eerste.netto).toBeCloseTo(207_460.91, 2);
  });

  it("belast rente wel direct, want daar valt niets uit te stellen", () => {
    const spaar: Inputs = { ...basis, r: 0.04, d: 0.04, g: 0, T: 3 };
    const rows = simulateBV(500_000, spaar);
    const eerste = rows[0];
    expect(eerste).toBeDefined();
    if (eerste === undefined) return;
    // 20.000 rente - 1.800 kosten = 18.200 winst -> 19% = 3.458
    expect(eerste.vpb).toBeCloseTo(3_458, 6);
  });

  it("geeft precies T rijen terug", () => {
    expect(simulateBV(200_000, { ...basis, T: 9 })).toHaveLength(9);
  });
});

describe("simulateBV — maandelijkse inleg", () => {
  it("geeft de inleg bij rendement nul onbelast terug (verkrijgingsprijs)", () => {
    // r = 0: geen groei, dus alles is exact na te rekenen.
    // Eindstand = 100.000 + 5 × 6.000 - (5 × 1.200 + 600) = 123.400.
    // De verkrijgingsprijs is 130.000, dus box 2 heft niets: netto = 123.400.
    // (Zonder meegroeiende verkrijgingsprijs zou 123.400 - 100.000 = 23.400
    // in box 2 vallen en was netto 123.400 - 5.733 = 117.667 — de mutatie
    // die deze test moet betrappen.)
    const nul: Inputs = {
      ...basis, V: 100_000, T: 5, r: 0, d: 0, g: 0,
      inleg: 500, inlegJaren: 5,
    };
    const rows = simulateBV(100_000, nul);
    const laatste = rows[rows.length - 1];
    expect(laatste).toBeDefined();
    if (laatste === undefined) return;
    expect(laatste.netto).toBeCloseTo(123_400, 6);
  });

  it("belast de rente op de inleg bij spaargeld direct in de Vpb", () => {
    const spaar: Inputs = {
      ...basis, V: 200_000, T: 2, r: 0.02, d: 0.02, g: 0,
      soort: "spaar", inleg: 100, inlegJaren: 2,
    };
    const groei = 100 * (inlegFactor(0.02) - 12);
    const rows = simulateBV(200_000, spaar);
    const jaar1 = rows[0];
    expect(jaar1).toBeDefined();
    if (jaar1 === undefined) return;
    // winst jaar 1 = rente 4.000 + inlegrente - kosten 1.800; Vpb 19%.
    expect(jaar1.vpb).toBeCloseTo(0.19 * (4_000 + groei - 1_800), 6);
    // Strikt groter dan zonder inleg (0,19 × 2.200 = 418).
    expect(jaar1.vpb).toBeGreaterThan(418);
  });

  it("laat de koersgroei op de inleg buiten de boekwaarde (uitstel)", () => {
    const beleg: Inputs = { ...basis, V: 100_000, T: 1, inleg: 500, inlegJaren: 1 };
    const rows = simulateBV(100_000, beleg);
    const jaar1 = rows[0];
    expect(jaar1).toBeDefined();
    if (jaar1 === undefined) return;
    const groei = 500 * (inlegFactor(0.07) - 12);
    // Marktwaarde: begin × 1,07 + hoofdsom + inleggroei, min de verkochte
    // stukken voor kosten (jaar 1: 1.200 + 600 = 1.800; d = 0, dus saldo -1.800).
    expect(jaar1.stand).toBeCloseTo(100_000 * 1.07 + 6_000 + groei - 1_800, 6);
    expect(jaar1.rend).toBeCloseTo(7_000 + groei, 6);
    expect(jaar1.inleg).toBe(6_000);
  });

  it("stopt met storten na het stopjaar", () => {
    const stop: Inputs = { ...basis, V: 100_000, T: 4, inleg: 500, inlegJaren: 2 };
    const rows = simulateBV(100_000, stop);
    expect(rows.map((rij) => rij.inleg)).toEqual([6_000, 6_000, 0, 0]);
  });
});
