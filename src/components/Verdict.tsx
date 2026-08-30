import { V_MAX, V_MIN, finalBV, finalBox3 } from "../model/compare";
import { eur } from "../model/format";
import { PARAMS_2026 } from "../model/params";
import type { Band, Inputs, Stelsel } from "../model/types";

interface Props {
  inputs: Inputs;
  stelsel: Stelsel;
  bands: Band[];
}

/** Positie op de logaritmische schaalbalk, in procenten. */
function positie(V: number): number {
  const p =
    (Math.log(V) - Math.log(V_MIN)) / (Math.log(V_MAX) - Math.log(V_MIN));
  return Math.max(0, Math.min(1, p)) * 100;
}

export function Verdict({ inputs, stelsel, bands }: Props) {
  const nu = finalBox3(inputs.V, inputs, "nu");
  const n28 = finalBox3(inputs.V, inputs, "2028");
  const bv = finalBV(inputs.V, inputs);

  const referentie = stelsel === "2028" ? n28 : nu;
  const verschil = bv - referentie;
  const bvWint = bv > referentie;
  const isNu = stelsel === "nu";

  const band = bands[0];
  const onder = band?.from ?? null;
  const boven = band?.to ?? null;

  const totaleInleg = 12 * inputs.inleg * inputs.inlegJaren;

  const tegelKlasse = (actief: boolean): string => {
    if (!actief) return "tile dim";
    return bvWint ? "tile" : "tile win-b3";
  };

  const balk = ((): string => {
    if (onder === null) return "var(--box3)";
    const p = positie(onder);
    const eind = boven === null ? 100 : positie(boven);
    const staart =
      boven === null ? "" : `,var(--box3) ${eind}%,var(--box3) 100%`;
    return `linear-gradient(90deg,var(--box3) 0%,var(--box3) ${p}%,var(--bv) ${p}%,var(--bv) ${eind}%${staart})`;
  })();

  return (
    <div className="card verdict">
      <p className="kp-label">Uitkomst bij jouw cijfers</p>
      <p className="kp-voorloop">
        {onder === null
          ? "In dit scenario loont een BV"
          : `Een BV loont ${stelsel === "2028" ? "(nieuw stelsel)" : "(huidig stelsel)"} vanaf`}
      </p>
      <p className={onder === null ? "kp none" : "kp"}>
        {onder === null ? "bij geen enkel vermogen" : eur(onder)}
      </p>

      <p className="kp-sub">
        {onder === null ? (
          <>
            Met {eur(inputs.V)} over {inputs.T} jaar houd je privé{" "}
            <b>{eur(referentie)}</b> over en via de BV <b>{eur(bv)}</b>. De kosten
            en de box 2-heffing wegen hier niet op tegen het uitstel.
          </>
        ) : (
          <>
            Met {eur(inputs.V)} over {inputs.T} jaar houd je netto{" "}
            <b>{eur(bv)}</b> over via de BV en <b>{eur(referentie)}</b> privé.
            Verschil: <b>{eur(Math.abs(verschil))}</b> voor{" "}
            {verschil >= 0 ? "de BV" : "box 3"}.
            {boven !== null && (
              <>
                {" "}
                Boven {eur(boven)} draait het weer om: dan vallen de lage Vpb- en
                box 2-schijven weg.
              </>
            )}
          </>
        )}
        {totaleInleg > 0 && (
          <>
            {" "}
            Daarnaast leg je in totaal <b>{eur(totaleInleg)}</b> in:{" "}
            {eur(inputs.inleg)} per maand, {inputs.inlegJaren} jaar lang. Beide
            eindbedragen bevatten die stortingen.
          </>
        )}
        {nu > n28 && (
          <>
            {" "}
            Let op: onder het <b>huidige</b> stelsel houd je privé{" "}
            {eur(nu - n28)} méér over dan onder het nieuwe — je rendement ligt
            boven het forfait.
          </>
        )}
        {n28 > nu && (
          <>
            {" "}
            Onder het <b>nieuwe</b> stelsel ben je privé {eur(n28 - nu)} beter af
            dan nu — je rendement blijft onder het forfait.
          </>
        )}
      </p>

      <div className="scale">
        <div className="scale-wrap">
          <div className="scale-you" style={{ left: `${positie(inputs.V)}%` }}>
            jij
          </div>
          <div className="scale-track" style={{ background: balk }}>
            {onder !== null && (
              <div className="scale-pivot" style={{ left: `${positie(onder)}%` }} />
            )}
          </div>
        </div>
        <div className="scale-ends">
          <span>Box 3 gunstiger</span>
          <span>BV gunstiger</span>
        </div>
      </div>

      <div className="three">
        <div className={tegelKlasse(isNu)}>
          <p className="tile-h">
            Privé in box 3 — huidig stelsel (forfaitair)
            {isNu ? "" : " · ter vergelijking"}
          </p>
          <p className="tile-n" style={{ color: "var(--box3)" }}>{eur(nu)}</p>
          <p className="tile-s">
            forfait {inputs.soort === "spaar" ? "1,28%" : "6,00%"} · heffingsvrij{" "}
            {eur(PARAMS_2026.hvv * inputs.mult)}
          </p>
        </div>

        <div className={tegelKlasse(!isNu)}>
          <p className="tile-h">
            Privé in box 3 — nieuw stelsel vanaf 2028
            {isNu ? " · ter vergelijking" : ""}
          </p>
          <p className="tile-n" style={{ color: "var(--box3)" }}>{eur(n28)}</p>
          <p className="tile-s">
            36% over het werkelijke rendement · heffingsvrij{" "}
            {eur(PARAMS_2026.hvr * inputs.mult)} per jaar
          </p>
        </div>

        <div className={bvWint ? "tile win-bv" : "tile"}>
          <p className="tile-h">In de BV, na Vpb, box 2 en kosten</p>
          <p className="tile-n" style={{ color: "var(--bv)" }}>{eur(bv)}</p>
          <p className="tile-s">
            na {eur(inputs.kosten * inputs.T + inputs.opricht)} kosten over{" "}
            {inputs.T} jaar
          </p>
        </div>
      </div>
    </div>
  );
}
