// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { WhyFold } from "../../src/components/WhyFold";
import { breakevenBands } from "../../src/model/compare";
import { DEFAULTS, toInputs } from "../../src/state";
import type { Inputs, Stelsel } from "../../src/model/types";

// Vitest draait niet met `globals: true`, dus de automatische opruiming van
// @testing-library/react (die op een globale `afterEach` leunt) slaat niet
// aan. Zonder dit blijft de DOM van vorige tests staan en levert
// `document.querySelector`/`getByText` dubbele of verouderde matches op.
afterEach(cleanup);

function paneel(overrides: Partial<Inputs> = {}, stelsel: Stelsel = "2028") {
  const inputs = { ...toInputs(DEFAULTS), ...overrides };
  render(
    <WhyFold inputs={inputs} stelsel={stelsel} bands={breakevenBands(inputs, stelsel)} />,
  );
}

// `getByText` beschouwt ook alle omliggende elementen als kandidaat (tot en
// met `document.body`), en tekst uit een kind telt mee in het textContent
// van elke voorouder. De kind-check hieronder voorkomt dat voorouders van
// een echte match ook meetellen; `getAllByText` (in plaats van `getByText`)
// is nodig omdat sommige bedragen bewust op twee plekken in het paneel
// staan (bijv. het vaste deel in beide kolommen). Zelfde aanpak als in
// Verdict.test.tsx.
const heeft = (fragment: string) =>
  screen.getAllByText((_c, node) => {
    if (node === null || !(node.textContent?.includes(fragment) ?? false)) {
      return false;
    }
    return !Array.from(node.children).some((kind) =>
      kind.textContent?.includes(fragment),
    );
  })[0];

describe("WhyFold", () => {
  it("toont het uitstel bij het eigen vermogen", () => {
    paneel();
    // uitstel 27.203 bij het standaardscenario
    expect(heeft("27.203")).toBeDefined();
  });

  it("toont het vaste deel", () => {
    paneel();
    // vast 46.584
    expect(heeft("46.584")).toBeDefined();
  });

  it("toont een saldo van nul op het kantelpunt", () => {
    paneel();
    const kolommen = document.querySelectorAll(".mini-r.tot b");
    expect(kolommen).toHaveLength(2);
    expect(kolommen[1]?.textContent).toContain("0");
  });

  it("noemt het heffingsvrij resultaat in het nieuwe stelsel", () => {
    paneel({}, "2028");
    expect(heeft("heffingsvrij resultaat")).toBeDefined();
  });

  it("noemt het heffingsvrij vermogen in het huidige stelsel", () => {
    paneel({}, "nu");
    expect(heeft("heffingsvrij vermogen")).toBeDefined();
  });

  it("claimt geen kantelpunt als de BV al bij het kleinste vermogen wint", () => {
    // T 40 en 12% rendement: de BV wint al bij € 25.000, dus de ondergrens
    // van de band is de scanvloer — geen echt kantelpunt. De oude tekst
    // beweerde daar "precies even groot" naast twee zichtbaar ongelijke
    // bedragen (delta bij € 25.000 is hier ruim € 83.000).
    paneel({ T: 40, r: 0.12, g: 0.12 });
    expect(document.querySelector(".mini.solo")).not.toBeNull();
    const tekst = document.body.textContent ?? "";
    expect(tekst).not.toContain("precies even groot");
    expect(heeft("al bij het kleinste vermogen")).toBeDefined();
  });

  it("valt terug op één kolom als er geen kantelpunt is", () => {
    paneel({ r: 0.02, d: 0.02, g: 0, soort: "spaar" });
    expect(document.querySelector(".mini.solo")).not.toBeNull();
    expect(heeft("geen kantelpunt")).toBeDefined();
  });

  // De brief dekt alleen het geen-kantelpunt-geval en de open band. Bij een
  // gesloten band (een bovengrens) hoort de zin over de hoogste Vpb- en
  // box 2-schijven te verschijnen. Bekende, tegen het model geverifieerde
  // parameters die tot zo'n gesloten band leiden:
  // breakevenBands -> [{ from: 1399340.60..., to: 1939108.34... }]
  it("noemt de bovengrens als de band gesloten is", () => {
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
    const zin = heeft("hoogste Vpb- en box 2-schijven");
    expect(zin).toBeDefined();
    expect(zin?.textContent).toMatch(/1\.939\.108/);
  });
});
