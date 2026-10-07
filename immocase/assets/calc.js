/* Immo Kalkül – Rechenkern (rein, ohne DOM). Alle Beträge in EUR, Raten als Dezimalzahl. */
(function (root) {
  const DEFAULTS = {
    name: 'Neues Objekt', kaufpreis: 450500, wohnflaeche: 86, baujahr: 1956,
    provision: 0.0298, grest: 0.035, notar: 0.0176, nkSonst: 0,
    eigenkapital: 37121, zins: 0.04, tilgung: 0.02, bindung: 10, zinsNach: 0.035,
    mieteMonat: 1550, leerstand: 0.02, mietSteig: 0.015,
    kostenNichtUml: 900, ruecklage: 1000, kostenSteig: 0.02,
    gebaeudeAnteil: 0.73, afaOverride: null, steuersatz: 0.42,
    haltedauer: 10, wertSteig: 0.015, verkaufskosten: 0.03,
    checklist: {}, notizen: ''
  };

  function afaSatzAuto(bj) {
    if (bj && bj < 1925) return 0.025;
    if (bj && bj >= 2023) return 0.03;
    return 0.02;
  }

  function irr(flows) {
    const npv = r => flows.reduce((s, cf, t) => s + cf / Math.pow(1 + r, t), 0);
    let lo = -0.99, hi = 1.0, fLo = npv(lo), fHi = npv(hi);
    if (!isFinite(fLo) || !isFinite(fHi) || fLo * fHi > 0) return NaN;
    for (let i = 0; i < 200; i++) {
      const mid = (lo + hi) / 2, f = npv(mid);
      if (Math.abs(f) < 1e-6) return mid;
      if (f * fLo < 0) { hi = mid; } else { lo = mid; fLo = f; }
    }
    return (lo + hi) / 2;
  }

  function calc(input) {
    const p = Object.assign({}, DEFAULTS, input);
    const n = Math.max(1, Math.min(40, Math.round(p.haltedauer)));
    const kp = Math.max(0, p.kaufpreis);

    // Kaufnebenkosten
    const nk = { provision: kp * p.provision, grest: kp * p.grest, notar: kp * p.notar, sonst: p.nkSonst };
    nk.total = nk.provision + nk.grest + nk.notar + nk.sonst;
    const ak = kp + nk.total;                       // Anschaffungskosten gesamt
    const darlehen = Math.max(0, ak - p.eigenkapital);

    // AfA: (KP + alle Anschaffungsnebenkosten) x Gebäudeanteil
    const afaSatz = p.afaOverride != null ? p.afaOverride : afaSatzAuto(p.baujahr);
    const afaBasis = ak * p.gebaeudeAnteil;
    const afaJahr = afaBasis * afaSatz;

    // Annuitätendarlehen, monatlich
    let rs = darlehen, rate = darlehen * (p.zins + p.tilgung) / 12;
    const years = [];
    let afaKum = 0;
    const horizon = Math.max(n, 30);
    for (let j = 1; j <= horizon; j++) {
      const rsStart = rs;
      let zinsen = 0, tilg = 0;
      for (let m = 1; m <= 12; m++) {
        const monthIdx = (j - 1) * 12 + m;
        if (monthIdx === p.bindung * 12 + 1) rate = rs * (p.zinsNach + p.tilgung) / 12;
        const z = monthIdx <= p.bindung * 12 ? p.zins : p.zinsNach;
        if (rs <= 0) break;
        const zm = rs * z / 12;
        const tm = Math.min(rs, rate - zm);
        zinsen += zm; tilg += tm; rs -= tm;
      }
      const g = Math.pow(1 + p.mietSteig, j - 1), k = Math.pow(1 + p.kostenSteig, j - 1);
      const mieteSoll = p.mieteMonat * 12 * g;
      const miete = mieteSoll * (1 - p.leerstand);
      const kosten = p.kostenNichtUml * k;
      const ruecklage = p.ruecklage * k;
      const afa = Math.min(afaJahr, Math.max(0, afaBasis - afaKum));
      afaKum += afa;
      const noi = miete - kosten - ruecklage;
      const kapitaldienst = zinsen + tilg;
      const stErgebnis = miete - zinsen - afa - kosten;   // Rücklage erst bei Verausgabung abzugsfähig
      const steuer = stErgebnis * p.steuersatz;           // + = Zahlung, - = Erstattung
      const cfVor = noi - kapitaldienst;
      const cfNach = cfVor - steuer;
      years.push({ j, rsStart, rsEnde: rs, zinsen, tilg, mieteSoll, miete, kosten, ruecklage, afa, noi,
        kapitaldienst, stErgebnis, steuer, cfVor, cfNach, afaKum });
    }

    // Exit
    const y = years.slice(0, n);
    const last = y[n - 1];
    const vk = kp * Math.pow(1 + p.wertSteig, n);
    const vkKosten = vk * p.verkaufskosten;
    const buchwert = ak - last.afaKum;
    const veraeussGewinn = vk - vkKosten - buchwert;
    const spekSteuer = n < 10 && veraeussGewinn > 0 ? veraeussGewinn * p.steuersatz : 0;
    const exitNetto = vk - vkKosten - last.rsEnde - spekSteuer;

    const flowsNach = [-p.eigenkapital, ...y.map(r => r.cfNach)];
    flowsNach[n] += exitNetto;
    const flowsVor = [-p.eigenkapital, ...y.map(r => r.cfVor)];
    flowsVor[n] += vk - vkKosten - last.rsEnde;
    const sumCfNach = y.reduce((s, r) => s + r.cfNach, 0);
    const sumCfVor = y.reduce((s, r) => s + r.cfVor, 0);
    const zuschussNach = -y.reduce((s, r) => s + Math.min(0, r.cfNach), 0);
    const gewinn = sumCfNach + exitNetto - p.eigenkapital;
    const kapitalEinsatz = p.eigenkapital + zuschussNach;

    const y1 = years[0];
    const jahresKaltSoll = p.mieteMonat * 12;
    const kpi = {
      bruttorendite: kp ? jahresKaltSoll / kp : NaN,
      faktor: jahresKaltSoll ? kp / jahresKaltSoll : NaN,
      nettorendite: ak ? y1.noi / ak : NaN,
      preisQm: p.wohnflaeche ? kp / p.wohnflaeche : NaN,
      mieteQm: p.wohnflaeche ? p.mieteMonat / p.wohnflaeche : NaN,
      ltv: kp ? darlehen / kp : NaN,
      dscr: y1.kapitaldienst ? y1.noi / y1.kapitaldienst : NaN,
      cfNachMonat: y1.cfNach / 12,
      cfVorMonat: y1.cfVor / 12,
      cashOnCash: p.eigenkapital > 0 ? y1.cfNach / p.eigenkapital : NaN,
      irrNach: p.eigenkapital > 0 ? irr(flowsNach) : NaN,
      irrVor: p.eigenkapital > 0 ? irr(flowsVor) : NaN,
      ekMultiple: kapitalEinsatz > 0 ? (gewinn + kapitalEinsatz) / kapitalEinsatz : NaN,
      rateMonat: darlehen * (p.zins + p.tilgung) / 12
    };

    // Ampel
    const amp = (v, g, y2, inv) => !isFinite(v) ? 'na' : inv ? (v <= g ? 'g' : v <= y2 ? 'y' : 'r') : (v >= g ? 'g' : v >= y2 ? 'y' : 'r');
    const ampel = {
      bruttorendite: amp(kpi.bruttorendite, 0.05, 0.035),
      faktor: amp(kpi.faktor, 20, 28, true),
      nettorendite: amp(kpi.nettorendite, 0.035, 0.025),
      dscr: amp(kpi.dscr, 1.2, 1.0),
      cfNachMonat: amp(kpi.cfNachMonat, 0, -150),
      irrNach: amp(kpi.irrNach, 0.06, 0.03),
      ltv: amp(kpi.ltv, 0.8, 1.0, true)
    };
    const pts = Object.values(ampel).reduce((s, a) => s + (a === 'g' ? 2 : a === 'y' ? 1 : 0), 0);
    const maxPts = Object.values(ampel).filter(a => a !== 'na').length * 2;
    const score = maxPts ? pts / maxPts : 0;
    const urteil = score >= 0.7 ? 'Attraktiv' : score >= 0.45 ? 'Prüfenswert' : 'Kritisch';

    return { p, n, nk, ak, darlehen, afaSatz, afaBasis, afaJahr, years: y, allYears: years,
      exit: { vk, vkKosten, rs: last.rsEnde, buchwert, veraeussGewinn, spekSteuer, exitNetto },
      sumCfNach, sumCfVor, zuschussNach, gewinn, kapitalEinsatz, kpi, ampel, score, urteil };
  }

  root.ImmoCalc = { calc, DEFAULTS, afaSatzAuto, irr };
  if (typeof module !== 'undefined') module.exports = root.ImmoCalc;
})(typeof window !== 'undefined' ? window : globalThis);
