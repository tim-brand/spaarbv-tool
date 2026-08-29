# Maandelijkse inleg — Design

**Datum:** 2026-08-29
**Status:** goedgekeurd ontwerp, wacht op implementatieplan
**Bouwt voort op:** docs/superpowers/specs/2026-08-29-spaarbv-tool-design.md

## Doel

De tool vergelijkt nu één eenmalig startvermogen privé (box 3) tegen dezelfde
som in een BV. Deze feature voegt een **maandelijkse inleg** toe — het
origineel op independentwealth.nl kan dit niet. De inleg verandert zowel de
bedragen als de samenstelling van het rendement, en op de BV-route ook de
fiscale afwikkeling (agiostortingen komen onbelast terug).

## Besluiten (met de gebruiker genomen)

1. **Scope: bedrag + stopjaar.** Eén maandbedrag, plus een veld "inleggen
   gedurende N jaar". Daarna groeit het vermogen zonder nieuwe stortingen
   door tot de horizon. Geen indexatie (YAGNI).
2. **Timing: exacte maandannuïteit.** Stortingen aan het begin van elke
   maand; elke storting rendeert `(1+r)^(maanden/12)` tot jaareinde.
3. **Grafiek: ongewijzigd.** De kantelpuntgrafiek blijft over startvermogen
   € 25.000 – € 5.000.000 scannen; de inleg staat bij elk punt vast. De
   scanvloer blijft € 25.000.

**Verworpen alternatieven.** Een wrapper die inleg bovenop de bestaande
lumpsum-simulatie superponeert is fout: belasting is niet-lineair (schijven,
vrijstellingen, verliespotten), dus som-van-simulaties ≠ simulatie-van-som.
Het hele model naar maandstappen ombouwen zou de golden fixture waardeloos
maken zonder merkbaar preciezer te zijn.

## Rekenkern

### Annuïteitshelper — nieuw bestand `src/model/inleg.ts`

```ts
/** Waarde aan jaareinde van 12 stortingen van € 1 aan het begin van elke
 *  maand, bij jaarrendement r. Bij r = 0 exact 12. */
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

/** m = maandbedrag. Levert {hoofdsom: 0, groei: 0} als m = 0. */
export function jaarInleg(m: number, r: number): JaarInleg {
  return { hoofdsom: 12 * m, groei: m * (inlegFactor(r) - 12) };
}
```

De groei wordt waar nodig gesplitst in een direct deel en een koersdeel,
naar rato `d/r` en `g/r` (met `r === 0` ⇒ groei is 0, geen splitsing nodig).
Dit volgt dezelfde d/g-splitsing als de rest van het model.

### Invoertype — `src/model/types.ts`

`Inputs` krijgt twee **verplichte** velden (geen optionals; testhelpers en
de golden-test-builder vullen `inleg: 0, inlegJaren: 0` aan — het
fixturebestand zelf blijft byte-identiek):

```ts
/** Maandelijkse inleg in euro's. 0 = geen inleg (huidig gedrag). */
inleg: number;
/** Aantal jaren (vanaf jaar 1) waarin wordt ingelegd; begrensd op T. */
inlegJaren: number;
```

`Box3Year` en `BvYear` krijgen elk een veld `inleg: number` (de gestorte
hoofdsom van dat jaar, 0 buiten de inlegperiode) voor de jaartabel.

Een jaar `i` (0-based) is een inlegjaar als `i < s.inlegJaren && s.inleg > 0`.

### Box 3 — `src/model/box3.ts`

Per inlegjaar, met `{hoofdsom, groei} = jaarInleg(s.inleg, s.r)`:

- `rend` wordt `begin * s.r + groei` — dit ís het werkelijke resultaat van
  dat jaar.
- **Nieuw stelsel (2028):** de grondslag is `rend`, dus de groei op de
  stortingen telt mee in de vermogensaanwas van het jaar zelf.
  Verliespot- en hvr-logica ongewijzigd.
- **Huidig stelsel (nu):** het forfait blijft over `begin` gaan
  (peildatum 1 januari) — stortingen van dit jaar worden pas volgend jaar
  voor het eerst belast. Dat klopt met de echte peildatumsystematiek.
- Eindstand: `vermogen = begin + rend + hoofdsom − tax`.

### BV — `src/model/bv.ts`

Elke storting is een **agiostorting**. Per inlegjaar, met de groei gesplitst
in `inlegDiv = groei × d/r` en `inlegKoers = groei × g/r`:

- `VK` wordt `let vk` en stijgt met `hoofdsom` — deze euro's komen bij
  liquidatie **onbelast** terug (verkrijgingsprijs).
- Marktwaarde: `A = begin * (1 + s.g) + hoofdsom + inlegKoers`.
- Boekwaarde: `C += hoofdsom` (aankoop tegen kostprijs; het koersdeel
  raakt de boekwaarde niet — zelfde uitstelmechaniek als bestaand).
- Direct deel: `div = begin * s.d + inlegDiv`. Het loopt daarmee vanzelf
  mee in `winst` (Vpb dat jaar) en in `saldo` (herbelegging dan wel
  gedwongen verkoop) — geen wijziging aan die logica.
- `rend` in de rij wordt `begin * s.r + groei`.
- `netIfLiquidatedNow` is ongewijzigd; hij krijgt alleen een gegroeide
  `vk` binnen.

### Vergelijking — `src/model/compare.ts`

