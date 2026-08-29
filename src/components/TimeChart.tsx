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
