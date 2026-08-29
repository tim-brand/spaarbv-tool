const fs = require('fs');
const path = require('path');

// Paden zijn relatief aan dit script, niet aan de werkdirectory, zodat
// `npm run golden` vanuit de repo-root werkt.
const REF = path.join(__dirname, 'reference-model.js');
const UIT = path.join(__dirname, '..', 'tests', 'fixtures', 'golden.json');

const src = fs.readFileSync(REF, 'utf8');
const m = {exports:{}};
new Function('module','exports','"use strict";'+src)(m,m.exports);
const R = m.exports;

function mk(o){
  const r = o.rendPct/100;
  const d = o.soort === 'spaar' ? r : 0;
  return { V:o.V, T:o.T, r:r, d:d, g:r-d, turnover:0,
           kosten:o.kosten, opricht:o.opricht, liqJaren:o.liq,
           waardering:'kostprijs', mult:o.partner?2:1, soort:o.soort };
}

const cases = [
  {name:'default', V:200000,T:20,rendPct:7,kosten:1200,opricht:600,liq:1,partner:false,soort:'beleggen'},
  {name:'default-partner', V:200000,T:20,rendPct:7,kosten:1200,opricht:600,liq:1,partner:true,soort:'beleggen'},
  {name:'spaargeld', V:200000,T:20,rendPct:2,kosten:1200,opricht:600,liq:1,partner:false,soort:'spaar'},
  {name:'klein-vermogen', V:50000,T:20,rendPct:7,kosten:1200,opricht:600,liq:1,partner:false,soort:'beleggen'},
  {name:'groot-vermogen', V:2000000,T:30,rendPct:7,kosten:1200,opricht:600,liq:1,partner:false,soort:'beleggen'},
  {name:'gespreid-uitkeren', V:1000000,T:25,rendPct:8,kosten:1500,opricht:600,liq:5,partner:false,soort:'beleggen'},
  {name:'korte-horizon', V:500000,T:5,rendPct:7,kosten:1200,opricht:600,liq:1,partner:false,soort:'beleggen'},
  {name:'laag-rendement', V:400000,T:20,rendPct:1.5,kosten:1200,opricht:600,liq:1,partner:false,soort:'beleggen'},
  {name:'hoge-kosten', V:300000,T:20,rendPct:7,kosten:5000,opricht:2500,liq:1,partner:false,soort:'beleggen'},
  {name:'lange-horizon-partner', V:750000,T:40,rendPct:9,kosten:1200,opricht:600,liq:10,partner:true,soort:'beleggen'},
  {name:'verliesjaren', V:400000,T:10,rendPct:-3,kosten:1200,opricht:600,liq:1,partner:false,soort:'beleggen'},
  {name:'venster', V:200000,T:40,rendPct:4,kosten:100,opricht:100,liq:1,partner:false,soort:'spaar'},
];

const out = cases.map(c => {
  const s = mk(c);
  const res = { name:c.name, input:{V:c.V,T:c.T,rendPct:c.rendPct,kosten:c.kosten,
                 opricht:c.opricht,liq:c.liq,partner:c.partner,soort:c.soort} };
  for (const st of ['nu','2028']){
    const b3 = R.simBox3(c.V, s, st);
    const bv = R.simBV(c.V, s);
    const o  = R.ontleed(c.V, s, st);
    const bd = R.bands(s, st).map(b => [b[0], isFinite(b[1])?b[1]:null]);
    res[st] = {
      eindBox3: b3[b3.length-1].netto,
      eindBV:   bv[bv.length-1].netto,
      delta:    R.delta(c.V, s, st),
      bands:    bd,
      ontleed:  {uitstel:o.uitstel, hvr:o.hvr, kosten:o.kosten,
                 vast:o.vast, totaal:o.totaal},
      box3Jaren: b3.map(r => ({begin:r.begin, rend:r.rend,
                               tax:r.tax, netto:r.netto})),
      bvJaren:   bv.map(r => ({begin:r.begin, rend:r.rend, kosten:r.kosten,
                               vpb:r.vpb, stand:r.stand,
                               latent:r.latent, netto:r.netto})),
    };
  }
  return res;
});
fs.writeFileSync(UIT, JSON.stringify(out,null,2));
console.log('cases:', out.length, 'bytes:', fs.statSync(UIT).size);
for (const c of out) console.log(c.name.padEnd(22),
  '2028 delta', String(c['2028'].delta).padStart(12),
  '| bands', JSON.stringify(c['2028'].bands));
