// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { YearTable } from "../../src/components/YearTable";
import { DEFAULTS, toInputs } from "../../src/state";
import type { Inputs, Stelsel } from "../../src/model/types";

afterEach(cleanup);

function tabel(overrides: Partial<Inputs> = {}, stelsel: Stelsel = "2028") {
  const inputs = { ...toInputs(DEFAULTS), ...overrides };
  render(<YearTable inputs={inputs} stelsel={stelsel} />);
  return inputs;
}

describe("YearTable", () => {
  it("geeft één rij per jaar", () => {
    tabel({ T: 12 });
    const body = document.querySelector("tbody");
    expect(body?.querySelectorAll("tr")).toHaveLength(12);
  });

  it("heeft twaalf kolommen per rij", () => {
    tabel({ T: 3 });
    const eerste = document.querySelector("tbody tr");
    expect(eerste?.querySelectorAll("td")).toHaveLength(12);
  });

  it("noemt de heffingskolom 'werkelijk' in het nieuwe stelsel", () => {
    tabel({}, "2028");
    expect(screen.getByText("Box 3 (werkelijk)")).toBeDefined();
  });

  it("noemt de heffingskolom 'forfaitair' in het huidige stelsel", () => {
    tabel({}, "nu");
    expect(screen.getByText("Box 3 (forfaitair)")).toBeDefined();
  });

  it("concludeert dat box 3 wint bij het standaardscenario", () => {
    tabel();
    const bar = document.querySelector(".verdict-bar");
    expect(bar?.className).toContain("b3");
    expect(bar?.textContent).toContain("privé in box 3 is aantrekkelijker");
  });

  it("concludeert dat de BV wint bij een groot vermogen", () => {
    tabel({ V: 2_000_000, T: 30 });
    const bar = document.querySelector(".verdict-bar");
    expect(bar?.className).toContain("bv");
    expect(bar?.textContent).toContain("de BV is aantrekkelijker");
  });

  it("kleurt het verschil groen bij voorsprong en rood bij achterstand", () => {
    tabel({ V: 2_000_000, T: 30 });
    expect(document.querySelectorAll("td.pos").length).toBeGreaterThan(0);
    expect(document.querySelectorAll("td.negv").length).toBeGreaterThan(0);
  });

  it("toont geen inlegkolom zonder inleg", () => {
    tabel();
    expect(screen.queryByText("Inleg")).toBeNull();
  });

  it("toont de gestorte hoofdsom per jaar bij een inleg", () => {
    tabel({ inleg: 500, inlegJaren: 20 });
    expect(screen.getByText("Inleg")).toBeDefined();
    expect(screen.getAllByText(/6\.000/).length).toBeGreaterThan(0);
  });

  it("toont nul in de inlegkolom na het stopjaar", () => {
    tabel({ inleg: 500, inlegJaren: 2 });
    const cellen = document.querySelectorAll("td.c-inleg");
    expect(cellen).toHaveLength(20);
    expect(cellen[1]?.textContent).toContain("6.000");
    expect(cellen[2]?.textContent).toContain("0");
  });
});
