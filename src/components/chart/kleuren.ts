/** Grafiekpalet van het krantontwerp. SVG-attributen kunnen geen CSS-
 *  variabelen lezen op de plekken waar wij ze zetten, dus dit is de ene
 *  plaats waar de grafiekkleuren wonen. Spiegel wijzigingen aan de tokens
 *  in styles.css. */
export const KLEUR = {
  /** Hoofdlijn: netto via de BV. */
  bv: "#27506b",
  /** Tekstlabels bij de BV-lijn (donkerder voor contrast op papier). */
  bvTekst: "#1e3d52",
  /** Privé/box 3-lijn. */
  box3: "#39586e",
  /** Box 3-tekstlabels naast de lijn. */
  box3Zacht: "rgba(57,88,110,.85)",
  /** De niet-gekozen stelsel-lijn (gestippeld). */
  box3Lijn2: "rgba(57,88,110,.45)",
  /** Vlak onder de BV-lijn. */
  vlakBv: "rgba(39,80,107,.10)",
  /** Vlak onder de box 3-lijn. */
  vlakBox3: "rgba(57,88,110,.10)",
  /** Gestippelde kantelpunt-hulplijn. */
  pivotLijn: "#a49a88",
  /** Kantelpuntlabels. */
  pivotTekst: "#6e675c",
  /** Asteksten in SVG-attributen. */
  mut: "#6e675c",
  /** De jij-stip. */
  ink: "#191613",
  /** Achtergrondplaatje onder labels. */
  plaat: "#fffdf8",
} as const;
