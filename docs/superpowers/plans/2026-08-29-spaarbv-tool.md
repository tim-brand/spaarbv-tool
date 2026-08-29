# Spaar-BV tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a React + TypeScript tool that shows from which level of wealth it becomes advantageous to invest through a Dutch BV instead of privately in box 3, functionally replicating the calculator at https://independentwealth.nl/weggevers/spaarbv-56874/ minus its author block.

**Architecture:** A pure, dependency-free TypeScript model layer (`src/model/`) that knows nothing about React or the DOM, and a presentation layer (`src/components/`) that renders it. `App.tsx` holds the input state and derives everything else; components are pure on props. Both charts are hand-rolled SVG React components — no chart library. Correctness is pinned by golden-value tests generated from the original implementation running under Node.

**Tech Stack:** Vite, React 18, TypeScript, Vitest. No runtime dependencies beyond React. Plain CSS with custom properties.

**Spec:** `docs/superpowers/specs/2026-08-29-spaarbv-tool-design.md`

## Global Constraints

- **No `!` non-null assertions.** Use null checks, optional chaining or narrowing.
- **No `any`.** Use `unknown` with narrowing where a type is genuinely unknown.
- **No type assertions (`as X`)** where inference or narrowing suffices; never double assertions.
- **All user-facing copy is Dutch**, written fresh — do NOT copy the original's headings, hints or assumptions text verbatim. The visual language (palette, typography, card grid, chart style) IS replicated.
- **The author block (photo, name, role) from the original is omitted.** This was explicitly excluded.
- **Tax parameters are peiljaar 2026** and constant across the projection — no indexation, no inflation adjustment.
- **Money is never rounded inside the model.** Rounding happens only in formatters. Golden tests compare to 2 decimals.
- **Commit after every task** with conventional-commit messages, single line, no body.

---

### Task 1: Project scaffold and the golden fixture

