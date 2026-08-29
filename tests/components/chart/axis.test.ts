import { describe, expect, it } from "vitest";
import { nietteStap, yTicks } from "../../../src/components/chart/axis";

describe("nietteStap", () => {
  it("rondt naar een nette stap binnen dezelfde orde van grootte", () => {
    expect(nietteStap(1000)).toBe(1000);
    expect(nietteStap(1800)).toBe(2000);
    expect(nietteStap(2400)).toBe(2500);
    expect(nietteStap(4000)).toBe(5000);
    expect(nietteStap(8000)).toBe(10_000);
  });

  it("werkt over verschillende ordes van grootte", () => {
    expect(nietteStap(140_000)).toBe(100_000);
    expect(nietteStap(12)).toBe(10);
  });
});

describe("yTicks", () => {
  it("geeft minstens vier lijnen", () => {
    expect(yTicks(-50_000, 200_000).length).toBeGreaterThanOrEqual(4);
  });

  it("gebruikt ronde bedragen", () => {
    const ticks = yTicks(0, 100_000);
    const stap = (ticks[1] ?? 0) - (ticks[0] ?? 0);
    expect(stap).toBeGreaterThan(0);
    for (const t of ticks) expect(Number.isFinite(t)).toBe(true);
  });

  it("neemt nul mee als het bereik de nullijn kruist", () => {
    expect(yTicks(-30_000, 70_000)).toContain(0);
  });

  it("blijft binnen het bereik", () => {
    for (const t of yTicks(-30_000, 70_000)) {
      expect(t).toBeGreaterThanOrEqual(-30_000);
      expect(t).toBeLessThanOrEqual(70_000);
    }
  });
});
