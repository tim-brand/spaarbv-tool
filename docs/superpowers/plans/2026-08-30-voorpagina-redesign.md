# Voorpagina-restyling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the React app to the approved "Versie B2 · Voorpagina" newspaper design — poster-scale verdict, right-hand sticky rekenpaneel with steppers, serif typography — without touching the tax model or its behavior.

**Architecture:** One up-front task replaces the stylesheet and fonts entirely (all classes for the final design land at once); the remaining tasks migrate components onto those classes one at a time. Chart colors move from hardcoded hex into a shared `chart/kleuren.ts` palette. Only presentation changes; `src/model/**` and `src/state.ts` are untouchable.

**Tech Stack:** React 18, TypeScript strict, Vite, Vitest (no `globals: true`), plain CSS with custom properties, Google Fonts (Newsreader + Archivo).

**Spec:** docs/superpowers/specs/2026-08-30-voorpagina-redesign-design.md (mockup: docs/superpowers/specs/assets/2026-08-30-voorpagina-mockup.html)

## Global Constraints

- `src/model/**`, `src/state.ts`, `tests/fixtures/golden.json`, `scripts/reference-model.js`, `scripts/generate-golden.js` must NOT be modified.
- Never use `!` non-null assertions; no `any` (use `unknown` + narrowing); no needless `as X`.
- Every jsdom test file has explicit `afterEach(cleanup)`.
- The CSS grid regression test must keep passing: grid-template-columns use `minmax(0, 1fr)` (never bare `1fr`) and `.grid > * { min-width: 0 }` stays.
- Existing component tests stay green; when a test pins presentation that deliberately changes, update the test in the same task and say so in the report. Behavior tests (values, copy from the model, aria) must never be weakened.
- All new Dutch copy is written fresh; commit messages: conventional, single line, no body, no AI mention; never `git add -A`; never `git -C`.
- Between Task 1 and Task 7 the app may look transitional (new CSS, partly old markup) — that is expected on this branch; each task still ends fully green (`npx vitest run`) and type-clean.
- Run `npx vitest run` and `npx tsc --noEmit -p tsconfig.json` before every commit.

---

### Task 1: Fonts, tokens, and the complete new stylesheet

**Files:**
- Modify: `index.html` (font links, lines 7–12)
- Modify: `src/styles.css` (full replacement)
- Test: `tests/styles.test.ts` (append a describe)

**Interfaces:**
- Produces: every CSS class later tasks reference: `.masthead`, `.masthead-meta`, `.paneel`, `.veld-kop`, `.stap`, `.stap-rij`, `.stap-waarde`, `.voetnoten`, plus restyled existing classes. Tokens: `--paper #faf7f0`, `--card #fffdf8`, `--ink #191613`, `--dim #48423a`, `--ink-2 #6e675c`, `--line #d8d2c4`, `--guide #a49a88`, `--box3 #39586e`, `--box3-bg rgba(57,88,110,.08)`, `--bv #27506b`, `--bv-bg rgba(39,80,107,.08)`, `--pivot #27506b`, `--pos #355e46`, `--neg #8c2f24`, `--display` (Newsreader stack), `--labels` (Archivo stack).

- [ ] **Step 1: Write the failing tests**

Append to `tests/styles.test.ts`, inside the file after the existing describe (reuse the existing `css` loading pattern by adding a new describe that reads the file the same way):

```ts
describe("styles.css - voorpagina-ontwerptaal", () => {
  const ruweCss = fs.readFileSync(path.join(__dirname, "../src/styles.css"), "utf-8");
  const css = zonderCommentaar(ruweCss);

  it("gebruikt de kranttokens", () => {
    expect(css).toContain("--paper: #faf7f0");
    expect(css).toContain("--ink: #191613");
    expect(css).toContain("--bv: #27506b");
    expect(css).toContain("--box3: #39586e");
    expect(css).toContain("--neg: #8c2f24");
  });

  it("zet Newsreader als displayletter en Archivo voor labels", () => {
    expect(css).toMatch(/--display:\s*"Newsreader"/);
    expect(css).toMatch(/--labels:\s*"Archivo"/);
    expect(css).not.toContain("Space Grotesk");
  });

  it("houdt het rekenpaneel rechts met een sticky kolom", () => {
    expect(css).toMatch(/\.grid\s*{[^}]*grid-template-areas/);
    expect(css).toMatch(/\.paneel-kolom\s*{[^}]*position:\s*sticky/);
  });
});
```

Note: `zonderCommentaar`, `fs`, and `path` already exist at module scope in this file — do not redeclare them; only add the describe (the `ruweCss`/`css` consts get fresh local names, rename them to `ruweCss2`/`css2` if TypeScript complains about shadowing at the same scope — they are inside the describe callback, so plain names are fine).

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx vitest run tests/styles.test.ts`
Expected: the three new tests FAIL (old tokens present); the two existing grid tests PASS.

- [ ] **Step 3: Swap the fonts in `index.html`**

Replace the single Space Grotesk `<link href=...>` element with:

```html
    <link
      href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,700;1,6..72,400&family=Archivo:wght@500;600&display=swap"
      rel="stylesheet"
    />
