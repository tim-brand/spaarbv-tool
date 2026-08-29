# Spaar-BV tool — design

Replicatie van de rekentool "Vanaf welk vermogen wordt een BV interessant?"
(https://independentwealth.nl/weggevers/spaarbv-56874/) als eigen project.

## Doel

Een interactieve tool die voor een particulier uitrekent of het lonend is om
vermogen via een BV te beleggen in plaats van privé in box 3. De gebruiker
voert vermogen, horizon, rendement en BV-kosten in; de tool toont het
kantelpunt (vanaf welk vermogen de BV wint), de netto eindvermogens van beide
routes, een jaar-voor-jaar tabel en twee grafieken.

Het enige echte BV-voordeel dat het model modelleert is **belastinguitstel**:
koerswinst in de BV wordt pas belast bij verkoop, terwijl box 3 elk jaar heft.
Dat uitstel moet opwegen tegen de vaste kosten van de BV, het gemiste
heffingsvrije bedrag in box 3, en de box 2-heffing bij uitkeren.

## Scope

**Wel:** volledige functionele replicatie van het rekenmodel, de invoervelden,
de uitkomsten, de tabel en beide grafieken.

**Niet:** het auteursblok rechtsboven (foto, naam, rol) — expliciet uitgesloten
door de opdrachtgever.

**Fideliteit:** de visuele taal (kleurenpalet, typografie, kaartenraster,
grafiekstijl) wordt overgenomen; alle Nederlandse kopteksten, hints en de
aannameslijst worden opnieuw geschreven. Het rekenmodel is rekenkunde over
publieke belastingregels en wordt functioneel identiek geïmplementeerd.

## Stack

React + TypeScript + Vite. Vitest voor de tests. Geen chart-library — de
grafieken zijn maatwerk-SVG (zie *Grafieken*). Geen CSS-framework; plain CSS
met custom properties, zoals het origineel.

## Architectuur

Twee lagen met een harde grens: een puur rekenmodel zonder DOM- of
React-afhankelijkheden, en een presentatielaag die dat model aanroept.

```
src/
  model/
    params.ts      belastingparameters (peiljaar 2026)
    types.ts       Inputs, Box3Year, BvYear, Bands, Decomposition
    box3.ts        simulateBox3()
    bv.ts          simulateBV(), netIfLiquidatedNow()
    compare.ts     delta(), breakevenBands(), decompose()
    format.ts      nl-NL formatters + parseNum()
  components/
    Inputs.tsx        sliders, segmented toggles, valutavelden
    Verdict.tsx       kantelpunt-kop, schaalbalk, drie tegels
    WhyFold.tsx       inklapbare uitsplitsing "waarom kantelt het daar"
    BreakevenChart.tsx  grafiek 1
    YearTable.tsx     jaar-voor-jaar tabel
    TimeChart.tsx     grafiek 2
    Assumptions.tsx   inklapbare aannames + disclaimer
  hooks/
    useIsNarrow.ts  vervangt de resize-listener van het origineel
  App.tsx
  styles.css
```

`App.tsx` houdt de invoerstaat vast en leidt alles af; componenten zijn puur op
props. Er is geen globale state en geen state-management-library nodig.

### Modelgrens

Het model kent React niet. Elke functie is puur: gelijke input geeft gelijke
output, geen gedeelde mutabele state. Dat maakt het model los testbaar en is
de reden dat de golden-value tests (zie *Verificatie*) betekenis hebben.

## Rekenmodel

### Belastingparameters (peiljaar 2026)

| Parameter | Waarde |
|---|---|
| Vpb laag / hoog / grens | 19% / 25,8% / €200.000 winst |
| Box 2 laag / hoog / grens | 24,5% / 31% / €68.843 p.p. |
| Box 3 tarief (beide stelsels) | 36% |
| Huidig stelsel: forfait beleggingen | 6,00% |
| Huidig stelsel: forfait banktegoeden | 1,28% |
| Huidig stelsel: heffingsvrij vermogen | €59.357 p.p. |
| Nieuw stelsel: heffingsvrij resultaat | €1.800 p.p. per jaar |

Met een fiscale partner verdubbelen het heffingsvrij vermogen, het heffingsvrij
resultaat en de box 2-schijfgrens. De Vpb-schijfgrens verdubbelt niet.

Tarieven en schijven blijven constant over de projectie; er wordt niet
geïndexeerd, ook niet voor inflatie.

### Box 3

Per jaar, startend met vermogen `A`:

- resultaat `res = A × r`, herbelegd, dus `A ← A + res`
- **nieuw stelsel (2028):** heffing over `res` boven het heffingsvrij resultaat.
  Negatief resultaat wordt niet belast maar opgeteld bij een verliespot; een
  positief resultaat wordt eerst met die pot verrekend (voorwaartse
  verliesverrekening) voordat het heffingsvrij resultaat wordt afgetrokken.
- **huidig stelsel (2026):** heffing over `(A_begin − heffingsvrij vermogen) ×
  forfait × 36%`. Dus ook belasting in verliesjaren, en niets extra's in jaren
  boven het forfait.
- de heffing wordt uit het vermogen zelf betaald: `A ← A − heffing`

### BV

Drie grootheden lopen naast elkaar: marktwaarde `A`, boekwaarde `C`
(kostprijs) en verkrijgingsprijs `VK` (de oorspronkelijke inleg als
kapitaalstorting/agio).

Per jaar:

- dividend/rente `div = A × d`, koersgroei brengt `A ← A × (1 + g)`;
  de boekwaarde `C` blijft ongemoeid — hier zit het uitstel
- kosten: jaarlijkse kosten, in jaar 1 plus de oprichtingskosten
- fiscale winst `= div + gerealiseerd − kosten`; verlies gaat naar de
  verliespot, winst wordt eerst daarmee verrekend en dan tegen Vpb belast
- kassaldo `= div − kosten − Vpb`. Is dat negatief, dan wordt er verkocht om
  bij te passen; de daarbij gerealiseerde winst schuift door naar het volgende
  boekjaar (`pending`) en de boekwaarde daalt pro rata.

**Waardering: kostprijs of lagere marktwaarde.** Ongerealiseerde koerswinst
valt niet in de heffing. Dit is vast in het model — het origineel had een
`waardering`-schakelaar met een `"actueel"`-tak en een `turnover`-parameter,
maar beide stonden hard op respectievelijk `"kostprijs"` en `0`. Die dode
takken worden niet overgenomen (YAGNI).

### Liquidatie

Voor elk jaar wordt berekend wat je netto privé overhoudt als je de BV op dat
moment zou liquideren en over `N` jaar zou uitkeren. De stille reserve
`(A − C) + pending` wordt over `N` jaar verdeeld, per tranche tegen Vpb belast
(dus de lage schijf `N` keer benut), en het resterende kassaldo boven de
verkrijgingsprijs wordt in `N` tranches box 2-belast (idem voor de lage
box 2-schijf). Tijdens de afwikkeling wordt geen rendement meer gerekend.

Dit is de kolom "Netto verm. privé" bij de BV, en de basis van alle
vergelijkingen: beide routes eindigen met volledig afgerekend geld op de
bankrekening.

### Kantelpunt

`delta(V) = netto BV(V) − netto box 3(V)`.

Het kantelpunt is niet per se één grens: bij hoge vermogens kan de BV weer
verliezen doordat de lage Vpb- en box 2-schijven wegvallen. `breakevenBands()`
scant daarom logaritmisch tussen €25.000 en €5.000.000, detecteert elke
tekenwissel en verfijnt die met bisectie in log-ruimte. Het resultaat is een
lijst intervallen waarin de BV wint — meestal één, met een ondergrens en soms
ook een bovengrens.

### Uitsplitsing ("waarom kantelt het daar")

Het verschil wordt in drie stukken getrokken die exact optellen tot `delta`:

1. **uitstel** — `delta` zonder kosten én zonder heffingsvrij bedrag. Dit
   schaalt mee met het vermogen.
2. **gemist heffingsvrij bedrag** — wat box 3 wel heeft en de BV niet. Vast.
3. **kosten** — wat de BV per jaar kost. Vast.

Omdat (1) meeschaalt en (2)+(3) vast zijn, is er een vermogen waar ze elkaar
opheffen: dat is het kantelpunt.

**Afwijking van het origineel:** het origineel berekent dit door zijn globale
parameter-object te muteren (`P.hvv = 0`, rekenen, terugzetten). Hier worden de
parameters expliciet als argument doorgegeven aan de simulatiefuncties, zodat
er geen gedeelde mutabele state is. De uitkomsten zijn identiek; de
implementatie is veilig onder React StrictMode en herhaalde renders.

## Invoer

| Veld | Type | Bereik / stap | Default |
|---|---|---|---|
| Soort vermogen | segmented | beleggingen / spaargeld | beleggingen |
| Vermogen nu | slider | €25.000–€2.000.000, stap €5.000 | €200.000 |
| Horizon | slider | 5–40 jaar, stap 1 | 20 |
| Fiscale partner | checkbox | — | uit |
| Rendement per jaar | slider | 0,5–12%, stap 0,1 | 7% (2% bij spaargeld) |
| Kosten per jaar | tekst, valuta | 0–€50.000 | €1.200 |
| Oprichting eenmalig | tekst, valuta | 0–€50.000 | €600 |
| Uitkeren aan het eind | slider | 1–10 jaar, stap 1 | 1 |
| Box 3-stelsel | segmented | nieuw 2028 / huidig 2026 | nieuw 2028 |

Bij spaargeld is het rendement direct rendement (`d = r`, `g = 0`): rente wordt
elk jaar belast, ook in de BV, dus er valt niets uit te stellen. Bij
beleggingen is het volledig koersgroei (`d = 0`, `g = r`), passend bij een
herbeleggende ETF.

Wisselen van soort zet het rendement terug op de bijbehorende default en
verandert de hint-teksten.

De valutavelden accepteren `1.200`, `1200` en `€ 1.200,50` en schrijven bij
verlies van focus netjes geformatteerd terug in nl-NL-notatie.

## Uitvoer

- **Kantelpunt-kop**: "Een BV loont vanaf €X", of "bij geen enkel vermogen".
- **Schaalbalk**: logaritmische balk van €25k tot €5M, blauw waar box 3 wint en
  goud waar de BV wint, met een markering op het kantelpunt en een "jij"-label
  op het ingevoerde vermogen.
- **Drie tegels**: netto eindvermogen privé onder het huidige stelsel, privé
  onder het nieuwe stelsel, en via de BV. Het gekozen stelsel is de actieve
  vergelijking; het andere staat gedimd "ter vergelijking" naast.
- **Uitsplitsing** (inklapbaar): de drie posten hierboven, in twee kolommen —
  bij jouw vermogen en op het kantelpunt.
- **Grafiek 1** — kantelpunt: `delta` afgezet tegen startvermogen.
- **Tabel** — jaar voor jaar, 12 kolommen.
- **Grafiek 2** — het verschil per jaar over de horizon.
- **Aannames** (inklapbaar) + disclaimer.

### Tabel

Kolommen: Jaar | *Privé:* begin jaar, rendement, box 3-heffing, netto vermogen
| *BV:* begin jaar, rendement, kosten, Vpb betaald, latente Vpb + AB, netto
vermogen privé | Verschil.

De kop van de heffingskolom wisselt mee met het stelsel ("Box 3 (forfaitair)"
vs. "Box 3 (werkelijk)"). De tabel scrolt horizontaal op smalle schermen. Een
conclusiebalk boven de tabel vat het eindverschil samen.

## Grafieken

Beide met de hand getekend als SVG in React — geen library. De grafieken zijn
maatwerk: logaritmische x-as, gevulde vlakken boven en onder de nullijn,
geannoteerde verticale kantelpuntlijnen, en labels met een witte achtergrond
zodat ze leesbaar blijven over de lijnen heen. Een library zou hier meer werk
zijn, niet minder.

**Grafiek 1 — kantelpunt.** x: startvermogen (log, €25k–max). y: `delta`. De
gekozen vergelijking is een dikke gouden lijn; het andere box 3-stelsel een
gestippelde blauwe. Vlak boven de nullijn goud, eronder blauw. Verticale
stippellijn op het kantelpunt (en op de bovengrens, als die er is), plus een
zwarte stip op het ingevoerde vermogen.

**Grafiek 2 — tijd.** x: jaren, 0 tot horizon. y: het verschil in dat jaar. De
BV begint met een achterstand (kosten lopen, uitstel moet nog opbouwen); de
grafiek markeert het diepste dal en het omslagjaar waarin de BV box 3 inhaalt.

Beide hebben een onderschrift dat in gewone taal uitlegt wat er te zien is, en
dat meebeweegt met de uitkomst (bijv. "er is geen omslagjaar binnen deze
horizon").

**Responsief:** onder 640px krijgen de SVG's grotere letters, andere marges en
minder tickmarks. Dat gaat via `useIsNarrow()`, een hook op
`matchMedia("(max-width: 640px)")` — schoner dan de resize-listener met
debounce en iOS-scroll-workaround uit het origineel.

## Verificatie

**Golden values.** De rekenfuncties van het origineel worden geëxtraheerd en
onder Node uitgevoerd om een fixture met referentiewaarden te genereren over
een raster van invoercombinaties (beide stelsels, beide soorten vermogen, met
en zonder partner, verschillende horizons en liquidatieperiodes). De TS-tests
asserteren dat het model die waarden reproduceert. Daarmee is "klopt de
replicatie" een test die slaagt of faalt, geen inschatting.

De fixture wordt gecommit; het extractiescript ook, zodat de herkomst
controleerbaar is.

**Unit-tests** daarnaast op de scherpe randen:

- Vpb- en box 2-schijfovergangen precies op de grens
- voorwaartse verliesverrekening in beide stelsels
- verdubbeling bij fiscale partner (en dat de Vpb-grens níet verdubbelt)
- spaargeld vs. beleggingen (uitstel verdwijnt bij spaargeld)
- `breakevenBands()` bij een scenario zonder kantelpunt, met één kantelpunt, en
  met een boven- én ondergrens
- `parseNum()` op de verschillende notaties
- dat `decompose()` exact optelt tot `delta()`

## Codeconventies

- Geen `!` non-null assertions; null-checks, optional chaining of narrowing.
- Geen `any`; `unknown` met narrowing waar een type echt onbekend is.
- Geen type-assertions waar inferentie of narrowing volstaat.

## Aannames en uitsluitingen (in de tool zelf getoond)

Beide routes starten met hetzelfde bedrag en eindigen met volledig afgerekend
vermogen. Belastingen en kosten worden uit het vermogen zelf betaald.

Niet meegenomen: gebruikelijk loon, buitenlandse bronbelasting op dividend, de
regeling excessief lenen, schenk- en erfbelasting, overdrachtsbelasting, en het
effect van tussentijds dividend dat privé weer wordt belegd.

Het box 3-stelsel per 2028 is een wetsvoorstel; bedragen kunnen nog wijzigen.
De tool is een rekenmodel, geen advies.