Geen wijzigingen. `delta`, `breakevenBands` en `decompose` geven `Inputs`
door; de inleg reist vanzelf mee en staat tijdens de V-scan vast (besluit 3).
De uitstel/vast-decompositie blijft operationeel gedefinieerd (hvv-nulstelling
op een kopie) en blijft daarmee geldig.

## UI

### Formulier — `src/state.ts` en `src/components/Inputs.tsx`

`FormState` krijgt:

```ts
/** Ruwe tekst, zoals kostenText. */
inlegText: string;          // default "0"
/** null = de hele horizon; een getal = expliciet gekozen. */
inlegJaren: number | null;  // default null
```

`toInputs`:

- `inleg = clamp(parseNum(f.inlegText, 0), 0, MAX_BEDRAG)`.
- `inlegJaren = min(f.inlegJaren ?? f.T, f.T)`, geheel en ≥ 0. Zolang de
  gebruiker het veld niet aanraakt volgt de inlegperiode dus de horizon,
  ook als die later wordt aangepast.

Formulier: nieuw tekstveld **"Maandelijkse inleg"** (zelfde patroon als
kosten: ruwe tekst, parse bij rekenen). Alleen wanneer de geparste inleg > 0
verschijnt daaronder het nummerveld **"Inleggen gedurende … jaar"**
(getoonde waarde `inlegJaren ?? T`, min 1, max T).

### Jaartabel — `src/components/YearTable.tsx`

Extra kolom **"Inleg"**, alleen gerenderd wanneer `inleg > 0` (anders blijft
de tabel exact zoals nu). Waarde: het `inleg`-veld van de rij.

### Verdict, WhyFold, Assumptions

- `Verdict.tsx`: noemt naast het startvermogen de **totale inleg**
  (`12 × inleg × inlegJaren`) wanneer die > 0 is, zodat de eindbedragen te
  plaatsen zijn.
- `WhyFold.tsx`: ongewijzigd in structuur; de decompositie rekent met de
  inleg mee via `Inputs`.
- `Assumptions.tsx`: drie nieuwe aannames, alleen getoond bij inleg > 0:
  storting aan het begin van elke maand; in de BV als agiostorting
  (verhoogt de verkrijgingsprijs, komt onbelast terug); in het huidige
  box 3-stelsel tellen stortingen pas mee op de eerstvolgende peildatum.
- Alle nieuwe Nederlandse teksten worden vers geschreven (bestaande
  constraint: nooit prozateksten van het origineel overnemen — hier extra
  eenvoudig, het origineel heeft deze feature niet).

### Grafieken

`BreakevenChart.tsx` en `TimeChart.tsx` ongewijzigd: ze tekenen wat het
model teruggeeft. De tijdlijnen bevatten met inleg vanzelf de stortingen aan
beide kanten — de vergelijking blijft appels met appels.

## Tests

1. **Golden-invariantie (het belangrijkste):** `tests/fixtures/golden.json`
   blijft onaangeroerd en alle bestaande golden-tests blijven **bit-exact**
   slagen met `inleg: 0`. Dit bewijst dat de refactor het gerepliceerde
   model niet heeft verstoord. `scripts/reference-model.js` en
   `scripts/generate-golden.js` blijven ongewijzigd — het origineel kent
   deze feature niet, dus de fixture dekt alleen `inleg = 0` (bewuste,
   gedocumenteerde beperking).
2. **Annuïteit (handberekend, eerst rood):** `inlegFactor(0) === 12`;
   `inlegFactor(0.07)` tegen een met de hand uitgerekende waarde (12 termen,
   6 decimalen); `jaarInleg(0, r)` ⇒ `{0, 0}`.
3. **Box 3:** per stelsel één scenario met inleg, handberekend voor T = 2
   (klein genoeg om na te rekenen): 2028 belast de inleggroei in jaar 1,
   "nu" belast de storting pas via `begin` van jaar 2.
4. **BV:** scenario dat vastpint dat `vk` met exact de hoofdsom groeit
   (netto-verschil bij liquidatie = onbelaste teruggave), en dat bij
   `soort: "spaar"` de inlegrente in de Vpb van het jaar zelf valt.
5. **Stopjaar:** `inlegJaren < T` ⇒ rijen ná het stopjaar hebben
   `inleg === 0` en identieke groeilogica als zonder feature.
6. **Componenten (jsdom, met `afterEach(cleanup)`):** jaren-veld alleen
   zichtbaar bij inleg > 0; jaartabel-kolom alleen bij inleg > 0; Verdict
   noemt de totale inleg; Assumptions toont de drie nieuwe aannames alleen
   bij inleg > 0.
7. Alle nieuwe tests eerst rood aantonen (mutatie- of ontbreken-bewijs),
   dan groen — zelfde discipline als de rest van de suite.

## Buiten scope

- Indexatie van de inleg.
- Een tweede grafiek over de inleg-as ("vanaf welke inleg wint de BV?").
- Scanvloer naar € 0 verlagen bij inleg > 0.
- Validatie tegen het origineel (onmogelijk: feature bestaat daar niet).

## Globale constraints (ongewijzigd van kracht)

- TypeScript strikt: geen `!`, geen `any` (wel `unknown` + narrowing),
  geen onnodige `as X`, nooit dubbele asserties.
- Vitest zonder `globals: true` ⇒ elk jsdom-testbestand expliciet
  `afterEach(cleanup)`.
- Nederlandse UI-teksten vers geschreven, nooit uit het origineel.
- Conventional commits, één regel, geen verwijzing naar AI.
