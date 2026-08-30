import { useIsNarrow } from "../hooks/useIsNarrow";
import { V_MAX, V_MIN, delta } from "../model/compare";
import { kort } from "../model/format";
import type { Band, Inputs, Stelsel } from "../model/types";
import { Label, labelBreedte } from "./chart/Label";
import { yTicks } from "./chart/axis";
import { KLEUR } from "./chart/kleuren";

interface Props {
  inputs: Inputs;
  stelsel: Stelsel;
  bands: Band[];
}

const N = 70;
const X_TICKS = [25_000, 50_000, 100_000, 200_000, 500_000, 1_000_000, 2_000_000, 5_000_000];
const X_TICKS_SMAL = [25_000, 100_000, 500_000, 2_000_000];

export function BreakevenChart({ inputs, stelsel, bands }: Props) {
  const smal = useIsNarrow();
  // Op smalle schermen krimpt de viewBox mee, zodat de grotere astekst (zie
  // styles.css) ook echt groter uitpakt: bij een vaste W=720 werd de SVG op
  // een smal kaartje zo ver teruggeschaald dat de tekst juist kleiner oogde
  // dan op desktop, ondanks de hogere font-size in viewBox-eenheden.
  const W = smal ? 380 : 720;
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
  const jijTekst =
    eigenDelta >= 0
      ? `jij: ${kort(eigenDelta)} voor de BV`
      : `jij: ${kort(-eigenDelta)} voor box 3`;
  // Op smal scherm ankerpunt op basis van de geschatte breedte van het label
  // zelf: bij de smallere viewBox (zie W hierboven) klopt "190 pixels vrije
  // ruimte" niet meer. Desktop (hieronder) blijft de oude vaste drempel
  // gebruiken.
  const jijHalf = smal ? labelBreedte(jijTekst, true) / 2 : 110;
  const stipAnchor: "start" | "middle" | "end" =
    stipX + jijHalf > x1 ? "end" : stipX - jijHalf < x0 ? "start" : "middle";

  const eersteWaarde = ptsA[0]?.[1] ?? 0;

  return (
    <div className="card">
      <p className="card-title">Vanaf welk vermogen kantelt het?</p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Grafiek: het kantelpunt — het verschil in netto eindvermogen tussen de BV en box 3, afgezet tegen het startvermogen"
      >
        <path d={vlak(ptsA, true)} fill={KLEUR.vlakBv} />
        <path d={vlak(ptsA, false)} fill={KLEUR.vlakBox3} />

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
        <Label
          x={x0 + 6} y={y0 - (smal ? 11 : 7)}
          text={smal ? "↑ meer via de BV" : "↑ hier houd je meer over via de BV"}
          color={KLEUR.bvTekst} narrow={smal}
        />
        <Label
          x={x0 + 6} y={y0 + (smal ? 24 : 16)}
          text={smal ? "↓ meer in box 3" : "↓ hier houd je meer over in box 3"}
          color={KLEUR.box3Zacht} narrow={smal}
        />

        {labelTicks.map((t) => (
          <text key={t} x={X(t)} y={H - M.b + (smal ? 24 : 16)} className="ax" textAnchor="middle">
            {kort(t)}
          </text>
        ))}
        <text
          x={(x0 + x1) / 2} y={H - M.b + (smal ? 52 : 36)}
          className="axb" textAnchor="middle" fill={KLEUR.mut}
        >
          vermogen waarmee je begint
        </text>

        <path d={lijn(ptsB)} fill="none" stroke={KLEUR.box3Lijn2} strokeWidth={1.8} strokeDasharray="5 4" />
        <path d={lijn(ptsA)} fill="none" stroke={KLEUR.bv} strokeWidth={2.6} />

        {eindA !== undefined && eindB !== undefined && (
          smal ? (
            <>
              <Label x={x1} y={Y(eindA[1]) - 12} text={naam[stelsel]} color={KLEUR.bvTekst} anchor="end" narrow />
              <Label x={x1} y={Y(eindB[1]) - 12} text={naam[ander]} color={KLEUR.box3Zacht} anchor="end" narrow />
            </>
          ) : (
            <>
              <text x={x1 + 7} y={Y(eindA[1]) + 3.5} className="axb" fill={KLEUR.bvTekst}>{naam[stelsel]}</text>
              <text x={x1 + 7} y={Y(eindB[1]) + 3.5} className="axb" fill={KLEUR.box3Zacht}>{naam[ander]}</text>
            </>
          )
        )}

        {band !== undefined && band.from >= lo && band.from <= hi && (() => {
          const kantelTekst = `kantelpunt ${kort(band.from)}`;
          const kantelRechts = smal
            ? X(band.from) + 7 + labelBreedte(kantelTekst, true) <= x1
            : X(band.from) < x1 - 150;
          return (
            <>
              <path
                d={`M ${X(band.from)} ${M.t} L ${X(band.from)} ${H - M.b}`}
                fill="none" stroke={KLEUR.pivotLijn} strokeWidth={1.5} strokeDasharray="4 3"
              />
              <Label
                x={X(band.from) + (kantelRechts ? 7 : -7)}
                y={M.t - (smal ? 10 : 0) + 2}
                text={kantelTekst}
                color={KLEUR.pivotTekst}
                anchor={kantelRechts ? "start" : "end"}
                narrow={smal}
              />
            </>
          );
        })()}

        {band?.to != null && band.to <= hi && (
          <>
            <path
              d={`M ${X(band.to)} ${M.t} L ${X(band.to)} ${H - M.b}`}
              fill="none" stroke={KLEUR.pivotLijn} strokeWidth={1.2} strokeDasharray="2 4"
            />
            <Label x={X(band.to) - 7} y={M.t + 2} text={`en tot ${kort(band.to)}`} color={KLEUR.pivotTekst} anchor="end" narrow={smal} />
          </>
        )}

        {toonStip && (
          <>
            <circle cx={stipX} cy={stipY} r={5} fill={KLEUR.ink} />
            <Label
              x={stipX} y={stipY + (eigenDelta >= 0 ? (smal ? -20 : -14) : (smal ? 34 : 26))}
              text={jijTekst}
              color={KLEUR.ink} anchor={stipAnchor} narrow={smal}
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
