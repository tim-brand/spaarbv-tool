# Maandelijkse inleg Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a monthly contribution (maandelijkse inleg) with a stop year to the spaar-BV comparison, threaded through both simulation routes.

**Architecture:** A new pure annuity module computes the year-end value of 12 start-of-month deposits. Both annual simulation loops (`simulateBox3`, `simulateBV`) consume it: box 3 adds deposits to the year's result (taxed in-year under 2028, next peildatum under "nu"); the BV books deposits as agiostorting (verkrijgingsprijs grows, returns untaxed). UI adds one text field, a conditional stop-year slider, a conditional table column, and result prose.

**Tech Stack:** TypeScript (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), React 18, Vite, Vitest (NO `globals: true`), @testing-library/react.

**Spec:** docs/superpowers/specs/2026-08-29-maandelijkse-inleg-design.md

## Global Constraints

- Never use the non-null assertion operator (`!`). Use `?.`, `if` guards, or narrowing.
- No `any` (use `unknown` + narrowing); no needless `as X`; never `as unknown as X`.
- Every jsdom test file MUST contain `afterEach(cleanup);` — Vitest runs without `globals: true`, so @testing-library/react's implicit cleanup never registers.
- `tests/fixtures/golden.json`, `scripts/reference-model.js` and `scripts/generate-golden.js` must NOT be modified. All golden tests must keep passing bit-exactly with `inleg: 0` after every task.
- All Dutch UI prose is written fresh — never copied from the original tool at independentwealth.nl.
- Commit messages: conventional commits, single line, no body, never mention Claude or AI.
- Never `git add -A`; add only files you created or edited. Never `git -C`.
- New tests must first be shown failing (missing feature or mutated expectation), then passing.
- Run the full suite (`npx vitest run`) before every commit; it must be fully green.

---

### Task 1: Annuity module

**Files:**
- Create: `src/model/inleg.ts`
- Test: `tests/model/inleg.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `inlegFactor(r: number): number` and `jaarInleg(m: number, r: number): JaarInleg` where `JaarInleg = { hoofdsom: number; groei: number }`. Tasks 3 and 4 import `jaarInleg` from `"./inleg"`; tests in Tasks 3–4 import `inlegFactor` from `"../../src/model/inleg"` to build expected values.

- [ ] **Step 1: Write the failing test**

Create `tests/model/inleg.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { inlegFactor, jaarInleg } from "../../src/model/inleg";

describe("inlegFactor", () => {
  it("is exact 12 bij rendement nul", () => {
    expect(inlegFactor(0)).toBe(12);
  });

  it("komt overeen met de meetkundige som bij een 1%-maandrente", () => {
    // Kies r zó dat de maandfactor precies 1,01 is: r = 1,01^12 - 1.
    // Dan is de som Σ_{j=1..12} 1,01^j = 101 × (1,01^12 - 1) — een
    // onafhankelijke gesloten vorm, met de hand na te rekenen.
    const r = 1.01 ** 12 - 1;
    expect(inlegFactor(r)).toBeCloseTo(101 * (1.01 ** 12 - 1), 8);
    expect(inlegFactor(r)).toBeCloseTo(12.8093280433, 6);
  });

  it("ligt tussen 12 en 12x de jaarfactor bij positief rendement", () => {
    const f = inlegFactor(0.07);
    expect(f).toBeGreaterThan(12);
    expect(f).toBeLessThan(12 * 1.07);
  });
});

