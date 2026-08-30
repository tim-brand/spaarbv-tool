import { describe, expect, it } from "vitest";
import { KLEUR } from "../../../src/components/chart/kleuren";

describe("grafiekpalet", () => {
  it("volgt de kranttokens", () => {
    expect(KLEUR.bv).toBe("#27506b");
    expect(KLEUR.box3).toBe("#39586e");
    expect(KLEUR.pivotLijn).toBe("#a49a88");
    expect(KLEUR.plaat).toBe("#fffdf8");
  });

  it("bevat geen oude palettkleuren", () => {
    const alles = Object.values(KLEUR).join(" ");
    expect(alles).not.toContain("#b8860b");
    expect(alles).not.toContain("#2f6f8f");
    expect(alles).not.toContain("#6f3ea8");
  });
});
