export function Assumptions() {
  return (
    <details>
      <summary>Aannames en spelregels</summary>
      <div className="details-body">
        <ul>
          <li>
            <b>Gelijke start, gelijke finish.</b> Beide routes beginnen met
            hetzelfde bedrag en eindigen met volledig afgerekend geld op je
            bankrekening. De BV wordt aan het eind geliquideerd, dus de latente
            Vpb- en box 2-claim wordt daadwerkelijk betaald.
          </li>
          <li>
            <b>Huidig stelsel (peiljaar 2026).</b> Forfaitair rendement over de
            grondslag: 6,00% voor beleggingen, 1,28% voor banktegoeden. Tarief
            36%, heffingsvrij vermogen €59.357 per persoon. Je betaalt dus ook in
            verliesjaren, en niets extra's in jaren waarin je meer verdient dan
            het forfait.
          </li>
          <li>
            <b>Nieuw stelsel (wetsvoorstel, beoogd 2028).</b>{" "}
            Vermogensaanwasbelasting: 36% over rente, dividend én de jaarlijkse
            waardestijging, ook zonder verkoop. Heffingsvrij resultaat €1.800 per
            persoon per jaar — het definitieve bedrag volgt uit de wettekst. Het
            heffingsvrij vermogen vervalt. Verliezen zijn voorwaarts verrekenbaar.
          </li>
          <li>
            <b>Je inleg in de BV</b> is kapitaalstorting en agio. Dat vormt je
            verkrijgingsprijs en komt onbelast terug; alleen de aangroei daarboven
            is box 2-belast.
          </li>
          <li>
            <b>Waardering op kostprijs of lagere marktwaarde.</b> De beleggingen
            staan op de balans voor wat je ervoor betaald hebt. Stijgt de koers,
            dan gebeurt er fiscaal niets: de winst valt pas in de heffing bij
            verkoop. Precies dat uitstel is waar het BV-voordeel vandaan komt.
            Zakt de koers onder de kostprijs, dan mag je afwaarderen en heb je
            direct een verlies. Waarderen op actuele waarde zou betekenen dat je
            elk jaar ook de ongerealiseerde koerswinst in de winst neemt; dan doet
            de BV hetzelfde als box 3 vanaf 2028, maar met kosten erbij, en
            verliest hij vrijwel altijd. Dit model rekent met kostprijs of lagere
            marktwaarde — de gangbare route voor een BV die buy-and-hold belegt.
            Voor sommige beleggingen en voor handelsposities kan een andere
            waardering verplicht zijn; laat dat toetsen.
          </li>
          <li>
            <b>Rente is geen koerswinst.</b> Bij spaargeld rekent het model met
            rente die je elk jaar ontvangt en die dan meteen belast is, ook in de
            BV. Er valt dan niets uit te stellen. Bij beleggingen gaat het model
            uit van een herbeleggende ETF zonder tussentijdse uitkering: de hele
            opbrengst is koersgroei en je verkoopt pas op de horizon.
          </li>
          <li>
            <b>Overige tarieven (2026).</b> Vpb 19% tot €200.000 winst, daarboven
            25,8%. Box 2 24,5% tot €68.843 per persoon, daarboven 31%. Tarieven
            blijven constant in de projectie; schijven worden niet geïndexeerd en
            er wordt niet gecorrigeerd voor inflatie.
          </li>
          <li>
            <b>Liquidatie.</b> Op de horizon wordt de portefeuille verkocht en over
            het gekozen aantal jaren uitgekeerd. Vpb en box 2 verdelen zich over
            die jaren, waardoor de lage schijven meerdere keren worden benut.
            Tijdens de afwikkeling rekent het model geen rendement meer — dat maakt
            de uitkomst iets voorzichtig.
          </li>
          <li>
            <b>Belastingen en kosten komen uit het vermogen zelf.</b> Er wordt niet
            van buitenaf bijgestort.
          </li>
          <li>
            <b>Niet meegenomen:</b> gebruikelijk loon (bij een pure
            beleggings-BV speelt dat doorgaans niet), buitenlandse bronbelasting op
            dividend, de regeling excessief lenen, schenk- en erfbelasting,
            overdrachtsbelasting, en het effect van tussentijds dividend dat je
            privé weer belegt.
          </li>
        </ul>
        <p className="disclaimer">
          Dit is een rekenmodel, geen advies. De uitkomst hangt volledig af van de
          ingevoerde aannames en van wetgeving die nog kan veranderen — het box
          3-stelsel per 2028 is op dit moment een wetsvoorstel. Leg je eigen
          situatie voor aan een fiscalist.
        </p>
      </div>
    </details>
  );
}
