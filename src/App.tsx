import { useMemo, useState } from "react";
import { Assumptions } from "./components/Assumptions";
import { BreakevenChart } from "./components/BreakevenChart";
import { Inputs as InputsPanel } from "./components/Inputs";
import { TimeChart } from "./components/TimeChart";
import { Verdict } from "./components/Verdict";
import { WhyFold } from "./components/WhyFold";
import { YearTable } from "./components/YearTable";
import { simulateBV } from "./model/bv";
import { breakevenBands } from "./model/compare";
import { eur } from "./model/format";
import { PARAMS_2026 } from "./model/params";
import { DEFAULTS, toInputs, type FormState } from "./state";

const STANDAARD_LIQ_HINT = "Gespreid uitkeren benut het lage box 2-tarief vaker.";

export default function App() {
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const inputs = useMemo(() => toInputs(form), [form]);
  const bands = useMemo(() => breakevenBands(inputs, form.stelsel), [inputs, form.stelsel]);

  const liqHint = useMemo((): string => {
    const rows = simulateBV(inputs.V, inputs);
    const laatste = rows[rows.length - 1];
    const ingelegd = inputs.V + 12 * inputs.inleg * inputs.inlegJaren;
    if (laatste === undefined || laatste.stand <= ingelegd) return STANDAARD_LIQ_HINT;

    const nu = laatste.stand - laatste.netto;
    const alt = inputs.liqJaren === 1 ? 5 : 1;
    const altRows = simulateBV(inputs.V, { ...inputs, liqJaren: alt });
    const altLaatste = altRows[altRows.length - 1];
    if (altLaatste === undefined) return STANDAARD_LIQ_HINT;

    const altBelasting = altLaatste.stand - altLaatste.netto;
    const verschil = Math.abs(altBelasting - nu);
    const grens = eur(PARAMS_2026.abGrens * inputs.mult);

    if (verschil < 100) {
      return `Bij het leeghalen betaal je nu ${eur(nu)} aan Vpb en box 2. Verder spreiden verandert daar niets meer aan: je uitkering past al helemaal in het lage box 2-tarief van 24,5%, dat geldt tot ${grens} per jaar.`;
    }

    const kern =
      alt === 5
        ? `Verdeel je het over 5 jaar, dan wordt dat ${eur(altBelasting)} — ${eur(verschil)} minder.`
        : `Zou je alles in één keer opnemen, dan was dat ${eur(altBelasting)} — ${eur(verschil)} méér.`;

    return `Bij het leeghalen betaal je nu ${eur(nu)} aan Vpb en box 2. ${kern} Dat komt doordat het lage box 2-tarief van 24,5% geldt tot ${grens} per jaar. Zodra je jaarlijkse uitkering daaronder blijft, levert verder spreiden niets meer op.`;
  }, [inputs]);

  return (
    <div className="pagina">
      <p className="eyebrow">Beleggen in de BV of privé · particulier</p>
      <h1>Vanaf welk vermogen wordt een BV interessant?</h1>
      <p className="lede">
        Privé betaal je in box 3 elk jaar belasting over je vermogen — vanaf 2028
        over je werkelijke rendement, inclusief koerswinst die je nog niet hebt
        verzilverd. In een BV mag die winst blijven staan tot je verkoopt. Dat
        uitstel is het hele voordeel, en het moet opwegen tegen de kosten van de
        BV, tegen het heffingsvrije bedrag dat je in box 3 opgeeft, en tegen de
        box 2-heffing bij het uitkeren. Vul je eigen cijfers in en je ziet waar de
        balans omslaat.
      </p>

      <div className="grid">
        <div>
          <InputsPanel form={form} onChange={setForm} liqHint={liqHint} />
        </div>
        <div>
          <Verdict inputs={inputs} stelsel={form.stelsel} bands={bands} />
          <WhyFold inputs={inputs} stelsel={form.stelsel} bands={bands} />
          <BreakevenChart inputs={inputs} stelsel={form.stelsel} bands={bands} />
          <YearTable inputs={inputs} stelsel={form.stelsel} />
          <TimeChart inputs={inputs} stelsel={form.stelsel} />
          <Assumptions inleg={inputs.inleg} />
          <p className="foot">Rekenmodel · indicatief · peiljaar 2026</p>
        </div>
      </div>
    </div>
  );
}
