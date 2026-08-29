// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Assumptions } from "../../src/components/Assumptions";

// Vitest draait niet met `globals: true`, dus de automatische opruiming van
// @testing-library/react (die op een globale `afterEach` leunt) slaat niet
// aan. Zonder dit blijft de DOM van vorige tests staan.
afterEach(cleanup);

describe("Assumptions", () => {
  it("verzwijgt de inleg-aannames zonder inleg", () => {
    render(<Assumptions inleg={0} />);
    expect(screen.queryByText(/agiostorting/)).toBeNull();
  });

  it("beschrijft de inleg-aannames bij een inleg", () => {
    render(<Assumptions inleg={500} />);
    expect(screen.getByText(/agiostorting/)).toBeDefined();
    expect(screen.getByText(/begin van elke maand/)).toBeDefined();
    expect(screen.getByText(/eerstvolgende peildatum/)).toBeDefined();
  });
});
