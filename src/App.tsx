import { useMemo, useState } from "react";
import { DEFAULTS, toInputs, type FormState } from "./state";
import { breakevenBands } from "./model/compare";
import { Inputs as InputsPanel } from "./components/Inputs";
import { Verdict } from "./components/Verdict";

export default function App() {
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const inputs = useMemo(() => toInputs(form), [form]);
  const bands = useMemo(
    () => breakevenBands(inputs, form.stelsel),
    [inputs, form.stelsel],
  );

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
        box 2-heffing bij het uitkeren. Vul je eigen cijfers in en je ziet waar
        de balans omslaat.
      </p>

      <div className="grid">
        <div>
          <InputsPanel
            form={form}
            onChange={setForm}
            liqHint="Gespreid uitkeren benut het lage box 2-tarief vaker."
          />
        </div>
        <div>
          <Verdict inputs={inputs} stelsel={form.stelsel} bands={bands} />
          {/* Tasks 10-14 */}
        </div>
      </div>
      <button type="button" onClick={() => setForm(DEFAULTS)}>
        reset
      </button>
    </div>
  );
}