```

(keep both `preconnect` lines above it unchanged).

- [ ] **Step 4: Replace `src/styles.css` in full**

Overwrite the file with exactly:

```css
:root {
  --ink: #191613;
  --dim: #48423a;
  --ink-2: #6e675c;
  --line: #d8d2c4;
  --guide: #a49a88;
  --paper: #faf7f0;
  --card: #fffdf8;
  --box3: #39586e;
  --box3-bg: rgba(57, 88, 110, 0.08);
  --bv: #27506b;
  --bv-bg: rgba(39, 80, 107, 0.08);
  --pivot: #27506b;
  --neg: #8c2f24;
  --pos: #355e46;
  --display: "Newsreader", Georgia, "Times New Roman", serif;
  --labels: "Archivo", "Helvetica Neue", Arial, sans-serif;
  --body: var(--display);
}

* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
html, body { margin: 0; padding: 0; background: var(--paper); }

body {
  font-family: var(--body);
  color: var(--ink);
  line-height: 1.5;
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
}

.pagina { overflow-x: hidden; max-width: 100%; padding: 28px 28px 26px; }
@media (min-width: 1000px) { .pagina { padding: 36px 56px 40px; } }

/* Masthead — krantenkop met dubbele regel eronder */
.masthead { border-bottom: 3px double var(--ink); padding-bottom: 18px; margin-bottom: 24px; }
.masthead-boven { display: flex; justify-content: space-between; align-items: baseline; gap: 18px; flex-wrap: wrap; }
.eyebrow {
  font-family: var(--labels); font-size: 12px; font-weight: 600;
  letter-spacing: 0.22em; text-transform: uppercase;
  color: var(--ink-2); margin: 0 0 10px;
}
.masthead-meta {
  font-family: var(--labels); font-size: 12px; font-weight: 500;
  letter-spacing: 0.06em; color: var(--ink-2); margin: 0 0 10px;
}
.masthead-meta a { color: var(--bv); text-decoration: none; border-bottom: 1px solid var(--bv); }
.masthead-meta a:hover { color: var(--ink); border-color: var(--ink); }

h1 {
  font-family: var(--display); font-weight: 700;
  font-size: clamp(34px, 5.5vw, 76px); line-height: 1.02;
  letter-spacing: -0.015em; margin: 0; max-width: 18ch;
}

.lede {
  max-width: 60ch; color: var(--dim); margin: 0 0 26px;
  font-style: italic; font-size: 19px; line-height: 1.6;
}

/* Layout: inhoud links, rekenpaneel rechts (sticky); mobiel paneel eerst */
.grid { display: grid; grid-template-columns: minmax(0, 1fr); grid-template-areas: "paneel" "inhoud"; gap: 26px; align-items: start; }
.grid > * { min-width: 0; }
.paneel-kolom { grid-area: paneel; }
.inhoud-kolom { grid-area: inhoud; }
@media (min-width: 1000px) {
  .grid { grid-template-columns: minmax(0, 1fr) 400px; grid-template-areas: "inhoud paneel"; gap: 48px; }
  .paneel-kolom { position: sticky; top: 16px; }
}

/* Kaarten: vlakke krantpanelen */
.card { background: var(--card); border: 1px solid var(--line); border-radius: 0; padding: 18px 20px; margin-bottom: 18px; }
.card-title {
  font-family: var(--labels); font-weight: 600; font-size: 12px;
  letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--ink-2); margin: 0 0 14px;
}

/* Rekenpaneel met dubbel kader */
.paneel {
  background: var(--card); border: 1px solid var(--ink);
  outline: 1px solid var(--ink); outline-offset: 3px;
  padding: 22px 24px; margin-bottom: 18px;
}
.paneel .card-title { color: var(--ink-2); }

.field { margin-bottom: 20px; }
.field:last-child { margin-bottom: 0; }
.field label { display: block; margin-bottom: 8px; }
.veld-kop {
  font-family: var(--labels); font-size: 11px; font-weight: 600;
  letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-2);
  border-top: 2px solid var(--ink); padding-top: 10px; display: block;
}
.field .val { float: right; font-family: var(--display); font-weight: 700; color: var(--ink); text-transform: none; letter-spacing: 0; font-size: 14px; }
.hint { font-family: var(--labels); font-size: 12px; color: var(--ink-2); margin: 6px 0 0; line-height: 1.5; }

