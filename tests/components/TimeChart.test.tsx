// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TimeChart } from "../../src/components/TimeChart";
import { DEFAULTS, toInputs } from "../../src/state";
import type { Inputs, Stelsel } from "../../src/model/types";

// Vitest draait niet met `globals: true`, dus de automatische opruiming van
// @testing-library/react (die op een globale `afterEach` leunt) slaat niet
// aan. Zonder dit blijft de DOM van vorige tests staan en levert
// document.querySelector(All) resultaten van een vorige grafiek op.
afterEach(cleanup);

// jsdom implementeert window.matchMedia niet. TimeChart roept via
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
  render(<TimeChart inputs={inputs} stelsel={stelsel} />);
}

describe("TimeChart", () => {
  it("tekent een svg met een beschrijvend label", () => {
    grafiek();
    const svg = document.querySelector("svg");
    expect(svg?.getAttribute("aria-label")).toContain("per jaar");
  });

  it("meldt dat er binnen de horizon geen omslag is bij het standaardscenario", () => {
    grafiek();
    const note = document.querySelector(".chart-note");
    expect(note?.textContent).toContain("niet boven box 3 uit");
  });

  it("noemt het omslagjaar als de BV wel inhaalt", () => {
    grafiek({ V: 2_000_000, T: 30 });
    const note = document.querySelector(".chart-note");
    expect(note?.textContent).toContain("jaar");
    expect(note?.textContent).toContain("diepste punt");
  });

  it("markeert het diepste dal met een stip", () => {
    grafiek({ V: 2_000_000, T: 30 });
    expect(document.querySelector("circle")).not.toBeNull();
  });

  it("labelt de assen", () => {
    grafiek();
    expect(document.body.textContent).toContain("jaren dat je het volhoudt");
    expect(document.body.textContent).toContain("BV staat voor");
  });

  it("gebruikt op een smal scherm kortere jaar-labels (j10 i.p.v. jaar 10)", () => {
    // Overschrijft de matchMedia-stub uit beforeEach alleen voor deze test,
    // zodat useIsNarrow() true teruggeeft. afterEach(vi.unstubAllGlobals)
    // ruimt dit weer op, en de volgende beforeEach zet 'm terug op breed —
    // de andere tests blijven dus in breed-modus draaien.
    vi.stubGlobal("matchMedia", () => ({
      matches: true,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    // Standaard T=20: breed gebruikt stap 5 ("jaar 5", "jaar 10", ...),
    // smal gebruikt stap 10 en het korte format ("j10", "j20"). Dezelfde
    // jaarwaarde (10) krijgt dus een structureel ander label — een
    // discriminator die niet cosmetisch is.
    grafiek();
    expect(document.body.textContent).toContain("j10");
    expect(document.body.textContent).not.toContain("jaar 10");
  });
});