The reference artifacts already exist in the repo — `scripts/reference-model.js` (the original's calculation functions extracted verbatim, wrapped as a CommonJS module) and `tests/fixtures/golden.json` (10 scenarios × 2 stelsels, with per-year rows). This task sets up the build so they can be used.

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`, `.gitignore`, `src/main.tsx`, `src/App.tsx`
- Existing (do not regenerate): `scripts/reference-model.js`, `scripts/generate-golden.js`, `tests/fixtures/golden.json`

**Interfaces:**
- Consumes: nothing
- Produces: a working `npm test` and `npm run dev`; `tests/fixtures/golden.json` loadable from tests

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "spaarbv-tool",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "golden": "node scripts/generate-golden.js"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.7.2",
    "vite": "^6.0.5",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  },
  "include": ["src", "tests"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

Note `noUncheckedIndexedAccess` is on. Array indexing yields `T | undefined`, so the model code must narrow rather than assert. This is deliberate — it is what keeps the no-`!` rule honest.

- [ ] **Step 3: Create `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "noEmit": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: Create `vite.config.ts`**

```ts
/// <reference types="vitest" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    // Model- en hooktests draaien in node; componenttests zetten zelf
    // `@vitest-environment jsdom` bovenaan het bestand.
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
});
```

Two things matter here and are easy to get wrong:
- The config must come from `vitest/config`, not `vite`, or the `test` key fails typecheck.
- The `include` glob must cover `.test.tsx` as well as `.test.ts` — Tasks 8-14 write `.tsx` test files, and a glob that misses them makes those suites silently not run.

- [ ] **Step 5: Create `index.html`**

```html
<!doctype html>
<html lang="nl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>Beleggen in de BV of privé?</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap"
      rel="stylesheet"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create `.gitignore`**

```
node_modules
dist
.DS_Store
*.local

# de spec en het plan horen wél in de repo
!docs/superpowers/
```

- [ ] **Step 7: Create placeholder `src/main.tsx` and `src/App.tsx`**

```tsx
// src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

const root = document.getElementById("root");
if (root === null) throw new Error("root-element ontbreekt");
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

```tsx
// src/App.tsx
export default function App() {
  return <div>spaar-BV tool</div>;
}
```

Also create an empty `src/styles.css` so the import resolves — Task 7 fills it.

- [ ] **Step 8: Install and verify the toolchain**

Run: `npm install && npm run typecheck && npm test`
Expected: install succeeds; typecheck passes; vitest reports "No test files found" and exits 0 (vitest exits 0 on no files with `--passWithNoTests`; if it exits 1, add `"test": "vitest run --passWithNoTests"`).

- [ ] **Step 9: Verify the golden fixture regenerates identically**

Run: `npm run golden && git status --short tests/fixtures/golden.json`
Expected: the script prints `cases: 10 bytes: 163404` and leaves `tests/fixtures/golden.json` byte-identical — proving the committed fixture is reproducible from the reference implementation. The generator resolves its paths against its own location, so it works from the repo root.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json tsconfig.json tsconfig.node.json vite.config.ts index.html .gitignore src/main.tsx src/App.tsx src/styles.css scripts/reference-model.js scripts/generate-golden.js tests/fixtures/golden.json
git commit -m "chore: scaffold vite react ts project with reference fixture"
```

---

### Task 2: Tax parameters and bracket functions

**Files:**
- Create: `src/model/types.ts`, `src/model/params.ts`
- Test: `tests/model/params.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `type Soort = "beleggen" | "spaar"`
  - `type Stelsel = "nu" | "2028"`
  - `interface Inputs { V, T, r, d, g, kosten, opricht, liqJaren, mult, soort }` (all `number` except `mult: 1 | 2` and `soort: Soort`)
  - `interface Box3Year { begin, rend, tax, netto }` — all `number`
  - `interface BvYear { begin, rend, kosten, vpb, stand, latent, netto }` — all `number`
  - `interface Band { from: number; to: number | null }`
  - `interface Decomposition { uitstel, hvr, kosten, vast, totaal }` — all `number`
  - `interface TaxParams { … }`, `const PARAMS_2026: TaxParams`
  - `function vpb(winst: number, p: TaxParams): number`
  - `function ab(basis: number, grens: number, p: TaxParams): number`

- [ ] **Step 1: Write `src/model/types.ts`**

```ts
/** Soort vermogen. Bepaalt het forfait in het huidige stelsel én of het
 *  rendement direct is (rente) of koersgroei (uitstelbaar). */
export type Soort = "beleggen" | "spaar";

/** Welk box 3-stelsel de BV tegenover zich krijgt. */
export type Stelsel = "nu" | "2028";

export interface Inputs {
  /** Startvermogen in euro's. */
  V: number;
  /** Horizon in hele jaren. */
  T: number;
  /** Totaalrendement per jaar als fractie, bijv. 0.07. */
  r: number;
  /** Direct rendement (rente/dividend) als fractie. Bij beleggen 0. */
  d: number;
  /** Koersgroei als fractie. Gelijk aan r - d. */
  g: number;
  /** Kosten van de BV per jaar in euro's. */
  kosten: number;
  /** Eenmalige oprichtingskosten, geboekt in jaar 1. */
  opricht: number;
  /** Over hoeveel jaar de BV aan het eind wordt uitgekeerd. */
  liqJaren: number;
  /** 2 met fiscale partner, anders 1. */
  mult: 1 | 2;
  soort: Soort;
}

/** Eén jaar in de privé-route. */
export interface Box3Year {
  /** Vermogen aan het begin van het jaar. */
  begin: number;
  /** Resultaat over dat jaar. */
  rend: number;
  /** Box 3-heffing, betaald uit het vermogen zelf. */
  tax: number;
  /** Vermogen aan het eind van het jaar, na heffing. */
  netto: number;
}

/** Eén jaar in de BV-route. */
export interface BvYear {
  begin: number;
  rend: number;
  /** Kosten van dat jaar, inclusief oprichting in jaar 1. */
  kosten: number;
  /** Daadwerkelijk in dat jaar betaalde Vpb. */
  vpb: number;
  /** Marktwaarde in de BV aan het eind van het jaar. */
  stand: number;
  /** Latente Vpb + box 2-claim als je nu zou liquideren. */
  latent: number;
  /** Wat je netto privé overhoudt als je nu liquideert en uitkeert. */
  netto: number;
}

/** Een vermogensinterval waarin de BV wint. `to: null` betekent oneindig. */
export interface Band {
  from: number;
  to: number | null;
}

/** Het verschil uit elkaar getrokken. uitstel + (-hvr) + (-kosten) === totaal. */
export interface Decomposition {
  /** Wat het uitstellen van belasting oplevert. Schaalt mee met het vermogen. */
  uitstel: number;
  /** Het heffingsvrije bedrag dat box 3 wél heeft en de BV niet. Vast bedrag. */
  hvr: number;
  /** Wat de BV over de hele horizon kost. Vast bedrag. */
  kosten: number;
  /** hvr + kosten: het deel dat niet meegroeit met het vermogen. */
  vast: number;
  /** Het totale verschil: gelijk aan delta(). */
  totaal: number;
}
```

- [ ] **Step 2: Write the failing test `tests/model/params.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { PARAMS_2026, ab, vpb } from "../../src/model/params";

describe("vpb", () => {
  it("rekent niets over nul of verlies", () => {
    expect(vpb(0, PARAMS_2026)).toBe(0);
    expect(vpb(-50_000, PARAMS_2026)).toBe(0);
  });

  it("past het lage tarief toe tot en met de schijfgrens", () => {
    expect(vpb(100_000, PARAMS_2026)).toBeCloseTo(19_000, 6);
    // precies op de grens: nog volledig laag
    expect(vpb(200_000, PARAMS_2026)).toBeCloseTo(38_000, 6);
  });

  it("past het hoge tarief toe boven de schijfgrens", () => {
    // 200.000 x 19% + 100.000 x 25,8%
    expect(vpb(300_000, PARAMS_2026)).toBeCloseTo(63_800, 6);
  });
});

describe("ab", () => {
  const grens = PARAMS_2026.abGrens;

  it("rekent niets over nul of negatief", () => {
    expect(ab(0, grens, PARAMS_2026)).toBe(0);
    expect(ab(-1_000, grens, PARAMS_2026)).toBe(0);
  });

  it("past het lage tarief toe tot en met de grens", () => {
    expect(ab(grens, grens, PARAMS_2026)).toBeCloseTo(16_866.535, 6);
  });

  it("past het hoge tarief toe boven de grens", () => {
    // 68.843 x 24,5% + 31.157 x 31%
    expect(ab(100_000, grens, PARAMS_2026)).toBeCloseTo(26_525.205, 6);
  });

  it("gebruikt de meegegeven grens, zodat een fiscale partner verdubbelt", () => {
    // met partner past 100.000 volledig in de lage schijf
    expect(ab(100_000, grens * 2, PARAMS_2026)).toBeCloseTo(24_500, 6);
  });
});

describe("PARAMS_2026", () => {
  it("heeft de tarieven van peiljaar 2026", () => {
    expect(PARAMS_2026).toEqual({
      wrTarief: 0.36,
      hvr: 1800,
      b3Tarief: 0.36,
      hvv: 59_357,
      forfBeleg: 0.06,
      forfSpaar: 0.0128,
      vpbLaag: 0.19,
      vpbHoog: 0.258,
      vpbGrens: 200_000,
      abLaag: 0.245,
      abHoog: 0.31,
      abGrens: 68_843,
    });
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run tests/model/params.test.ts`
Expected: FAIL — cannot resolve `../../src/model/params`.

- [ ] **Step 4: Write `src/model/params.ts`**

```ts
/** Belastingparameters. Peiljaar 2026; het nieuwe box 3-stelsel is een
 *  wetsvoorstel, beoogd 2028. Bedragen per persoon — met een fiscale partner
 *  verdubbelen hvv, hvr en abGrens (zie Inputs.mult). De Vpb-schijfgrens
 *  verdubbelt níet: die geldt per vennootschap. */
export interface TaxParams {
  /** Tarief vermogensaanwasbelasting, nieuw stelsel. */
  wrTarief: number;
  /** Heffingsvrij resultaat per jaar, nieuw stelsel. */
  hvr: number;
  /** Box 3-tarief, huidig stelsel. */
  b3Tarief: number;
  /** Heffingsvrij vermogen, huidig stelsel. */
  hvv: number;
  /** Forfaitair rendement beleggingen, huidig stelsel. */
  forfBeleg: number;
  /** Forfaitair rendement banktegoeden, huidig stelsel. */
  forfSpaar: number;
  vpbLaag: number;
  vpbHoog: number;
  vpbGrens: number;
  abLaag: number;
  abHoog: number;
  abGrens: number;
}

export const PARAMS_2026: TaxParams = {
  wrTarief: 0.36,
  hvr: 1800,
  b3Tarief: 0.36,
  hvv: 59_357,
  forfBeleg: 0.06,
  forfSpaar: 0.0128,
  vpbLaag: 0.19,
  vpbHoog: 0.258,
  vpbGrens: 200_000,
  abLaag: 0.245,
  abHoog: 0.31,
  abGrens: 68_843,
};

/** Vennootschapsbelasting over de winst. Verlies levert geen teruggaaf op —
 *  verliesverrekening gebeurt bij de aanroeper. */
export function vpb(winst: number, p: TaxParams): number {
  if (winst <= 0) return 0;
  if (winst <= p.vpbGrens) return winst * p.vpbLaag;
  return p.vpbGrens * p.vpbLaag + (winst - p.vpbGrens) * p.vpbHoog;
}

/** Box 2 (aanmerkelijk belang) over een uitkering boven de verkrijgingsprijs.
 *  `grens` wordt meegegeven omdat die met een fiscale partner verdubbelt. */
export function ab(basis: number, grens: number, p: TaxParams): number {
  if (basis <= 0) return 0;
  if (basis <= grens) return basis * p.abLaag;
  return grens * p.abLaag + (basis - grens) * p.abHoog;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/model/params.test.ts && npm run typecheck`
Expected: 8 tests PASS, typecheck clean.

- [ ] **Step 6: Commit**

```bash
git add src/model/types.ts src/model/params.ts tests/model/params.test.ts
git commit -m "feat(model): add tax parameters and bracket functions"
```

---

### Task 3: Box 3 simulation

**Files:**
- Create: `src/model/box3.ts`
- Test: `tests/model/box3.test.ts`

**Interfaces:**
- Consumes: `Inputs`, `Box3Year`, `Stelsel` from `types.ts`; `TaxParams`, `PARAMS_2026` from `params.ts`
- Produces: `function simulateBox3(V: number, s: Inputs, stelsel: Stelsel, p?: TaxParams): Box3Year[]` — returns exactly `s.T` rows

- [ ] **Step 1: Write the failing test `tests/model/box3.test.ts`**

The expected values below come from the reference implementation via `tests/fixtures/golden.json`; the first-year figures are also verifiable by hand and shown as such in the comments.

```ts
import { describe, expect, it } from "vitest";
import { simulateBox3 } from "../../src/model/box3";
import type { Inputs } from "../../src/model/types";

const basis: Inputs = {
  V: 200_000, T: 20, r: 0.07, d: 0, g: 0.07,
  kosten: 1200, opricht: 600, liqJaren: 1, mult: 1, soort: "beleggen",
};

describe("simulateBox3 — nieuw stelsel (2028)", () => {
  it("heft 36% over het werkelijke resultaat boven het heffingsvrij resultaat", () => {
    const rows = simulateBox3(200_000, basis, "2028");
    const eerste = rows[0];
    expect(eerste).toBeDefined();
    if (eerste === undefined) return;
    // 200.000 x 7% = 14.000 resultaat; (14.000 - 1.800) x 36% = 4.392
    expect(eerste.begin).toBeCloseTo(200_000, 6);
    expect(eerste.rend).toBeCloseTo(14_000, 6);
    expect(eerste.tax).toBeCloseTo(4_392, 6);
    // 200.000 + 14.000 - 4.392
    expect(eerste.netto).toBeCloseTo(209_608, 6);
  });

  it("verdubbelt het heffingsvrij resultaat met een fiscale partner", () => {
    const rows = simulateBox3(200_000, { ...basis, mult: 2 }, "2028");
    const eerste = rows[0];
    expect(eerste).toBeDefined();
    if (eerste === undefined) return;
    // (14.000 - 3.600) x 36% = 3.744
    expect(eerste.tax).toBeCloseTo(3_744, 6);
  });

  it("belast een verliesjaar niet en verrekent het verlies voorwaarts", () => {
    const verlies: Inputs = { ...basis, T: 2, r: -0.1, g: -0.1 };
    const rows = simulateBox3(100_000, verlies, "2028");
    const [jaar1, jaar2] = rows;
    expect(jaar1).toBeDefined();
    expect(jaar2).toBeDefined();
    if (jaar1 === undefined || jaar2 === undefined) return;
    // jaar 1: -10.000 resultaat, geen heffing, verliespot 10.000
    expect(jaar1.tax).toBe(0);
    expect(jaar1.netto).toBeCloseTo(90_000, 6);
    // jaar 2: opnieuw verlies, dus opnieuw geen heffing
    expect(jaar2.tax).toBe(0);
  });

  it("houdt de heffing op nul zolang het verlies aanhoudt", () => {
    const rows = simulateBox3(100_000, { ...basis, T: 3, r: -0.05, g: -0.05 }, "2028");
    expect(rows).toHaveLength(3);
    expect(rows.every((rij) => rij.tax === 0)).toBe(true);
  });

  it("heft niets zolang het resultaat onder het heffingsvrij resultaat blijft", () => {
    // 100.000 x 1% = 1.000 resultaat, onder de 1.800 vrijstelling
    const rows = simulateBox3(100_000, { ...basis, T: 1, r: 0.01, g: 0.01 }, "2028");
    const eerste = rows[0];
    expect(eerste).toBeDefined();
    if (eerste === undefined) return;
    expect(eerste.tax).toBe(0);
  });
});

describe("simulateBox3 — huidig stelsel (2026)", () => {
  it("heft forfaitair over de grondslag boven het heffingsvrij vermogen", () => {
    const rows = simulateBox3(200_000, basis, "nu");
    const eerste = rows[0];
    expect(eerste).toBeDefined();
    if (eerste === undefined) return;
    // (200.000 - 59.357) x 6,00% x 36% = 3.037,89
    expect(eerste.tax).toBeCloseTo(3_037.89, 2);
    expect(eerste.netto).toBeCloseTo(210_962.11, 2);
  });

  it("gebruikt het spaarforfait bij spaargeld", () => {
    const spaar: Inputs = { ...basis, r: 0.02, d: 0.02, g: 0, soort: "spaar" };
    const rows = simulateBox3(200_000, spaar, "nu");
    const eerste = rows[0];
    expect(eerste).toBeDefined();
    if (eerste === undefined) return;
    // (200.000 - 59.357) x 1,28% x 36% = 648,08
    expect(eerste.rend).toBeCloseTo(4_000, 6);
    expect(eerste.tax).toBeCloseTo(648.08, 2);
    expect(eerste.netto).toBeCloseTo(203_351.92, 2);
  });

  it("heft ook in een verliesjaar, want het forfait staat los van het resultaat", () => {
    const rows = simulateBox3(200_000, { ...basis, T: 1, r: -0.1, g: -0.1 }, "nu");
    const eerste = rows[0];
    expect(eerste).toBeDefined();
    if (eerste === undefined) return;
    expect(eerste.tax).toBeGreaterThan(0);
  });

  it("heft niets onder het heffingsvrij vermogen", () => {
    const rows = simulateBox3(50_000, { ...basis, T: 1 }, "nu");
    const eerste = rows[0];
    expect(eerste).toBeDefined();
    if (eerste === undefined) return;
    expect(eerste.tax).toBe(0);
  });
});

describe("simulateBox3 — vorm", () => {
  it("geeft precies T rijen terug", () => {
    expect(simulateBox3(200_000, { ...basis, T: 7 }, "2028")).toHaveLength(7);
  });

  it("laat elke rij aansluiten op de volgende", () => {
    const rows = simulateBox3(200_000, basis, "2028");
    for (let i = 1; i < rows.length; i += 1) {
      const vorige = rows[i - 1];
      const huidige = rows[i];
      if (vorige === undefined || huidige === undefined) continue;
      expect(huidige.begin).toBeCloseTo(vorige.netto, 6);
    }
  });
});
```

Note: the model applies one constant return to every year, so a loss-then-gain sequence cannot be expressed through this public API. The tests above therefore cover the loss pot only insofar as it suppresses tax across consecutive loss years. The actual loss-offset arithmetic is exercised by the golden tests in Task 5, which run real multi-year paths against the reference implementation.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/model/box3.test.ts`
Expected: FAIL — cannot resolve `../../src/model/box3`.

- [ ] **Step 3: Write `src/model/box3.ts`**

```ts
import { PARAMS_2026, type TaxParams } from "./params";
import type { Box3Year, Inputs, Stelsel } from "./types";

/**
 * Simuleert de privé-route in box 3 over `s.T` jaren.
 *
 * Nieuw stelsel (2028): vermogensaanwasbelasting. 36% over het werkelijke
 * resultaat — rente, dividend én de jaarlijkse waardestijging, ook als je
 * niets verkocht hebt — boven een heffingsvrij resultaat per jaar. Verlies
 * wordt niet belast maar gaat naar een verliespot die voorwaarts verrekend
 * wordt met latere winst.
 *
 * Huidig stelsel (2026): forfaitair. 36% over een verondersteld rendement
 * over de grondslag aan het begin van het jaar, boven het heffingsvrij
 * vermogen. Je betaalt dus ook in verliesjaren, en niets extra's in jaren
 * waarin je meer verdient dan het forfait.
 *
 * De heffing wordt uit het vermogen zelf betaald; er wordt niet bijgestort.
 */
export function simulateBox3(
  V: number,
  s: Inputs,
  stelsel: Stelsel,
  p: TaxParams = PARAMS_2026,
): Box3Year[] {
  const hvr = p.hvr * s.mult;
  const hvv = p.hvv * s.mult;
  const forfait = s.soort === "spaar" ? p.forfSpaar : p.forfBeleg;

  const rows: Box3Year[] = [];
  let vermogen = V;
  let verliespot = 0;

  for (let i = 0; i < s.T; i += 1) {
    const begin = vermogen;
    const rend = begin * s.r;
    vermogen = begin + rend;

    let tax: number;
    if (stelsel === "2028") {
      let grondslag = rend;
      if (grondslag < 0) {
        verliespot += -grondslag;
        grondslag = 0;
      } else {
        const verrekend = Math.min(grondslag, verliespot);
        grondslag -= verrekend;
        verliespot -= verrekend;
      }
      tax = Math.max(0, grondslag - hvr) * p.wrTarief;
    } else {
      tax = Math.max(0, begin - hvv) * forfait * p.b3Tarief;
    }

    vermogen -= tax;
    rows.push({ begin, rend, tax, netto: vermogen });
  }

  return rows;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/model/box3.test.ts && npm run typecheck`
Expected: all PASS, typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/model/box3.ts tests/model/box3.test.ts
git commit -m "feat(model): add box 3 simulation for both stelsels"
```

---

### Task 4: BV simulation and liquidation

**Files:**
- Create: `src/model/bv.ts`
- Test: `tests/model/bv.test.ts`

**Interfaces:**
- Consumes: `Inputs`, `BvYear` from `types.ts`; `TaxParams`, `PARAMS_2026`, `vpb`, `ab` from `params.ts`
- Produces:
  - `interface LiquidationResult { netto: number; latVpb: number; latAb: number }`
  - `function netIfLiquidatedNow(A: number, C: number, VK: number, pending: number, verlies: number, s: Inputs, p?: TaxParams): LiquidationResult`
  - `function simulateBV(V: number, s: Inputs, p?: TaxParams): BvYear[]` — returns exactly `s.T` rows

**Domain notes for the implementer.** Three quantities run in parallel and must not be conflated:

- `A` — **marktwaarde**: what the portfolio is worth.
- `C` — **boekwaarde**: what it is carried at on the balance sheet, i.e. cost price. Unrealised gains do NOT move it. The gap `A − C` is the stille reserve, and deferring tax on that gap is the entire BV advantage.
- `VK` — **verkrijgingsprijs**: the original paid-in capital. It comes back untaxed; only what exceeds it is box 2-taxed.

`pending` is realised gain that arose from selling to cover a cash shortfall, deferred into the next financial year. `verlies` is the Vpb loss pot.

- [ ] **Step 1: Write the failing test `tests/model/bv.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { netIfLiquidatedNow, simulateBV } from "../../src/model/bv";
import { PARAMS_2026 } from "../../src/model/params";
import type { Inputs } from "../../src/model/types";

const basis: Inputs = {
  V: 200_000, T: 20, r: 0.07, d: 0, g: 0.07,
  kosten: 1200, opricht: 600, liqJaren: 1, mult: 1, soort: "beleggen",
};

describe("netIfLiquidatedNow", () => {
  it("rekent niets af als er geen stille reserve en geen aangroei is", () => {
    const r = netIfLiquidatedNow(200_000, 200_000, 200_000, 0, 0, basis);
    expect(r.latVpb).toBe(0);
    expect(r.latAb).toBe(0);
    expect(r.netto).toBeCloseTo(200_000, 6);
  });

  it("belast de stille reserve met Vpb en de aangroei daarna met box 2", () => {
    // marktwaarde 300.000, boekwaarde 200.000 -> stille reserve 100.000
    // Vpb: 100.000 x 19% = 19.000; kas = 300.000 - 19.000 = 281.000
    // box 2-basis = 281.000 - 200.000 = 81.000
    //   68.843 x 24,5% + 12.157 x 31% = 16.866,535 + 3.768,67 = 20.635,205
    const r = netIfLiquidatedNow(300_000, 200_000, 200_000, 0, 0, basis);
    expect(r.latVpb).toBeCloseTo(19_000, 6);
    expect(r.latAb).toBeCloseTo(20_635.205, 6);
    expect(r.netto).toBeCloseTo(281_000 - 20_635.205, 6);
  });

  it("benut de lage box 2-schijf vaker bij gespreid uitkeren", () => {
    const ineens = netIfLiquidatedNow(300_000, 200_000, 200_000, 0, 0, basis);
    const gespreid = netIfLiquidatedNow(300_000, 200_000, 200_000, 0, 0, {
      ...basis, liqJaren: 5,
    });
    // dezelfde Vpb-som, maar minder box 2 doordat elke tranche in de lage schijf valt
    expect(gespreid.latAb).toBeLessThan(ineens.latAb);
    // 81.000 / 5 = 16.200 per jaar, ruim onder de grens -> volledig 24,5%
    expect(gespreid.latAb).toBeCloseTo(81_000 * PARAMS_2026.abLaag, 6);
  });

  it("telt pending mee in de stille reserve", () => {
    const zonder = netIfLiquidatedNow(300_000, 200_000, 200_000, 0, 0, basis);
    const met = netIfLiquidatedNow(300_000, 200_000, 200_000, 50_000, 0, basis);
    expect(met.latVpb).toBeGreaterThan(zonder.latVpb);
  });

  it("verrekent de verliespot met de stille reserve", () => {
    const r = netIfLiquidatedNow(300_000, 200_000, 200_000, 0, 100_000, basis);
    expect(r.latVpb).toBe(0);
  });

  it("verdubbelt de box 2-schijf met een fiscale partner", () => {
    const alleen = netIfLiquidatedNow(300_000, 200_000, 200_000, 0, 0, basis);
    const partner = netIfLiquidatedNow(300_000, 200_000, 200_000, 0, 0, {
      ...basis, mult: 2,
    });
    // box 2-basis 81.000 past dan volledig in de lage schijf
    expect(partner.latAb).toBeCloseTo(81_000 * PARAMS_2026.abLaag, 6);
    expect(partner.latAb).toBeLessThan(alleen.latAb);
  });
});

describe("simulateBV", () => {
  it("boekt de oprichtingskosten alleen in jaar 1", () => {
    const rows = simulateBV(200_000, basis);
    const [jaar1, jaar2] = rows;
    expect(jaar1).toBeDefined();
    expect(jaar2).toBeDefined();
    if (jaar1 === undefined || jaar2 === undefined) return;
    expect(jaar1.kosten).toBeCloseTo(1_800, 6); // 1.200 + 600
    expect(jaar2.kosten).toBeCloseTo(1_200, 6);
  });

  it("betaalt geen Vpb zolang er alleen ongerealiseerde koerswinst is", () => {
    // beleggen: d = 0, dus geen belastbare bate; de kosten maken juist verlies
    const rows = simulateBV(200_000, basis);
    expect(rows.every((rij) => rij.vpb === 0)).toBe(true);
  });

  it("reproduceert de referentiewaarden voor het eerste jaar", () => {
    const rows = simulateBV(200_000, basis);
    const eerste = rows[0];
    expect(eerste).toBeDefined();
    if (eerste === undefined) return;
    expect(eerste.begin).toBeCloseTo(200_000, 6);
    expect(eerste.rend).toBeCloseTo(14_000, 6);
    // 214.000 marktwaarde min 1.800 kosten die uit de portefeuille komen
    expect(eerste.stand).toBeCloseTo(212_200, 2);
    expect(eerste.latent).toBeCloseTo(4_739.09, 2);
    expect(eerste.netto).toBeCloseTo(207_460.91, 2);
  });

  it("belast rente wel direct, want daar valt niets uit te stellen", () => {
    const spaar: Inputs = { ...basis, r: 0.04, d: 0.04, g: 0, T: 3 };
    const rows = simulateBV(500_000, spaar);
    const eerste = rows[0];
    expect(eerste).toBeDefined();
    if (eerste === undefined) return;
    // 20.000 rente - 1.800 kosten = 18.200 winst -> 19% = 3.458
    expect(eerste.vpb).toBeCloseTo(3_458, 6);
  });

  it("geeft precies T rijen terug", () => {
    expect(simulateBV(200_000, { ...basis, T: 9 })).toHaveLength(9);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/model/bv.test.ts`
Expected: FAIL — cannot resolve `../../src/model/bv`.

- [ ] **Step 3: Write `src/model/bv.ts`**

```ts
import { PARAMS_2026, ab, vpb, type TaxParams } from "./params";
import type { BvYear, Inputs } from "./types";

export interface LiquidationResult {
  /** Wat er netto privé overblijft. */
  netto: number;
  /** De Vpb die daarbij wordt afgerekend over de stille reserve. */
  latVpb: number;
  /** De box 2-heffing over wat er boven de verkrijgingsprijs uitkomt. */
  latAb: number;
}

/**
 * Wat je netto privé overhoudt als je de BV nú liquideert en de opbrengst
 * over `s.liqJaren` jaar uitkeert.
 *
 * De stille reserve — marktwaarde min boekwaarde, plus nog niet verwerkte
 * gerealiseerde winst — wordt over de uitkeerperiode verdeeld en per tranche
 * tegen Vpb belast, zodat de lage Vpb-schijf meerdere keren wordt benut. Wat
 * daarna in kas zit boven de verkrijgingsprijs is box 2-belast, opnieuw in
 * tranches, zodat ook de lage box 2-schijf vaker meetelt.
 *
 * Tijdens de afwikkeling wordt geen rendement meer gerekend. Dat maakt de
 * uitkomst iets voorzichtig.
 *
 * @param A marktwaarde van de portefeuille
 * @param C boekwaarde (kostprijs)
 * @param VK verkrijgingsprijs: de oorspronkelijke inleg, komt onbelast terug
 * @param pending gerealiseerde winst die nog in de heffing moet vallen
 * @param verlies openstaande verliespot voor de Vpb
 */
export function netIfLiquidatedNow(
  A: number,
  C: number,
  VK: number,
  pending: number,
  verlies: number,
  s: Inputs,
  p: TaxParams = PARAMS_2026,
): LiquidationResult {
  const N = s.liqJaren;
  const reserve = A - C + pending;

  let verliespot = verlies;
  let kas = 0;
  let latVpb = 0;

  for (let j = 0; j < N; j += 1) {
    let winst = reserve / N;
    if (winst < 0) {
      verliespot += -winst;
      winst = 0;
    } else {
      const verrekend = Math.min(winst, verliespot);
      winst -= verrekend;
      verliespot -= verrekend;
    }
    const heffing = vpb(winst, p);
    latVpb += heffing;
    kas += A / N - heffing;
  }

  if (kas < 0) kas = 0;

  const abBasis = kas - VK;
  const abGrens = p.abGrens * s.mult;
  let latAb = 0;
  if (abBasis > 0) {
    for (let k = 0; k < N; k += 1) latAb += ab(abBasis / N, abGrens, p);
  }

  return { netto: kas - latAb, latVpb, latAb };
}

/**
 * Simuleert de BV-route over `s.T` jaren.
 *
 * Waardering op kostprijs of lagere marktwaarde: koerswinst raakt de
 * boekwaarde niet en valt pas in de heffing bij verkoop. Dát uitstel is waar
 * het BV-voordeel vandaan komt. Rente en dividend zijn wél direct belast.
 *
 * Kosten en Vpb worden uit de BV zelf betaald. Is er te weinig kas, dan wordt
 * er verkocht; de daarbij gerealiseerde winst schuift door naar het volgende
 * boekjaar en de boekwaarde daalt naar rato.
 *
 * `netto` per rij is wat je overhoudt als je de BV in dát jaar zou liquideren
 * en uitkeren — zo zijn beide routes elk jaar appels met appels.
 */
export function simulateBV(V: number, s: Inputs, p: TaxParams = PARAMS_2026): BvYear[] {
  let A = V; // marktwaarde
  let C = V; // boekwaarde
  const VK = V; // verkrijgingsprijs

  let verlies = 0;
  let pending = 0;
  const rows: BvYear[] = [];

  for (let i = 0; i < s.T; i += 1) {
    const begin = A;
    const div = begin * s.d;
    A = begin * (1 + s.g);

    const gerealiseerd = pending;
    pending = 0;

    const kosten = s.kosten + (i === 0 ? s.opricht : 0);

    let winst = div + gerealiseerd - kosten;
    let betaaldeVpb = 0;
    if (winst < 0) {
      verlies += -winst;
    } else {
      const verrekend = Math.min(winst, verlies);
      winst -= verrekend;
      verlies -= verrekend;
      betaaldeVpb = vpb(winst, p);
    }

    const saldo = div - kosten - betaaldeVpb;
    if (saldo >= 0) {
      A += saldo;
      C += saldo;
    } else {
      const verkoop = -saldo;
      if (A > 0) {
        const boekdeel = C / A;
        pending += verkoop * (1 - boekdeel);
        C -= verkoop * boekdeel;
      }
      A -= verkoop;
    }
    if (A < 0) A = 0;
    if (C < 0) C = 0;

    const liq = netIfLiquidatedNow(A, C, VK, pending, verlies, s, p);
    rows.push({
      begin,
      rend: begin * s.r,
      kosten,
      vpb: betaaldeVpb,
      stand: A,
      latent: liq.latVpb + liq.latAb,
      netto: liq.netto,
    });
  }

  return rows;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/model/bv.test.ts && npm run typecheck`
Expected: all PASS, typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/model/bv.ts tests/model/bv.test.ts
git commit -m "feat(model): add bv simulation with deferred gains and liquidation"
```

---

### Task 5: Comparison, breakeven bands, decomposition — and the golden tests

This is the task that proves the replication. The golden fixture holds 10 scenarios × 2 stelsels with every per-year row; if this passes, the model is numerically identical to the original.

**Files:**
- Create: `src/model/compare.ts`
- Test: `tests/model/compare.test.ts`, `tests/model/golden.test.ts`

**Interfaces:**
- Consumes: `simulateBox3`, `simulateBV`, `Inputs`, `Band`, `Decomposition`, `Stelsel`, `TaxParams`, `PARAMS_2026`
- Produces:
  - `const V_MIN = 25_000`, `const V_MAX = 5_000_000`
  - `function finalBox3(V: number, s: Inputs, stelsel: Stelsel, p?: TaxParams): number`
  - `function finalBV(V: number, s: Inputs, p?: TaxParams): number`
  - `function delta(V: number, s: Inputs, stelsel: Stelsel, p?: TaxParams): number`
  - `function breakevenBands(s: Inputs, stelsel: Stelsel, p?: TaxParams): Band[]`
  - `function decompose(V: number, s: Inputs, stelsel: Stelsel, p?: TaxParams): Decomposition`

- [ ] **Step 1: Write the failing golden test `tests/model/golden.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import golden from "../fixtures/golden.json";
import { simulateBox3 } from "../../src/model/box3";
import { simulateBV } from "../../src/model/bv";
import { breakevenBands, decompose, delta } from "../../src/model/compare";
import type { Inputs, Soort, Stelsel } from "../../src/model/types";

interface GoldenInput {
  V: number; T: number; rendPct: number; kosten: number;
  opricht: number; liq: number; partner: boolean; soort: string;
}
interface GoldenYearB3 { begin: number; rend: number; tax: number; netto: number }
interface GoldenYearBv {
  begin: number; rend: number; kosten: number; vpb: number;
  stand: number; latent: number; netto: number;
}
interface GoldenStelsel {
  eindBox3: number; eindBV: number; delta: number;
  /** Elk element is [ondergrens, bovengrens]; bovengrens null betekent oneindig.
   *  Bewust geen tuple-type: het JSON-import leidt arrays af, geen tuples. */
  bands: Array<Array<number | null>>;
  ontleed: { uitstel: number; hvr: number; kosten: number; vast: number; totaal: number };
  box3Jaren: GoldenYearB3[];
  bvJaren: GoldenYearBv[];
}
interface GoldenCase { name: string; input: GoldenInput; nu: GoldenStelsel; "2028": GoldenStelsel }

function isSoort(v: string): v is Soort {
  return v === "beleggen" || v === "spaar";
}

function toInputs(g: GoldenInput): Inputs {
  if (!isSoort(g.soort)) throw new Error(`onbekend soort: ${g.soort}`);
  const r = g.rendPct / 100;
  const d = g.soort === "spaar" ? r : 0;
  return {
    V: g.V, T: g.T, r, d, g: r - d,
    kosten: g.kosten, opricht: g.opricht, liqJaren: g.liq,
    mult: g.partner ? 2 : 1, soort: g.soort,
  };
}

/** Geen cast: de interfaces hierboven zijn opzettelijk zo geschreven dat de
 *  vorm die TypeScript uit golden.json afleidt er rechtstreeks op past. Wijkt
 *  de fixture af, dan loopt deze regel stuk — precies wat je wilt. */
const cases: GoldenCase[] = golden;
const stelsels: Stelsel[] = ["nu", "2028"];

describe("golden values tegen de referentie-implementatie", () => {
  it("dekt tien scenario's", () => {
    expect(cases).toHaveLength(10);
  });

  for (const c of cases) {
    for (const stelsel of stelsels) {
      const verwacht = c[stelsel];
      const s = toInputs(c.input);

      describe(`${c.name} — ${stelsel}`, () => {
        it("reproduceert elke box 3-jaarrij", () => {
          const rows = simulateBox3(c.input.V, s, stelsel);
          expect(rows).toHaveLength(verwacht.box3Jaren.length);
          rows.forEach((rij, i) => {
            const w = verwacht.box3Jaren[i];
            expect(w).toBeDefined();
            if (w === undefined) return;
            expect(rij.begin).toBeCloseTo(w.begin, 2);
            expect(rij.rend).toBeCloseTo(w.rend, 2);
            expect(rij.tax).toBeCloseTo(w.tax, 2);
            expect(rij.netto).toBeCloseTo(w.netto, 2);
          });
        });

        it("reproduceert elke BV-jaarrij", () => {
          const rows = simulateBV(c.input.V, s);
          expect(rows).toHaveLength(verwacht.bvJaren.length);
          rows.forEach((rij, i) => {
            const w = verwacht.bvJaren[i];
            expect(w).toBeDefined();
            if (w === undefined) return;
            expect(rij.begin).toBeCloseTo(w.begin, 2);
            expect(rij.rend).toBeCloseTo(w.rend, 2);
            expect(rij.kosten).toBeCloseTo(w.kosten, 2);
            expect(rij.vpb).toBeCloseTo(w.vpb, 2);
            expect(rij.stand).toBeCloseTo(w.stand, 2);
            expect(rij.latent).toBeCloseTo(w.latent, 2);
            expect(rij.netto).toBeCloseTo(w.netto, 2);
          });
        });

        it("reproduceert het verschil", () => {
          expect(delta(c.input.V, s, stelsel)).toBeCloseTo(verwacht.delta, 2);
        });

        it("reproduceert de kantelpunten", () => {
          const bands = breakevenBands(s, stelsel);
          expect(bands).toHaveLength(verwacht.bands.length);
          bands.forEach((b, i) => {
            const w = verwacht.bands[i];
            expect(w).toBeDefined();
            if (w === undefined) return;
            const onder = w[0];
            const boven = w[1];
            expect(typeof onder).toBe("number");
            if (typeof onder !== "number") return;
            expect(b.from).toBeCloseTo(onder, 2);
            if (boven === null || boven === undefined) {
              expect(b.to).toBeNull();
            } else {
              expect(b.to).not.toBeNull();
              if (b.to === null) return;
              expect(b.to).toBeCloseTo(boven, 2);
            }
          });
        });

        it("reproduceert de uitsplitsing", () => {
          const o = decompose(c.input.V, s, stelsel);
          expect(o.uitstel).toBeCloseTo(verwacht.ontleed.uitstel, 2);
          expect(o.hvr).toBeCloseTo(verwacht.ontleed.hvr, 2);
          expect(o.kosten).toBeCloseTo(verwacht.ontleed.kosten, 2);
          expect(o.vast).toBeCloseTo(verwacht.ontleed.vast, 2);
          expect(o.totaal).toBeCloseTo(verwacht.ontleed.totaal, 2);
        });
      });
    }
  }
});
```

- [ ] **Step 2: Write the failing unit test `tests/model/compare.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { V_MAX, V_MIN, breakevenBands, decompose, delta, finalBV, finalBox3 } from "../../src/model/compare";
import type { Inputs } from "../../src/model/types";

const basis: Inputs = {
  V: 200_000, T: 20, r: 0.07, d: 0, g: 0.07,
  kosten: 1200, opricht: 600, liqJaren: 1, mult: 1, soort: "beleggen",
};

describe("delta", () => {
  it("is het verschil tussen de BV en box 3", () => {
    const d = delta(200_000, basis, "2028");
    expect(d).toBeCloseTo(finalBV(200_000, basis) - finalBox3(200_000, basis, "2028"), 6);
    // referentiewaarde
    expect(d).toBeCloseTo(-19_380.62, 2);
  });

  it("groeit met het vermogen, want het uitstel schaalt mee", () => {
    expect(delta(1_000_000, basis, "2028")).toBeGreaterThan(delta(200_000, basis, "2028"));
  });
});

describe("breakevenBands", () => {
  it("vindt het kantelpunt voor het standaardscenario", () => {
    const bands = breakevenBands(basis, "2028");
    expect(bands).toHaveLength(1);
    const eerste = bands[0];
    expect(eerste).toBeDefined();
    if (eerste === undefined) return;
    expect(eerste.from).toBeCloseTo(490_469.45, 2);
    expect(eerste.to).toBeNull();
  });

  it("geeft een lege lijst als de BV nergens wint", () => {
    // spaargeld: rente is direct belast, dus er valt niets uit te stellen
    const spaar: Inputs = { ...basis, r: 0.02, d: 0.02, g: 0, soort: "spaar" };
    expect(breakevenBands(spaar, "2028")).toHaveLength(0);
  });

  it("verschuift het kantelpunt omhoog met een fiscale partner", () => {
    const alleen = breakevenBands(basis, "2028")[0];
    const partner = breakevenBands({ ...basis, mult: 2 }, "2028")[0];
    expect(alleen).toBeDefined();
    expect(partner).toBeDefined();
    if (alleen === undefined || partner === undefined) return;
    expect(partner.from).toBeGreaterThan(alleen.from);
    expect(partner.from).toBeCloseTo(727_444.17, 2);
  });

  it("verschuift het kantelpunt omhoog bij hogere kosten", () => {
    const duur = breakevenBands({ ...basis, kosten: 5000, opricht: 2500 }, "2028")[0];
    expect(duur).toBeDefined();
    if (duur === undefined) return;
    expect(duur.from).toBeCloseTo(1_738_575.12, 2);
  });

  it("houdt zich aan het scanbereik", () => {
    for (const band of breakevenBands(basis, "2028")) {
      expect(band.from).toBeGreaterThanOrEqual(V_MIN);
      expect(band.from).toBeLessThanOrEqual(V_MAX);
    }
  });
});

describe("decompose", () => {
  it("telt exact op tot delta", () => {
    for (const V of [50_000, 200_000, 750_000, 2_000_000]) {
      const o = decompose(V, basis, "2028");
      expect(o.uitstel - o.hvr - o.kosten).toBeCloseTo(o.totaal, 6);
      expect(o.vast).toBeCloseTo(o.hvr + o.kosten, 6);
      expect(o.totaal).toBeCloseTo(delta(V, basis, "2028"), 6);
    }
  });

  it("laat het vaste deel nauwelijks meebewegen met het vermogen", () => {
    const klein = decompose(200_000, basis, "2028");
    const groot = decompose(2_000_000, basis, "2028");
    // het uitstel schaalt mee, het vaste deel niet
    expect(groot.uitstel / klein.uitstel).toBeGreaterThan(5);
    expect(groot.vast / klein.vast).toBeLessThan(2);
  });

  it("is op het kantelpunt per saldo nul", () => {
    const band = breakevenBands(basis, "2028")[0];
    expect(band).toBeDefined();
    if (band === undefined) return;
    const o = decompose(band.from, basis, "2028");
    expect(o.totaal).toBeCloseTo(0, 2);
    expect(o.uitstel).toBeCloseTo(o.vast, 2);
  });

  it("muteert de meegegeven parameters niet", () => {
    // regressietest op de globale-mutatie-hack uit het origineel
    const voor = delta(200_000, basis, "2028");
    decompose(200_000, basis, "2028");
    decompose(200_000, basis, "nu");
    expect(delta(200_000, basis, "2028")).toBeCloseTo(voor, 10);
  });
});
```

- [ ] **Step 3: Run both tests to verify they fail**

Run: `npx vitest run tests/model/compare.test.ts tests/model/golden.test.ts`
Expected: FAIL — cannot resolve `../../src/model/compare`.

- [ ] **Step 4: Write `src/model/compare.ts`**

```ts
import { simulateBox3 } from "./box3";
import { simulateBV } from "./bv";
import { PARAMS_2026, type TaxParams } from "./params";
import type { Band, Decomposition, Inputs, Stelsel } from "./types";

/** Onder- en bovengrens van het vermogensbereik dat we afzoeken. */
export const V_MIN = 25_000;
export const V_MAX = 5_000_000;

function laatste<T>(rows: T[]): T {
  const r = rows[rows.length - 1];
  if (r === undefined) throw new Error("simulatie leverde geen rijen op (T moet >= 1 zijn)");
  return r;
}

/** Netto eindvermogen van de privé-route. */
export function finalBox3(
  V: number, s: Inputs, stelsel: Stelsel, p: TaxParams = PARAMS_2026,
): number {
  return laatste(simulateBox3(V, s, stelsel, p)).netto;
}

/** Netto eindvermogen van de BV-route, na liquidatie en uitkeren. */
export function finalBV(V: number, s: Inputs, p: TaxParams = PARAMS_2026): number {
  return laatste(simulateBV(V, s, p)).netto;
}

/** Positief = de BV levert meer op; negatief = box 3 wint. */
export function delta(
  V: number, s: Inputs, stelsel: Stelsel, p: TaxParams = PARAMS_2026,
): number {
  return finalBV(V, s, p) - finalBox3(V, s, stelsel, p);
}

/**
 * De vermogensintervallen waarin de BV wint.
 *
 * Het is niet per se één grens: bij hoge vermogens kan de BV weer verliezen
 * doordat de lage Vpb- en box 2-schijven wegvallen. We scannen daarom
 * logaritmisch over het hele bereik, zoeken elke tekenwissel op en verfijnen
 * die met bisectie in log-ruimte (het meetkundig gemiddelde als middelpunt).
 */
export function breakevenBands(
  s: Inputs, stelsel: Stelsel, p: TaxParams = PARAMS_2026,
): Band[] {
  const n = 80;
  const wint: boolean[] = [];
  const bedragen: number[] = [];

  for (let i = 0; i <= n; i += 1) {
    const V = V_MIN * Math.pow(V_MAX / V_MIN, i / n);
    bedragen.push(V);
    wint.push(delta(V, s, stelsel, p) > 0);
  }

  const eersteWint = wint[0];
  if (eersteWint === undefined) return [];

  const out: Band[] = [];
  let open: number | null = eersteWint ? V_MIN : null;

  for (let i = 1; i <= n; i += 1) {
    const nu = wint[i];
    const vorige = wint[i - 1];
    const bNu = bedragen[i];
    const bVorige = bedragen[i - 1];
    if (nu === undefined || vorige === undefined || bNu === undefined || bVorige === undefined) continue;
    if (nu === vorige) continue;

    let onder = bVorige;
    let boven = bNu;
    for (let k = 0; k < 32; k += 1) {
      const midden = Math.sqrt(onder * boven);
      if ((delta(midden, s, stelsel, p) > 0) === vorige) onder = midden;
      else boven = midden;
    }
    const grens = Math.sqrt(onder * boven);

    if (nu) {
      open = grens;
    } else if (open !== null) {
      out.push({ from: open, to: grens });
      open = null;
    }
  }

  if (open !== null) out.push({ from: open, to: null });
  return out;
}

/**
 * Trekt het verschil uit elkaar in drie stukken die exact optellen tot delta:
 *
 *  - uitstel: wat het uitstellen van belasting oplevert. Schaalt mee met het vermogen.
 *  - hvr:     het heffingsvrije bedrag dat box 3 wél heeft en de BV niet. Vast.
 *  - kosten:  wat de BV over de horizon kost. Vast.
 *
 * Omdat het eerste meeschaalt en de andere twee niet, is er een vermogen waar
 * ze elkaar opheffen — en dat is precies het kantelpunt.
 *
 * Het origineel deed dit door zijn globale parameter-object te muteren. Hier
 * bouwen we in plaats daarvan losse parameter-objecten, zodat er geen gedeelde
 * mutabele state is.
 */
export function decompose(
  V: number, s: Inputs, stelsel: Stelsel, p: TaxParams = PARAMS_2026,
): Decomposition {
  const kaal: Inputs = { ...s, kosten: 0, opricht: 0 };
  const zonderVrijstelling: TaxParams =
    stelsel === "nu" ? { ...p, hvv: 0 } : { ...p, hvr: 0 };

  const uitstel = delta(V, kaal, stelsel, zonderVrijstelling);
  const metVrijstelling = delta(V, kaal, stelsel, p);
  const totaal = delta(V, s, stelsel, p);

  return {
    uitstel,
    hvr: uitstel - metVrijstelling,
    kosten: metVrijstelling - totaal,
    vast: uitstel - totaal,
    totaal,
  };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run && npm run typecheck`
Expected: all model tests PASS — including all 10 golden scenarios × 2 stelsels × 5 assertions each. Typecheck clean.

If a golden assertion fails, the model deviates from the original. Do not adjust the fixture — fix the model.

- [ ] **Step 6: Commit**

```bash
git add src/model/compare.ts tests/model/compare.test.ts tests/model/golden.test.ts
git commit -m "feat(model): add comparison, breakeven bands and decomposition"
```

---

### Task 6: Formatters and input parsing

**Files:**
- Create: `src/model/format.ts`
- Test: `tests/model/format.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `function eur(x: number): string` — "€ 200.000", minus sign U+2212
  - `function kort(x: number): string` — "€200k", "€1,2M"
  - `function pct(x: number): string` — "7,0%" (input is a percentage, not a fraction)
  - `function parseNum(v: string, fallback: number, max: number): number`
  - `function formatNumberNl(x: number): string` — "1.200"

- [ ] **Step 1: Write the failing test `tests/model/format.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { eur, formatNumberNl, kort, parseNum, pct } from "../../src/model/format";

describe("eur", () => {
  it("formatteert in nl-NL zonder centen", () => {
    // non-breaking space na het euroteken, afhankelijk van de ICU-versie
    expect(eur(200_000).replace(/ | /g, " ")).toBe("€ 200.000");
  });

  it("rondt af op hele euro's", () => {
    expect(eur(1234.56).replace(/ | /g, " ")).toBe("€ 1.235");
  });

  it("gebruikt een echt minteken", () => {
    expect(eur(-5000)).toContain("−");
    expect(eur(-5000)).not.toContain("-");
  });
});

describe("kort", () => {
  it("kort duizenden af", () => {
    expect(kort(200_000)).toBe("€200k");
    expect(kort(25_000)).toBe("€25k");
  });

  it("kort miljoenen af met één decimaal", () => {
    expect(kort(1_200_000)).toBe("€1,2M");
  });

  it("laat de decimaal weg vanaf tien miljoen", () => {
    expect(kort(12_000_000)).toBe("€12M");
  });

  it("laat kleine bedragen heel", () => {
    expect(kort(750)).toBe("€750");
  });

  it("gebruikt een echt minteken", () => {
    expect(kort(-200_000)).toBe("−€200k");
  });
});

describe("pct", () => {
  it("toont één decimaal met een komma", () => {
    expect(pct(7)).toBe("7,0%");
    expect(pct(1.28)).toBe("1,3%");
  });
});

describe("formatNumberNl", () => {
  it("gebruikt punten als duizendtalscheiding", () => {
    expect(formatNumberNl(1200)).toBe("1.200");
    expect(formatNumberNl(600)).toBe("600");
  });
});

describe("parseNum", () => {
  it("leest een kaal getal", () => {
    expect(parseNum("1200", 0, 50_000)).toBe(1200);
  });

  it("leest nl-notatie met duizendtalpunten", () => {
    expect(parseNum("1.200", 0, 50_000)).toBe(1200);
    expect(parseNum("12.500", 0, 50_000)).toBe(12_500);
  });

  it("leest een bedrag met euroteken en centen", () => {
    expect(parseNum("€ 1.200,50", 0, 50_000)).toBeCloseTo(1200.5, 6);
  });

  it("valt terug op de fallback bij onzin", () => {
    expect(parseNum("", 1200, 50_000)).toBe(1200);
    expect(parseNum("abc", 1200, 50_000)).toBe(1200);
  });

  it("valt terug op de fallback bij een negatief bedrag", () => {
    expect(parseNum("-500", 1200, 50_000)).toBe(1200);
  });

  it("kapt af op het maximum", () => {
    expect(parseNum("999999", 1200, 50_000)).toBe(50_000);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/model/format.test.ts`
Expected: FAIL — cannot resolve `../../src/model/format`.

- [ ] **Step 3: Write `src/model/format.ts`**

```ts
const euroFormatter = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const getalFormatter = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 });

/** Bedrag in hele euro's, nl-NL, met een typografisch minteken. */
export function eur(x: number): string {
  return euroFormatter.format(Math.round(x)).replace("-", "−");
}

/** Kort bedrag voor assen en labels: €750, €200k, €1,2M. */
export function kort(x: number): string {
  const a = Math.abs(x);
  const teken = x < 0 ? "−" : "";
  if (a >= 1e6) {
    return `${teken}€${(a / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(".", ",")}M`;
  }
  if (a >= 1e3) return `${teken}€${Math.round(a / 1e3)}k`;
  return `${teken}€${Math.round(a)}`;
}

/** Percentage met één decimaal. Verwacht 7 voor 7%, niet 0.07. */
export function pct(x: number): string {
  return `${x.toFixed(1).replace(".", ",")}%`;
}

/** Getal met nl-NL duizendtalscheiding, zonder valutateken. */
export function formatNumberNl(x: number): string {
  return getalFormatter.format(Math.round(x));
}

/**
 * Leest een bedrag uit een vrij tekstveld. Accepteert "1200", "1.200" en
 * "€ 1.200,50". Bij onzin of een negatief bedrag komt `fallback` terug; het
 * resultaat wordt afgekapt op `max`.
 */
export function parseNum(v: string, fallback: number, max: number): number {
  let t = v.replace(/[^\d,.]/g, "");

  if (t.includes(",")) {
    // komma is de decimaalscheiding; punten zijn duizendtalscheiding
    t = t.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(t)) {
    // alleen punten, in een duizendtalpatroon: dus geen decimalen
    t = t.replace(/\./g, "");
  }

  const n = Number.parseFloat(t);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.min(n, max);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/model/format.test.ts && npm run typecheck`
Expected: all PASS.

If `eur` assertions fail on whitespace, the local ICU uses U+202F rather than U+00A0. The test already normalises both; if it still differs, adjust the test's normalisation — not the implementation.

- [ ] **Step 5: Commit**

```bash
git add src/model/format.ts tests/model/format.test.ts
git commit -m "feat(model): add nl-NL formatters and lenient amount parsing"
```

---

### Task 7: Styles, responsive hook, and the App shell

**Files:**
- Create: `src/styles.css` (replace the empty placeholder), `src/hooks/useIsNarrow.ts`
- Modify: `src/App.tsx`
- Test: `tests/hooks/useIsNarrow.test.ts`

**Interfaces:**
- Consumes: `Inputs`, `Soort`, `Stelsel`, model functions
- Produces:
  - `function useIsNarrow(): boolean` — true below 641px
  - `App` holding all input state; the state shape and defaults that Task 8 consumes:
    ```ts
    interface FormState {
      soort: Soort; V: number; T: number; partner: boolean;
      rendPct: number; kostenText: string; oprichtText: string;
      liqJaren: number; stelsel: Stelsel;
    }
    const DEFAULTS: FormState = {
      soort: "beleggen", V: 200_000, T: 20, partner: false,
      rendPct: 7, kostenText: "1.200", oprichtText: "600",
      liqJaren: 1, stelsel: "2028",
    };
    ```
  - `function toInputs(f: FormState): Inputs` exported from `src/state.ts`

- [ ] **Step 1: Write `src/hooks/useIsNarrow.ts`**

```ts
import { useEffect, useState } from "react";

const QUERY = "(max-width: 640px)";

/**
 * True op smalle schermen. De grafieken kiezen dan grotere letters, andere
 * marges en minder tickmarks.
 *
 * Vervangt de resize-listener met debounce uit het origineel: matchMedia vuurt
 * alleen bij een echte overgang, dus geen last van iOS dat resize afvuurt
 * tijdens scrollen.
 */
export function useIsNarrow(): boolean {
  const [narrow, setNarrow] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(QUERY);
    const onChange = (e: MediaQueryListEvent): void => setNarrow(e.matches);
    setNarrow(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return narrow;
}
```

- [ ] **Step 2: Write the failing test `tests/hooks/useIsNarrow.test.ts`**

This needs a DOM environment. Add `jsdom` and `@testing-library/react` as devDependencies and give the test file an environment docblock.

```ts
// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useIsNarrow } from "../../src/hooks/useIsNarrow";

interface FakeMql {
  matches: boolean;
  addEventListener: (t: string, cb: (e: MediaQueryListEvent) => void) => void;
  removeEventListener: (t: string, cb: (e: MediaQueryListEvent) => void) => void;
}

let luisteraars: Array<(e: MediaQueryListEvent) => void> = [];
let huidig = false;

function installeer(): void {
  luisteraars = [];
  const mql: FakeMql = {
    get matches() { return huidig; },
    addEventListener: (_t, cb) => { luisteraars.push(cb); },
    removeEventListener: (_t, cb) => {
      luisteraars = luisteraars.filter((l) => l !== cb);
    },
  };
  vi.stubGlobal("matchMedia", () => mql);
}

describe("useIsNarrow", () => {
  beforeEach(() => { huidig = false; installeer(); });

  it("is false op een breed scherm", () => {
    const { result } = renderHook(() => useIsNarrow());
    expect(result.current).toBe(false);
  });

  it("is true op een smal scherm", () => {
    huidig = true;
    const { result } = renderHook(() => useIsNarrow());
    expect(result.current).toBe(true);
  });

  it("reageert op een verandering van schermbreedte", () => {
    const { result } = renderHook(() => useIsNarrow());
    expect(result.current).toBe(false);
    act(() => {
      huidig = true;
      for (const l of luisteraars) {
        l({ matches: true } as MediaQueryListEvent);
      }
    });
    expect(result.current).toBe(true);
  });

  it("ruimt de luisteraar op bij unmount", () => {
    const { unmount } = renderHook(() => useIsNarrow());
    expect(luisteraars).toHaveLength(1);
    unmount();
    expect(luisteraars).toHaveLength(0);
  });
});
```

Install: `npm i -D jsdom @testing-library/react @testing-library/dom`

- [ ] **Step 3: Run the test to verify it fails, then passes**

Run: `npx vitest run tests/hooks/useIsNarrow.test.ts`
Expected: FAIL first (module missing if you wrote the test first — otherwise it should pass immediately once step 1 is in place). Confirm PASS before moving on.

- [ ] **Step 4: Write `src/state.ts`**

```ts
import type { Inputs, Soort, Stelsel } from "./model/types";
import { parseNum } from "./model/format";

export interface FormState {
  soort: Soort;
  V: number;
  T: number;
  partner: boolean;
  /** Rendement als percentage, dus 7 voor 7%. */
  rendPct: number;
  /** Ruwe tekst uit het invoerveld; pas bij het rekenen geparsed. */
  kostenText: string;
  oprichtText: string;
  liqJaren: number;
  stelsel: Stelsel;
}

export const DEFAULT_KOSTEN = 1200;
export const DEFAULT_OPRICHT = 600;
export const MAX_BEDRAG = 50_000;

export const DEFAULTS: FormState = {
  soort: "beleggen",
  V: 200_000,
  T: 20,
  partner: false,
  rendPct: 7,
  kostenText: "1.200",
  oprichtText: "600",
  liqJaren: 1,
  stelsel: "2028",
};

/** Standaardrendement per soort vermogen; wisselen zet het veld hierop terug. */
export function defaultRendement(soort: Soort): number {
  return soort === "spaar" ? 2 : 7;
}

/**
 * Vertaalt de formulierstaat naar de invoer van het rekenmodel.
 *
 * Bij spaargeld is het rendement direct rendement: rente wordt elk jaar
 * belast, ook in de BV, dus er valt niets uit te stellen. Bij beleggingen is
 * het volledig koersgroei, passend bij een herbeleggende ETF.
 */
export function toInputs(f: FormState): Inputs {
  const r = f.rendPct / 100;
  const d = f.soort === "spaar" ? r : 0;
  return {
    V: f.V,
    T: f.T,
    r,
    d,
    g: r - d,
    kosten: parseNum(f.kostenText, DEFAULT_KOSTEN, MAX_BEDRAG),
    opricht: parseNum(f.oprichtText, DEFAULT_OPRICHT, MAX_BEDRAG),
    liqJaren: f.liqJaren,
    mult: f.partner ? 2 : 1,
    soort: f.soort,
  };
}
```

- [ ] **Step 5: Write `src/styles.css`**

Replicate the original's visual language. The palette and type scale below are taken from the original's CSS custom properties; the class names and structure are our own.

```css
:root {
  --ink: #161a20;
  --ink-2: #5b6470;
  --line: #dcdfd9;
  --paper: #f5f6f2;
  --card: #ffffff;
  --box3: #2f6f8f;
  --box3-bg: #e4eef4;
  --bv: #b8860b;
  --bv-bg: #f6ecd8;
  --pivot: #6f3ea8;
  --neg: #b3402f;
  --pos: #2e7d5b;
  --display: "Space Grotesk", ui-sans-serif, system-ui, sans-serif;
  --body: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}

* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
html, body { margin: 0; padding: 0; background: var(--paper); }

body {
  font-family: var(--body);
  color: var(--ink);
  line-height: 1.5;
  font-size: 15px;
  -webkit-font-smoothing: antialiased;
}

.pagina { overflow-x: hidden; max-width: 100%; padding: 28px 22px 22px; }

.eyebrow {
  font-family: var(--display); font-size: 11px; font-weight: 500;
  letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--ink-2); margin: 0 0 10px;
}

h1 {
  font-family: var(--display); font-weight: 700;
  font-size: clamp(26px, 3.4vw, 38px); line-height: 1.1;
  letter-spacing: -0.02em; margin: 0 0 10px;
}

.lede { max-width: 64ch; color: var(--ink-2); margin: 0 0 26px; }

.grid { display: grid; grid-template-columns: 320px 1fr; gap: 22px; align-items: start; }
@media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }

.card {
  background: var(--card); border: 1px solid var(--line);
  border-radius: 10px; padding: 16px 18px; margin-bottom: 16px;
}

.card-title {
  font-family: var(--display); font-weight: 700; font-size: 13px;
  letter-spacing: 0.04em; text-transform: uppercase;
  color: var(--ink-2); margin: 0 0 14px;
}

.field { margin-bottom: 18px; }
.field:last-child { margin-bottom: 0; }
.field label { display: block; font-size: 13.5px; font-weight: 500; margin-bottom: 6px; }
.field .val { float: right; font-family: var(--display); font-weight: 700; color: var(--ink); }
.hint { font-size: 12px; color: var(--ink-2); margin: 6px 0 0; }

input[type="range"] { width: 100%; accent-color: var(--bv); }

.seg { display: flex; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
.seg button {
  flex: 1; padding: 8px 6px; border: 0; background: var(--card);
  font-family: var(--display); font-size: 12.5px; font-weight: 500;
  color: var(--ink-2); cursor: pointer; line-height: 1.25;
}
.seg button[aria-pressed="true"] { background: var(--ink); color: #fff; }

.in-wrap { display: flex; align-items: center; border: 1px solid var(--line); border-radius: 8px; }
.in-wrap span { padding: 0 8px; color: var(--ink-2); }
.in-wrap input {
  flex: 1; border: 0; padding: 8px 10px 8px 0; font: inherit;
  background: transparent; min-width: 0;
}
.in-wrap input:focus { outline: none; }
.in-wrap:focus-within { border-color: var(--ink); }

.toggle { display: flex; align-items: center; gap: 8px; cursor: pointer; }

.verdict { border-color: var(--ink); }
.kp-label {
  font-family: var(--display); font-size: 11px; font-weight: 500;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-2); margin: 0 0 4px;
}
.kp {
  font-family: var(--display); font-weight: 700;
  font-size: clamp(24px, 3vw, 34px); margin: 0 0 6px; color: var(--pivot);
}
.kp.none { color: var(--box3); font-size: clamp(19px, 2.2vw, 25px); }
.kp-sub { font-size: 13.5px; color: var(--ink-2); margin: 0 0 18px; }

.scale { margin-bottom: 18px; }
.scale-wrap { position: relative; padding-top: 20px; }
.scale-track { height: 8px; border-radius: 4px; position: relative; }
.scale-pivot {
  position: absolute; top: -3px; width: 2px; height: 14px;
  background: var(--pivot); transform: translateX(-1px);
}
.scale-you {
  position: absolute; top: 0; transform: translateX(-50%);
  font-family: var(--display); font-size: 11px; font-weight: 700; white-space: nowrap;
}
.scale-ends {
  display: flex; justify-content: space-between;
  font-size: 11px; color: var(--ink-2); margin-top: 6px;
}

.three { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
@media (max-width: 700px) { .three { grid-template-columns: 1fr; } }
.tile { border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px; }
.tile.dim { opacity: 0.55; }
.tile.win-b3 { border-color: var(--box3); background: var(--box3-bg); }
.tile.win-bv { border-color: var(--bv); background: var(--bv-bg); }
.tile-h { font-size: 11.5px; color: var(--ink-2); margin: 0 0 6px; line-height: 1.3; }
.tile-n { font-family: var(--display); font-weight: 700; font-size: 19px; margin: 0; }
.tile-s { font-size: 11px; color: var(--ink-2); margin: 4px 0 0; }

details { border: 1px solid var(--line); border-radius: 10px; background: var(--card); margin-bottom: 16px; }
summary {
  cursor: pointer; padding: 14px 18px; font-family: var(--display);
  font-weight: 700; font-size: 13px; letter-spacing: 0.04em;
  text-transform: uppercase; color: var(--ink-2); list-style: none;
}
summary::-webkit-details-marker { display: none; }
.details-body, .fold-body { padding: 0 18px 16px; }
.details-body ul { margin: 0; padding-left: 18px; }
.details-body li { margin-bottom: 10px; font-size: 13.5px; color: var(--ink-2); }
.details-body li b { color: var(--ink); }
.disclaimer { font-size: 12px; color: var(--ink-2); font-style: italic; margin: 14px 0 0; }

.mini { display: grid; grid-template-columns: 1fr auto auto; gap: 8px 18px; margin: 14px 0; font-size: 13px; }
.mini.solo { grid-template-columns: 1fr auto; }
.mini.solo .mini-r > *:nth-child(3) { display: none; }
.mini-r { display: contents; }
.mini-r > * { padding: 6px 0; }
.mini-r.kop em { font-size: 11px; color: var(--ink-2); font-style: normal; text-align: right; }
.mini-r b { font-family: var(--display); text-align: right; white-space: nowrap; }
.mini-r.tot > * { border-top: 1px solid var(--line); font-weight: 700; }
.waarom-zin, .bal-sum { font-size: 13.5px; color: var(--ink-2); margin: 0; }
.bal-sum { margin-top: 12px; }

.tw { overflow-x: auto; margin: 0 -18px; padding: 0 18px; }
table { border-collapse: collapse; font-size: 12px; white-space: nowrap; min-width: 100%; }
th, td { padding: 5px 8px; text-align: right; border-bottom: 1px solid var(--line); }
th { font-family: var(--display); font-weight: 500; color: var(--ink-2); font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.04em; }
th.g-b3, td.c-b3 { background: rgba(47, 111, 143, 0.05); }
th.g-bv, td.c-bv { background: rgba(184, 134, 11, 0.06); }
td.jaar { text-align: left; color: var(--ink-2); }
td.pos { color: var(--pos); font-weight: 500; }
td.negv { color: var(--neg); font-weight: 500; }

.verdict-bar {
  font-family: var(--display); font-weight: 700; font-size: 13.5px;
  padding: 9px 12px; border-radius: 8px; margin: 0 0 12px;
}
.verdict-bar.bv { background: var(--bv-bg); color: #8a6708; }
.verdict-bar.b3 { background: var(--box3-bg); color: var(--box3); }

.scroll-hint, .chart-note { font-size: 12px; color: var(--ink-2); margin: 10px 0 0; }
.chart-note b { color: var(--ink); }

svg { width: 100%; height: auto; display: block; }
svg text.ax { font-family: var(--body); font-size: 11px; fill: var(--ink-2); }
svg text.axb { font-family: var(--display); font-size: 11px; font-weight: 500; }
@media (max-width: 640px) {
  svg text.ax { font-size: 18px; }
  svg text.axb { font-size: 18px; }
}
svg line.gl { stroke: var(--line); stroke-width: 1; }
svg line.zl { stroke: var(--ink); stroke-width: 1.5; }

.foot { font-size: 11.5px; color: var(--ink-2); margin: 20px 0 0; }
```

- [ ] **Step 6: Write `src/App.tsx` shell**

Components are added in Tasks 8-14; for now render the header and a placeholder grid so the shell can be verified in the browser.

```tsx
import { useMemo, useState } from "react";
import { DEFAULTS, toInputs, type FormState } from "./state";
import { breakevenBands } from "./model/compare";

export default function App() {
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const inputs = useMemo(() => toInputs(form), [form]);
  const bands = useMemo(
    () => breakevenBands(inputs, form.stelsel),
    [inputs, form.stelsel],
  );

  return (
    <div className="pagina">
      <p className="eyebrow">Beleggen in de BV of privé · particulier</p>
      <h1>Vanaf welk vermogen wordt een BV interessant?</h1>
      <p className="lede">
        Privé betaal je in box 3 elk jaar belasting over je vermogen — vanaf 2028
        over je werkelijke rendement, inclusief koerswinst die je nog niet hebt
        verzilverd. In een BV mag die winst blijven staan tot je verkoopt. Dat
        uitstel is het hele voordeel, en het moet opwegen tegen de kosten van de
        BV, tegen het heffingsvrije bedrag dat je in box 3 opgeeft, en tegen de
        box 2-heffing bij het uitkeren. Vul je eigen cijfers in en je ziet waar
        de balans omslaat.
      </p>

      <div className="grid">
        <div>{/* Task 8: Inputs */}</div>
        <div>
          <p>
            kantelpunt:{" "}
            {bands[0] === undefined ? "geen" : Math.round(bands[0].from)}
          </p>
          {/* Tasks 9-14 */}
        </div>
      </div>
      <button type="button" onClick={() => setForm(DEFAULTS)}>
        reset
      </button>
    </div>
  );
}
```

- [ ] **Step 7: Verify the shell runs**

Run: `npm run dev` and open the printed URL.
Expected: the header renders in Space Grotesk on the paper background, and "kantelpunt: 490469" is shown. Stop the server.

Run: `npm run typecheck && npx vitest run`
Expected: clean, all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/styles.css src/state.ts src/hooks/useIsNarrow.ts src/App.tsx tests/hooks/useIsNarrow.test.ts package.json package-lock.json
git commit -m "feat(ui): add styles, form state and responsive hook"
```

---

### Task 8: Inputs panel

**Files:**
- Create: `src/components/Inputs.tsx`
- Modify: `src/App.tsx`
- Test: `tests/components/Inputs.test.tsx`

**Interfaces:**
- Consumes: `FormState`, `DEFAULT_KOSTEN`, `DEFAULT_OPRICHT`, `MAX_BEDRAG`, `defaultRendement` from `state.ts`; `eur`, `pct`, `parseNum`, `formatNumberNl` from `model/format.ts`
- Produces: `function Inputs(props: { form: FormState; onChange: (next: FormState) => void; liqHint: string }): JSX.Element`

`liqHint` is the dynamic explanation under the payout slider; App computes it (Task 14) because it needs the simulation. Until then pass a static string.

- [ ] **Step 1: Write the failing test `tests/components/Inputs.test.tsx`**

```tsx
// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Inputs } from "../../src/components/Inputs";
import { DEFAULTS, type FormState } from "../../src/state";

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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/components/Inputs.test.tsx`
Expected: FAIL — cannot resolve `../../src/components/Inputs`.

- [ ] **Step 3: Write `src/components/Inputs.tsx`**

```tsx
import { eur, formatNumberNl, parseNum, pct } from "../model/format";
import type { Soort, Stelsel } from "../model/types";
import {
  DEFAULT_KOSTEN,
  DEFAULT_OPRICHT,
  MAX_BEDRAG,
  defaultRendement,
  type FormState,
} from "../state";

interface Props {
  form: FormState;
  onChange: (next: FormState) => void;
  /** Uitleg onder de uitkeerslider; App rekent die uit. */
  liqHint: string;
}

const SOORT_HINT: Record<Soort, string> = {
  beleggen:
    "Koerswinst mag in de BV blijven staan tot je verkoopt. Forfait in het huidige stelsel: 6,00%.",
  spaar:
    "Rente komt elk jaar binnen en is dan meteen belast — ook in de BV. Er valt dus niets uit te stellen. Forfait in het huidige stelsel: 1,28%.",
};

const REND_HINT: Record<Soort, string> = {
  beleggen:
    "Gemiddeld bruto over de hele periode. Bij een herbeleggende ETF is dit vrijwel volledig koersgroei.",
  spaar: "De rente die je gemiddeld krijgt. Elk jaar belast, privé én in de BV.",
};

export function Inputs({ form, onChange, liqHint }: Props) {
  const set = <K extends keyof FormState>(key: K, value: FormState[K]): void => {
    onChange({ ...form, [key]: value });
  };

  const kiesSoort = (soort: Soort): void => {
    onChange({ ...form, soort, rendPct: defaultRendement(soort) });
  };

  const netjes = (key: "kostenText" | "oprichtText", fallback: number): void => {
    const n = parseNum(form[key], fallback, MAX_BEDRAG);
    onChange({ ...form, [key]: formatNumberNl(n) });
  };

  return (
    <>
      <div className="card">
        <p className="card-title">Jouw vermogen</p>

        <div className="field">
          <label htmlFor="k-soort-beleggen">Wat voor vermogen is het?</label>
          <div className="seg" role="group" aria-label="Soort vermogen">
            <button
              type="button" id="k-soort-beleggen"
              aria-pressed={form.soort === "beleggen"}
              onClick={() => kiesSoort("beleggen")}
            >
              Beleggingen
            </button>
            <button
              type="button"
              aria-pressed={form.soort === "spaar"}
              onClick={() => kiesSoort("spaar")}
            >
              Spaargeld
            </button>
          </div>
          <p className="hint">{SOORT_HINT[form.soort]}</p>
        </div>

        <div className="field">
          <label htmlFor="k-verm">
            Vermogen nu <span className="val">{eur(form.V)}</span>
          </label>
          <input
            type="range" id="k-verm" min={25_000} max={2_000_000} step={5_000}
            value={form.V}
            onChange={(e) => set("V", Number(e.target.value))}
          />
          <p className="hint">Wat je nu in box 3 hebt staan.</p>
        </div>

        <div className="field">
          <label htmlFor="k-jaar">
            Horizon <span className="val">{form.T} jaar</span>
          </label>
          <input
            type="range" id="k-jaar" min={5} max={40} step={1}
            value={form.T}
            onChange={(e) => set("T", Number(e.target.value))}
          />
          <p className="hint">Hoeveel jaar tot je het geld nodig hebt.</p>
        </div>

        <div className="field">
          <label className="toggle" htmlFor="k-part">
            <input
              type="checkbox" id="k-part" checked={form.partner}
              onChange={(e) => set("partner", e.target.checked)}
            />
            Fiscale partner
          </label>
          <p className="hint">
            Verdubbelt het heffingsvrij vermogen, het heffingsvrij resultaat en de
            box 2-schijf.
          </p>
        </div>
      </div>

      <div className="card">
        <p className="card-title">Het rendement</p>
        <div className="field">
          <label htmlFor="k-rend">
            Rendement per jaar <span className="val">{pct(form.rendPct)}</span>
          </label>
          <input
            type="range" id="k-rend" min={0.5} max={12} step={0.1}
            value={form.rendPct}
            onChange={(e) => set("rendPct", Number(e.target.value))}
          />
          <p className="hint">{REND_HINT[form.soort]}</p>
        </div>
      </div>

      <div className="card">
        <p className="card-title">De BV</p>

        <div className="field">
          <label htmlFor="k-kost">Kosten per jaar</label>
          <div className="in-wrap">
            <span>€</span>
            <input
              type="text" id="k-kost" inputMode="numeric" value={form.kostenText}
              onChange={(e) => set("kostenText", e.target.value)}
              onBlur={() => netjes("kostenText", DEFAULT_KOSTEN)}
            />
          </div>
          <p className="hint">Jaarrekening, aangiftes, KvK.</p>
        </div>

        <div className="field">
          <label htmlFor="k-opr">Oprichting eenmalig</label>
          <div className="in-wrap">
            <span>€</span>
            <input
              type="text" id="k-opr" inputMode="numeric" value={form.oprichtText}
              onChange={(e) => set("oprichtText", e.target.value)}
              onBlur={() => netjes("oprichtText", DEFAULT_OPRICHT)}
            />
          </div>
          <p className="hint">Notaris en inschrijving, geboekt in het eerste jaar.</p>
        </div>

        <div className="field">
          <label htmlFor="k-liq">
            Uitkeren aan het eind{" "}
            <span className="val">
              {form.liqJaren === 1 ? "in 1 keer" : `in ${form.liqJaren} jaar`}
            </span>
          </label>
          <input
            type="range" id="k-liq" min={1} max={10} step={1}
            value={form.liqJaren}
            onChange={(e) => set("liqJaren", Number(e.target.value))}
          />
          <p className="hint">{liqHint}</p>
        </div>
      </div>

      <div className="card">
        <p className="card-title">Welk box 3-stelsel</p>
        <div className="field">
          <div className="seg" role="group" aria-label="Box 3-stelsel">
            <button
              type="button" aria-pressed={form.stelsel === "2028"}
              onClick={() => set("stelsel", "2028" satisfies Stelsel)}
            >
              Nieuw stelsel
              <br />
              2028
            </button>
            <button
              type="button" aria-pressed={form.stelsel === "nu"}
              onClick={() => set("stelsel", "nu" satisfies Stelsel)}
            >
              Huidig stelsel
              <br />
              2026
            </button>
          </div>
          <p className="hint">
            Bepaalt welk stelsel in de tabel en de grafieken tegenover de BV staat.
            Beide uitkomsten blijven hierboven zichtbaar.
          </p>
        </div>
      </div>
    </>
  );
}
```

Note: the `<label htmlFor="k-soort-beleggen">` on the segmented control points at the first button so the group has an accessible label; the tests query the buttons by their accessible name, not the label.

- [ ] **Step 4: Wire it into `src/App.tsx`**

Replace `<div>{/* Task 8: Inputs */}</div>` with:

```tsx
<div>
  <InputsPanel
    form={form}
    onChange={setForm}
    liqHint="Gespreid uitkeren benut het lage box 2-tarief vaker."
  />
</div>
```

and add `import { Inputs as InputsPanel } from "./components/Inputs";`

The alias avoids a name clash with the `Inputs` **type** from `model/types.ts`, which App also uses. Task 14 keeps the same alias.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run && npm run typecheck`
Expected: all PASS.

If the `getByText(/200\.000/)` assertion fails on the non-breaking space inside the formatted euro, relax the matcher to `screen.getByText((t) => t.includes("200.000"))`.

- [ ] **Step 6: Commit**

```bash
git add src/components/Inputs.tsx src/App.tsx tests/components/Inputs.test.tsx
git commit -m "feat(ui): add inputs panel"
```

---

### Task 9: Verdict panel

**Files:**
- Create: `src/components/Verdict.tsx`
- Modify: `src/App.tsx`
- Test: `tests/components/Verdict.test.tsx`

**Interfaces:**
- Consumes: `Band`, `Inputs`, `Stelsel`; `finalBV`, `finalBox3`, `V_MIN`, `V_MAX`; `eur`; `PARAMS_2026`
- Produces: `function Verdict(props: { inputs: Inputs; stelsel: Stelsel; bands: Band[] }): JSX.Element`

- [ ] **Step 1: Write the failing test `tests/components/Verdict.test.tsx`**

```tsx
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Verdict } from "../../src/components/Verdict";
import { breakevenBands } from "../../src/model/compare";
import { DEFAULTS, toInputs } from "../../src/state";
import type { Inputs, Stelsel } from "../../src/model/types";

function paneel(overrides: Partial<Inputs> = {}, stelsel: Stelsel = "2028") {
  const inputs = { ...toInputs(DEFAULTS), ...overrides };
  const bands = breakevenBands(inputs, stelsel);
  render(<Verdict inputs={inputs} stelsel={stelsel} bands={bands} />);
  return { inputs, bands };
}

const tekst = (fragment: string) =>
  screen.getByText((_c, node) => node?.textContent?.includes(fragment) ?? false);

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

  it("zet de jij-markering op de logaritmische schaal", () => {
    paneel();
    const you = document.querySelector<HTMLElement>(".scale-you");
    expect(you).not.toBeNull();
    // 200.000 ligt tussen 25k en 5M op log-schaal: ln(8)/ln(200) ~ 39%
    const links = Number.parseFloat(you?.style.left ?? "0");
    expect(links).toBeGreaterThan(35);
    expect(links).toBeLessThan(45);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/components/Verdict.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/components/Verdict.tsx`**

```tsx
import { V_MAX, V_MIN, finalBV, finalBox3 } from "../model/compare";
import { eur } from "../model/format";
import { PARAMS_2026 } from "../model/params";
import type { Band, Inputs, Stelsel } from "../model/types";

interface Props {
  inputs: Inputs;
  stelsel: Stelsel;
  bands: Band[];
}

/** Positie op de logaritmische schaalbalk, in procenten. */
function positie(V: number): number {
  const p =
    (Math.log(V) - Math.log(V_MIN)) / (Math.log(V_MAX) - Math.log(V_MIN));
  return Math.max(0, Math.min(1, p)) * 100;
}

export function Verdict({ inputs, stelsel, bands }: Props) {
  const nu = finalBox3(inputs.V, inputs, "nu");
  const n28 = finalBox3(inputs.V, inputs, "2028");
  const bv = finalBV(inputs.V, inputs);

  const referentie = stelsel === "2028" ? n28 : nu;
  const verschil = bv - referentie;
  const bvWint = bv > referentie;
  const isNu = stelsel === "nu";

  const band = bands[0];
  const onder = band?.from ?? null;
  const boven = band?.to ?? null;

  const tegelKlasse = (actief: boolean): string => {
    if (!actief) return "tile dim";
    return bvWint ? "tile" : "tile win-b3";
  };

  const balk = ((): string => {
    if (onder === null) return "var(--box3)";
    const p = positie(onder);
    const eind = boven === null ? 100 : positie(boven);
    const staart =
      boven === null ? "" : `,var(--box3) ${eind}%,var(--box3) 100%`;
    return `linear-gradient(90deg,var(--box3) 0%,var(--box3) ${p}%,var(--bv) ${p}%,var(--bv) ${eind}%${staart})`;
  })();

  return (
    <div className="card verdict">
      <p className="kp-label">
        {onder === null
          ? "In dit scenario loont een BV"
          : `Een BV loont ${stelsel === "2028" ? "(nieuw stelsel)" : "(huidig stelsel)"}`}
      </p>
      <p className={onder === null ? "kp none" : "kp"}>
        {onder === null ? "bij geen enkel vermogen" : `vanaf ${eur(onder)}`}
      </p>

      <p className="kp-sub">
        {onder === null ? (
          <>
            Met {eur(inputs.V)} over {inputs.T} jaar houd je privé{" "}
            <b>{eur(referentie)}</b> over en via de BV <b>{eur(bv)}</b>. De kosten
            en de box 2-heffing wegen hier niet op tegen het uitstel.
          </>
        ) : (
          <>
            Met {eur(inputs.V)} over {inputs.T} jaar houd je netto{" "}
            <b>{eur(bv)}</b> over via de BV en <b>{eur(referentie)}</b> privé.
            Verschil: <b>{eur(Math.abs(verschil))}</b> voor{" "}
            {verschil >= 0 ? "de BV" : "box 3"}.
            {boven !== null && (
              <>
                {" "}
                Boven {eur(boven)} draait het weer om: dan vallen de lage Vpb- en
                box 2-schijven weg.
              </>
            )}
          </>
        )}
        {nu > n28 && (
          <>
            {" "}
            Let op: onder het <b>huidige</b> stelsel houd je privé{" "}
            {eur(nu - n28)} méér over dan onder het nieuwe — je rendement ligt
            boven het forfait.
          </>
        )}
        {n28 > nu && (
          <>
            {" "}
            Onder het <b>nieuwe</b> stelsel ben je privé {eur(n28 - nu)} beter af
            dan nu — je rendement blijft onder het forfait.
          </>
        )}
      </p>

      <div className="scale">
        <div className="scale-wrap">
          <div className="scale-you" style={{ left: `${positie(inputs.V)}%` }}>
            jij
          </div>
          <div className="scale-track" style={{ background: balk }}>
            {onder !== null && (
              <div className="scale-pivot" style={{ left: `${positie(onder)}%` }} />
            )}
          </div>
        </div>
        <div className="scale-ends">
          <span>Box 3 gunstiger</span>
          <span>BV gunstiger</span>
        </div>
      </div>

      <div className="three">
        <div className={tegelKlasse(isNu)}>
          <p className="tile-h">
            Privé in box 3 — huidig stelsel (forfaitair)
            {isNu ? "" : " · ter vergelijking"}
          </p>
          <p className="tile-n" style={{ color: "var(--box3)" }}>{eur(nu)}</p>
          <p className="tile-s">
            forfait {inputs.soort === "spaar" ? "1,28%" : "6,00%"} · heffingsvrij{" "}
            {eur(PARAMS_2026.hvv * inputs.mult)}
          </p>
        </div>

        <div className={tegelKlasse(!isNu)}>
          <p className="tile-h">
            Privé in box 3 — nieuw stelsel vanaf 2028
            {isNu ? " · ter vergelijking" : ""}
          </p>
          <p className="tile-n" style={{ color: "var(--box3)" }}>{eur(n28)}</p>
          <p className="tile-s">
            36% over het werkelijke rendement · heffingsvrij{" "}
            {eur(PARAMS_2026.hvr * inputs.mult)} per jaar
          </p>
        </div>

        <div className={bvWint ? "tile win-bv" : "tile"}>
          <p className="tile-h">In de BV, na Vpb, box 2 en kosten</p>
          <p className="tile-n" style={{ color: "var(--bv)" }}>{eur(bv)}</p>
          <p className="tile-s">
            na {eur(inputs.kosten * inputs.T + inputs.opricht)} kosten over{" "}
            {inputs.T} jaar
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire into `src/App.tsx`** — replace the placeholder `<p>kantelpunt: …</p>` with `<Verdict inputs={inputs} stelsel={form.stelsel} bands={bands} />` and add the import.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run && npm run typecheck`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/Verdict.tsx src/App.tsx tests/components/Verdict.test.tsx
git commit -m "feat(ui): add verdict panel with breakeven scale"
```

---

### Task 10: "Why it tips" fold

**Files:**
- Create: `src/components/WhyFold.tsx`
- Modify: `src/App.tsx`
- Test: `tests/components/WhyFold.test.tsx`

**Interfaces:**
- Consumes: `decompose`; `eur`; `Band`, `Inputs`, `Stelsel`
- Produces: `function WhyFold(props: { inputs: Inputs; stelsel: Stelsel; bands: Band[] }): JSX.Element`

- [ ] **Step 1: Write the failing test `tests/components/WhyFold.test.tsx`**

```tsx
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WhyFold } from "../../src/components/WhyFold";
import { breakevenBands } from "../../src/model/compare";
import { DEFAULTS, toInputs } from "../../src/state";
import type { Inputs, Stelsel } from "../../src/model/types";

function paneel(overrides: Partial<Inputs> = {}, stelsel: Stelsel = "2028") {
  const inputs = { ...toInputs(DEFAULTS), ...overrides };
  render(
    <WhyFold inputs={inputs} stelsel={stelsel} bands={breakevenBands(inputs, stelsel)} />,
  );
}

const heeft = (fragment: string) =>
  screen.getByText((_c, node) => node?.textContent?.includes(fragment) ?? false);

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

  it("valt terug op één kolom als er geen kantelpunt is", () => {
    paneel({ r: 0.02, d: 0.02, g: 0, soort: "spaar" });
    expect(document.querySelector(".mini.solo")).not.toBeNull();
    expect(heeft("geen kantelpunt")).toBeDefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/components/WhyFold.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/components/WhyFold.tsx`**

```tsx
import { decompose } from "../model/compare";
import { eur } from "../model/format";
import type { Band, Inputs, Stelsel } from "../model/types";

interface Props {
  inputs: Inputs;
  stelsel: Stelsel;
  bands: Band[];
}

function teken(x: number): string {
  return x >= 0 ? "+ " : "− ";
}

export function WhyFold({ inputs, stelsel, bands }: Props) {
  const eigen = decompose(inputs.V, inputs, stelsel);
  const band = bands[0];
  const kantel = band === undefined ? null : decompose(band.from, inputs, stelsel);

  const vrijstellingWoord =
    stelsel === "2028" ? "heffingsvrij resultaat" : "heffingsvrij vermogen";

  return (
    <details className="fold">
      <summary>Waarom het daar kantelt</summary>
      <div className="fold-body">
        <p className="waarom-zin">
          <b>De BV levert je een percentage op en kost je een vast bedrag.</b> Hij
          wint dus pas zodra je vermogen groot genoeg is om dat vaste bedrag te
          dragen.
        </p>

        <div className={kantel === null ? "mini solo" : "mini"}>
          <div className="mini-r kop">
            <span />
            <em>bij jouw {eur(inputs.V)}</em>
            <em>op het kantelpunt</em>
          </div>

          <div className="mini-r">
            <span>Wat het uitstel van belasting oplevert</span>
            <b style={{ color: "var(--pos)" }}>
              {teken(eigen.uitstel)}
              {eur(Math.abs(eigen.uitstel))}
            </b>
            <b style={{ color: "var(--pos)" }}>
              {kantel === null ? "—" : `+ ${eur(Math.abs(kantel.uitstel))}`}
            </b>
          </div>

          <div className="mini-r">
            <span>Wat de BV je kost: kosten en gemist {vrijstellingWoord}</span>
            <b style={{ color: "var(--bv)" }}>
              {"− "}
              {eur(Math.abs(eigen.vast))}
            </b>
            <b style={{ color: "var(--bv)" }}>
              {kantel === null ? "—" : `− ${eur(Math.abs(kantel.vast))}`}
            </b>
          </div>

          <div className="mini-r tot">
            <span>Blijft over</span>
            <b style={{ color: eigen.totaal >= 0 ? "var(--bv)" : "var(--box3)" }}>
              {teken(eigen.totaal)}
              {eur(Math.abs(eigen.totaal))}
            </b>
            <b>{kantel === null ? "—" : eur(0)}</b>
          </div>
        </div>

        <p className="bal-sum">
          {band === undefined ? (
            <>
              Er is hier geen kantelpunt: bij geen enkel vermogen wordt het uitstel
              groter dan wat de BV kost. Verleng de horizon, verhoog het rendement
              of verlaag de kosten om te zien wat ervoor nodig is.
            </>
          ) : (
            <>
              Rechts zie je waar dat kantelpunt vandaan komt: bij{" "}
              <b>{eur(band.from)}</b> zijn beide bedragen precies even groot, dus
              blijft er niets over. Daaronder wint box 3, daarboven de BV. Merk op
              dat de tweede regel in beide kolommen bijna hetzelfde bedrag is —
              dat is het vaste deel, dat niet meegroeit met je vermogen. Alleen de
              eerste regel groeit mee.
              {band.to !== null && (
                <>
                  {" "}
                  Boven {eur(band.to)} draait het weer om, omdat je dan in de
                  hoogste Vpb- en box 2-schijven belandt.
                </>
              )}
            </>
          )}
        </p>
      </div>
    </details>
  );
}
```

- [ ] **Step 4: Wire into `src/App.tsx`** below `<Verdict …/>`, and add the import.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run && npm run typecheck`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/WhyFold.tsx src/App.tsx tests/components/WhyFold.test.tsx
git commit -m "feat(ui): add decomposition fold explaining the tipping point"
```

---

### Task 11: Year-by-year table

**Files:**
- Create: `src/components/YearTable.tsx`
- Modify: `src/App.tsx`
- Test: `tests/components/YearTable.test.tsx`

**Interfaces:**
- Consumes: `simulateBox3`, `simulateBV`, `eur`, `Inputs`, `Stelsel`
- Produces: `function YearTable(props: { inputs: Inputs; stelsel: Stelsel }): JSX.Element`

- [ ] **Step 1: Write the failing test `tests/components/YearTable.test.tsx`**

```tsx
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { YearTable } from "../../src/components/YearTable";
import { DEFAULTS, toInputs } from "../../src/state";
import type { Inputs, Stelsel } from "../../src/model/types";

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
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/components/YearTable.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/components/YearTable.tsx`**

```tsx
import { simulateBox3 } from "../model/box3";
import { simulateBV } from "../model/bv";
import { eur } from "../model/format";
import type { Inputs, Stelsel } from "../model/types";

interface Props {
  inputs: Inputs;
  stelsel: Stelsel;
}

export function YearTable({ inputs, stelsel }: Props) {
  const b3 = simulateBox3(inputs.V, inputs, stelsel);
  const bv = simulateBV(inputs.V, inputs);

  const laatsteB3 = b3[b3.length - 1];
  const laatsteBv = bv[bv.length - 1];
  const eind =
    laatsteB3 === undefined || laatsteBv === undefined
      ? 0
      : laatsteBv.netto - laatsteB3.netto;

  return (
    <div className="card">
      <p className="card-title">
        Jaar voor jaar —{" "}
        {stelsel === "2028"
          ? "privé in het nieuwe stelsel (2028)"
          : "privé in het huidige stelsel (2026)"}
      </p>

      <p className={`verdict-bar ${eind >= 0 ? "bv" : "b3"}`}>
        {eind >= 0
          ? `Conclusie: beleggen via de BV is aantrekkelijker (+ ${eur(eind)})`
          : `Conclusie: privé in box 3 is aantrekkelijker (+ ${eur(-eind)})`}
      </p>

      <div className="tw">
        <table>
          <thead>
            <tr>
              <th />
              <th className="g-b3" colSpan={4}>Beleggen in privé</th>
              <th className="g-bv" colSpan={6}>Beleggen in de BV</th>
              <th />
            </tr>
            <tr>
              <th>Jaar</th>
              <th className="g-b3">Begin jaar</th>
              <th className="g-b3">Rendement</th>
              <th className="g-b3">
                {stelsel === "2028" ? "Box 3 (werkelijk)" : "Box 3 (forfaitair)"}
              </th>
              <th className="g-b3">Netto verm. privé</th>
              <th className="g-bv">Begin jaar</th>
              <th className="g-bv">Rendement</th>
              <th className="g-bv">Kosten</th>
              <th className="g-bv">Vpb betaald</th>
              <th className="g-bv">Latente Vpb + AB</th>
              <th className="g-bv">Netto verm. privé</th>
              <th>Verschil</th>
            </tr>
          </thead>
          <tbody>
            {b3.map((rij, i) => {
              const b = bv[i];
              if (b === undefined) return null;
              const v = b.netto - rij.netto;
              return (
                <tr key={i}>
                  <td className="jaar">{i + 1}</td>
                  <td className="c-b3">{eur(rij.begin)}</td>
                  <td className="c-b3">{eur(rij.rend)}</td>
                  <td className="c-b3">{eur(rij.tax)}</td>
                  <td className="c-b3">{eur(rij.netto)}</td>
                  <td className="c-bv">{eur(b.begin)}</td>
                  <td className="c-bv">{eur(b.rend)}</td>
                  <td className="c-bv">{eur(b.kosten)}</td>
                  <td className="c-bv">{eur(b.vpb)}</td>
                  <td className="c-bv">{eur(b.latent)}</td>
                  <td className="c-bv">{eur(b.netto)}</td>
                  <td className={v >= 0 ? "pos" : "negv"}>
                    {v >= 0 ? "+" : ""}
                    {eur(v)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="scroll-hint">
        Sleep horizontaal voor alle kolommen. „Netto vermogen privé" bij de BV is
        wat je overhoudt als je de BV in dát jaar zou liquideren en uitkeren.
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Wire into `src/App.tsx`** and add the import.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run && npm run typecheck`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/YearTable.tsx src/App.tsx tests/components/YearTable.test.tsx
git commit -m "feat(ui): add year-by-year comparison table"
```

---

### Task 12: Shared SVG chart helpers

Both charts need the same primitives. Extracting them first keeps Tasks 13 and 14 small.

**Files:**
- Create: `src/components/chart/axis.ts`, `src/components/chart/Label.tsx`
- Test: `tests/components/chart/axis.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `function nietteStap(ruw: number): number` — rounds a raw step to 1/2/2.5/5/10 × a power of ten
  - `function yTicks(ymin: number, ymax: number): number[]`
  - `function Label(props: { x: number; y: number; text: string; color: string; anchor?: "start" | "middle" | "end"; narrow: boolean }): JSX.Element` — text on a translucent white plate so it stays legible over lines

- [ ] **Step 1: Write the failing test `tests/components/chart/axis.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { nietteStap, yTicks } from "../../../src/components/chart/axis";

describe("nietteStap", () => {
  it("rondt naar een nette stap binnen dezelfde orde van grootte", () => {
    expect(nietteStap(1000)).toBe(1000);
    expect(nietteStap(1800)).toBe(2000);
    expect(nietteStap(2400)).toBe(2500);
    expect(nietteStap(4000)).toBe(5000);
    expect(nietteStap(8000)).toBe(10_000);
  });

  it("werkt over verschillende ordes van grootte", () => {
    expect(nietteStap(140_000)).toBe(250_000);
    expect(nietteStap(12)).toBe(20);
  });
});

describe("yTicks", () => {
  it("geeft minstens vier lijnen", () => {
    expect(yTicks(-50_000, 200_000).length).toBeGreaterThanOrEqual(4);
  });

  it("gebruikt ronde bedragen", () => {
    const ticks = yTicks(0, 100_000);
    const stap = (ticks[1] ?? 0) - (ticks[0] ?? 0);
    expect(stap).toBeGreaterThan(0);
    for (const t of ticks) expect(Number.isFinite(t)).toBe(true);
  });

  it("neemt nul mee als het bereik de nullijn kruist", () => {
    expect(yTicks(-30_000, 70_000)).toContain(0);
  });

  it("blijft binnen het bereik", () => {
    for (const t of yTicks(-30_000, 70_000)) {
      expect(t).toBeGreaterThanOrEqual(-30_000);
      expect(t).toBeLessThanOrEqual(70_000);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/components/chart/axis.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/components/chart/axis.ts`**

```ts
/**
 * Rondt een ruwe stapgrootte af naar een nette waarde: 1, 2, 2,5, 5 of 10 maal
 * een macht van tien. Zo krijg je ronde bedragen op de as in plaats van
 * willekeurige tussenstanden.
 */
export function nietteStap(ruw: number): number {
  const magnitude = Math.pow(10, Math.floor(Math.log10(Math.abs(ruw))));
  const n = Math.abs(ruw) / magnitude;
  const factor = n < 1.5 ? 1 : n < 2.25 ? 2 : n < 3.5 ? 2.5 : n < 7.5 ? 5 : 10;
  return factor * magnitude;
}

/** Ronde waarden voor de y-as, met minstens vier lijnen en nul erbij als het bereik die kruist. */
export function yTicks(ymin: number, ymax: number): number[] {
  let stap = nietteStap((ymax - ymin) / 4);
  let uit: number[] = [];

  for (let poging = 0; poging < 3; poging += 1) {
    uit = [];
    for (let v = Math.ceil(ymin / stap) * stap; v <= ymax + 1e-9; v += stap) {
      uit.push(v);
    }
    if (uit.length >= 4) break;
    stap /= 2;
  }

  if (!uit.includes(0) && ymin < 0 && ymax > 0) uit.push(0);
  return uit;
}
```

- [ ] **Step 4: Write `src/components/chart/Label.tsx`**

```tsx
interface Props {
  x: number;
  y: number;
  text: string;
  color: string;
  anchor?: "start" | "middle" | "end";
  /** Op smalle schermen staan de letters groter, dus is het plaatje breder. */
  narrow: boolean;
}

/**
 * Tekst met een halfdoorzichtig wit plaatje eronder, zodat labels leesbaar
 * blijven waar ze over lijnen of vlakken heen vallen.
 */
export function Label({ x, y, text, color, anchor = "start", narrow }: Props) {
  const breedte = text.length * (narrow ? 9.4 : 5.9) + 10;
  const plaatX =
    anchor === "end" ? x - breedte + 5 : anchor === "middle" ? x - breedte / 2 : x - 5;

  return (
    <>
      <rect x={plaatX} y={y - 10} width={breedte} height={14} fill="#ffffff" opacity={0.86} rx={2} />
      <text x={x} y={y} className="axb" textAnchor={anchor} fill={color}>
        {text}
      </text>
    </>
  );
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/components/chart/axis.test.ts && npm run typecheck`
Expected: all PASS.

Note: `nietteStap` uses `Math.log10` where the original used `Math.log(x) / Math.LN10`. Equivalent, clearer.

- [ ] **Step 6: Commit**

```bash
git add src/components/chart/axis.ts src/components/chart/Label.tsx tests/components/chart/axis.test.ts
git commit -m "feat(ui): add shared svg chart helpers"
```

---

### Task 13: Breakeven chart

**Files:**
- Create: `src/components/BreakevenChart.tsx`
- Modify: `src/App.tsx`
- Test: `tests/components/BreakevenChart.test.tsx`

**Interfaces:**
- Consumes: `delta`, `V_MIN`, `V_MAX`; `kort`; `yTicks`, `Label`; `useIsNarrow`
- Produces: `function BreakevenChart(props: { inputs: Inputs; stelsel: Stelsel; bands: Band[] }): JSX.Element`

- [ ] **Step 1: Write the failing test `tests/components/BreakevenChart.test.tsx`**

```tsx
// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BreakevenChart } from "../../src/components/BreakevenChart";
import { breakevenBands } from "../../src/model/compare";
import { DEFAULTS, toInputs } from "../../src/state";
import type { Inputs, Stelsel } from "../../src/model/types";

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
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/components/BreakevenChart.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/components/BreakevenChart.tsx`**

```tsx
import { useIsNarrow } from "../hooks/useIsNarrow";
import { V_MAX, V_MIN, delta } from "../model/compare";
import { kort } from "../model/format";
import type { Band, Inputs, Stelsel } from "../model/types";
import { Label } from "./chart/Label";
import { yTicks } from "./chart/axis";

interface Props {
  inputs: Inputs;
  stelsel: Stelsel;
  bands: Band[];
}

const N = 70;
const W = 720;
const X_TICKS = [25_000, 50_000, 100_000, 200_000, 500_000, 1_000_000, 2_000_000, 5_000_000];
const X_TICKS_SMAL = [25_000, 100_000, 500_000, 2_000_000];

export function BreakevenChart({ inputs, stelsel, bands }: Props) {
  const smal = useIsNarrow();
  const H = smal ? 400 : 340;
  const M = smal
    ? { t: 34, r: 20, b: 66, l: 92 }
    : { t: 26, r: 104, b: 52, l: 78 };

  const band = bands[0];
  const lo = V_MIN;
  let hi = Math.max(inputs.V * 2.2, 1_200_000);
  if (band !== undefined) {
    if (band.to !== null) hi = Math.max(hi, band.to * 1.3);
    hi = Math.max(hi, band.from * 1.7);
  }
  hi = Math.min(hi, V_MAX);

  const ander: Stelsel = stelsel === "2028" ? "nu" : "2028";
  const ptsA: Array<[number, number]> = [];
  const ptsB: Array<[number, number]> = [];
  for (let i = 0; i <= N; i += 1) {
    const V = lo * Math.pow(hi / lo, i / N);
    ptsA.push([V, delta(V, inputs, stelsel)]);
    ptsB.push([V, delta(V, inputs, ander)]);
  }

  const waarden = [...ptsA, ...ptsB].map((p) => p[1]).concat([0]);
  let ymax = Math.max(...waarden);
  let ymin = Math.min(...waarden);
  const marge = (ymax - ymin) * 0.16 || 1000;
  ymax += marge;
  ymin -= marge;

  const X = (v: number): number =>
    M.l + ((Math.log(v) - Math.log(lo)) / (Math.log(hi) - Math.log(lo))) * (W - M.l - M.r);
  const Y = (v: number): number => M.t + ((ymax - v) / (ymax - ymin)) * (H - M.t - M.b);

  const y0 = Y(0);
  const x0 = M.l;
  const x1 = W - M.r;

  const vlak = (pts: Array<[number, number]>, boven: boolean): string => {
    const eerste = pts[0];
    const laatste = pts[pts.length - 1];
    if (eerste === undefined || laatste === undefined) return "";
    let d = `M ${X(eerste[0])} ${y0}`;
    for (const p of pts) {
      d += ` L ${X(p[0])} ${Y(boven ? Math.max(0, p[1]) : Math.min(0, p[1]))}`;
    }
    return `${d} L ${X(laatste[0])} ${y0} Z`;
  };

  const lijn = (pts: Array<[number, number]>): string =>
    pts.map((p, k) => `${k === 0 ? "M" : "L"} ${X(p[0])} ${Y(p[1])}`).join(" ");

  const zichtbareTicks = X_TICKS.filter((t) => t >= lo && t <= hi);
  const labelTicks = (smal ? X_TICKS_SMAL : X_TICKS).filter((t) => t >= lo && t <= hi);

  const eindA = ptsA[N];
  const eindB = ptsB[N];
  const naam: Record<Stelsel, string> = smal
    ? { "2028": "vs. 2028", nu: "vs. nu" }
    : { "2028": "vs. box 3 in 2028", nu: "vs. box 3 nu" };

  const eigenDelta = delta(inputs.V, inputs, stelsel);
  const toonStip = inputs.V >= lo && inputs.V <= hi;
  const stipX = X(inputs.V);
  const stipY = Y(eigenDelta);
  const stipAnchor: "start" | "middle" | "end" =
    stipX > W - M.r - (smal ? 190 : 110)
      ? "end"
      : stipX < M.l + (smal ? 190 : 110)
        ? "start"
        : "middle";

  const eersteWaarde = ptsA[0]?.[1] ?? 0;

  return (
    <div className="card">
      <p className="card-title">Vanaf welk vermogen kantelt het?</p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Grafiek: het kantelpunt — het verschil in netto eindvermogen tussen de BV en box 3, afgezet tegen het startvermogen"
      >
        <path d={vlak(ptsA, true)} fill="rgba(184,134,11,.16)" />
        <path d={vlak(ptsA, false)} fill="rgba(47,111,143,.13)" />

        {yTicks(ymin, ymax).map((yv) =>
          yv === 0 ? null : (
            <g key={yv}>
              <line x1={x0} x2={x1} y1={Y(yv)} y2={Y(yv)} className="gl" />
              <text x={x0 - 9} y={Y(yv) + 3.5} className="ax" textAnchor="end">
                {kort(yv)}
              </text>
            </g>
          ),
        )}

        {zichtbareTicks.map((t) => (
          <line key={t} x1={X(t)} x2={X(t)} y1={M.t} y2={H - M.b} className="gl" />
        ))}

        <line x1={x0} x2={x1} y1={y0} y2={y0} className="zl" />
        <text x={x0 - 9} y={y0 + 3.5} className="ax" textAnchor="end">€0</text>
        <Label x={x0 + 6} y={y0 - 7} text="↑ hier houd je meer over via de BV" color="#8a6708" narrow={smal} />
        <Label x={x0 + 6} y={y0 + 16} text="↓ hier houd je meer over in box 3" color="#2f6f8f" narrow={smal} />

        {labelTicks.map((t) => (
          <text key={t} x={X(t)} y={H - M.b + (smal ? 24 : 16)} className="ax" textAnchor="middle">
            {kort(t)}
          </text>
        ))}
        <text
          x={(x0 + x1) / 2} y={H - M.b + (smal ? 52 : 36)}
          className="axb" textAnchor="middle" fill="#5b6470"
        >
          vermogen waarmee je begint
        </text>

        <path d={lijn(ptsB)} fill="none" stroke="rgba(47,111,143,.45)" strokeWidth={1.8} strokeDasharray="5 4" />
        <path d={lijn(ptsA)} fill="none" stroke="#b8860b" strokeWidth={2.6} />

        {eindA !== undefined && eindB !== undefined && (
          smal ? (
            <>
              <Label x={x1} y={Y(eindA[1]) - 12} text={naam[stelsel]} color="#8a6708" anchor="end" narrow />
              <Label x={x1} y={Y(eindB[1]) - 12} text={naam[ander]} color="rgba(47,111,143,.95)" anchor="end" narrow />
            </>
          ) : (
            <>
              <text x={x1 + 7} y={Y(eindA[1]) + 3.5} className="axb" fill="#8a6708">{naam[stelsel]}</text>
              <text x={x1 + 7} y={Y(eindB[1]) + 3.5} className="axb" fill="rgba(47,111,143,.85)">{naam[ander]}</text>
            </>
          )
        )}

        {band !== undefined && band.from >= lo && band.from <= hi && (
          <>
            <path
              d={`M ${X(band.from)} ${M.t} L ${X(band.from)} ${H - M.b}`}
              fill="none" stroke="#6f3ea8" strokeWidth={1.5} strokeDasharray="4 3"
            />
            <Label
              x={X(band.from) + (X(band.from) < W - M.r - (smal ? 250 : 150) ? 7 : -7)}
              y={M.t - (smal ? 10 : 0) + 2}
              text={`kantelpunt ${kort(band.from)}`}
              color="#6f3ea8"
              anchor={X(band.from) < W - M.r - (smal ? 250 : 150) ? "start" : "end"}
              narrow={smal}
            />
          </>
        )}

        {band?.to != null && band.to <= hi && (
          <>
            <path
              d={`M ${X(band.to)} ${M.t} L ${X(band.to)} ${H - M.b}`}
              fill="none" stroke="#6f3ea8" strokeWidth={1.2} strokeDasharray="2 4"
            />
            <Label x={X(band.to) - 7} y={M.t + 2} text={`en tot ${kort(band.to)}`} color="#6f3ea8" anchor="end" narrow={smal} />
          </>
        )}

        {toonStip && (
          <>
            <circle cx={stipX} cy={stipY} r={5} fill="#161a20" />
            <Label
              x={stipX} y={stipY + (eigenDelta >= 0 ? -14 : 26)}
              text={
                eigenDelta >= 0
                  ? `jij: ${kort(eigenDelta)} voor de BV`
                  : `jij: ${kort(-eigenDelta)} voor box 3`
              }
              color="#161a20" anchor={stipAnchor} narrow={smal}
            />
          </>
        )}
      </svg>

      <p className="chart-note">
        Lees de grafiek zo: schuif over de horizontale as naar jouw vermogen, en
        de gouden lijn zegt hoeveel je aan het eind méér of minder overhoudt als
        je dat bedrag via een BV belegt in plaats van privé. Het is dus een{" "}
        <b>verschil</b>, geen vermogen. De zwarte stip staat op jouw vermogen; het
        bedrag ernaast is wat je daar wint of verliest — niet je afstand tot het
        kantelpunt.{" "}
        {eersteWaarde < 0 && (
          <>
            Links begint de lijn onder nul: wie met {kort(lo)} begint houdt via een
            BV {kort(-eersteWaarde)} mínder over, omdat de vaste kosten daar
            zwaarder wegen dan het uitstel.{" "}
          </>
        )}
        De gestippelde blauwe lijn is dezelfde vergelijking tegen het andere box
        3-stelsel.
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Wire into `src/App.tsx`** above `<YearTable …/>` and add the import.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run && npm run typecheck`
Expected: all PASS.

- [ ] **Step 6: Verify visually**

Run: `npm run dev`, open the page, drag the wealth slider from €25k to €2M.
Expected: the gold line rises through zero, the pivot line sits where the verdict panel says it does, the black dot tracks the slider. Narrow the window below 640px and confirm the labels grow and the x-axis thins out. Stop the server.

- [ ] **Step 7: Commit**

```bash
git add src/components/BreakevenChart.tsx src/App.tsx tests/components/BreakevenChart.test.tsx
git commit -m "feat(ui): add breakeven chart"
```

---

### Task 14: Time chart, assumptions, and final wiring

**Files:**
- Create: `src/components/TimeChart.tsx`, `src/components/Assumptions.tsx`
- Modify: `src/App.tsx`
- Test: `tests/components/TimeChart.test.tsx`, `tests/App.test.tsx`

**Interfaces:**
- Consumes: everything above
- Produces: `function TimeChart(props: { inputs: Inputs; stelsel: Stelsel }): JSX.Element`, `function Assumptions(): JSX.Element`, and the finished `App`

- [ ] **Step 1: Write the failing test `tests/components/TimeChart.test.tsx`**

```tsx
// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TimeChart } from "../../src/components/TimeChart";
import { DEFAULTS, toInputs } from "../../src/state";
import type { Inputs, Stelsel } from "../../src/model/types";

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
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/components/TimeChart.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/components/TimeChart.tsx`**

```tsx
import { useIsNarrow } from "../hooks/useIsNarrow";
import { simulateBox3 } from "../model/box3";
import { simulateBV } from "../model/bv";
import { kort } from "../model/format";
import type { Inputs, Stelsel } from "../model/types";
import { Label } from "./chart/Label";
import { yTicks } from "./chart/axis";

interface Props {
  inputs: Inputs;
  stelsel: Stelsel;
}

const W = 720;

export function TimeChart({ inputs, stelsel }: Props) {
  const smal = useIsNarrow();
  const H = smal ? 360 : 300;
  const M = smal ? { t: 26, r: 22, b: 64, l: 92 } : { t: 22, r: 24, b: 44, l: 78 };

  const bv = simulateBV(inputs.V, inputs);
  const b3 = simulateBox3(inputs.V, inputs, stelsel);

  const d: number[] = [0];
  let omslag: number | null = null;
  let dal = 0;
  let dalJaar = 0;

  for (let i = 0; i < inputs.T; i += 1) {
    const a = b3[i];
    const b = bv[i];
    if (a === undefined || b === undefined) continue;
    const v = b.netto - a.netto;
    d.push(v);
    if (v < dal) {
      dal = v;
      dalJaar = i + 1;
    }
    if (v > 0 && omslag === null) omslag = i + 1;
  }

  let ymax = Math.max(...d);
  let ymin = Math.min(...d);
  const marge = (ymax - ymin) * 0.18 || 1000;
  ymax += marge;
  ymin -= marge;
  if (ymax < 0) ymax = marge;
  if (ymin > 0) ymin = -marge;

  const X = (j: number): number => M.l + (j / inputs.T) * (W - M.l - M.r);
  const Y = (v: number): number => M.t + ((ymax - v) / (ymax - ymin)) * (H - M.t - M.b);
  const y0 = Y(0);

  const vlak = (boven: boolean): string => {
    let p = `M ${X(0)} ${y0}`;
    d.forEach((v, j) => {
      p += ` L ${X(j)} ${Y(boven ? Math.max(0, v) : Math.min(0, v))}`;
    });
    return `${p} L ${X(inputs.T)} ${y0} Z`;
  };

  const lijn = d.map((v, j) => `${j === 0 ? "M" : "L"} ${X(j)} ${Y(v)}`).join(" ");

  const stap = smal
    ? inputs.T <= 10 ? 5 : 10
    : inputs.T <= 10 ? 2 : inputs.T <= 20 ? 5 : 10;
  const jaarTicks: number[] = [];
  for (let j = 0; j <= inputs.T; j += stap) jaarTicks.push(j);

  const eindV = d[inputs.T] ?? 0;

  return (
    <div className="card">
      <p className="card-title">Hoe lang duurt het voor de BV je voorsprong geeft?</p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Grafiek: het verschil tussen de BV en box 3 per jaar, met het jaar waarin de BV de achterstand inhaalt"
      >
        <path d={vlak(true)} fill="rgba(184,134,11,.16)" />
        <path d={vlak(false)} fill="rgba(47,111,143,.13)" />

        {yTicks(ymin, ymax).map((yv) =>
          yv === 0 ? null : (
            <g key={yv}>
              <line x1={M.l} x2={W - M.r} y1={Y(yv)} y2={Y(yv)} className="gl" />
              <text x={M.l - 9} y={Y(yv) + 3.5} className="ax" textAnchor="end">{kort(yv)}</text>
            </g>
          ),
        )}

        <line x1={M.l} x2={W - M.r} y1={y0} y2={y0} className="zl" />
        <text x={M.l - 9} y={y0 + 3.5} className="ax" textAnchor="end">€0</text>
        <Label x={M.l + 6} y={y0 - 7} text="↑ BV staat voor" color="#8a6708" narrow={smal} />
        <Label x={M.l + 6} y={y0 + 16} text="↓ BV staat achter" color="#2f6f8f" narrow={smal} />

        {jaarTicks.map((j) => (
          <text key={j} x={X(j)} y={H - M.b + (smal ? 24 : 15)} className="ax" textAnchor="middle">
            {j === 0 ? "nu" : smal ? `j${j}` : `jaar ${j}`}
          </text>
        ))}
        <text
          x={(M.l + W - M.r) / 2} y={H - M.b + (smal ? 50 : 34)}
          className="axb" textAnchor="middle" fill="#5b6470"
        >
          jaren dat je het volhoudt
        </text>

        <path d={lijn} fill="none" stroke="#b8860b" strokeWidth={2.6} />

        {omslag !== null && (
          <>
            <path
              d={`M ${X(omslag)} ${M.t} L ${X(omslag)} ${H - M.b}`}
              fill="none" stroke="#6f3ea8" strokeWidth={1.5} strokeDasharray="4 3"
            />
            <Label
              x={X(omslag) + (X(omslag) < W - 200 ? 7 : -7)}
              y={M.t + 2}
              text={`vanaf jaar ${omslag} sta je voor`}
              color="#6f3ea8"
              anchor={X(omslag) < W - 200 ? "start" : "end"}
              narrow={smal}
            />
          </>
        )}

        {dal < 0 && (
          <>
            <circle cx={X(dalJaar)} cy={Y(dal)} r={4} fill="#2f6f8f" />
            <Label
              x={X(dalJaar)} y={Y(dal) + 20}
              text={`diepste dal ${kort(dal)}`} color="#2f6f8f"
              anchor={X(dalJaar) > W - 150 ? "end" : "middle"} narrow={smal}
            />
          </>
        )}
      </svg>

      <p className="chart-note">
        {omslag !== null ? (
          <>
            De BV start met een achterstand: de kosten lopen al terwijl het
            belastingvoordeel nog moet opbouwen. Het diepste punt ligt in jaar{" "}
            {dalJaar} op {kort(dal)}. Pas in <b>jaar {omslag}</b> haal je box 3 in,
            en daarna loopt het verschil op tot {kort(eindV)} in jaar {inputs.T}.
            Stap je er eerder uit, dan ben je slechter af.
          </>
        ) : (
          <>
            Binnen deze horizon komt de BV niet boven box 3 uit: aan het eind sta
            je {kort(-eindV)} achter. Er is geen jaar waarin het omslaat — verleng
            de horizon of verlaag de kosten om te zien wat ervoor nodig is.
          </>
        )}
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Write `src/components/Assumptions.tsx`**

All copy below is our own wording of publicly documented tax rules.

```tsx
export function Assumptions() {
  return (
    <details>
      <summary>Aannames en spelregels</summary>
      <div className="details-body">
        <ul>
          <li>
            <b>Gelijke start, gelijke finish.</b> Beide routes beginnen met
            hetzelfde bedrag en eindigen met volledig afgerekend geld op je
            bankrekening. De BV wordt aan het eind geliquideerd, dus de latente
            Vpb- en box 2-claim wordt daadwerkelijk betaald.
          </li>
          <li>
            <b>Huidig stelsel (peiljaar 2026).</b> Forfaitair rendement over de
            grondslag: 6,00% voor beleggingen, 1,28% voor banktegoeden. Tarief
            36%, heffingsvrij vermogen €59.357 per persoon. Je betaalt dus ook in
            verliesjaren, en niets extra's in jaren waarin je meer verdient dan
            het forfait.
          </li>
          <li>
            <b>Nieuw stelsel (wetsvoorstel, beoogd 2028).</b>{" "}
            Vermogensaanwasbelasting: 36% over rente, dividend én de jaarlijkse
            waardestijging, ook zonder verkoop. Heffingsvrij resultaat €1.800 per
            persoon per jaar — het definitieve bedrag volgt uit de wettekst. Het
            heffingsvrij vermogen vervalt. Verliezen zijn voorwaarts verrekenbaar.
          </li>
          <li>
            <b>Je inleg in de BV</b> is kapitaalstorting en agio. Dat vormt je
            verkrijgingsprijs en komt onbelast terug; alleen de aangroei daarboven
            is box 2-belast.
          </li>
          <li>
            <b>Waardering op kostprijs of lagere marktwaarde.</b> De beleggingen
            staan op de balans voor wat je ervoor betaald hebt. Stijgt de koers,
            dan gebeurt er fiscaal niets: de winst valt pas in de heffing bij
            verkoop. Precies dat uitstel is waar het BV-voordeel vandaan komt.
            Zakt de koers onder de kostprijs, dan mag je afwaarderen en heb je
            direct een verlies. Waarderen op actuele waarde zou betekenen dat je
            elk jaar ook de ongerealiseerde koerswinst in de winst neemt; dan doet
            de BV hetzelfde als box 3 vanaf 2028, maar met kosten erbij, en
            verliest hij vrijwel altijd. Dit model rekent met kostprijs of lagere
            marktwaarde — de gangbare route voor een BV die buy-and-hold belegt.
            Voor sommige beleggingen en voor handelsposities kan een andere
            waardering verplicht zijn; laat dat toetsen.
          </li>
          <li>
            <b>Rente is geen koerswinst.</b> Bij spaargeld rekent het model met
            rente die je elk jaar ontvangt en die dan meteen belast is, ook in de
            BV. Er valt dan niets uit te stellen. Bij beleggingen gaat het model
            uit van een herbeleggende ETF zonder tussentijdse uitkering: de hele
            opbrengst is koersgroei en je verkoopt pas op de horizon.
          </li>
          <li>
            <b>Overige tarieven (2026).</b> Vpb 19% tot €200.000 winst, daarboven
            25,8%. Box 2 24,5% tot €68.843 per persoon, daarboven 31%. Tarieven
            blijven constant in de projectie; schijven worden niet geïndexeerd en
            er wordt niet gecorrigeerd voor inflatie.
          </li>
          <li>
            <b>Liquidatie.</b> Op de horizon wordt de portefeuille verkocht en over
            het gekozen aantal jaren uitgekeerd. Vpb en box 2 verdelen zich over
            die jaren, waardoor de lage schijven meerdere keren worden benut.
            Tijdens de afwikkeling rekent het model geen rendement meer — dat maakt
            de uitkomst iets voorzichtig.
          </li>
          <li>
            <b>Belastingen en kosten komen uit het vermogen zelf.</b> Er wordt niet
            van buitenaf bijgestort.
          </li>
          <li>
            <b>Niet meegenomen:</b> gebruikelijk loon (bij een pure
            beleggings-BV speelt dat doorgaans niet), buitenlandse bronbelasting op
            dividend, de regeling excessief lenen, schenk- en erfbelasting,
            overdrachtsbelasting, en het effect van tussentijds dividend dat je
            privé weer belegt.
          </li>
        </ul>
        <p className="disclaimer">
          Dit is een rekenmodel, geen advies. De uitkomst hangt volledig af van de
          ingevoerde aannames en van wetgeving die nog kan veranderen — het box
          3-stelsel per 2028 is op dit moment een wetsvoorstel. Leg je eigen
          situatie voor aan een fiscalist.
        </p>
      </div>
    </details>
  );
}
```

- [ ] **Step 5: Finish `src/App.tsx`**

The payout hint is computed here because it needs the simulation. It mirrors the original's behaviour: show what emptying the BV costs, and what the other choice would change.

```tsx
import { useMemo, useState } from "react";
import { Assumptions } from "./components/Assumptions";
import { BreakevenChart } from "./components/BreakevenChart";
import { Inputs as InputsPanel } from "./components/Inputs";
import { TimeChart } from "./components/TimeChart";
import { Verdict } from "./components/Verdict";
import { WhyFold } from "./components/WhyFold";
import { YearTable } from "./components/YearTable";
import { simulateBV } from "./model/bv";
import { breakevenBands } from "./model/compare";
import { eur } from "./model/format";
import { PARAMS_2026 } from "./model/params";
import { DEFAULTS, toInputs, type FormState } from "./state";

const STANDAARD_LIQ_HINT = "Gespreid uitkeren benut het lage box 2-tarief vaker.";

export default function App() {
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const inputs = useMemo(() => toInputs(form), [form]);
  const bands = useMemo(() => breakevenBands(inputs, form.stelsel), [inputs, form.stelsel]);

  const liqHint = useMemo((): string => {
    const rows = simulateBV(inputs.V, inputs);
    const laatste = rows[rows.length - 1];
    if (laatste === undefined || laatste.stand <= inputs.V) return STANDAARD_LIQ_HINT;

    const nu = laatste.stand - laatste.netto;
    const alt = inputs.liqJaren === 1 ? 5 : 1;
    const altRows = simulateBV(inputs.V, { ...inputs, liqJaren: alt });
    const altLaatste = altRows[altRows.length - 1];
    if (altLaatste === undefined) return STANDAARD_LIQ_HINT;

    const altBelasting = altLaatste.stand - altLaatste.netto;
    const verschil = Math.abs(altBelasting - nu);
    const grens = eur(PARAMS_2026.abGrens * inputs.mult);

    if (verschil < 100) {
      return `Bij het leeghalen betaal je nu ${eur(nu)} aan Vpb en box 2. Verder spreiden verandert daar niets meer aan: je uitkering past al helemaal in het lage box 2-tarief van 24,5%, dat geldt tot ${grens} per jaar.`;
    }

    const kern =
      alt === 5
        ? `Verdeel je het over 5 jaar, dan wordt dat ${eur(altBelasting)} — ${eur(verschil)} minder.`
        : `Zou je alles in één keer opnemen, dan was dat ${eur(altBelasting)} — ${eur(verschil)} méér.`;

    return `Bij het leeghalen betaal je nu ${eur(nu)} aan Vpb en box 2. ${kern} Dat komt doordat het lage box 2-tarief van 24,5% geldt tot ${grens} per jaar. Zodra je jaarlijkse uitkering daaronder blijft, levert verder spreiden niets meer op.`;
  }, [inputs]);

  return (
    <div className="pagina">
      <p className="eyebrow">Beleggen in de BV of privé · particulier</p>
      <h1>Vanaf welk vermogen wordt een BV interessant?</h1>
      <p className="lede">
        Privé betaal je in box 3 elk jaar belasting over je vermogen — vanaf 2028
        over je werkelijke rendement, inclusief koerswinst die je nog niet hebt
        verzilverd. In een BV mag die winst blijven staan tot je verkoopt. Dat
        uitstel is het hele voordeel, en het moet opwegen tegen de kosten van de
        BV, tegen het heffingsvrije bedrag dat je in box 3 opgeeft, en tegen de
        box 2-heffing bij het uitkeren. Vul je eigen cijfers in en je ziet waar de
        balans omslaat.
      </p>

      <div className="grid">
        <div>
          <InputsPanel form={form} onChange={setForm} liqHint={liqHint} />
        </div>
        <div>
          <Verdict inputs={inputs} stelsel={form.stelsel} bands={bands} />
          <WhyFold inputs={inputs} stelsel={form.stelsel} bands={bands} />
          <BreakevenChart inputs={inputs} stelsel={form.stelsel} bands={bands} />
          <YearTable inputs={inputs} stelsel={form.stelsel} />
          <TimeChart inputs={inputs} stelsel={form.stelsel} />
          <Assumptions />
          <p className="foot">Rekenmodel · indicatief · peiljaar 2026</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Write the integration test `tests/App.test.tsx`**

```tsx
// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "../src/App";

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
});
```

- [ ] **Step 7: Run the full suite**

Run: `npx vitest run && npm run typecheck && npm run build`
Expected: every test passes, typecheck clean, production build succeeds.

- [ ] **Step 8: Verify visually end to end**

Run: `npm run dev`. Check:
- both charts render and update as sliders move
- the table scrolls horizontally on a narrow window
- switching to Spaargeld sets the return to 2% and both charts show the BV losing everywhere
- the payout slider's hint text changes as you move it
- no author block, no photo anywhere on the page

Stop the server.

- [ ] **Step 9: Commit**

```bash
git add src/components/TimeChart.tsx src/components/Assumptions.tsx src/App.tsx tests/components/TimeChart.test.tsx tests/App.test.tsx
git commit -m "feat(ui): add time chart, assumptions and final wiring"
```
