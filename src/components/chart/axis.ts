/**
 * Rondt een ruwe stapgrootte af naar een nette waarde: 1, 2, 2,5, 5 of 10 maal
 * een macht van tien. Zo krijg je ronde bedragen op de as in plaats van
 * willekeurige tussenstanden.
 */
export function nietteStap(ruw: number): number {
  const magnitude = Math.pow(10, Math.floor(Math.log10(Math.abs(ruw))));
  const n = Math.abs(ruw) / magnitude;
  const factor = n < 1.5 ? 1 : n < 2.25 ? 2 : n < 3.5 ? 2.5 : n < 7.5 ? 5 : 10;
  return factor * magnitude;
}

/** Ronde waarden voor de y-as, met minstens vier lijnen en nul erbij als het bereik die kruist. */
export function yTicks(ymin: number, ymax: number): number[] {
  let stap = nietteStap((ymax - ymin) / 4);
  let uit: number[] = [];

  for (let poging = 0; poging < 3; poging += 1) {
    uit = [];
    for (let v = Math.ceil(ymin / stap) * stap; v <= ymax + 1e-9; v += stap) {
      uit.push(v);
    }
    if (uit.length >= 4) break;
    stap /= 2;
  }

  if (!uit.includes(0) && ymin < 0 && ymax > 0) uit.push(0);
  return uit;
}
