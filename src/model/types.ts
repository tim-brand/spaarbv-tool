/** Soort vermogen. Bepaalt het forfait in het huidige stelsel én of het
 *  rendement direct is (rente) of koersgroei (uitstelbaar). */
export type Soort = "beleggen" | "spaar";

/** Welk box 3-stelsel de BV tegenover zich krijgt. */
export type Stelsel = "nu" | "2028";

export interface Inputs {
  /** Startvermogen in euro's. */
  V: number;
  /** Horizon in hele jaren. */
  T: number;
  /** Totaalrendement per jaar als fractie, bijv. 0.07. */
  r: number;
  /** Direct rendement (rente/dividend) als fractie. Bij beleggen 0. */
  d: number;
  /** Koersgroei als fractie. Gelijk aan r - d. */
  g: number;
  /** Kosten van de BV per jaar in euro's. */
  kosten: number;
  /** Eenmalige oprichtingskosten, geboekt in jaar 1. */
  opricht: number;
  /** Over hoeveel jaar de BV aan het eind wordt uitgekeerd. */
  liqJaren: number;
  /** 2 met fiscale partner, anders 1. */
  mult: 1 | 2;
  soort: Soort;
}

/** Eén jaar in de privé-route. */
export interface Box3Year {
  /** Vermogen aan het begin van het jaar. */
  begin: number;
  /** Resultaat over dat jaar. */
  rend: number;
  /** Box 3-heffing, betaald uit het vermogen zelf. */
  tax: number;
  /** Vermogen aan het eind van het jaar, na heffing. */
  netto: number;
}

/** Eén jaar in de BV-route. */
export interface BvYear {
  begin: number;
  rend: number;
  /** Kosten van dat jaar, inclusief oprichting in jaar 1. */
  kosten: number;
  /** Daadwerkelijk in dat jaar betaalde Vpb. */
  vpb: number;
  /** Marktwaarde in de BV aan het eind van het jaar. */
  stand: number;
  /** Latente Vpb + box 2-claim als je nu zou liquideren. */
  latent: number;
  /** Wat je netto privé overhoudt als je nu liquideert en uitkeert. */
  netto: number;
}

/** Een vermogensinterval waarin de BV wint. `to: null` betekent oneindig. */
export interface Band {
  from: number;
  to: number | null;
}

/** Het verschil uit elkaar getrokken. uitstel + (-hvr) + (-kosten) === totaal. */
export interface Decomposition {
  /** Wat het uitstellen van belasting oplevert. Schaalt mee met het vermogen. */
  uitstel: number;
  /** Het heffingsvrije bedrag dat box 3 wél heeft en de BV niet. Vast bedrag. */
  hvr: number;
  /** Wat de BV over de hele horizon kost. Vast bedrag. */
  kosten: number;
  /** hvr + kosten: het deel dat niet meegroeit met het vermogen. */
  vast: number;
  /** Het totale verschil: gelijk aan delta(). */
  totaal: number;
}