/* Stepper: − waarde + boven de slider */
.stap-rij { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.stap {
  width: 44px; height: 44px; border: 1px solid var(--ink); border-radius: 50%;
  background: var(--card); color: var(--ink); font-size: 22px; line-height: 1;
  display: flex; align-items: center; justify-content: center; cursor: pointer;
  flex-shrink: 0; font-family: var(--body); padding: 0;
}
.stap:hover { background: var(--ink); color: var(--card); }
.stap:disabled { opacity: 0.35; cursor: default; }
.stap:disabled:hover { background: var(--card); color: var(--ink); }
.stap-waarde { flex: 1; text-align: center; font-family: var(--display); font-size: 26px; font-weight: 700; }

input[type="range"] { width: 100%; accent-color: var(--bv); }

.seg { display: flex; border: 1px solid var(--ink); overflow: hidden; }
.seg button {
  flex: 1; padding: 10px 6px; border: 0; background: var(--card);
  font-family: var(--labels); font-size: 13px; font-weight: 600;
  color: var(--dim); cursor: pointer; line-height: 1.25; min-height: 44px;
}
.seg button[aria-pressed="true"] { background: var(--ink); color: var(--card); }

.in-wrap { display: flex; align-items: center; border: 1px solid var(--ink); background: var(--card); }
.in-wrap span { padding: 0 10px; color: var(--ink-2); }
.in-wrap input {
  flex: 1; border: 0; padding: 10px 10px 10px 0; font: inherit;
  font-family: var(--display); font-weight: 700; font-size: 18px;
  background: transparent; min-width: 0;
}
.in-wrap input:focus { outline: none; }
.in-wrap:focus-within { outline: 2px solid var(--bv); outline-offset: -1px; }

.toggle { display: flex; align-items: center; gap: 8px; cursor: pointer; font-family: var(--labels); font-size: 14px; }

/* Verdict: posterheld */
.verdict { border: 0; background: transparent; padding: 0 0 6px; border-bottom: 1px solid var(--line); }
.kp-label {
  font-family: var(--labels); font-size: 11px; font-weight: 600;
  letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink-2); margin: 0 0 2px;
}
.kp-voorloop { font-family: var(--display); font-style: italic; font-weight: 500; font-size: clamp(20px, 2.6vw, 30px); color: var(--dim); margin: 0; }
.kp {
  font-family: var(--display); font-weight: 700;
  font-size: clamp(44px, 7vw, 96px); line-height: 1.02; letter-spacing: -0.02em;
  margin: 0 0 10px; color: var(--pivot);
}
.kp.none { color: var(--box3); font-size: clamp(26px, 3.4vw, 44px); }
.kp-sub { font-size: 16px; font-style: italic; color: var(--dim); margin: 0 0 20px; max-width: 60ch; }
.kp-sub b { font-style: normal; }

.scale { margin-bottom: 20px; }
.scale-wrap { position: relative; padding-top: 20px; }
.scale-track { height: 6px; position: relative; }
.scale-pivot {
  position: absolute; top: -4px; width: 2px; height: 14px;
  background: var(--pivot); transform: translateX(-1px);
}
.scale-you {
  position: absolute; top: 0; transform: translateX(-50%);
  font-family: var(--labels); font-size: 11px; font-weight: 600; white-space: nowrap;
}
.scale-ends {
  display: flex; justify-content: space-between;
  font-family: var(--labels); font-size: 11px; color: var(--ink-2); margin-top: 6px;
}

/* Drie krantstatregels */
.three { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; margin-bottom: 8px; }
@media (max-width: 700px) { .three { grid-template-columns: minmax(0, 1fr); } }
.tile { border-top: 2px solid var(--ink); padding: 10px 2px 6px; }
.tile.dim { opacity: 0.55; }
.tile.win-b3 { background: var(--box3-bg); }
.tile.win-bv { background: var(--bv-bg); }
.tile-h { font-family: var(--labels); font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-2); margin: 0 0 6px; line-height: 1.35; }
.tile-n { font-family: var(--display); font-weight: 700; font-size: 24px; margin: 0; }
.tile-s { font-family: var(--labels); font-size: 11px; color: var(--ink-2); margin: 4px 0 0; }

details { border: 1px solid var(--line); border-radius: 0; background: var(--card); margin-bottom: 18px; }
summary {
  cursor: pointer; padding: 14px 20px; font-family: var(--labels);
  font-weight: 600; font-size: 12px; letter-spacing: 0.18em;
  text-transform: uppercase; color: var(--ink-2); list-style: none;
}
summary::-webkit-details-marker { display: none; }
.details-body, .fold-body { padding: 0 20px 18px; }
.details-body ul { margin: 0; padding-left: 18px; }
.details-body li { margin-bottom: 10px; font-size: 14.5px; color: var(--dim); }
.details-body li b { color: var(--ink); }
.disclaimer { font-size: 13px; color: var(--ink-2); font-style: italic; margin: 14px 0 0; }

