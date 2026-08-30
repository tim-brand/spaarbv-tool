import type { CSSProperties } from "react";
import { eur, formatNumberNl, parseNum, pct } from "../model/format";
import type { Soort } from "../model/types";
import {
  DEFAULT_KOSTEN,
  DEFAULT_OPRICHT,
  MAX_BEDRAG,
  defaultRendement,
  type FormState,
} from "../state";

interface Props {
  form: FormState;
  onChange: (next: FormState) => void;
  /** Uitleg onder de uitkeerslider; App rekent die uit. */
  liqHint: string;
}

const SOORT_HINT: Record<Soort, string> = {
  beleggen:
    "Koerswinst mag in de BV blijven staan tot je verkoopt. Forfait in het huidige stelsel: 6,00%.",
  spaar:
    "Rente komt elk jaar binnen en is dan meteen belast — ook in de BV. Er valt dus niets uit te stellen. Forfait in het huidige stelsel: 1,28%.",
};

const REND_HINT: Record<Soort, string> = {
  beleggen:
    "Gemiddeld bruto over de hele periode. Bij een herbeleggende ETF is dit vrijwel volledig koersgroei.",
  spaar: "De rente die je gemiddeld krijgt. Elk jaar belast, privé én in de BV.",
};

export function Inputs({ form, onChange, liqHint }: Props) {
  const set = <K extends keyof FormState>(key: K, value: FormState[K]): void => {
    onChange({ ...form, [key]: value });
  };

  const kiesSoort = (soort: Soort): void => {
    onChange({ ...form, soort, rendPct: defaultRendement(soort) });
  };

  const netjes = (
    key: "kostenText" | "oprichtText" | "inlegText",
    fallback: number,
  ): void => {
    const n = parseNum(form[key], fallback, MAX_BEDRAG);
    onChange({ ...form, [key]: formatNumberNl(n) });
  };

  const inleg = parseNum(form.inlegText, 0, MAX_BEDRAG);
  const inlegJarenTonen = Math.min(form.inlegJaren ?? form.T, form.T);

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
    // De stapknoppen krijgen hun toegankelijke naam via verborgen tekst in
    // plaats van het `aria-label`-attribuut: getByLabelText van
    // @testing-library/dom doorzoekt élk element met een `aria-label`, dus
    // een letterlijk `aria-label="<naam> verhogen"` op de knop zou ook
    // matchen op bestaande, contractuele `getByLabelText(/naam/)`-tests voor
    // het bijbehorende slider-veld (meerdere elementen gevonden). Tekstinhoud
    // wordt daar niet door opgepikt, dus dat voorkomt de botsing terwijl de
    // knop via `getByRole("button", { name: ... })` nog steeds exact de
    // vereiste naam heeft.
    const verborgen: CSSProperties = {
      position: "absolute", width: 1, height: 1, padding: 0, margin: -1,
      overflow: "hidden", clip: "rect(0, 0, 0, 0)", whiteSpace: "nowrap", border: 0,
    };
    return (
      <div className="field">
        <label className="veld-kop" htmlFor={id}>{naam}</label>
        <div className="stap-rij">
          <button
            type="button" className="stap" disabled={waarde <= min}
            onClick={() => zet(rond(klem(waarde - step, min, max)))}
          >
            <span aria-hidden="true">−</span>
            <span style={verborgen}>{`${naam} verlagen`}</span>
          </button>
          <span className="stap-waarde">{toon}</span>
          <button
            type="button" className="stap" disabled={waarde >= max}
            onClick={() => zet(rond(klem(waarde + step, min, max)))}
          >
            <span aria-hidden="true">+</span>
            <span style={verborgen}>{`${naam} verhogen`}</span>
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

  return (
    <>
      <div className="paneel">
        <p className="card-title">Jouw vermogen</p>

        <div className="field">
          <label id="soort-label" className="veld-kop">Wat voor vermogen is het?</label>
          <div className="seg" role="group" aria-labelledby="soort-label">
            <button
              type="button"
              aria-pressed={form.soort === "beleggen"}
              onClick={() => kiesSoort("beleggen")}
            >
              Beleggingen
            </button>
            <button
              type="button"
              aria-pressed={form.soort === "spaar"}
              onClick={() => kiesSoort("spaar")}
            >
              Spaargeld
            </button>
          </div>
          <p className="hint">{SOORT_HINT[form.soort]}</p>
        </div>

        {stapVeld({
          id: "k-verm",
          naam: "Vermogen nu",
          waarde: form.V,
          toon: eur(form.V),
          min: 25_000,
          max: 2_000_000,
          step: 5_000,
          zet: (n) => set("V", n),
          hint: "Wat je nu in box 3 hebt staan.",
        })}

        <div className="field">
          <label htmlFor="k-inleg" className="veld-kop">Maandelijkse inleg</label>
          <div className="in-wrap">
            <span>€</span>
            <input
              type="text" id="k-inleg" inputMode="numeric" value={form.inlegText}
              onChange={(e) => set("inlegText", e.target.value)}
              onBlur={() => netjes("inlegText", 0)}
            />
          </div>
          <p className="hint">
            Wat je er elke maand bijlegt, aan het begin van de maand. Laat op 0
            staan als je alleen met je huidige vermogen rekent.
          </p>
        </div>

        {inleg > 0 &&
          stapVeld({
            id: "k-inlegjaren",
            naam: "Inleggen gedurende",
            waarde: inlegJarenTonen,
            toon: `${inlegJarenTonen} van de ${form.T} jaar`,
            min: 1,
            max: form.T,
            step: 1,
            zet: (n) => set("inlegJaren", n),
            hint: "Daarna stoppen de stortingen en groeit het vermogen alleen nog door rendement.",
          })}

        {stapVeld({
          id: "k-jaar",
          naam: "Horizon",
          waarde: form.T,
          toon: `${form.T} jaar`,
          min: 5,
          max: 40,
          step: 1,
          zet: (n) => set("T", n),
          hint: "Hoeveel jaar tot je het geld nodig hebt.",
        })}

        <div className="field">
          <label className="toggle" htmlFor="k-part">
            <input
              type="checkbox" id="k-part" checked={form.partner}
              onChange={(e) => set("partner", e.target.checked)}
            />
            Fiscale partner
          </label>
          <p className="hint">
            Verdubbelt het heffingsvrij vermogen, het heffingsvrij resultaat en de
            box 2-schijf.
          </p>
        </div>
      </div>

      <div className="paneel">
        <p className="card-title">Het rendement</p>
        {stapVeld({
          id: "k-rend",
          naam: "Rendement per jaar",
          waarde: form.rendPct,
          toon: pct(form.rendPct),
          min: 0.5,
          max: 12,
          step: 0.1,
          zet: (n) => set("rendPct", n),
          hint: REND_HINT[form.soort],
        })}
      </div>

      <div className="paneel">
        <p className="card-title">De BV</p>

        <div className="field">
          <label htmlFor="k-kost" className="veld-kop">Kosten per jaar</label>
          <div className="in-wrap">
            <span>€</span>
            <input
              type="text" id="k-kost" inputMode="numeric" value={form.kostenText}
              onChange={(e) => set("kostenText", e.target.value)}
              onBlur={() => netjes("kostenText", DEFAULT_KOSTEN)}
            />
          </div>
          <p className="hint">Jaarrekening, aangiftes, KvK.</p>
        </div>

        <div className="field">
          <label htmlFor="k-opr" className="veld-kop">Oprichting eenmalig</label>
          <div className="in-wrap">
            <span>€</span>
            <input
              type="text" id="k-opr" inputMode="numeric" value={form.oprichtText}
              onChange={(e) => set("oprichtText", e.target.value)}
              onBlur={() => netjes("oprichtText", DEFAULT_OPRICHT)}
            />
          </div>
          <p className="hint">Notaris en inschrijving, geboekt in het eerste jaar.</p>
        </div>

        {stapVeld({
          id: "k-liq",
          naam: "Uitkeren aan het eind",
          waarde: form.liqJaren,
          toon: form.liqJaren === 1 ? "in 1 keer" : `in ${form.liqJaren} jaar`,
          min: 1,
          max: 10,
          step: 1,
          zet: (n) => set("liqJaren", n),
          hint: liqHint,
        })}
      </div>

      <div className="paneel">
        <p className="card-title" id="stelsel-label">Welk box 3-stelsel</p>
        <div className="field">
          <div className="seg" role="group" aria-labelledby="stelsel-label">
            <button
              type="button" aria-pressed={form.stelsel === "2028"}
              onClick={() => set("stelsel", "2028")}
            >
              Nieuw stelsel
              <br />
              2028
            </button>
            <button
              type="button" aria-pressed={form.stelsel === "nu"}
              onClick={() => set("stelsel", "nu")}
            >
              Huidig stelsel
              <br />
              2026
            </button>
          </div>
          <p className="hint">
            Bepaalt welk stelsel in de tabel en de grafieken tegenover de BV staat.
            Beide uitkomsten blijven hierboven zichtbaar.
          </p>
        </div>
      </div>
    </>
  );
}
