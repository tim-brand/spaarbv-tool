import { describe, expect, it } from "vitest";

// Dit project heeft geen @types/node (en dat willen we niet toevoegen voor
// één test). `require` en `__dirname` bestaan gewoon at runtime dankzij
// vite-node, maar TypeScript kent de "node:"-modulenamen niet zonder
// @types/node. Daarom declareren we hier alleen de paar signatures die we
// nodig hebben, in plaats van de hele module te typen.
declare const __dirname: string;
declare const require: {
  (id: "node:fs"): { readFileSync: (path: string, encoding: "utf-8") => string };
  (id: "node:path"): { join: (...segments: string[]) => string };
};

const fs = require("node:fs");
const path = require("node:path");

// Regressietest voor de CSS Grid min-content blowout: `1fr` is een
// afkorting voor `minmax(auto, 1fr)`, en `auto` als minimum betekent
// min-content. De tabel met `white-space: nowrap` duwde daardoor de
// rechterkolom (en daarmee de hele pagina) breder dan het scherm.
// Dit is een bewust bot instrument: het pint het CSS-mechanisme vast,
// niet het gerenderde resultaat. Een echte visuele/layout-check zou
// robuuster zijn, maar deze test voorkomt in ieder geval dat de kale
// `1fr` stilletjes terugsluipt.
describe("styles.css - grid blowout regressie", () => {
  const css = fs.readFileSync(path.join(__dirname, "../src/styles.css"), "utf-8");

  it("gebruikt minmax(0, 1fr) in plaats van kale 1fr voor de grid-kolommen", () => {
    const gridRules = css.match(/\.grid\s*{[^}]*}/g) ?? [];
    const mediaGridRules = css.match(/@media[^{]*{\s*\.grid\s*{[^}]*}/g) ?? [];
    const allGridRules = [...gridRules, ...mediaGridRules].join("\n");

    expect(allGridRules).toContain("minmax(0, 1fr)");

    // Er mag geen kale `1fr` (zonder minmax) meer voorkomen in de
    // grid-template-columns declaraties.
    const templateColumnsDeclarations =
      allGridRules.match(/grid-template-columns:[^;]+;/g) ?? [];
    for (const declaration of templateColumnsDeclarations) {
      expect(declaration).not.toMatch(/(?<!minmax\(0,\s*)\b1fr\b/);
    }
  });

  it("zet min-width: 0 op de directe kinderen van .grid", () => {
    expect(css).toMatch(/\.grid\s*>\s*\*\s*{[^}]*min-width:\s*0/);
  });
});
