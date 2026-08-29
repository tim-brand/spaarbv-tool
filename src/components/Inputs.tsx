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

  const netjes = (key: "kostenText" | "oprichtText", fallback: number): void => {
    const n = parseNum(form[key], fallback, MAX_BEDRAG);
    onChange({ ...form, [key]: formatNumberNl(n) });
  };

  return (
    <>
      <div className="card">
        <p className="card-title">Jouw vermogen</p>

        <div className="field">
          <label id="soort-label">Wat voor vermogen is het?</label>
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

        <div className="field">
          <label htmlFor="k-verm">
            Vermogen nu <span className="val">{eur(form.V)}</span>
          </label>
          <input
            type="range" id="k-verm" min={25_000} max={2_000_000} step={5_000}
            value={form.V}
            onChange={(e) => set("V", Number(e.target.value))}
          />
          <p className="hint">Wat je nu in box 3 hebt staan.</p>
        </div>

        <div className="field">
          <label htmlFor="k-jaar">
            Horizon <span className="val">{form.T} jaar</span>
          </label>
          <input
            type="range" id="k-jaar" min={5} max={40} step={1}
            value={form.T}
            onChange={(e) => set("T", Number(e.target.value))}
          />
          <p className="hint">Hoeveel jaar tot je het geld nodig hebt.</p>
        </div>

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

      <div className="card">
        <p className="card-title">Het rendement</p>
        <div className="field">
          <label htmlFor="k-rend">
            Rendement per jaar <span className="val">{pct(form.rendPct)}</span>
          </label>
          <input
            type="range" id="k-rend" min={0.5} max={12} step={0.1}
            value={form.rendPct}
            onChange={(e) => set("rendPct", Number(e.target.value))}
          />
          <p className="hint">{REND_HINT[form.soort]}</p>
        </div>
      </div>

      <div className="card">
        <p className="card-title">De BV</p>

        <div className="field">
          <label htmlFor="k-kost">Kosten per jaar</label>
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
          <label htmlFor="k-opr">Oprichting eenmalig</label>
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

        <div className="field">
          <label htmlFor="k-liq">
            Uitkeren aan het eind{" "}
            <span className="val">
              {form.liqJaren === 1 ? "in 1 keer" : `in ${form.liqJaren} jaar`}
            </span>
          </label>
          <input
            type="range" id="k-liq" min={1} max={10} step={1}
            value={form.liqJaren}
            onChange={(e) => set("liqJaren", Number(e.target.value))}
          />
          <p className="hint">{liqHint}</p>
        </div>
      </div>

      <div className="card">
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
