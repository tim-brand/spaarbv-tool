# Voorpagina-restyling — Design

**Datum:** 2026-08-30
**Status:** goedgekeurd ontwerp ("Versie B2 · Voorpagina" van het ontwerpcanvas)
**Referentie:** docs/superpowers/specs/assets/2026-08-30-voorpagina-mockup.html
(statisch mockup-bestand; opent in een browser, de `<x-dc>`-wrapper is inert)

## Doel

De bestaande React-app krijgt het goedgekeurde krantontwerp op posterschaal:
de tool oogt als de voorpagina van een financiële krant. Het kantelpunt is de
kop van de pagina, het rekenpaneel staat als vast zijpaneel rechts. **Alleen
de presentatie verandert** — het rekenmodel, de state en alle bestaande
gedragslogica blijven onaangeroerd; de bestaande tests blijven de waarheid
over het gedrag.

## Ontwerptaal (exacte waarden uit het mockup)

### Kleurtokens (`:root` in `src/styles.css`)

| Token | Nieuw | Was | Gebruik |
|---|---|---|---|
| `--paper` | `#faf7f0` | `#f5f6f2` | paginaachtergrond |
| `--card` | `#fffdf8` | `#ffffff` | panelen/kaarten |
| `--ink` | `#191613` | `#161a20` | tekst, lijnen, actieve knoppen |
| `--dim` | `#48423a` | (nieuw) | cursieve subtekst, lede |
| `--ink-2` | `#6e675c` | `#5b6470` | labels, hints, bijschriften |
| `--line` | `#d8d2c4` | `#dcdfd9` | dunne regels/borders |
| `--guide` | `#a49a88` | (nieuw) | gestippelde hulplijnen in grafieken |
| `--box3` | `#39586e` | `#2f6f8f` | privé/box 3-lijn en -waarden |
| `--box3-bg` | `rgba(57,88,110,.08)` | `#e4eef4` | box 3-tinten (tabel, balk, tegels) |
| `--bv` | `#27506b` | `#b8860b` | BV-lijn en -waarden; tevens accent |
| `--bv-bg` | `rgba(39,80,107,.08)` | `#f6ecd8` | BV-tinten |
| `--pivot` | `#27506b` | `#6f3ea8` | het grote kantelpuntgetal, scale-tick |
| `--pos` | `#355e46` | `#2e7d5b` | positieve verschillen |
| `--neg` | `#8c2f24` | `#b3402f` | negatieve verschillen (osseblood) |

### Typografie

- `--display: "Newsreader", Georgia, "Times New Roman", serif` — koppen,
  bedragen, tabelgetallen. Geladen via Google Fonts met `ital,opsz,wght`
  assen (400/500/700 + italic 400), ter vervanging van Space Grotesk.
- `--labels: "Archivo", "Helvetica Neue", Arial, sans-serif` — alle
  KLEINKAPITAAL-labels (eyebrow, card-titles, veldlabels, tabelkoppen,
  as-teksten, hints, voetnoten). Gewichten 500/600.
- `--body` = `--display` (de kranttekst is serif); kleine functionele tekst
  (hints, bijschriften, voetnoten) gebruikt `--labels`.
- Labelpatroon overal: 11px, weight 600, `letter-spacing: 0.12em`,
  uppercase, kleur `--ink-2`, met een `border-top: 2px solid var(--ink)`
  boven het blok waar het mockup dat toont (velden, statregels).

### Krantelementen

