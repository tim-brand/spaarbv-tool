// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Inputs } from "../../src/components/Inputs";
import { DEFAULTS, type FormState } from "../../src/state";

// Vitest draait niet met `globals: true`, dus de automatische opruiming van
// @testing-library/react (die op een globale `afterEach` leunt) slaat niet
// aan. Zonder dit blijft de DOM van vorige tests staan en levert `getByText`
// dubbele matches op.
afterEach(cleanup);

function setup(overrides: Partial<FormState> = {}) {
  const onChange = vi.fn();
  const form: FormState = { ...DEFAULTS, ...overrides };
  render(<Inputs form={form} onChange={onChange} liqHint="hint" />);
  return { onChange, form };
}

describe("Inputs", () => {
  it("toont het vermogen als bedrag naast de slider", () => {
    setup();
    expect(screen.getByText(/200\.000/)).toBeDefined();
  });

  it("toont de horizon in jaren", () => {
    setup();
    expect(screen.getByText("20 jaar")).toBeDefined();
  });

  it("meldt een nieuw vermogen bij het slepen van de slider", () => {
    const { onChange } = setup();
    const slider = screen.getByLabelText(/Vermogen nu/);
    fireEvent.change(slider, { target: { value: "500000" } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ V: 500_000 }));
  });

  it("zet het rendement terug op 2% bij wisselen naar spaargeld", () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Spaargeld" }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ soort: "spaar", rendPct: 2 }),
    );
  });

  it("zet het rendement terug op 7% bij wisselen naar beleggingen", () => {
    const { onChange } = setup({ soort: "spaar", rendPct: 2 });
    fireEvent.click(screen.getByRole("button", { name: "Beleggingen" }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ soort: "beleggen", rendPct: 7 }),
    );
  });

  it("markeert het gekozen stelsel met aria-pressed", () => {
    setup();
    const nieuw = screen.getByRole("button", { name: /Nieuw stelsel/ });
    expect(nieuw.getAttribute("aria-pressed")).toBe("true");
  });

  it("meldt een wisseling van stelsel", () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByRole("button", { name: /Huidig stelsel/ }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ stelsel: "nu" }));
  });

  it("schakelt de fiscale partner om", () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByLabelText("Fiscale partner"));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ partner: true }));
  });

  it("laat tijdens het typen ruwe tekst staan", () => {
    const { onChange } = setup();
    const veld = screen.getByLabelText(/Kosten per jaar/);
    fireEvent.change(veld, { target: { value: "25" } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ kostenText: "25" }),
    );
  });

  it("formatteert het bedrag netjes bij verlies van focus", () => {
    const { onChange } = setup({ kostenText: "2500" });
    const veld = screen.getByLabelText(/Kosten per jaar/);
    fireEvent.blur(veld);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ kostenText: "2.500" }),
    );
  });

  it("valt terug op de standaard als het veld leeg is bij blur", () => {
    const { onChange } = setup({ kostenText: "" });
    fireEvent.blur(screen.getByLabelText(/Kosten per jaar/));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ kostenText: "1.200" }),
    );
  });

  it("toont het uitkeren in één keer als zodanig", () => {
    setup({ liqJaren: 1 });
    expect(screen.getByText("in 1 keer")).toBeDefined();
  });

  it("toont gespreid uitkeren in jaren", () => {
    setup({ liqJaren: 5 });
    expect(screen.getByText("in 5 jaar")).toBeDefined();
  });
});
