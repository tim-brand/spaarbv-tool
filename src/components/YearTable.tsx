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
        Sleep horizontaal voor alle kolommen. „Netto vermogen privé” bij de BV is
        wat je overhoudt als je de BV in dát jaar zou liquideren en uitkeren.
      </p>
    </div>
  );
}
