import { describe, expect, it } from "vitest";
import { inlegFactor, jaarInleg } from "../../src/model/inleg";

describe("inlegFactor", () => {
  it("is exact 12 bij rendement nul", () => {
    expect(inlegFactor(0)).toBe(12);
  });

  it("komt overeen met de meetkundige som bij een 1%-maandrente", () => {
    // Kies r zó dat de maandfactor precies 1,01 is: r = 1,01^12 - 1.
    // Dan is de som Σ_{j=1..12} 1,01^j = 101 × (1,01^12 - 1) — een
    // onafhankelijke gesloten vorm, met de hand na te rekenen.
    const r = 1.01 ** 12 - 1;
    expect(inlegFactor(r)).toBeCloseTo(101 * (1.01 ** 12 - 1), 8);
    expect(inlegFactor(r)).toBeCloseTo(12.8093280433, 6);
  });

  it("ligt tussen 12 en 12x de jaarfactor bij positief rendement", () => {
    const f = inlegFactor(0.07);
    expect(f).toBeGreaterThan(12);
    expect(f).toBeLessThan(12 * 1.07);
  });
});

describe("jaarInleg", () => {
  it("levert nullen zonder inleg", () => {
    expect(jaarInleg(0, 0.07)).toEqual({ hoofdsom: 0, groei: 0 });
  });

  it("levert 12x de maandinleg zonder rendement, zonder groei", () => {
    expect(jaarInleg(500, 0)).toEqual({ hoofdsom: 6000, groei: 0 });
  });

  it("berekent de groei als maandbedrag maal (factor - 12)", () => {
    const r = 1.01 ** 12 - 1;
    const { hoofdsom, groei } = jaarInleg(100, r);
    expect(hoofdsom).toBe(1200);
    expect(groei).toBeCloseTo(80.9328043, 5);
  });
});
