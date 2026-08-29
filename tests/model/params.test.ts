import { describe, expect, it } from "vitest";
import { PARAMS_2026, ab, vpb } from "../../src/model/params";

describe("vpb", () => {
  it("rekent niets over nul of verlies", () => {
    expect(vpb(0, PARAMS_2026)).toBe(0);
    expect(vpb(-50_000, PARAMS_2026)).toBe(0);
  });

  it("past het lage tarief toe tot en met de schijfgrens", () => {
    expect(vpb(100_000, PARAMS_2026)).toBeCloseTo(19_000, 6);
    // precies op de grens: nog volledig laag
    expect(vpb(200_000, PARAMS_2026)).toBeCloseTo(38_000, 6);
  });

  it("past het hoge tarief toe boven de schijfgrens", () => {
    // 200.000 x 19% + 100.000 x 25,8%
    expect(vpb(300_000, PARAMS_2026)).toBeCloseTo(63_800, 6);
  });
});

describe("ab", () => {
  const grens = PARAMS_2026.abGrens;

  it("rekent niets over nul of negatief", () => {
    expect(ab(0, grens, PARAMS_2026)).toBe(0);
    expect(ab(-1_000, grens, PARAMS_2026)).toBe(0);
  });

  it("past het lage tarief toe tot en met de grens", () => {
    expect(ab(grens, grens, PARAMS_2026)).toBeCloseTo(16_866.535, 6);
  });

  it("past het hoge tarief toe boven de grens", () => {
    // 68.843 x 24,5% + 31.157 x 31%
    expect(ab(100_000, grens, PARAMS_2026)).toBeCloseTo(26_525.205, 6);
  });

  it("gebruikt de meegegeven grens, zodat een fiscale partner verdubbelt", () => {
    // met partner past 100.000 volledig in de lage schijf
    expect(ab(100_000, grens * 2, PARAMS_2026)).toBeCloseTo(24_500, 6);
  });
});

describe("PARAMS_2026", () => {
  it("heeft de tarieven van peiljaar 2026", () => {
    expect(PARAMS_2026).toEqual({
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
    });
  });
});
