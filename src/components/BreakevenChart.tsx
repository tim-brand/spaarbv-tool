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
