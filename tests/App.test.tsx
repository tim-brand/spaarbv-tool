// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../src/App";

// Vitest draait niet met `globals: true`, dus de automatische opruiming van
// @testing-library/react (die op een globale `afterEach` leunt) slaat niet
// aan. Zonder dit blijft de DOM van vorige tests staan en levert
// document.querySelector(All) resultaten van een vorige render op.
afterEach(cleanup);

// jsdom implementeert window.matchMedia niet. BreakevenChart en TimeChart
// roepen via useIsNarrow() rechtstreeks matchMedia aan, dus zonder stub
// crasht de hele App-render. We doen alsof het scherm breed is (niet-smal).
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

describe("App", () => {
  it("rendert de tool met de standaardwaarden", () => {
    render(<App />);
    expect(screen.getByRole("heading", { level: 1 })).toBeDefined();
    expect(document.body.textContent).toContain("490.469");
  });

  it("bevat geen auteursblok", () => {
    render(<App />);
    expect(document.body.textContent).not.toContain("Riwan");
    expect(document.body.textContent).not.toContain("Independent Wealth");
    expect(document.body.textContent).not.toContain("Maker van deze tool");
    expect(document.querySelector("img")).toBeNull();
  });

  it("rekent alles opnieuw door bij een nieuwe horizon", () => {
    render(<App />);
    const voor = document.querySelectorAll("tbody tr").length;
    fireEvent.change(screen.getByLabelText(/Horizon/), { target: { value: "30" } });
    expect(document.querySelectorAll("tbody tr")).toHaveLength(30);
    expect(voor).toBe(20);
  });

  it("wisselt van stelsel", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Huidig stelsel/ }));
    expect(screen.getByText("Box 3 (forfaitair)")).toBeDefined();
  });

  it("toont bij spaargeld dat de BV nergens loont", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Spaargeld" }));
    expect(screen.getByText("bij geen enkel vermogen")).toBeDefined();
  });

  it("valt terug op de standaard liquiditeitshint als de stand door de inleg nog onder de totale inbreng blijft", () => {
    // V 25.000, T 5 jaar, 0,5% rendement, spaar en € 3.000/maand: de stand
    // (~201.260) blijft onder wat er is ingelegd (205.000), terwijl hij wel
    // boven V zelf uitkomt. De oude vergelijking (stand <= V) zag dat niet en
    // beweerde dan ten onrechte dat de uitkering al in het lage box
    // 2-tarief past.
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Spaargeld" }));
    fireEvent.change(screen.getByLabelText(/Vermogen nu/), {
      target: { value: "25000" },
    });
    fireEvent.change(screen.getByLabelText(/Horizon/), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText(/Rendement per jaar/), {
      target: { value: "0.5" },
    });
    fireEvent.change(screen.getByLabelText("Maandelijkse inleg"), {
      target: { value: "3000" },
    });
    expect(
      screen.getByText("Gespreid uitkeren benut het lage box 2-tarief vaker."),
    ).toBeDefined();
  });

  it("linkt in de masthead naar de broncode", () => {
    render(<App />);
    const link = screen.getByRole("link", { name: /broncode op GitHub/ });
    expect(link.getAttribute("href")).toBe("https://github.com/tim-brand/spaarbv-tool");
  });

  it("toont de drie voetnoten onderaan", () => {
    render(<App />);
    const strook = document.querySelector(".voetnoten");
    expect(strook).not.toBeNull();
    expect(strook?.textContent).toContain("Geen advies");
    expect(strook?.textContent).toContain("wetsvoorstel");
  });
});
