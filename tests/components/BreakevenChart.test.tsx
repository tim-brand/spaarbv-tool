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
      inleg: 0,
      inlegJaren: 0,
    };
    const stelsel: Stelsel = "2028";
    const bands = breakevenBands(inputs, stelsel);

    expect(bands).toHaveLength(1);
    expect(bands[0]?.to).not.toBeNull();

    render(<BreakevenChart inputs={inputs} stelsel={stelsel} bands={bands} />);
    expect(document.body.textContent).toContain("en tot");
    expect(document.body.textContent).toContain("€1,9M");
  });

  it("gebruikt op een smal scherm een Label (rect + text) voor de reeksnamen, waar het op een breed scherm kale tekst is", () => {
    // Overschrijft de matchMedia-stub uit beforeEach alleen voor deze test,
    // zodat useIsNarrow() true teruggeeft. afterEach(vi.unstubAllGlobals)
    // ruimt dit weer op, en de volgende beforeEach zet 'm terug op breed —
    // de andere tests blijven dus in breed-modus draaien.
    vi.stubGlobal("matchMedia", () => ({
      matches: true,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    grafiek();

    // Op smal scherm renderen de reeksnamen (bijv. "vs. 2028") via <Label>,
    // dus als <rect> gevolgd door <text>. Op breed scherm is het kale
    // <text>, zonder <rect> ervoor — het element-type zelf verandert, dus
    // dit is een structurele smal-specifieke uitkomst, geen cosmetische.
    const naamTekst = Array.from(document.querySelectorAll("svg text")).find(
      (t) => t.textContent === "vs. 2028",
    );
    expect(naamTekst).not.toBeUndefined();
    expect(naamTekst?.previousElementSibling?.tagName).toBe("rect");

    // Tweede, onafhankelijke discriminator: op smal scherm toont de x-as
    // 4 tickwaarden (X_TICKS_SMAL) in plaats van de volle 8.
    const tickLabels = Array.from(
      document.querySelectorAll('svg text[text-anchor="middle"].ax'),
    );
    expect(tickLabels.length).toBeLessThanOrEqual(4);
  });
});
