interface Props {
  x: number;
  y: number;
  text: string;
  color: string;
  anchor?: "start" | "middle" | "end";
  /** Op smalle schermen staan de letters groter, dus is het plaatje breder. */
  narrow: boolean;
}

/**
 * Geschatte breedte van een label in viewBox-eenheden. Gebruikt door de
 * grafieken zelf om te bepalen of een label naar links of naar rechts moet
 * uitlijnen, zodat het binnen de viewBox blijft — belangrijk sinds de
 * viewBox op smalle schermen smaller is dan vroeger (zie TimeChart/
 * BreakevenChart).
 */
export function labelBreedte(text: string, narrow: boolean): number {
  return text.length * (narrow ? 9.4 : 5.9) + 10;
}

/**
 * Tekst met een halfdoorzichtig wit plaatje eronder, zodat labels leesbaar
 * blijven waar ze over lijnen of vlakken heen vallen.
 */
export function Label({ x, y, text, color, anchor = "start", narrow }: Props) {
  const breedte = labelBreedte(text, narrow);
  const plaatX =
    anchor === "end" ? x - breedte + 5 : anchor === "middle" ? x - breedte / 2 : x - 5;
  // Op smalle schermen krijgt .axb via styles.css een grotere font-size
  // (18 i.p.v. 11 viewBox-eenheden), dus moet het witte plaatje eronder ook
  // hoger zijn, anders steken de letters erbovenuit. De brede (niet-smalle)
  // waarden zijn bewust ongewijzigd gelaten t.o.v. voorheen.
  const hoogte = narrow ? 23 : 14;
  const plaatY = narrow ? y - 16 : y - 10;

  return (
    <>
      <rect
        x={plaatX} y={plaatY} width={breedte} height={hoogte}
        fill="#ffffff" opacity={0.86} rx={2}
      />
      <text x={x} y={y} className="axb" textAnchor={anchor} fill={color}>
        {text}
      </text>
    </>
  );
}
