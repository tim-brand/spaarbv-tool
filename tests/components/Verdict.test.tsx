// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Verdict } from "../../src/components/Verdict";
import { breakevenBands } from "../../src/model/compare";
import { DEFAULTS, toInputs } from "../../src/state";
import type { Inputs, Stelsel } from "../../src/model/types";

// Vitest draait niet met `globals: true`, dus de automatische opruiming van
// @testing-library/react (die op een globale `afterEach` leunt) slaat niet
// aan. Zonder dit blijft de DOM van vorige tests staan en levert `getByText`
// dubbele matches op.
afterEach(cleanup);

function paneel(overrides: Partial<Inputs> = {}, stelsel: Stelsel = "2028") {
  const inputs = { ...toInputs(DEFAULTS), ...overrides };
  const bands = breakevenBands(inputs, stelsel);
  render(<Verdict inputs={inputs} stelsel={stelsel} bands={bands} />);
  return { inputs, bands };
}

// `getByText` beschouwt ook alle omliggende elementen als kandidaat (tot en
// met `document.body`), en tekst uit een kind telt mee in het textContent
// van elke voorouder. De kind-check hieronder voorkomt dat voorouders van
// een echte match ook meetellen; `getAllByText` (in plaats van `getByText`)
// is nodig omdat sommige bedragen bewust op twee plekken in het paneel
// staan (bijv. het referentiebedrag in zowel de toelichting als de tegel).
const tekst = (fragment: string) =>
  screen.getAllByText((_c, node) => {
    if (node === null || !(node.textContent?.includes(fragment) ?? false)) {
      return false;
    }
    return !Array.from(node.children).some((kind) =>
      kind.textContent?.includes(fragment),
    );
  })[0];

describe("Verdict", () => {
  it("toont het kantelpunt", () => {
    paneel();
    expect(tekst("490.469")).toBeDefined();
  });

  it("meldt het als de BV nergens wint", () => {
    paneel({ r: 0.02, d: 0.02, g: 0, soort: "spaar" });
    expect(screen.getByText("bij geen enkel vermogen")).toBeDefined();
  });

  it("toont drie tegels met de eindbedragen", () => {
    paneel();
    // privé huidig 556.403, privé 2028 500.786, BV 481.405
    expect(tekst("556.403")).toBeDefined();
    expect(tekst("500.786")).toBeDefined();
    expect(tekst("481.405")).toBeDefined();
  });

  it("dimt de tegel van het niet-gekozen stelsel", () => {
    paneel({}, "2028");
    const dim = document.querySelector(".tile.dim");
    expect(dim).not.toBeNull();
    expect(dim?.textContent).toContain("huidig stelsel");
  });

  it("markeert box 3 als winnaar bij het standaardscenario", () => {
    paneel();
    // met 200.000 wint box 3 in het nieuwe stelsel
    expect(document.querySelector(".tile.win-b3")).not.toBeNull();
    expect(document.querySelector(".tile.win-bv")).toBeNull();
  });

  it("markeert de BV als winnaar bij een groot vermogen", () => {
    paneel({ V: 2_000_000, T: 30 });
    expect(document.querySelector(".tile.win-bv")).not.toBeNull();
  });

  it("toont de bovengrens van een tweezijdige band", () => {
    // Bij lage kosten over een lange horizon wint de BV alleen in een
    // venster: erboven vallen de lage Vpb- en box 2-schijven weg.
    paneel(
      {
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
      },
      "2028",
    );
    expect(tekst("1.939.108")).toBeDefined();
    expect(tekst("draait het weer om")).toBeDefined();
  });

  it("zet de jij-markering op de logaritmische schaal", () => {
    paneel();
    const you = document.querySelector<HTMLElement>(".scale-you");
    expect(you).not.toBeNull();
    // 200.000 ligt tussen 25k en 5M op log-schaal: ln(8)/ln(200) ~ 39%
    const links = Number.parseFloat(you?.style.left ?? "0");
    expect(links).toBeGreaterThan(35);
    expect(links).toBeLessThan(45);
  });

  it("noemt de totale inleg wanneer er maandelijks wordt ingelegd", () => {
    paneel({ inleg: 500, inlegJaren: 10 });
    // 12 × 500 × 10 = 60.000
    expect(tekst("60.000")).toBeDefined();
    expect(tekst("per maand")).toBeDefined();
  });

  it("zwijgt over inleg wanneer die nul is", () => {
    paneel();
    expect(document.body.textContent ?? "").not.toContain("per maand");
  });
});
