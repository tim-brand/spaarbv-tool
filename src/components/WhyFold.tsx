import { V_MIN, decompose } from "../model/compare";
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

  /* Een ondergrens die exact op de scanvloer ligt betekent: de BV wint al
     bij het kleinste vermogen dat we doorrekenen. Er is dan geen echt
     kantelpunt in beeld — de band is afgekapt, niet gekruist — dus de
     kantelpuntkolom zou een gelijkheid tonen die er niet is. */
  const afgekapt = band !== undefined && band.from === V_MIN;
  const kantel =
    band === undefined || afgekapt ? null : decompose(band.from, inputs, stelsel);

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
          ) : afgekapt ? (
            <>
              In dit scenario is er geen kantelpunt te zien: de BV wint al bij het
              kleinste vermogen in deze vergelijking, {eur(V_MIN)}. Het uitstel
              weegt hier bij elk doorgerekend vermogen op tegen de vaste lasten.
              {band.to !== null && (
                <>
                  {" "}
                  Boven {eur(band.to)} draait het wél om, omdat je dan in de
                  hoogste Vpb- en box 2-schijven belandt.
                </>
              )}
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