.mini { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 8px 18px; margin: 14px 0; font-size: 14px; }
.mini.solo { grid-template-columns: minmax(0, 1fr) auto; }
.mini.solo .mini-r > *:nth-child(3) { display: none; }
.mini-r { display: contents; }
.mini-r > * { padding: 6px 0; }
.mini-r.kop em { font-family: var(--labels); font-size: 11px; color: var(--ink-2); font-style: normal; text-align: right; text-transform: uppercase; letter-spacing: 0.06em; }
.mini-r b { font-family: var(--display); text-align: right; white-space: nowrap; }
.mini-r.tot > * { border-top: 1px solid var(--ink); font-weight: 700; }
.waarom-zin, .bal-sum { font-size: 14.5px; color: var(--dim); margin: 0; }
.bal-sum { margin-top: 12px; }

.tw { overflow-x: auto; margin: 0 -20px; padding: 0 20px; }
table { border-collapse: collapse; font-size: 13px; white-space: nowrap; min-width: 100%; font-family: var(--display); }
th, td { padding: 6px 8px; text-align: right; border-bottom: 1px solid var(--line); }
th { font-family: var(--labels); font-weight: 600; color: var(--ink-2); font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.06em; }
th.g-b3, td.c-b3 { background: var(--box3-bg); }
th.g-bv, td.c-bv { background: var(--bv-bg); }
td.jaar { text-align: left; color: var(--ink-2); }
td.pos { color: var(--pos); font-weight: 500; }
td.negv { color: var(--neg); font-weight: 500; }

.verdict-bar {
  font-family: var(--labels); font-weight: 600; font-size: 13px;
  letter-spacing: 0.04em; padding: 10px 12px; margin: 0 0 12px;
}
.verdict-bar.bv { background: var(--bv-bg); color: var(--bv); }
.verdict-bar.b3 { background: var(--box3-bg); color: var(--box3); }

.scroll-hint, .chart-note { font-family: var(--labels); font-size: 12px; color: var(--ink-2); margin: 10px 0 0; }
.chart-note b { color: var(--ink); }

svg { width: 100%; height: auto; display: block; }
svg text.ax { font-family: var(--labels); font-size: 11px; fill: var(--ink-2); }
svg text.axb { font-family: var(--labels); font-size: 11px; font-weight: 600; }
@media (max-width: 640px) {
  svg text.ax { font-size: 18px; }
  svg text.axb { font-size: 18px; }
}
svg line.gl { stroke: var(--line); stroke-width: 1; }
svg line.zl { stroke: var(--ink); stroke-width: 1.5; }

/* Voetnotenstrook */
.voetnoten {
  border-top: 1px solid var(--line); margin-top: 6px; padding-top: 14px;
  display: flex; gap: 26px; flex-wrap: wrap;
  font-family: var(--labels); font-size: 12.5px; color: var(--ink-2);
}

.foot { font-family: var(--labels); font-size: 11.5px; color: var(--ink-2); margin: 20px 0 0; }
```

- [ ] **Step 5: Run tests to verify they pass, full suite, commit**

Run: `npx vitest run tests/styles.test.ts` → all PASS (including both existing grid tests — the new `.grid` rule keeps `minmax(0, 1fr)` and `min-width: 0`).
Run: `npx vitest run` and `npx tsc --noEmit -p tsconfig.json` — green/clean. (Component tests query by role/label/class, not by computed style, so the CSS swap alone must not break them; if one fails, STOP and report BLOCKED rather than changing that test here.)

```bash
git add index.html src/styles.css tests/styles.test.ts
git commit -m "feat(ui): swap stylesheet to newspaper design tokens"
```

---

### Task 2: Masthead and page layout

**Files:**
- Modify: `src/App.tsx`
- Test: `tests/App.test.tsx` (append tests)

**Interfaces:**
- Consumes: `.masthead`, `.masthead-boven`, `.masthead-meta`, `.paneel-kolom`, `.inhoud-kolom`, `.voetnoten` from Task 1.
- Produces: the DOM order later tasks assume — rekenpaneel first in the DOM (`.paneel-kolom`), content column second (`.inhoud-kolom`).

- [ ] **Step 1: Write the failing tests**

`tests/App.test.tsx` is an existing jsdom test file with `afterEach(cleanup)` and a render helper for `<App />` — follow its existing pattern. Append inside its describe:

```tsx
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
```

(If the file renders `<App />` through a helper, use that helper instead of a bare `render`; keep assertions identical.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/App.test.tsx`
Expected: the two new tests FAIL (no link, no `.voetnoten`); existing tests PASS.

- [ ] **Step 3: Restructure `src/App.tsx`'s JSX**

Replace the returned JSX (keep ALL hooks, `liqHint`, and component props exactly as they are) with:

