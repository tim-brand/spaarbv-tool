  /* ================= fiscale parameters ================= */
  var P = {
    /* nieuw stelsel (wetsvoorstel, beoogd 2028) */
    wrTarief: 0.36, hvr: 1800,
    /* huidig stelsel (2026) */
    b3Tarief: 0.36, hvv: 59357, forfBeleg: 0.06, forfSpaar: 0.0128,
    /* vpb 2026 */
    vpbLaag: 0.19, vpbHoog: 0.258, vpbGrens: 200000,
    /* box 2 2026 */
    abLaag: 0.245, abHoog: 0.31, abGrens: 68843
  };

  function vpb(w){
    if (w <= 0) return 0;
    return w <= P.vpbGrens ? w * P.vpbLaag
                           : P.vpbGrens * P.vpbLaag + (w - P.vpbGrens) * P.vpbHoog;
  }
  function ab(w, grens){
    if (w <= 0) return 0;
    return w <= grens ? w * P.abLaag
                      : grens * P.abLaag + (w - grens) * P.abHoog;
  }

  /* ================= box 3 ================= */
  /* stelsel "2028": vermogensaanwas, 36% over werkelijk resultaat boven het heffingsvrij resultaat
     stelsel "nu"  : forfaitair rendement over de grondslag boven het heffingsvrij vermogen      */
  function simBox3(V, s, stelsel){
    var A = V, verlies = 0, rows = [];
    var hvr = P.hvr * s.mult, hvv = P.hvv * s.mult;
    var forf = (s.soort === "spaar") ? P.forfSpaar : P.forfBeleg;

    for (var i = 0; i < s.T; i++){
      var A0 = A;
      var res = A0 * s.r;                          // rente/dividend + koersontwikkeling, herbelegd
      A = A0 + res;

      var t;
      if (stelsel === "2028"){
        var b = res;
        if (b < 0){ verlies += -b; b = 0; }
        else { var u = Math.min(b, verlies); b -= u; verlies -= u; }
        t = Math.max(0, b - hvr) * P.wrTarief;
      } else {
        t = Math.max(0, A0 - hvv) * forf * P.b3Tarief;
      }

      A -= t;
      rows.push({ begin:A0, rend:res, tax:t, netto:A });
    }
    return rows;
  }

  /* ================= spaar-BV ================= */
  /* netto privé als je de BV op dit moment liquideert en over N jaar uitkeert */
  function netNu(A, C, VK, pending, verlies, s){
    var N = s.liqJaren, rest = (A - C) + pending, vl = verlies;
    var kas = 0, vpbTot = 0;
    for (var j = 0; j < N; j++){
      var w = rest / N;
      if (w < 0){ vl += -w; w = 0; }
      else { var u = Math.min(w, vl); w -= u; vl -= u; }
      var tv = vpb(w); vpbTot += tv;
      kas += (A / N) - tv;
    }
    if (kas < 0) kas = 0;
    var abBasis = kas - VK, abTot = 0, abGrens = P.abGrens * s.mult;
    if (abBasis > 0){ for (var k = 0; k < N; k++) abTot += ab(abBasis / N, abGrens); }
    return { netto: kas - abTot, latVpb: vpbTot, latAb: abTot };
  }

  function simBV(V, s){
    var A = V, C = V, VK = V;                      // marktwaarde, boekwaarde, verkrijgingsprijs
    var verlies = 0, pending = 0, rows = [];

    for (var i = 0; i < s.T; i++){
      var A0 = A;
      var div = A0 * s.d;
      A = A0 * (1 + s.g);                          // koersgroei; boekwaarde ongemoeid

      var real = pending; pending = 0;
      if (s.waardering === "actueel"){
        real += (A - C); C = A;                    // jaarlijks volledig afrekenen
      } else if (s.turnover > 0){
        real += (A - C) * s.turnover;
        C += (A - C) * s.turnover;                 // opbrengst herbelegd tegen marktwaarde
      }

      var kosten = s.kosten + (i === 0 ? s.opricht : 0);

      var winst = div + real - kosten, t = 0;
      if (winst < 0){ verlies += -winst; }
      else {
        var u2 = Math.min(winst, verlies); winst -= u2; verlies -= u2;
        t = vpb(winst);
      }

      var saldo = div - kosten - t;                // kas: dividend in, kosten en Vpb uit
      if (saldo >= 0){ A += saldo; C += saldo; }
      else {
        var verkoop = -saldo;
        if (A > 0){
          var q = C / A;
          pending += verkoop * (1 - q);            // gerealiseerde winst schuift naar volgend jaar
          C -= verkoop * q;
        }
        A -= verkoop;
      }
      if (A < 0) A = 0;
      if (C < 0) C = 0;

      var n = netNu(A, C, VK, pending, verlies, s);
      rows.push({ begin:A0, rend:A0 * s.r, kosten:kosten, vpb:t, stand:A,
                  latent:n.latVpb + n.latAb, netto:n.netto });
    }
    return rows;
  }

  function eindB3(V, s, stelsel){ var r = simBox3(V, s, stelsel); return r[r.length-1].netto; }
  function eindBV(V, s){ var r = simBV(V, s); return r[r.length-1].netto; }
  function delta(V, s, stelsel){ return eindBV(V, s) - eindB3(V, s, stelsel); }

  /* Het verschil uit elkaar getrokken in drie stukken die exact optellen tot delta:
       uitstel  = wat het uitstellen van belasting oplevert  (schaalt mee met het vermogen)
       hvr      = het heffingsvrij resultaat dat box 3 wél heeft en de BV niet  (vast bedrag)
       kosten   = wat de BV per jaar kost                                      (vast bedrag) */
  function ontleed(V, s, stelsel){
    var kaal = Object.assign({}, s, { kosten:0, opricht:0 });
    var isNu = (stelsel === "nu");
    var bewaar = isNu ? P.hvv : P.hvr;              /* huidig stelsel: heffingsvrij vermogen */

    if (isNu) P.hvv = 0; else P.hvr = 0;
    var uitstel = delta(V, kaal, stelsel);          /* zonder kosten én zonder heffingsvrij */
    if (isNu) P.hvv = bewaar; else P.hvr = bewaar;

    var metHvr = delta(V, kaal, stelsel);           /* alleen het heffingsvrij resultaat erbij */
    var totaal = delta(V, s, stelsel);              /* en de kosten erbij */

    return {
      uitstel: uitstel,
      hvr:     uitstel - metHvr,                    /* positief = kost de BV dit bedrag */
      kosten:  metHvr - totaal,
      vast:    uitstel - totaal,
      totaal:  totaal
    };
  }

  /* ============ waar wint de BV? (kan een venster zijn) ============ */
  /* ============ waar wint de BV? (kan een venster zijn) ============ */
  var VLO = 25000, VHI = 5000000;

  function bands(s, stelsel){
    var n = 80, pts = [], i;
    for (i = 0; i <= n; i++){
      var V = VLO * Math.pow(VHI / VLO, i / n);
      pts.push([V, delta(V, s, stelsel) > 0]);
    }
    var out = [], open = pts[0][1] ? VLO : null;
    for (i = 1; i <= n; i++){
      if (pts[i][1] === pts[i-1][1]) continue;
      var a = pts[i-1][0], b = pts[i][0], was = pts[i-1][1];
      for (var k = 0; k < 32; k++){
        var m = Math.sqrt(a * b);
        if ((delta(m, s, stelsel) > 0) === was) a = m; else b = m;
      }
      var cut = Math.sqrt(a * b);
      if (pts[i][1]) open = cut;
      else if (open !== null){ out.push([open, cut]); open = null; }
    }
    if (open !== null) out.push([open, Infinity]);
    return out;
  }

  /* --- ontleed (uit het origineel) --- */
  function ontleed(V, s, stelsel){
    var kaal = Object.assign({}, s, { kosten:0, opricht:0 });
    var isNu = (stelsel === "nu");
    var bewaar = isNu ? P.hvv : P.hvr;
    if (isNu) P.hvv = 0; else P.hvr = 0;
    var uitstel = delta(V, kaal, stelsel);
    if (isNu) P.hvv = bewaar; else P.hvr = bewaar;
    var metHvr = delta(V, kaal, stelsel);
    var totaal = delta(V, s, stelsel);
    return { uitstel:uitstel, hvr:uitstel-metHvr, kosten:metHvr-totaal,
             vast:uitstel-totaal, totaal:totaal };
  }

  module.exports = { P:P, vpb:vpb, ab:ab, simBox3:simBox3, simBV:simBV, netNu:netNu,
                     eindB3:eindB3, eindBV:eindBV, delta:delta, bands:bands, ontleed:ontleed };
