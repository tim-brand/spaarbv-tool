import { describe, expect, it } from "vitest";
import { V_MAX, V_MIN, breakevenBands, decompose, delta, finalBV, finalBox3 } from "../../src/model/compare";
import { PARAMS_2026 } from "../../src/model/params";
import type { Inputs } from "../../src/model/types";

const basis: Inputs = {
  V: 200_000, T: 20, r: 0.07, d: 0, g: 0.07,
  kosten: 1200, opricht: 600, liqJaren: 1, mult: 1, soort: "beleggen",
  inleg: 0, inlegJaren: 0,
};

describe("delta", () => {
  it("is het verschil tussen de BV en box 3", () => {
    const d = delta(200_000, basis, "2028");
    expect(d).toBeCloseTo(finalBV(200_000, basis) - finalBox3(200_000, basis, "2028"), 6);
    // referentiewaarde
    expect(d).toBeCloseTo(-19_380.62, 2);
  });

  it("groeit met het vermogen, want het uitstel schaalt mee", () => {
    expect(delta(1_000_000, basis, "2028")).toBeGreaterThan(delta(200_000, basis, "2028"));
  });
});

describe("breakevenBands", () => {
  it("vindt het kantelpunt voor het standaardscenario", () => {
    const bands = breakevenBands(basis, "2028");
    expect(bands).toHaveLength(1);
    const eerste = bands[0];
    expect(eerste).toBeDefined();
    if (eerste === undefined) return;
    expect(eerste.from).toBeCloseTo(490_469.45, 2);
    expect(eerste.to).toBeNull();
  });

  it("geeft een lege lijst als de BV nergens wint", () => {
    // spaargeld: rente is direct belast, dus er valt niets uit te stellen
    const spaar: Inputs = { ...basis, r: 0.02, d: 0.02, g: 0, soort: "spaar" };
    expect(breakevenBands(spaar, "2028")).toHaveLength(0);
  });

  it("verschuift het kantelpunt omhoog met een fiscale partner", () => {
    const alleen = breakevenBands(basis, "2028")[0];
    const partner = breakevenBands({ ...basis, mult: 2 }, "2028")[0];
    expect(alleen).toBeDefined();
    expect(partner).toBeDefined();
    if (alleen === undefined || partner === undefined) return;
    expect(partner.from).toBeGreaterThan(alleen.from);
    expect(partner.from).toBeCloseTo(727_444.17, 2);
  });

  it("verschuift het kantelpunt omhoog bij hogere kosten", () => {
    const duur = breakevenBands({ ...basis, kosten: 5000, opricht: 2500 }, "2028")[0];
    expect(duur).toBeDefined();
    if (duur === undefined) return;
    expect(duur.from).toBeCloseTo(1_738_575.12, 2);
  });

  it("houdt zich aan het scanbereik", () => {
    for (const band of breakevenBands(basis, "2028")) {
      expect(band.from).toBeGreaterThanOrEqual(V_MIN);
      expect(band.from).toBeLessThanOrEqual(V_MAX);
    }
  });

  it("vindt een venster met een bovengrens wanneer de lage schijven wegvallen", () => {
    // spaar, T=40, lage kosten, stelsel 2028: bij hoog vermogen vallen de lage
    // Vpb- en box 2-schijf weg en verliest de BV weer boven een bovengrens,
    // dus dit levert een venster op in plaats van een open-eind kantelpunt
    const venster: Inputs = {
      V: 200_000, T: 40, r: 0.04, d: 0.04, g: 0,
      kosten: 100, opricht: 100, liqJaren: 1, mult: 1, soort: "spaar",
      inleg: 0, inlegJaren: 0,
    };
    const band = breakevenBands(venster, "2028")[0];
    expect(band).toBeDefined();
    if (band === undefined) return;
    expect(typeof band.from).toBe("number");
    expect(typeof band.to).toBe("number");
    if (typeof band.to !== "number") return;
    expect(band.to).toBeGreaterThan(band.from);
  });
});

describe("met maandelijkse inleg", () => {
  it("laat de identiteit delta = decompose().totaal ook met inleg gelden", () => {
    const metInleg = { ...basis, inleg: 500, inlegJaren: basis.T };
    expect(decompose(200_000, metInleg, "2028").totaal).toBeCloseTo(
      delta(200_000, metInleg, "2028"),
      6,
    );
  });

  it("verschuift het kantelpunt omhoog naarmate er meer wordt ingelegd", () => {
    const zonderInleg = breakevenBands(basis, "2028")[0];
    const metInleg = breakevenBands(
      { ...basis, inleg: 5_000, inlegJaren: basis.T },
      "2028",
    )[0];
    expect(zonderInleg).toBeDefined();
    expect(metInleg).toBeDefined();
    if (zonderInleg === undefined || metInleg === undefined) return;
    expect(metInleg.from).toBeGreaterThan(zonderInleg.from);
  });
});

describe("decompose", () => {
  it("telt exact op tot delta", () => {
    for (const V of [50_000, 200_000, 750_000, 2_000_000]) {
      const o = decompose(V, basis, "2028");
      expect(o.uitstel - o.hvr - o.kosten).toBeCloseTo(o.totaal, 6);
      expect(o.vast).toBeCloseTo(o.hvr + o.kosten, 6);
      expect(o.totaal).toBeCloseTo(delta(V, basis, "2028"), 6);
    }
  });

  it("laat het vaste deel nauwelijks meebewegen met het vermogen", () => {
    const klein = decompose(200_000, basis, "2028");
    const groot = decompose(2_000_000, basis, "2028");
    // het uitstel schaalt mee, het vaste deel niet
    expect(groot.uitstel / klein.uitstel).toBeGreaterThan(5);
    expect(groot.vast / klein.vast).toBeLessThan(2);
  });

  it("is op het kantelpunt per saldo nul", () => {
    const band = breakevenBands(basis, "2028")[0];
    expect(band).toBeDefined();
    if (band === undefined) return;
    const o = decompose(band.from, basis, "2028");
    expect(o.totaal).toBeCloseTo(0, 2);
    expect(o.uitstel).toBeCloseTo(o.vast, 2);
  });

  it("muteert de meegegeven parameters niet", () => {
    // regressietest op de globale-mutatie-hack uit het origineel: bevries het
    // parameterobject zodat een schrijfpoging (`p.hvv = 0` of `p.hvr = 0`)
    // meteen een TypeError gooit in plaats van stilletjes te slagen en later
    // weer teruggedraaid te worden
    const bevroren = Object.freeze({ ...PARAMS_2026 });
    expect(() => decompose(200_000, basis, "2028", bevroren)).not.toThrow();
    expect(() => decompose(200_000, basis, "nu", bevroren)).not.toThrow();
  });
});
