import { describe, expect, it } from "vitest";
import { eur, formatNumberNl, kort, parseNum, pct } from "../../src/model/format";

describe("eur", () => {
  it("formatteert in nl-NL zonder centen", () => {
    // non-breaking space na het euroteken, afhankelijk van de ICU-versie
    expect(eur(200_000).replace(/[  ]/g, " ")).toBe("€ 200.000");
  });

  it("rondt af op hele euro's", () => {
    expect(eur(1234.56).replace(/[  ]/g, " ")).toBe("€ 1.235");
  });

  it("gebruikt een echt minteken", () => {
    expect(eur(-5000)).toContain("−");
    expect(eur(-5000)).not.toContain("-");
  });
});

describe("kort", () => {
  it("kort duizenden af", () => {
    expect(kort(200_000)).toBe("€200k");
    expect(kort(25_000)).toBe("€25k");
  });

  it("kort miljoenen af met één decimaal", () => {
    expect(kort(1_200_000)).toBe("€1,2M");
  });

  it("laat de decimaal weg vanaf tien miljoen", () => {
    expect(kort(12_000_000)).toBe("€12M");
  });

  it("laat kleine bedragen heel", () => {
    expect(kort(750)).toBe("€750");
  });

  it("gebruikt een echt minteken", () => {
    expect(kort(-200_000)).toBe("−€200k");
  });
});

describe("pct", () => {
  it("toont één decimaal met een komma", () => {
    expect(pct(7)).toBe("7,0%");
    expect(pct(1.28)).toBe("1,3%");
  });
});

describe("formatNumberNl", () => {
  it("gebruikt punten als duizendtalscheiding", () => {
    expect(formatNumberNl(1200)).toBe("1.200");
    expect(formatNumberNl(600)).toBe("600");
  });
});

describe("parseNum", () => {
  it("leest een kaal getal", () => {
    expect(parseNum("1200", 0, 50_000)).toBe(1200);
  });

  it("leest nl-notatie met duizendtalpunten", () => {
    expect(parseNum("1.200", 0, 50_000)).toBe(1200);
    expect(parseNum("12.500", 0, 50_000)).toBe(12_500);
  });

  it("leest een bedrag met euroteken en centen", () => {
    expect(parseNum("€ 1.200,50", 0, 50_000)).toBeCloseTo(1200.5, 6);
  });

  it("valt terug op de fallback bij onzin", () => {
    expect(parseNum("", 1200, 50_000)).toBe(1200);
    expect(parseNum("abc", 1200, 50_000)).toBe(1200);
  });

  it("valt terug op de fallback bij een negatief bedrag", () => {
    expect(parseNum("-500", 1200, 50_000)).toBe(1200);
  });

  it("kapt af op het maximum", () => {
    expect(parseNum("999999", 1200, 50_000)).toBe(50_000);
  });
});