```tsx
  return (
    <div className="pagina">
      <header className="masthead">
        <div className="masthead-boven">
          <p className="eyebrow">Beleggen in de BV of privé · particulier</p>
          <p className="masthead-meta">
            Rekenmodel · peiljaar 2026 ·{" "}
            <a href="https://github.com/tim-brand/spaarbv-tool">broncode op GitHub</a>
          </p>
        </div>
        <h1>Vanaf welk vermogen wordt een BV interessant?</h1>
      </header>

      <div className="grid">
        <div className="paneel-kolom">
          <InputsPanel form={form} onChange={setForm} liqHint={liqHint} />
        </div>
        <div className="inhoud-kolom">
          <p className="lede">
            Privé betaal je in box 3 elk jaar belasting over je vermogen — vanaf 2028
            over je werkelijke rendement, inclusief koerswinst die je nog niet hebt
            verzilverd. In een BV mag die winst blijven staan tot je verkoopt. Dat
            uitstel is het hele voordeel, en het moet opwegen tegen de kosten van de
            BV, tegen het heffingsvrije bedrag dat je in box 3 opgeeft, en tegen de
            box 2-heffing bij het uitkeren. Vul je eigen cijfers in en je ziet waar de
            balans omslaat.
          </p>
          <Verdict inputs={inputs} stelsel={form.stelsel} bands={bands} />
          <WhyFold inputs={inputs} stelsel={form.stelsel} bands={bands} />
          <BreakevenChart inputs={inputs} stelsel={form.stelsel} bands={bands} />
          <YearTable inputs={inputs} stelsel={form.stelsel} />
          <TimeChart inputs={inputs} stelsel={form.stelsel} />
          <Assumptions inleg={inputs.inleg} />
          <div className="voetnoten">
            <span>① Geen advies — een rekenmodel met jouw aannames.</span>
            <span>② Alle aannames en broncode staan open.</span>
            <span>③ Wetgeving 2028 is nog een wetsvoorstel.</span>
          </div>
          <p className="foot">Rekenmodel · indicatief · peiljaar 2026</p>
        </div>
      </div>
    </div>
  );
```