- **Masthead**: eyebrow-regel (`letter-spacing: 0.22em`) met rechts een
  metaregel "Peiljaar 2026 · broncode op GitHub" (link naar
  https://github.com/tim-brand/spaarbv-tool); daaronder de kop in
  `clamp(34px, 5.5vw, 76px)`, `line-height: 1.02`; afgesloten met
  `border-bottom: 3px double var(--ink)`.
- **Dubbelkaderpaneel**: het rekenpaneel krijgt
  `border: 1px solid var(--ink); outline: 1px solid var(--ink);
  outline-offset: 3px; background: var(--card);`.
- **Voetnotenstrook**: onderaan drie regels met ①②③ in `--labels` 12,5px:
  "① Geen advies — een rekenmodel met jouw aannames." /
  "② Alle aannames en broncode staan open." /
  "③ Wetgeving 2028 is nog een wetsvoorstel."

## Paginalayout (`src/App.tsx` + CSS)

- Header wordt de masthead (zie boven); de bestaande `.lede` verhuist als
  cursieve intro naar de linkerkolom, onder de grafieken zoals in het mockup
  mag ook — gekozen: direct onder de masthead in de linkerkolom, vóór het
  verdict, in `--dim` cursief 19px (leesvolgorde wint van het poster-ideaal).
- Grid: `grid-template-columns: minmax(0, 1fr) 400px; gap: 48px` vanaf
  1000px; het rekenpaneel staat RECHTS en is sticky
  (`position: sticky; top: 16px`). Daaronder één kolom, paneel bovenaan
  (DOM-volgorde: paneel eerst; desktopplaatsing via `grid-template-areas`).
- De grid-regressietest (minmax(0, 1fr) + `min-width: 0` op kinderen)
  blijft gelden.
- Volgorde linkerkolom: intro → Verdict (poster) → WhyFold →
  BreakevenChart → YearTable → TimeChart → Assumptions → voetnotenstrook →
  bestaande `.foot`.

## Componenten

### Verdict — posterheld

Bovenin: caps-label "Uitkomst bij jouw cijfers", dan cursief
"Een BV loont vanaf" (30px), dan het bedrag alleen op zijn eigen regel in
`clamp(44px, 7vw, 96px)`, weight 700, kleur `--pivot`. De bestaande
tekstlogica (geen-kantelpunt-variant, kp-sub-prozataksten, inlegzin,
stelselvergelijking, schaalbalk, drie tegels) blijft functioneel identiek;
de "geen kantelpunt"-variant houdt zijn kleinere opmaak. Tegels worden
krantstatregels: geen afgeronde borders, wel `border-top: 2px solid
var(--ink)`, transparante achtergrond; win-tinten via `--box3-bg`/`--bv-bg`
achtergrond blijven. Klassenamen (.kp, .kp-sub, .three, .tile, …) blijven.

### Rekenpaneel (Inputs) — steppers + sliders

Elk sliderveld (Vermogen, Horizon, Rendement, Uitkeren, Inlegperiode) krijgt
het mockuppatroon: caps-label met top-rule; daaronder − knop · gecentreerde
serifwaarde (26px) · + knop; daaronder de bestaande range-slider
(accent-color `--bv`). De stepperknoppen zijn echte buttons van 44×44px
(rond, 1px ink-border) die de waarde één sliderstap verlagen/verhogen,
geklemd op de slidergrenzen, met `aria-label` "<veldnaam> verlagen"/
"… verhogen". Tekstvelden (kosten, oprichting, inleg) behouden het
€-invoerpatroon, gestyled in dezelfde veldopmaak zonder steppers. De
segmentknoppen (soort, stelsel) worden rechthoekig ink-op-papier zoals het
mockup ("Nieuw · 2028"-stijl mag qua opmaak, de bestaande langere teksten
blijven). Bestaande ids, labels en gedrag blijven; steppers zijn de enige
functionele toevoeging.

### Grafieken — gedeeld palet

Nieuw `src/components/chart/kleuren.ts` exporteert het volledige
grafiekpalet; `BreakevenChart.tsx`, `TimeChart.tsx` en `chart/Label.tsx`
gebruiken uitsluitend die constanten (geen hexwaarden meer in de
componenten):

```ts
export const KLEUR = {
  bv: "#27506b",            // was #b8860b (hoofdlijn)
  bvTekst: "#1e3d52",       // was #8a6708 (labels bij de BV-lijn)
  box3: "#39586e",          // was #2f6f8f
  box3Zacht: "rgba(57,88,110,.85)",   // was rgba(47,111,143,.85)
  box3Lijn2: "rgba(57,88,110,.45)",   // was rgba(47,111,143,.45)
  vlakBv: "rgba(39,80,107,.10)",      // was rgba(184,134,11,.16)
  vlakBox3: "rgba(57,88,110,.10)",    // was rgba(47,111,143,.13)
  pivotLijn: "#a49a88",     // was #6f3ea8 (gestippelde kantelpuntlijn)
  pivotTekst: "#6e675c",    // was #6f3ea8 (kantelpuntlabels)
  mut: "#6e675c",           // was #5b6470 (asteksten)
  ink: "#191613",           // was #161a20 (jij-stip)
  plaat: "#fffdf8",         // was #ffffff (labelplaatje)
} as const;
```

De vlakken onder de lijnen bestaan al (`vlak(...)`); alleen de kleuren
wisselen. Alle labels, stippen, hulplijnen en de jij-stip volgen de mapping
hierboven 1-op-1. Astekst (`svg text.ax/.axb`) gaat naar `--labels`.

### Tabel, verdictbalk, vouwpanelen

- Tabel: koppen in `--labels`; kolomtinten uit `--box3-bg`/`--bv-bg`
  (vervangt de hardgecodeerde rgba's); pos/neg via nieuwe `--pos`/`--neg`.
- `.verdict-bar.bv` kleur wordt `var(--bv)` (was hardcoded `#8a6708`);
  achtergronden via de nieuwe bg-tokens.
- `details`/`summary` (WhyFold, Assumptions): geen afgeronde kaart maar
  krantstijl — `border: 1px solid var(--line)`, `border-radius: 0`,
  summary in `--labels` caps met top-rule-gevoel. `.mini-r b` en tegels in
  serif.
- Border-radius verdwijnt paginabreed (0 op kaarten, panelen, tabellen);
  alleen stepperknoppen en sliderknoppen blijven rond.

## Wat expliciet NIET verandert

- `src/model/**`, `src/state.ts`, alle rekengedrag en teksten van het model.
- Bestaande testbestanden blijven groen; testwijzigingen alleen waar een
  test opmaak pint die bewust verandert (dan aanpassen mét motivatie), plus
  nieuwe tests voor steppers, masthead-link, voetnotenstrook en het
  kleurenpalet.
- Copy blijft de bestaande verse Nederlandse teksten; de enige nieuwe copy
  is de metaregel, stepper-arialabels en de drie voetnoten (vers geschreven).
- Golden fixtures en referentiescripts blijven onaangeroerd.

## Mobiel

Eén kolom onder 1000px: masthead (kop `clamp` schaalt mee), rekenpaneel
bovenaan, daarna de linkerkolominhoud. Stepperknoppen blijven 44×44. De
bestaande smalle-grafiekvarianten (`useIsNarrow`, `W = smal ? 380 : 720`)
blijven zoals ze zijn.

## Globale constraints (ongewijzigd van kracht)

- TypeScript strikt: geen `!`, geen `any` (wel `unknown` + narrowing),
  geen onnodige `as X`, nooit dubbele asserties.
- Vitest zonder `globals: true` ⇒ jsdom-tests met expliciete
  `afterEach(cleanup)`.
- Conventional commits, één regel, geen verwijzing naar AI.
- De CSS-grid-regressietest (minmax(0, 1fr), `min-width: 0`) blijft slagen.
