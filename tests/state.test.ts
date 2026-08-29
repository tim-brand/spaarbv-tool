import { describe, expect, it } from "vitest";
import { DEFAULTS, MAX_BEDRAG, toInputs } from "../src/state";

describe("toInputs — maandelijkse inleg", () => {
  it("parseert de inleg uit de ruwe tekst", () => {
    const s = toInputs({ ...DEFAULTS, inlegText: "1.500" });
    expect(s.inleg).toBe(1500);
  });

  it("valt terug op 0 bij onzin en bij een minteken", () => {
    expect(toInputs({ ...DEFAULTS, inlegText: "abc" }).inleg).toBe(0);
    expect(toInputs({ ...DEFAULTS, inlegText: "-500" }).inleg).toBe(0);
  });

  it("begrenst de inleg op het maximumbedrag", () => {
    const s = toInputs({ ...DEFAULTS, inlegText: "99.999.999" });
    expect(s.inleg).toBe(MAX_BEDRAG);
  });

  it("laat de inlegperiode de horizon volgen zolang die niet gekozen is", () => {
    const s = toInputs({ ...DEFAULTS, T: 30, inlegJaren: null });
    expect(s.inlegJaren).toBe(30);
  });

  it("begrenst een gekozen inlegperiode op de horizon", () => {
    const s = toInputs({ ...DEFAULTS, T: 10, inlegJaren: 25 });
    expect(s.inlegJaren).toBe(10);
  });

  it("houdt een kortere gekozen inlegperiode aan", () => {
    const s = toInputs({ ...DEFAULTS, T: 20, inlegJaren: 5 });
    expect(s.inlegJaren).toBe(5);
  });

  it("houdt de standaardinvoer op nul inleg", () => {
    const s = toInputs(DEFAULTS);
    expect(s.inleg).toBe(0);
  });
});