The lede text is the existing copy moved verbatim — do not rewrite it.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/App.test.tsx` — PASS.

- [ ] **Step 5: Full suite, typecheck, commit**

Run: `npx vitest run && npx tsc --noEmit -p tsconfig.json` — green/clean.

```bash
git add src/App.tsx tests/App.test.tsx
git commit -m "feat(ui): add masthead and sticky panel layout"
```

---

### Task 3: Rekenpaneel with steppers

**Files:**
- Modify: `src/components/Inputs.tsx`
- Test: `tests/components/Inputs.test.tsx` (append tests)

**Interfaces:**
- Consumes: `.paneel`, `.veld-kop`, `.stap`, `.stap-rij`, `.stap-waarde` from Task 1; existing `FormState`, `set`, `parseNum`, `MAX_BEDRAG`.
- Produces: stepper buttons with aria-labels `"<Veldnaam> verlagen"` / `"<Veldnaam> verhogen"` for the five slider fields (Vermogen nu, Horizon, Rendement per jaar, Uitkeren aan het eind, Inleggen gedurende).

- [ ] **Step 1: Write the failing tests**

Append inside the existing `describe("Inputs", ...)`:

```tsx
  it("verhoogt het vermogen met één sliderstap via de plusknop", () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Vermogen nu verhogen" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ V: 205_000 }));
  });

  it("verlaagt de horizon met één jaar via de minknop", () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Horizon verlagen" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ T: 19 }));
  });

  it("klemt de stepper op het slidermaximum", () => {
    const { onChange } = setup({ V: 2_000_000 });
    const plus = screen.getByRole("button", { name: "Vermogen nu verhogen" });
    if (!(plus instanceof HTMLButtonElement)) throw new Error("geen button");
    expect(plus.disabled).toBe(true);
    fireEvent.click(plus);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("stept het rendement met een tiende procent", () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Rendement per jaar verhogen" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ rendPct: 7.1 }));
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/components/Inputs.test.tsx`
Expected: the four new tests FAIL (no such buttons); existing tests PASS.

- [ ] **Step 3: Implement the stepper field pattern**

In `src/components/Inputs.tsx`, add below the `netjes` helper (inside the component, above the `return`):

```tsx
  const klem = (n: number, min: number, max: number): number =>
    Math.min(Math.max(n, min), max);

  /** Eén sliderveld in het krantpatroon: capskop, − waarde +, slider. */
  const stapVeld = (opts: {
    id: string;
    naam: string;
    waarde: number;
    toon: string;
    min: number;
    max: number;
    step: number;
    zet: (n: number) => void;
    hint: string;
  }) => {
    const { id, naam, waarde, toon, min, max, step, zet, hint } = opts;
    // Afronden op de stapgrootte voorkomt zwevendekomma-resten. Let op:
    // `Math.round(n / step) * step` alleen is niet genoeg (71 * 0.1 geeft
    // 7.100000000000001), vandaar de toFixed-pas erachteraan.
    const rond = (n: number): number =>
      Number((Math.round(n / step) * step).toFixed(4));
    return (
      <div className="field">
        <label className="veld-kop" htmlFor={id}>{naam}</label>
        <div className="stap-rij">
          <button
            type="button" className="stap" disabled={waarde <= min}
            aria-label={`${naam} verlagen`}
            onClick={() => zet(rond(klem(waarde - step, min, max)))}
          >
            −
          </button>
          <span className="stap-waarde">{toon}</span>
          <button
            type="button" className="stap" disabled={waarde >= max}
            aria-label={`${naam} verhogen`}
            onClick={() => zet(rond(klem(waarde + step, min, max)))}
          >
            +
          </button>
        </div>
        <input
          type="range" id={id} min={min} max={max} step={step} value={waarde}
          onChange={(e) => zet(Number(e.target.value))}
        />
        <p className="hint">{hint}</p>
      </div>
    );
  };
```

Then rebuild the JSX using this pattern, keeping card order, ids, hint texts, and all handlers:

- On all four `<div className="card">` blocks in this component, replace `className="card"` with `className="paneel"` (the double-frame paneel style replaces the card style inside the rekenpaneel).
- First paneel (`Jouw vermogen`): keep the soort segmented control exactly as-is, but change its `<label id="soort-label">` to `<label id="soort-label" className="veld-kop">`. Replace the `k-verm` field with `stapVeld({ id: "k-verm", naam: "Vermogen nu", waarde: form.V, toon: eur(form.V), min: 25_000, max: 2_000_000, step: 5_000, zet: (n) => set("V", n), hint: "Wat je nu in box 3 hebt staan." })`. Keep the `Maandelijkse inleg` text field, giving its label `className="veld-kop"`. Replace the conditional `k-inlegjaren` field with `{inleg > 0 && stapVeld({ id: "k-inlegjaren", naam: "Inleggen gedurende", waarde: inlegJarenTonen, toon: `${inlegJarenTonen} van de ${form.T} jaar`, min: 1, max: form.T, step: 1, zet: (n) => set("inlegJaren", n), hint: "Daarna stoppen de stortingen en groeit het vermogen alleen nog door rendement." })}`. Replace the `k-jaar` field with `stapVeld({ id: "k-jaar", naam: "Horizon", waarde: form.T, toon: `${form.T} jaar`, min: 5, max: 40, step: 1, zet: (n) => set("T", n), hint: "Hoeveel jaar tot je het geld nodig hebt." })`. Keep the partner toggle as-is.
- Second paneel (`Het rendement`): replace the `k-rend` field with `stapVeld({ id: "k-rend", naam: "Rendement per jaar", waarde: form.rendPct, toon: pct(form.rendPct), min: 0.5, max: 12, step: 0.1, zet: (n) => set("rendPct", n), hint: REND_HINT[form.soort] })`.
- Third paneel (`De BV`): kosten and oprichting text fields keep their structure, labels get `className="veld-kop"`. Replace the `k-liq` field with `stapVeld({ id: "k-liq", naam: "Uitkeren aan het eind", waarde: form.liqJaren, toon: form.liqJaren === 1 ? "in 1 keer" : `in ${form.liqJaren} jaar`, min: 1, max: 10, step: 1, zet: (n) => set("liqJaren", n), hint: liqHint })`.
- Fourth paneel (stelsel): unchanged apart from `className="paneel"` and the title keeping `card-title`.

Note the removed `.val` spans: the stepper value replaces them. The existing tests that assert visible values ("20 jaar", "€ 200.000"-ish, "20 van de 20 jaar") must still pass because the same strings now render in `.stap-waarde`. The old `k-inlegjaren` slider-value test asserts `slider.value === "10"` after a change event — unchanged behavior.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/components/Inputs.test.tsx` — ALL pass (old + new). If an old test fails on a changed accessible name, fix the markup, not the test — ids and label texts are contractual.

- [ ] **Step 5: Full suite, typecheck, commit**

Run: `npx vitest run && npx tsc --noEmit -p tsconfig.json`.

```bash
git add src/components/Inputs.tsx tests/components/Inputs.test.tsx
git commit -m "feat(ui): restyle rekenpaneel with stepper controls"
```

---

### Task 4: Verdict poster hero

**Files:**
- Modify: `src/components/Verdict.tsx`
- Test: `tests/components/Verdict.test.tsx` (append one test)

**Interfaces:**
- Consumes: `.kp-voorloop`, restyled `.kp`/`.kp-label`/`.tile` from Task 1.
- Produces: nothing new for later tasks.

- [ ] **Step 1: Write the failing test**

Append inside `describe("Verdict", ...)`:

```tsx
  it("zet het kantelpuntbedrag alleen op de posterregel", () => {
    paneel();
    const held = document.querySelector(".kp");
    expect(held?.textContent).toContain("490.469");
    expect(held?.textContent).not.toContain("vanaf");
    expect(document.querySelector(".kp-voorloop")?.textContent).toContain(
      "Een BV loont",
    );
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/Verdict.test.tsx`
Expected: the new test FAILS (`.kp` currently contains "vanaf € 490.469" and `.kp-voorloop` does not exist).

- [ ] **Step 3: Implement**

In `src/components/Verdict.tsx`, replace the two elements

```tsx
      <p className="kp-label">...</p>
      <p className={onder === null ? "kp none" : "kp"}>...</p>
```

with:

```tsx
      <p className="kp-label">Uitkomst bij jouw cijfers</p>
      <p className="kp-voorloop">
        {onder === null
          ? "In dit scenario loont een BV"
          : `Een BV loont ${stelsel === "2028" ? "(nieuw stelsel)" : "(huidig stelsel)"} vanaf`}
      </p>
      <p className={onder === null ? "kp none" : "kp"}>
        {onder === null ? "bij geen enkel vermogen" : eur(onder)}
      </p>
```

Everything below (kp-sub, scale, three tiles) stays untouched — the tiles' newspaper look comes from Task 1's CSS.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/components/Verdict.test.tsx` — ALL pass. (The existing kantelpunt test matches "490.469" via the leaf matcher; it now lives alone in `.kp`, still a match.)

- [ ] **Step 5: Full suite, typecheck, commit**

```bash
git add src/components/Verdict.tsx tests/components/Verdict.test.tsx
git commit -m "feat(ui): make verdict a poster headline"
```

---

### Task 5: Shared chart palette + BreakevenChart

**Files:**
- Create: `src/components/chart/kleuren.ts`
- Modify: `src/components/chart/Label.tsx` (plate fill)
- Modify: `src/components/BreakevenChart.tsx`
- Test: Create `tests/components/chart/kleuren.test.ts`; update `tests/components/BreakevenChart.test.tsx` only if it pins old hex values.

**Interfaces:**
- Produces: `KLEUR` const object from `src/components/chart/kleuren.ts` — keys: `bv`, `bvTekst`, `box3`, `box3Zacht`, `box3Lijn2`, `vlakBv`, `vlakBox3`, `pivotLijn`, `pivotTekst`, `mut`, `ink`, `plaat` (exact values below). Task 6 imports the same object.

- [ ] **Step 1: Write the failing test**

Create `tests/components/chart/kleuren.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { KLEUR } from "../../../src/components/chart/kleuren";

describe("grafiekpalet", () => {
  it("volgt de kranttokens", () => {
    expect(KLEUR.bv).toBe("#27506b");
    expect(KLEUR.box3).toBe("#39586e");
    expect(KLEUR.pivotLijn).toBe("#a49a88");
    expect(KLEUR.plaat).toBe("#fffdf8");
  });

  it("bevat geen oude palettkleuren", () => {
    const alles = Object.values(KLEUR).join(" ");
    expect(alles).not.toContain("#b8860b");
    expect(alles).not.toContain("#2f6f8f");
    expect(alles).not.toContain("#6f3ea8");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/chart/kleuren.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the palette and swap BreakevenChart + Label**

Create `src/components/chart/kleuren.ts`:

```ts
/** Grafiekpalet van het krantontwerp. SVG-attributen kunnen geen CSS-
 *  variabelen lezen op de plekken waar wij ze zetten, dus dit is de ene
 *  plaats waar de grafiekkleuren wonen. Spiegel wijzigingen aan de tokens
 *  in styles.css. */
export const KLEUR = {
  /** Hoofdlijn: netto via de BV. */
  bv: "#27506b",
  /** Tekstlabels bij de BV-lijn (donkerder voor contrast op papier). */
  bvTekst: "#1e3d52",
  /** Privé/box 3-lijn. */
  box3: "#39586e",
  /** Box 3-tekstlabels naast de lijn. */
  box3Zacht: "rgba(57,88,110,.85)",
  /** De niet-gekozen stelsel-lijn (gestippeld). */
  box3Lijn2: "rgba(57,88,110,.45)",
  /** Vlak onder de BV-lijn. */
  vlakBv: "rgba(39,80,107,.10)",
  /** Vlak onder de box 3-lijn. */
  vlakBox3: "rgba(57,88,110,.10)",
  /** Gestippelde kantelpunt-hulplijn. */
  pivotLijn: "#a49a88",
  /** Kantelpuntlabels. */
  pivotTekst: "#6e675c",
  /** Asteksten in SVG-attributen. */
  mut: "#6e675c",
  /** De jij-stip. */
  ink: "#191613",
  /** Achtergrondplaatje onder labels. */
  plaat: "#fffdf8",
} as const;
```

In `src/components/chart/Label.tsx`: import `KLEUR` and change the plate `fill="#ffffff"` to `fill={KLEUR.plaat}`.

In `src/components/BreakevenChart.tsx`: import `KLEUR` and replace every hardcoded color 1-op-1:
- `rgba(184,134,11,.16)` → `KLEUR.vlakBv`; `rgba(47,111,143,.13)` → `KLEUR.vlakBox3`
- `#b8860b` → `KLEUR.bv`; `rgba(47,111,143,.45)` → `KLEUR.box3Lijn2`
- `#8a6708` → `KLEUR.bvTekst`; `rgba(47,111,143,.85)` → `KLEUR.box3Zacht`
- `#6f3ea8` → `KLEUR.pivotLijn` on `stroke=` attributes, `KLEUR.pivotTekst` on `color=`/text props
- `#5b6470` → `KLEUR.mut`; `#161a20` → `KLEUR.ink`

After the swap, `grep -n "#[0-9a-f]\{6\}" src/components/BreakevenChart.tsx` must return nothing.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/components/chart/kleuren.test.ts tests/components/BreakevenChart.test.tsx`
If a BreakevenChart test pins an old hex value, update that expectation to the corresponding `KLEUR` value and note it in the report; assertions about geometry, labels, and behavior stay untouched.

- [ ] **Step 5: Full suite, typecheck, commit**

```bash
git add src/components/chart/kleuren.ts src/components/chart/Label.tsx src/components/BreakevenChart.tsx tests/components/chart/kleuren.test.ts
git commit -m "feat(ui): move charts to shared newspaper palette"
```

(Also `git add tests/components/BreakevenChart.test.tsx` if it changed.)

---

### Task 6: TimeChart on the shared palette

**Files:**
- Modify: `src/components/TimeChart.tsx`
- Test: `tests/components/TimeChart.test.tsx` (update only pinned hex values, if any)

**Interfaces:**
- Consumes: `KLEUR` from Task 5 (same keys).

- [ ] **Step 1: Establish the failing check**

Run: `grep -n "#[0-9a-f]\{6\}\|rgba(" src/components/TimeChart.tsx`
Expected: several hits (`#b8860b`, `#2f6f8f`, `#6f3ea8`, `#8a6708`, `#5b6470`, `rgba(184,134,11,.16)`, `rgba(47,111,143,.13)`) — this list is the work.

- [ ] **Step 2: Implement**

Import `KLEUR` and apply the same 1-op-1 mapping as Task 5:
- `rgba(184,134,11,.16)` → `KLEUR.vlakBv`; `rgba(47,111,143,.13)` → `KLEUR.vlakBox3`
- `#b8860b` → `KLEUR.bv`; `#8a6708` → `KLEUR.bvTekst`; `#2f6f8f` → `KLEUR.box3`
- `#6f3ea8` → `KLEUR.pivotLijn` on strokes, `KLEUR.pivotTekst` on Label colors
- `#5b6470` → `KLEUR.mut`

After the swap the same grep must return nothing.

- [ ] **Step 3: Run tests**

Run: `npx vitest run tests/components/TimeChart.test.tsx` — update only expectations that pin old hex values (note them in the report); everything else untouched.

- [ ] **Step 4: Full suite, typecheck, commit**

```bash
git add src/components/TimeChart.tsx
git commit -m "feat(ui): apply newspaper palette to time chart"
```

(Also add the test file if it changed.)

---

### Task 7: Visual verification pass

**Files:**
- Modify: only files needed for fixes found in this task (report each).

- [ ] **Step 1: Build and serve**

Run: `npx tsc --noEmit -p tsconfig.json && npm run build && npm run preview -- --port 4173 &` (or `npm run dev`).

- [ ] **Step 2: Inspect at three widths**

Screenshot or inspect at 1440, 1000, and 390 px wide. Checklist:
- Masthead double rule spans the page; headline never overlaps the meta line.
- Rekenpaneel right + sticky at 1440; first-in-column at 390; no horizontal page scroll at 390 (grid regression).
- Stepper buttons are 44×44, values legible, sliders aligned.
- Poster verdict: giant number fits at all widths (clamp), "geen kantelpunt" variant still sensible (set rendement to 0,5% with spaargeld to check).
- Charts: lines distinguishable (solid BV vs dashed alternative), label plates readable on paper background, kantelpunt guide visible but subordinate.
- Table tints visible but subtle; verdict-bar readable in both b3/bv states.

- [ ] **Step 3: Fix what the checklist catches**

Apply minimal fixes (CSS preferred). Each fix: name the symptom and the change in the task report. If a fix touches a component, re-run that component's tests.

- [ ] **Step 4: Full suite, typecheck, commit**

Run: `npx vitest run && npx tsc --noEmit -p tsconfig.json`.

```bash
git add <only the files you changed>
git commit -m "fix(ui): polish newspaper layout after visual pass"
```

(Skip the commit if the pass found nothing — then state that in the report.)
