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
 * Tekst met een halfdoorzichtig wit plaatje eronder, zodat labels leesbaar
 * blijven waar ze over lijnen of vlakken heen vallen.
 */
export function Label({ x, y, text, color, anchor = "start", narrow }: Props) {
  const breedte = text.length * (narrow ? 9.4 : 5.9) + 10;
  const plaatX =
    anchor === "end" ? x - breedte + 5 : anchor === "middle" ? x - breedte / 2 : x - 5;

  return (
    <>
      <rect x={plaatX} y={y - 10} width={breedte} height={14} fill="#ffffff" opacity={0.86} rx={2} />
      <text x={x} y={y} className="axb" textAnchor={anchor} fill={color}>
        {text}
      </text>
    </>
  );
}
