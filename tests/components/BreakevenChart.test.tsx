// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BreakevenChart } from "../../src/components/BreakevenChart";
import { breakevenBands } from "../../src/model/compare";
import { DEFAULTS, toInputs } from "../../src/state";
import type { Inputs, Stelsel } from "../../src/model/types";

// Vitest draait niet met `globals: true`, dus de automatische opruiming van
// @testing-library/react (die op een globale `afterEach` leunt) slaat niet
// aan. Zonder dit blijft de DOM van vorige tests staan en levert
// document.querySelector(All) resultaten van een vorige grafiek op.
afterEach(cleanup);

// jsdom implementeert window.matchMedia niet. BreakevenChart roept via
// useIsNarrow() rechtstreeks matchMedia aan, dus zonder stub crasht elke
// render. We doen alsof het scherm breed is (niet-smal).
beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function grafiek(overrides: Partial<Inputs> = {}, stelsel: Stelsel = "2028") {
  const inputs = { ...toInputs(DEFAULTS), ...overrides };
  return render(
    <BreakevenChart
      inputs={inputs}
      stelsel={stelsel}
      bands={breakevenBands(inputs, stelsel)}
    />,
  );
}

describe("BreakevenChart", () => {
  it("tekent een svg met een beschrijvend label", () => {
    grafiek();
    const svg = document.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("role")).toBe("img");
    expect(svg?.getAttribute("aria-label")).toContain("kantelpunt");
  });

  it("tekent twee lijnen: het gekozen stelsel en het andere", () => {
    grafiek();
    const lijnen = document.querySelectorAll("path[stroke]:not([stroke-dasharray])");
    expect(lijnen.length).toBeGreaterThanOrEqual(1);
    expect(document.querySelectorAll("path[stroke-dasharray]").length).toBeGreaterThanOrEqual(1);
  });

  it("markeert het kantelpunt", () => {
    grafiek();
    expect(document.body.textContent).toContain("kantelpunt");
  });

  it("markeert waar de gebruiker staat met een stip", () => {
    grafiek();
    expect(document.querySelector("circle")).not.toBeNull();
    expect(document.body.textContent).toContain("jij:");
  });

  it("laat het kantelpunt weg als de BV nergens wint", () => {
    grafiek({ r: 0.02, d: 0.02, g: 0, soort: "spaar" });
    expect(document.body.textContent).not.toContain("kantelpunt ");
  });

  it("legt onder de grafiek uit dat het om een verschil gaat", () => {
    grafiek();
    const note = document.querySelector(".chart-note");
    expect(note?.textContent).toContain("verschil");
  });

  it("toont een bovengrens-label als de band een tweezijdig venster is", () => {
    const inputs: Inputs = {
      soort: "spaar",
      V: 200_000,
      T: 40,
      r: 0.04,
      d: 0.04,
      g: 0,
      kosten: 100,
      opricht: 100,
      liqJaren: 1,
      mult: 1,
    };
    const stelsel: Stelsel = "2028";
    const bands = breakevenBands(inputs, stelsel);

    expect(bands).toHaveLength(1);
    expect(bands[0]?.to).not.toBeNull();

    render(<BreakevenChart inputs={inputs} stelsel={stelsel} bands={bands} />);
    expect(document.body.textContent).toContain("en tot");
    expect(document.body.textContent).toContain("€1,9M");
  });
});