describe("jaarInleg", () => {
  it("levert nullen zonder inleg", () => {
    expect(jaarInleg(0, 0.07)).toEqual({ hoofdsom: 0, groei: 0 });
  });

  it("levert 12x de maandinleg zonder rendement, zonder groei", () => {
    expect(jaarInleg(500, 0)).toEqual({ hoofdsom: 6000, groei: 0 });
  });

  it("berekent de groei als maandbedrag maal (factor - 12)", () => {
    const r = 1.01 ** 12 - 1;
    const { hoofdsom, groei } = jaarInleg(100, r);
    expect(hoofdsom).toBe(1200);
    expect(groei).toBeCloseTo(80.9328043, 5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/model/inleg.test.ts`
Expected: FAIL — cannot resolve `../../src/model/inleg`.

- [ ] **Step 3: Write the implementation**

Create `src/model/inleg.ts`:

```ts
/**
 * Maandelijkse inleg, gevouwen in de jaarlus van het model.
 *
 * Aanname: storting aan het begin van elke maand. Een storting in maand k
 * (1-based) rendeert dan nog (13 - k) maanden tot jaareinde, dus met factor
 * (1+r)^((13-k)/12). Gesommeerd over k = 1..12 is dat Σ_{j=1..12} (1+r)^(j/12).
 */

/** Waarde aan jaareinde van 12 stortingen van € 1, bij jaarrendement r.
 *  Bij r = 0 exact 12. */
export function inlegFactor(r: number): number {
  let som = 0;
  for (let j = 1; j <= 12; j += 1) som += (1 + r) ** (j / 12);
  return som;
}

export interface JaarInleg {
  /** Gestorte hoofdsom: 12 × maandbedrag. */
  hoofdsom: number;
  /** Rendement dat de stortingen in hun eigen jaar al maken. */
  groei: number;
}

/** Hoofdsom en eerstejaarsgroei van een jaar maandelijks inleggen.
 *  m = maandbedrag; levert nullen bij m = 0. */
export function jaarInleg(m: number, r: number): JaarInleg {
  if (m === 0) return { hoofdsom: 0, groei: 0 };
  return { hoofdsom: 12 * m, groei: m * (inlegFactor(r) - 12) };
}
```

Note on `inlegFactor(0)`: `1 ** (j / 12)` is exactly `1`, so the sum is exactly `12` — `toBe(12)` is safe.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/model/inleg.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Run the full suite, then commit**

Run: `npx vitest run` — all green.

```bash
git add src/model/inleg.ts tests/model/inleg.test.ts
git commit -m "feat(model): add monthly annuity helper"
```

---

### Task 2: Thread `inleg`/`inlegJaren` through `Inputs` (plumbing only, zero behavior change)

**Files:**
- Modify: `src/model/types.ts` (the `Inputs` interface)
- Modify: `src/state.ts` (`toInputs` return object)
- Modify: `tests/model/box3.test.ts` (the `basis` literal)
- Modify: `tests/model/bv.test.ts` (the `basis` literal)
- Modify: `tests/model/compare.test.ts` (the `basis` literal AND the second inline `Inputs` literal around line 71)
- Modify: `tests/model/golden.test.ts` (the local `toInputs` builder)

**Interfaces:**
- Consumes: nothing from Task 1 (the fields are inert until Tasks 3–4).
- Produces: `Inputs` gains two REQUIRED fields: `inleg: number` (monthly amount in euros) and `inlegJaren: number` (deposit years, 0-based years `i < inlegJaren` are deposit years). Every construction site sets both to `0` in this task.

This task exists so Tasks 3 and 4 can each compile and be reviewed on their own. The simulations ignore the new fields for now; the golden suite passing bit-exactly proves zero behavior change.

- [ ] **Step 1: Add the fields to `Inputs` in `src/model/types.ts`**

Directly after the `mult: 1 | 2;` line inside `interface Inputs`, add:

```ts
  /** Maandelijkse inleg in euro's. 0 = geen inleg. */
  inleg: number;
  /** Aantal jaren (vanaf jaar 1) waarin wordt ingelegd; begrensd op T. */
  inlegJaren: number;
```

- [ ] **Step 2: Watch the compiler fail**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: errors in `src/state.ts` and the four test files — every object literal typed `Inputs` now misses two properties. (If a construction site errors that this step didn't list, fix it the same way and mention it in your report.)

- [ ] **Step 3: Add `inleg: 0, inlegJaren: 0` at every construction site**

In `src/state.ts`, inside the object returned by `toInputs`, after `liqJaren: f.liqJaren,` add:

```ts
    inleg: 0,
    inlegJaren: 0,
```

(Temporary hardcode — Task 5 replaces these with real parsing.)

In `tests/model/box3.test.ts` and `tests/model/bv.test.ts`, extend the `basis` literal:

```ts
const basis: Inputs = {
  V: 200_000, T: 20, r: 0.07, d: 0, g: 0.07,
  kosten: 1200, opricht: 600, liqJaren: 1, mult: 1, soort: "beleggen",
  inleg: 0, inlegJaren: 0,
};
```

In `tests/model/compare.test.ts`, do the same to its `basis` literal, and add `inleg: 0, inlegJaren: 0,` to the inline `Inputs` literal near line 71 (the one with `kosten: 100, opricht: 100`).

In `tests/model/golden.test.ts`, in the local `toInputs` builder, extend the returned object:

```ts
  return {
    V: g.V, T: g.T, r, d, g: r - d,
    kosten: g.kosten, opricht: g.opricht, liqJaren: g.liq,
    mult: g.partner ? 2 : 1, soort: g.soort,
    inleg: 0, inlegJaren: 0,
  };
```

Do NOT touch `tests/fixtures/golden.json`.

- [ ] **Step 4: Verify compile and full suite**

Run: `npx tsc --noEmit -p tsconfig.json` — clean.
Run: `npx vitest run` — all green, including every golden test.

- [ ] **Step 5: Commit**

```bash
git add src/model/types.ts src/state.ts tests/model/box3.test.ts tests/model/bv.test.ts tests/model/compare.test.ts tests/model/golden.test.ts
git commit -m "refactor(model): thread inleg fields through inputs"
```

---

### Task 3: Deposits in the box 3 simulation

**Files:**
- Modify: `src/model/types.ts` (the `Box3Year` interface)
- Modify: `src/model/box3.ts`
- Test: `tests/model/box3.test.ts` (append a new `describe` block)

**Interfaces:**
- Consumes: `jaarInleg(m, r)` from `src/model/inleg.ts` (Task 1); `Inputs.inleg` / `Inputs.inlegJaren` (Task 2).
- Produces: `Box3Year` gains required field `inleg: number` (that year's deposited principal, 0 outside the deposit period). `rend` now includes the deposits' first-year growth. Task 7 renders `rij.inleg`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/model/box3.test.ts` (add `import { inlegFactor } from "../../src/model/inleg";` at the top):

```ts
describe("simulateBox3 — maandelijkse inleg", () => {
  const metInleg: Inputs = { ...basis, V: 100_000, T: 2, inleg: 500, inlegJaren: 2 };
  // Eerstejaarsgroei van € 500/maand bij 7%: 500 × (factor - 12).
  const groei = 500 * (inlegFactor(0.07) - 12);

  it("belast de inleggroei in het nieuwe stelsel in het jaar zelf", () => {
    const rows = simulateBox3(100_000, metInleg, "2028");
    const jaar1 = rows[0];
    expect(jaar1).toBeDefined();
    if (jaar1 === undefined) return;
    expect(jaar1.inleg).toBe(6000);
    expect(jaar1.rend).toBeCloseTo(7_000 + groei, 6);
    expect(jaar1.tax).toBeCloseTo((7_000 + groei - 1_800) * 0.36, 6);
    expect(jaar1.netto).toBeCloseTo(100_000 + 7_000 + groei + 6_000 - jaar1.tax, 6);
  });

  it("belast de inleg in het huidige stelsel pas op de volgende peildatum", () => {
    const rows = simulateBox3(100_000, metInleg, "nu");
    const zonder = simulateBox3(100_000, { ...metInleg, inleg: 0 }, "nu");
    const [jaar1, jaar2] = rows;
    expect(jaar1).toBeDefined();
    expect(jaar2).toBeDefined();
    if (jaar1 === undefined || jaar2 === undefined) return;
    // Forfait over de beginstand: (100.000 - 59.357) × 6% × 36% = 877,8888.
    // De inleg van dit jaar verandert daar niets aan.
    expect(jaar1.tax).toBeCloseTo(877.8888, 4);
    expect(jaar1.tax).toBeCloseTo(zonder[0]?.tax ?? Number.NaN, 10);
    // Jaar 2: de gestorte € 6.000 + groei staat nu wél in de grondslag.
    const begin2 = 100_000 + 7_000 + groei + 6_000 - jaar1.tax;
    expect(jaar2.begin).toBeCloseTo(begin2, 6);
    expect(jaar2.tax).toBeCloseTo((begin2 - 59_357) * 0.06 * 0.36, 6);
  });

  it("stopt met inleggen na het stopjaar", () => {
    const stop: Inputs = { ...basis, V: 100_000, T: 4, inleg: 500, inlegJaren: 2 };
    const rows = simulateBox3(100_000, stop, "2028");
    expect(rows[0]?.inleg).toBe(6000);
    expect(rows[1]?.inleg).toBe(6000);
    expect(rows[2]?.inleg).toBe(0);
    expect(rows[3]?.inleg).toBe(0);
    const jaar3 = rows[2];
    if (jaar3 === undefined) return;
    // Zonder inleg is het rendement weer zuiver begin × r.
    expect(jaar3.rend).toBeCloseTo(jaar3.begin * 0.07, 6);
  });

  it("houdt zonder inleg elk jaarveld op nul inleg", () => {
    const rows = simulateBox3(200_000, basis, "2028");
    expect(rows.every((rij) => rij.inleg === 0)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/model/box3.test.ts`
Expected: FAIL — `Box3Year` has no `inleg` field (TypeScript error) / values differ.

- [ ] **Step 3: Implement**

In `src/model/types.ts`, add to `Box3Year` after the `begin` field:

```ts
  /** Gestorte hoofdsom van dat jaar (12 × maandinleg), 0 buiten de inlegperiode. */
  inleg: number;
```

In `src/model/box3.ts`: add `import { jaarInleg } from "./inleg";` and replace the top of the loop body

```ts
    const begin = vermogen;
    const rend = begin * s.r;
    vermogen = begin + rend;
```

with

```ts
    const begin = vermogen;
    const storting =
      i < s.inlegJaren ? jaarInleg(s.inleg, s.r) : { hoofdsom: 0, groei: 0 };
    const rend = begin * s.r + storting.groei;
    vermogen = begin + rend + storting.hoofdsom;
```

and extend the push:

```ts
    rows.push({ begin, inleg: storting.hoofdsom, rend, tax, netto: vermogen });
```

The tax branches stay untouched: 2028 already taxes `rend` (now including deposit growth); "nu" already taxes `begin` (deposits join next year's opening balance). Extend the function's doc comment with one sentence stating both timing facts.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/model/box3.test.ts` — PASS.

- [ ] **Step 5: Run the full suite, then commit**

Run: `npx vitest run` — all green; golden tests prove `inleg: 0` is still bit-exact.

```bash
git add src/model/types.ts src/model/box3.ts tests/model/box3.test.ts
git commit -m "feat(model): apply monthly deposits in box 3 simulation"
```

---

### Task 4: Deposits as agiostorting in the BV simulation

**Files:**
- Modify: `src/model/types.ts` (the `BvYear` interface)
- Modify: `src/model/bv.ts`
- Test: `tests/model/bv.test.ts` (append a new `describe` block)

**Interfaces:**
- Consumes: `jaarInleg(m, r)` from `src/model/inleg.ts`; `Inputs.inleg` / `Inputs.inlegJaren`.
- Produces: `BvYear` gains required field `inleg: number` (that year's deposited principal). The verkrijgingsprijs passed to `netIfLiquidatedNow` grows with each deposit. `netIfLiquidatedNow` itself is NOT modified.

- [ ] **Step 1: Write the failing tests**

Append to `tests/model/bv.test.ts` (add `import { inlegFactor } from "../../src/model/inleg";` to the imports; the file already imports `simulateBV` and the `Inputs` type and defines `basis`):

```ts
describe("simulateBV — maandelijkse inleg", () => {
  it("geeft de inleg bij rendement nul onbelast terug (verkrijgingsprijs)", () => {
    // r = 0: geen groei, dus alles is exact na te rekenen.
    // Eindstand = 100.000 + 5 × 6.000 - (5 × 1.200 + 600) = 123.400.
    // De verkrijgingsprijs is 130.000, dus box 2 heft niets: netto = 123.400.
    // (Zonder meegroeiende verkrijgingsprijs zou 123.400 - 100.000 = 23.400
    // in box 2 vallen en was netto 123.400 - 5.733 = 117.667 — de mutatie
    // die deze test moet betrappen.)
    const nul: Inputs = {
      ...basis, V: 100_000, T: 5, r: 0, d: 0, g: 0,
      inleg: 500, inlegJaren: 5,
    };
    const rows = simulateBV(100_000, nul);
    const laatste = rows[rows.length - 1];
    expect(laatste).toBeDefined();
    if (laatste === undefined) return;
    expect(laatste.netto).toBeCloseTo(123_400, 6);
  });

  it("belast de rente op de inleg bij spaargeld direct in de Vpb", () => {
    const spaar: Inputs = {
      ...basis, V: 200_000, T: 2, r: 0.02, d: 0.02, g: 0,
      soort: "spaar", inleg: 100, inlegJaren: 2,
    };
    const groei = 100 * (inlegFactor(0.02) - 12);
    const rows = simulateBV(200_000, spaar);
    const jaar1 = rows[0];
    expect(jaar1).toBeDefined();
    if (jaar1 === undefined) return;
    // winst jaar 1 = rente 4.000 + inlegrente - kosten 1.800; Vpb 19%.
    expect(jaar1.vpb).toBeCloseTo(0.19 * (4_000 + groei - 1_800), 6);
    // Strikt groter dan zonder inleg (0,19 × 2.200 = 418).
    expect(jaar1.vpb).toBeGreaterThan(418);
  });

  it("laat de koersgroei op de inleg buiten de boekwaarde (uitstel)", () => {
    const beleg: Inputs = { ...basis, V: 100_000, T: 1, inleg: 500, inlegJaren: 1 };
    const rows = simulateBV(100_000, beleg);
    const jaar1 = rows[0];
    expect(jaar1).toBeDefined();
    if (jaar1 === undefined) return;
    const groei = 500 * (inlegFactor(0.07) - 12);
    // Marktwaarde: begin × 1,07 + hoofdsom + inleggroei, min de verkochte
    // stukken voor kosten (jaar 1: 1.200 + 600 = 1.800; d = 0, dus saldo -1.800).
    expect(jaar1.stand).toBeCloseTo(100_000 * 1.07 + 6_000 + groei - 1_800, 6);
    expect(jaar1.rend).toBeCloseTo(7_000 + groei, 6);
    expect(jaar1.inleg).toBe(6_000);
  });

  it("stopt met storten na het stopjaar", () => {
    const stop: Inputs = { ...basis, V: 100_000, T: 4, inleg: 500, inlegJaren: 2 };
    const rows = simulateBV(100_000, stop);
    expect(rows.map((rij) => rij.inleg)).toEqual([6_000, 6_000, 0, 0]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/model/bv.test.ts`
Expected: FAIL — `BvYear` has no `inleg` field / values differ.

- [ ] **Step 3: Implement**

In `src/model/types.ts`, add to `BvYear` after the `begin` field:

```ts
  /** Gestorte hoofdsom van dat jaar (12 × maandinleg), 0 buiten de inlegperiode. */
  inleg: number;
```

In `src/model/bv.ts`: add `import { jaarInleg } from "./inleg";`. In `simulateBV`, change `const VK = V;` to `let vk = V;` (and pass `vk` to `netIfLiquidatedNow`). Replace the top of the loop body

```ts
    const begin = A;
    const div = begin * s.d;
    A = begin * (1 + s.g);
```

with

```ts
    const begin = A;
    const storting =
      i < s.inlegJaren ? jaarInleg(s.inleg, s.r) : { hoofdsom: 0, groei: 0 };
    // Splitsing van de eerstejaarsgroei naar rato van d en g. Bij r = 0 is
    // de groei 0, dus valt er niets te splitsen.
    const inlegDiv = s.r === 0 ? 0 : storting.groei * (s.d / s.r);
    const inlegKoers = storting.groei - inlegDiv;

    const div = begin * s.d + inlegDiv;
    A = begin * (1 + s.g) + storting.hoofdsom + inlegKoers;
    C += storting.hoofdsom;
    vk += storting.hoofdsom;
```

The rest of the loop is untouched: `div` flows into `winst` (Vpb over direct return in the year itself) and into `saldo` (reinvestment or forced sale), exactly as before. Update the row push:

```ts
    rows.push({
      begin,
      inleg: storting.hoofdsom,
      rend: begin * s.r + storting.groei,
      kosten,
      vpb: betaaldeVpb,
      stand: A,
      latent: liq.latVpb + liq.latAb,
      netto: liq.netto,
    });
```

Extend the function's doc comment with one sentence: deposits are agiostortingen — they raise boekwaarde and verkrijgingsprijs by the principal, so they return untaxed at liquidation; their direct return is taxed in-year, their price growth defers.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/model/bv.test.ts` — PASS.

- [ ] **Step 5: Run the full suite, then commit**

Run: `npx vitest run` — all green, golden bit-exact.

```bash
git add src/model/types.ts src/model/bv.ts tests/model/bv.test.ts
git commit -m "feat(model): apply monthly deposits as agio in bv simulation"
```

---

### Task 5: Form state and parsing

**Files:**
- Modify: `src/state.ts`
- Test: Create `tests/state.test.ts`

**Interfaces:**
- Consumes: `Inputs.inleg` / `Inputs.inlegJaren` (Task 2); existing `parseNum(text, fallback, max?)` from `src/model/format.ts`.
- Produces: `FormState` gains `inlegText: string` (default `"0"`) and `inlegJaren: number | null` (default `null`, meaning "the whole horizon"). `toInputs` fills the real model fields from them. Task 6 binds the form controls to these fields.

- [ ] **Step 1: Write the failing tests**

Create `tests/state.test.ts` (plain node environment — no jsdom, no cleanup needed):

```ts
import { describe, expect, it } from "vitest";
import { DEFAULTS, MAX_BEDRAG, toInputs } from "../src/state";

describe("toInputs — maandelijkse inleg", () => {
  it("parseert de inleg uit de ruwe tekst", () => {
    const s = toInputs({ ...DEFAULTS, inlegText: "1.500" });
    expect(s.inleg).toBe(1500);
  });

  it("valt terug op 0 bij onzin en bij een minteken", () => {
    expect(toInputs({ ...DEFAULTS, inlegText: "abc" }).inleg).toBe(0);
    expect(toInputs({ ...DEFAULTS, inlegText: "-500" }).inleg).toBe(0);
  });

  it("begrenst de inleg op het maximumbedrag", () => {
    const s = toInputs({ ...DEFAULTS, inlegText: "99.999.999" });
    expect(s.inleg).toBe(MAX_BEDRAG);
  });

  it("laat de inlegperiode de horizon volgen zolang die niet gekozen is", () => {
    const s = toInputs({ ...DEFAULTS, T: 30, inlegJaren: null });
    expect(s.inlegJaren).toBe(30);
  });

  it("begrenst een gekozen inlegperiode op de horizon", () => {
    const s = toInputs({ ...DEFAULTS, T: 10, inlegJaren: 25 });
    expect(s.inlegJaren).toBe(10);
  });

  it("houdt een kortere gekozen inlegperiode aan", () => {
    const s = toInputs({ ...DEFAULTS, T: 20, inlegJaren: 5 });
    expect(s.inlegJaren).toBe(5);
  });

  it("houdt de standaardinvoer op nul inleg", () => {
    const s = toInputs(DEFAULTS);
    expect(s.inleg).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/state.test.ts`
Expected: FAIL — `FormState` has no `inlegText`/`inlegJaren` (TypeScript errors).

- [ ] **Step 3: Implement**

In `src/state.ts`:

Add to `FormState` after `oprichtText: string;`:

```ts
  /** Ruwe tekst uit het inlegveld, zoals kostenText. */
  inlegText: string;
  /** Inlegperiode in jaren; null = de hele horizon. */
  inlegJaren: number | null;
```

Add to `DEFAULTS` after `oprichtText: "600",`:

```ts
  inlegText: "0",
  inlegJaren: null,
```

In `toInputs`, replace the Task 2 hardcode (`inleg: 0, inlegJaren: 0,`) with:

```ts
    inleg: parseNum(f.inlegText, 0, MAX_BEDRAG),
    inlegJaren: Math.min(Math.max(Math.floor(f.inlegJaren ?? f.T), 0), f.T),
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/state.test.ts` — PASS.

- [ ] **Step 5: Run the full suite, then commit**

Run: `npx vitest run` — all green. (Component tests use `toInputs(DEFAULTS)` with `inlegText: "0"` → `inleg: 0`, so nothing shifts; golden stays bit-exact because the golden builder does not go through `toInputs` from `src/state.ts`.)

```bash
git add src/state.ts tests/state.test.ts
git commit -m "feat(state): parse monthly contribution form fields"
```

---

### Task 6: Form controls

**Files:**
- Modify: `src/components/Inputs.tsx`
- Test: `tests/components/Inputs.test.tsx` (append tests)

**Interfaces:**
- Consumes: `FormState.inlegText` / `FormState.inlegJaren` (Task 5); existing `parseNum`, `formatNumberNl`, `MAX_BEDRAG`, the `netjes` blur helper and the `field`/`in-wrap`/`hint` markup patterns already in the file.
- Produces: a text input labeled `Maandelijkse inleg` (id `k-inleg`) and — only when the parsed inleg > 0 — a range input labeled `Inleggen gedurende` (id `k-inlegjaren`, min 1, max `form.T`, value `form.inlegJaren ?? form.T`).

- [ ] **Step 1: Write the failing tests**

Append inside the existing `describe("Inputs", ...)` block of `tests/components/Inputs.test.tsx`:

```ts
  it("toont een veld voor de maandelijkse inleg", () => {
    setup();
    expect(screen.getByLabelText("Maandelijkse inleg")).toBeDefined();
  });

  it("verbergt de inlegperiode zolang er geen inleg is", () => {
    setup();
    expect(screen.queryByLabelText(/Inleggen gedurende/)).toBeNull();
  });

  it("toont de inlegperiode zodra er een inleg staat, standaard de horizon", () => {
    setup({ inlegText: "500" });
    const slider = screen.getByLabelText(/Inleggen gedurende/);
    if (!(slider instanceof HTMLInputElement)) throw new Error("geen input");
    expect(slider.value).toBe("20");
    expect(screen.getByText("20 van de 20 jaar")).toBeDefined();
  });

  it("meldt een gekozen inlegperiode", () => {
    const { onChange } = setup({ inlegText: "500" });
    const slider = screen.getByLabelText(/Inleggen gedurende/);
    fireEvent.change(slider, { target: { value: "10" } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ inlegJaren: 10 }),
    );
  });

  it("meldt een nieuwe inlegtekst", () => {
    const { onChange } = setup();
    const veld = screen.getByLabelText("Maandelijkse inleg");
    fireEvent.change(veld, { target: { value: "750" } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ inlegText: "750" }),
    );
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/components/Inputs.test.tsx`
Expected: the five new tests FAIL (no such labels), existing ones PASS.

- [ ] **Step 3: Implement**

In `src/components/Inputs.tsx`:

Widen the `netjes` helper's key union so blur also tidies the new field:

```ts
  const netjes = (
    key: "kostenText" | "oprichtText" | "inlegText",
    fallback: number,
  ): void => {
```

Compute the parsed inleg once, above the `return`:

```ts
  const inleg = parseNum(form.inlegText, 0, MAX_BEDRAG);
```

In the first card (`Jouw vermogen`), directly after the `k-verm` field's closing `</div>` and before the `k-jaar` field, insert:

```tsx
        <div className="field">
          <label htmlFor="k-inleg">Maandelijkse inleg</label>
          <div className="in-wrap">
            <span>€</span>
            <input
              type="text" id="k-inleg" inputMode="numeric" value={form.inlegText}
              onChange={(e) => set("inlegText", e.target.value)}
              onBlur={() => netjes("inlegText", 0)}
            />
          </div>
          <p className="hint">
            Wat je er elke maand bijlegt, aan het begin van de maand. Laat op 0
            staan als je alleen met je huidige vermogen rekent.
          </p>
        </div>

        {inleg > 0 && (
          <div className="field">
            <label htmlFor="k-inlegjaren">
              Inleggen gedurende{" "}
              <span className="val">
                {form.inlegJaren ?? form.T} van de {form.T} jaar
              </span>
            </label>
            <input
              type="range" id="k-inlegjaren" min={1} max={form.T} step={1}
              value={form.inlegJaren ?? form.T}
              onChange={(e) => set("inlegJaren", Number(e.target.value))}
            />
            <p className="hint">
              Daarna stoppen de stortingen en groeit het vermogen alleen nog
              door rendement.
            </p>
          </div>
        )}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/components/Inputs.test.tsx` — PASS.

- [ ] **Step 5: Run the full suite, then commit**

Run: `npx vitest run` — all green.

```bash
git add src/components/Inputs.tsx tests/components/Inputs.test.tsx
git commit -m "feat(ui): add monthly contribution inputs"
```

---

### Task 7: Year table column

**Files:**
- Modify: `src/components/YearTable.tsx`
- Test: `tests/components/YearTable.test.tsx` (append tests)

**Interfaces:**
- Consumes: `Box3Year.inleg` (Task 3), `BvYear.inleg` (Task 4), `Inputs.inleg` (Task 2).
- Produces: when `inputs.inleg > 0`, one extra column headed `Inleg` directly after the `Jaar` column (the deposit is identical on both routes, so it is shown once, outside the two column groups).

- [ ] **Step 1: Write the failing tests**

`tests/components/YearTable.test.tsx` has a render helper `tabel(overrides: Partial<Inputs> = {}, stelsel: Stelsel = "2028")`. Append inside the existing `describe("YearTable", ...)` block:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/components/YearTable.test.tsx`
Expected: new tests FAIL (first one may pass — that is fine; the other two must fail).

- [ ] **Step 3: Implement**

In `src/components/YearTable.tsx`, add above the `return`:

```ts
  const toonInleg = inputs.inleg > 0;
```

In the first `<thead>` row, change the leading `<th />` to span the extra column when shown:

```tsx
              <th colSpan={toonInleg ? 2 : 1} />
```

In the second header row, directly after `<th>Jaar</th>`:

```tsx
              {toonInleg && <th>Inleg</th>}
```

In the body row, directly after the `jaar` cell:

```tsx
                  {toonInleg && <td className="c-inleg">{eur(rij.inleg)}</td>}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/components/YearTable.test.tsx` — PASS.

- [ ] **Step 5: Run the full suite, then commit**

Run: `npx vitest run` — all green.

```bash
git add src/components/YearTable.tsx tests/components/YearTable.test.tsx
git commit -m "feat(ui): show deposit column in year table"
```

---

### Task 8: Verdict prose and assumptions

**Files:**
- Modify: `src/components/Verdict.tsx`
- Modify: `src/components/Assumptions.tsx`
- Modify: `src/App.tsx` (pass the inleg to `Assumptions`)
- Test: `tests/components/Verdict.test.tsx` (append), Create: `tests/components/Assumptions.test.tsx`

**Interfaces:**
- Consumes: `Inputs.inleg` / `Inputs.inlegJaren`; `eur` from `src/model/format.ts`.
- Produces: `Assumptions` gains a required prop `inleg: number`; `Verdict` mentions the total contribution when `inputs.inleg > 0`.

- [ ] **Step 1: Write the failing tests**

`tests/components/Verdict.test.tsx` has a render helper `paneel(overrides, stelsel)` and a leaf-filtering text matcher named `tekst`. Append inside the existing `describe("Verdict", ...)` block:

```ts
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
```

Create `tests/components/Assumptions.test.tsx`:

```tsx
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/components/Verdict.test.tsx tests/components/Assumptions.test.tsx`
Expected: new tests FAIL (`Assumptions` takes no props yet; Verdict says nothing about inleg).

- [ ] **Step 3: Implement**

In `src/components/Verdict.tsx`, add above the `return`:

```ts
  const totaleInleg = 12 * inputs.inleg * inputs.inlegJaren;
```

In the `kp-sub` paragraph, directly after the closing of the first conditional block (after the `)}` that ends the `onder === null ? (...) : (...)` expression) and before the `{nu > n28 && (` fragment, insert:

```tsx
        {totaleInleg > 0 && (
          <>
            {" "}
            Daarnaast leg je in totaal <b>{eur(totaleInleg)}</b> in:{" "}
            {eur(inputs.inleg)} per maand, {inputs.inlegJaren} jaar lang. Beide
            eindbedragen bevatten die stortingen.
          </>
        )}
```

In `src/components/Assumptions.tsx`, give the component a prop:

```tsx
interface Props {
  /** Maandelijkse inleg; bij 0 blijven de inleg-aannames verborgen. */
  inleg: number;
}

export function Assumptions({ inleg }: Props) {
```

and insert, directly after the `<b>Je inleg in de BV</b>` list item, the conditional item:

```tsx
          {inleg > 0 && (
            <li>
              <b>Maandelijkse inleg.</b> Het model stort aan het begin van elke
              maand en rekent daarover naar rato rendement in het jaar van
              storten. In de BV is elke storting een agiostorting: ze verhoogt
              de verkrijgingsprijs en komt bij liquidatie onbelast terug. In het
              huidige box 3-stelsel tellen de stortingen van een jaar pas mee op
              de eerstvolgende peildatum; in het nieuwe stelsel telt hun
              rendement direct mee in het werkelijke resultaat.
            </li>
          )}
```

In `src/App.tsx`, change `<Assumptions />` to:

```tsx
          <Assumptions inleg={inputs.inleg} />
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/components/Verdict.test.tsx tests/components/Assumptions.test.tsx` — PASS.

- [ ] **Step 5: Run the full suite and the build, then commit**

Run: `npx vitest run` — all green.
Run: `npx tsc --noEmit -p tsconfig.json && npm run build` — clean.

```bash
git add src/components/Verdict.tsx src/components/Assumptions.tsx src/App.tsx tests/components/Verdict.test.tsx tests/components/Assumptions.test.tsx
git commit -m "feat(ui): mention contributions in verdict and assumptions"
```
