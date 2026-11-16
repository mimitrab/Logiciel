// Générateur du compte-rendu : transforme les données saisies en courrier médical rédigé.
import { age, ageTexte, cap, dateCourte, dateLongue, fr, liste, num } from './lib.js';
import {
  CIRCONSTANCES, CONCLUSIONS_COULEURS, CV_DEFICITS, CV_TECHNIQUES, DEVIATIONS, FREQUENCES, NORMES_DEFAUT, PLAINTES, PRECISIONS, RESULTATS_CLASSEMENT, STEREO, TEMPS_ECRAN, TESTS_CLASSEMENT, TYPES_BILAN, WORTH,
  completude, coverReference, evalFusion, evalPPC, indicationReeducation, lectureLang, nomUtilisateur, normesTexte,
} from './domain.js';

/* ---------- Petites briques de rédaction ---------- */
const phrase = (s) => {
  const t = String(s || '').trim();
  if (!t) return '';
  const c = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.!?…]$/.test(c) ? c : `${c}.`;
};
const sansPoint = (s) => String(s || '').trim().replace(/[.;,\s]+$/, '');
// « Myopie légère » → « myopie légère », mais « DMLA » reste « DMLA ».
const minuscule = (s) => (/^[A-ZÀ-Ý][a-zà-ÿ]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const dioptries = (n) => `${fr(n)} dioptrie${n >= 2 ? 's' : ''}`;

export function identite(patient, ref) {
  const a = age(patient.ddn, ref);
  const f = patient.sexe === 'F';
  const enfant = !a.inconnu && a.ans < 18;
  const complet = `${patient.prenom} ${String(patient.nom || '').toUpperCase()}`;
  const civ = f ? 'Mme' : 'M.';
  const jeune = a.ans < 12 ? "l'enfant" : f ? 'la jeune' : 'le jeune';
  return {
    f,
    enfant,
    civ,
    complet,
    e: f ? 'e' : '',
    presentation: enfant ? `${jeune} ${complet}` : `${civ} ${complet}`,
    court: enfant ? patient.prenom : `${civ} ${String(patient.nom || '').toUpperCase()}`,
    age: ageTexte(patient.ddn, ref),
  };
}

/* ---------- Correction optique ---------- */
export const dpt = (n) => `${n > 0 ? '+' : n < 0 ? '-' : ''}${Math.abs(n).toFixed(2).replace('.', ',')}`;
function formuleOeil(o) {
  if (!o) return '';
  const sph = num(o.sph);
  const cyl = num(o.cyl);
  const axe = num(o.axe);
  const add = num(o.add);
  if (sph == null && !cyl && !add) return '';
  let s = sph == null || sph === 0 ? 'plan' : dpt(sph);
  if (cyl) s += ` (${dpt(cyl)}${axe != null ? ` à ${axe}°` : ''})`;
  if (add) s += ` add ${dpt(Math.abs(add))}`;
  return s;
}
export function formuleCorrection(c) {
  if (!c) return '';
  const od = formuleOeil(c.od);
  const og = formuleOeil(c.og);
  return [od && `OD ${od}`, og && `OG ${og}`].filter(Boolean).join(' ; ');
}
export const libelleCorrection = (c) => (!c || c.type === 'aucune' || !c.type ? 'Aucune correction' : c.type === 'lentilles' ? 'Lentilles de contact' : 'Lunettes');
/** Lecture en clair d'une formule : aide à repérer une erreur de signe. */
export function natureOeil(o) {
  if (!o) return '';
  const sph = num(o.sph);
  const n = [];
  if (sph < 0) n.push('myopie');
  if (sph > 0) n.push('hypermétropie');
  if (num(o.cyl)) n.push('astigmatisme');
  if (num(o.add)) n.push('addition de près');
  return n.join(', ');
}

/* ---------- Acuité visuelle ---------- */
const avVal = (v) => (v === '< 1/10' ? 'inférieure à 1/10' : v === 'NM' ? 'non mesurable' : `de ${v}`);
function avDistance(v) {
  const parts = [];
  if (v.od && v.og && v.od === v.og) parts.push(`${avVal(v.od)} à chaque œil`);
  else {
    if (v.od) parts.push(`${avVal(v.od)} à l'œil droit`);
    if (v.og) parts.push(`${avVal(v.og)} à l'œil gauche`);
  }
  let s = liste(parts);
  if (v.odg) s = s ? `${s} (${v.odg === 'NM' ? 'non mesurable' : v.odg} en binoculaire)` : `${avVal(v.odg)} en binoculaire`;
  return s;
}
function avPhrase(intro, a) {
  const vl = avDistance(a.vl);
  const vp = avDistance(a.vp);
  if (!vl && !vp) return '';
  if (vl && vp) return `${intro}, l'acuité visuelle est ${vl} en vision de loin, et ${vp} en vision de près.`;
  return `${intro}, l'acuité visuelle est ${vl || vp} en vision de ${vl ? 'loin' : 'près'}.`;
}

/* ---------- Examen sous écran ---------- */
function partiesDeviation(c) {
  const dev = DEVIATIONS[c.type];
  if (!dev) return null;
  if (dev.kind === 'ortho') return { ortho: true, base: dev.txt, val: '', apres: '', court: '' };
  const p = (PRECISIONS[dev.kind] || []).find((x) => x[0] === c.precision);
  const v = num(c.valeur);
  return { base: dev.txt + (p && p[2].adj ? p[2].adj : ''), val: v ? `de ${dioptries(v)}` : '', apres: (p && p[2].apres) || '', court: (p && p[2].court) || '' };
}
const nomDeviation = (p) => [p.base, p.val].filter(Boolean).join(' ');
/** « une exophorie de 8 dioptries » (ou sans l'article, pour une parenthèse). */
export function descDeviation(c, article = true) {
  const p = partiesDeviation(c);
  if (!p) return '';
  return article ? nomDeviation(p) : nomDeviation(p).replace(/^une? /, '');
}
/** Ce qui est observé pour une condition (sans ou avec correction), de loin et de près. */
function clauseCover(paire) {
  const a = partiesDeviation(paire.vl);
  const b = partiesDeviation(paire.vp);
  if (!a && !b) return null;
  if (a && b && a.ortho && b.ortho) return { ortho: true, texte: 'aucune déviation : orthophorie en vision de loin comme en vision de près' };
  const suite = (p) => (p.apres ? `, ${p.apres}` : '');
  const entre = (p) => (p.court ? ` (${p.court})` : '');
  if (!a || !b) {
    const p = a || b;
    return { texte: `${nomDeviation(p)} en vision de ${a ? 'loin' : 'près'}${suite(p)}` };
  }
  if (a.base === b.base && !a.ortho) {
    if (a.val === b.val && a.apres === b.apres) return { texte: `${nomDeviation(a)} en vision de loin comme en vision de près${suite(a)}` };
    if (a.val && b.val) {
      if (a.apres === b.apres) return { texte: `${a.base} ${a.val} en vision de loin et ${b.val} en vision de près${suite(a)}` };
      return { texte: `${a.base} ${a.val} en vision de loin${entre(a)} et ${b.val} en vision de près${entre(b)}` };
    }
  }
  return { texte: `${nomDeviation(a)}${entre(a)} en vision de loin et ${nomDeviation(b)}${entre(b)} en vision de près` };
}
function coverTest(d) {
  const sc = clauseCover(d.om.cover.sc);
  const ac = clauseCover(d.om.cover.ac);
  if (!sc && !ac) return '';
  const portee = d.av.correction.type && d.av.correction.type !== 'aucune';
  const obs = (c) => (c.ortho ? `on n'observe ${c.texte}` : `on observe ${c.texte}`);
  const debut = "À l'examen sous écran (cover-test)";
  if (sc && ac) {
    if (sc.texte === ac.texte) return `${debut}, avec comme sans correction, ${obs(sc)}.`;
    return `${debut} sans correction, ${obs(sc)}. Avec correction, ${obs(ac)}.`;
  }
  if (sc) return `${debut}${portee ? ' sans correction' : ''}, ${obs(sc)}.`;
  return `${debut} avec correction, ${obs(ac)}.`;
}

function worth(om) {
  const t = (k) => (WORTH.find((w) => w[0] === k) || [])[2];
  const vl = t(om.worth.vl);
  const vp = t(om.worth.vp);
  if (!vl && !vp) return '';
  const debut = "Au test de Worth (verre rouge devant l'œil droit), on note";
  if (vl && vp && vl === vp) return `${debut} ${vl} en vision de loin comme en vision de près.`;
  if (vl && vp) return `${debut} ${vl} en vision de loin et ${vp} en vision de près.`;
  return `${debut} ${vl || vp} en vision de ${vl ? 'loin' : 'près'}.`;
}

function motilite(om) {
  const out = [];
  const det = sansPoint(om.motiliteDetail);
  if (om.motilite === 'normale') out.push('La motilité oculaire est normale dans toutes les directions du regard, sans limitation ni hyperaction.');
  if (om.motilite === 'limitation') out.push(`L'étude de la motilité oculaire met en évidence une limitation${det ? ` : ${minuscule(det)}` : ''}.`);
  if (om.motilite === 'hyperaction') out.push(`L'étude de la motilité oculaire met en évidence une hyperaction${det ? ` : ${minuscule(det)}` : ''}.`);
  if (om.poursuites && om.saccades) out.push(`Les poursuites sont ${om.poursuites} et les saccades ${om.saccades}.`);
  else if (om.poursuites) out.push(`Les poursuites sont ${om.poursuites}.`);
  else if (om.saccades) out.push(`Les saccades sont ${om.saccades}.`);
  return out.join(' ');
}

function ppc(om, normes) {
  const b = num(om.ppc.bris);
  const r = num(om.ppc.recup);
  const ev = evalPPC(om.ppc.bris, normes);
  if (!ev) return '';
  return `Le punctum proximum de convergence (PPC) est rompu à ${fr(b)} cm${r != null ? ` et récupéré à ${fr(r)} cm` : ''}, ${ev.eloigne ? `ce qui est éloigné (norme : jusqu'à ${fr(normes.ppc)} cm)` : 'ce qui est satisfaisant'}.`;
}

function fusionTexte(om, normes) {
  const F = om.fusion;
  const paire = (x) => {
    const b = num(x.bris);
    const r = num(x.recup);
    return b == null ? '' : r == null ? fr(b) : `${fr(b)}/${fr(r)}`;
  };
  const bloc = (f, prime) => [paire(f.d) && `divergence D${prime} ${paire(f.d)}`, paire(f.c) && `convergence C${prime} ${paire(f.c)}`].filter(Boolean).join(' et ');
  const vl = bloc(F.vl, '');
  const vp = bloc(F.vp, "'");
  if (!vl && !vp) return '';
  const segs = [vl && `en vision de loin, ${vl}`, vp && `en vision de près, ${vp}`].filter(Boolean);
  let s = `Les amplitudes de fusion, mesurées à la barre de prismes (bris/récupération, en dioptries), sont les suivantes : ${segs.join(' ; ')}.`;

  const ev = evalFusion(F, normes);
  const ou = (a) => (a.length === 2 ? 'de loin comme de près' : `en vision de ${a[0]}`);
  const ref = `des normes d'Hugonnier (${normesTexte(normes)})`;
  if (ev.cBas.length && ev.dBas.length) s += ` Au regard ${ref}, les amplitudes sont réduites en convergence (${ou(ev.cBas)}) comme en divergence (${ou(ev.dBas)}).`;
  else if (ev.cBas.length) s += ` Au regard ${ref}, la convergence fusionnelle est réduite ${ou(ev.cBas)}${ev.dMesure ? ', la divergence étant conservée' : ''}.`;
  else if (ev.dBas.length) s += ` Au regard ${ref}, la divergence fusionnelle est réduite ${ou(ev.dBas)}${ev.cMesure ? ', la convergence étant conservée' : ''}.`;
  else s += ` Ces amplitudes sont conformes aux normes d'Hugonnier (${normesTexte(normes)}).`;
  return s;
}

function stereo(om) {
  const t = STEREO[om.stereo.test];
  if (!t) return '';
  if (t.kind === 'figures') {
    const l = lectureLang(om.stereo);
    if (!l) return '';
    const noms = liste(l.vues.map((f) => f[2]));
    if (!l.vues.length) return `Aucune figure n'est reconnue ${t.au} (0 sur ${l.total}) : aucune vision stéréoscopique n'est mise en évidence.`;
    if (l.vues.length === l.total) return `La vision stéréoscopique est présente ${t.au} : les ${l.total} figures sont reconnues (${noms}).`;
    if (!l.vuesStereo.length) return `${cap(t.au)}, seule l'étoile, visible en monoculaire, est reconnue (1 figure sur ${l.total}) : aucune vision stéréoscopique n'est mise en évidence.`;
    return `${cap(t.au)}, ${l.vues.length} figure${l.vues.length > 1 ? 's' : ''} sur ${l.total} ${l.vues.length > 1 ? 'sont reconnues' : 'est reconnue'} (${noms}) : la vision stéréoscopique est partielle.`;
  }
  const r = om.stereo.resultat;
  if (r === '' || r == null) return '';
  const n = Number(r);
  if (n === 0) return `Aucune vision stéréoscopique n'est mise en évidence ${t.au}.`;
  const qualite = n <= 60 ? "témoignant d'une stéréoscopie fine" : n <= 120 ? 'ce qui est satisfaisant' : "témoignant d'une stéréoscopie grossière";
  return `La vision stéréoscopique est mesurée à ${n} secondes d'arc ${t.au}, ${qualite}.`;
}

/* ---------- Champ visuel et vision des couleurs ---------- */
function cvOeil(nom, o, technique) {
  const tete = [];
  if (o.fiabilite) tete.push(`${technique === 'goldmann' ? 'coopération' : 'fiabilité'} ${o.fiabilite}`);
  const md = num(o.md);
  if (md != null) tete.push(`déviation moyenne (MD) de ${md > 0 ? '+' : ''}${fr(md)} dB`);
  const def = CV_DEFICITS.filter((x) => o.deficits && o.deficits[x[0]]).map((x) => x[2]);
  const constat = def.length ? `le relevé met en évidence ${liste(def)}` : o.normal ? 'le champ visuel est dans les limites de la normale' : '';
  const segs = [tete.join(', '), constat].filter(Boolean);
  const notes = phrase(o.notes);
  if (!segs.length && !notes) return '';
  return `${nom} : ${[segs.length ? `${segs.join(' ; ')}.` : '', notes].filter(Boolean).join(' ')}`;
}
function champVisuel(cv) {
  const t = CV_TECHNIQUES[cv.technique];
  const out = [];
  const prog = sansPoint(cv.programme);
  if (t) out.push(`L'examen a été réalisé ${t.phrase}${prog ? ` (${minuscule(prog)})` : ''}.`);
  const od = cvOeil('Œil droit', cv.od, cv.technique);
  const og = cvOeil('Œil gauche', cv.og, cv.technique);
  if (od) out.push(od);
  if (og) out.push(og);
  if (cv.commentaire.trim()) out.push(phrase(cv.commentaire));
  return out;
}
function visionCouleurs(k) {
  const out = [];
  const pl = (o) => {
    const l = num(o.lues);
    const t = num(o.total);
    if (l == null) return null;
    return { n: l, txt: `${l} planche${l > 1 ? 's' : ''}${t ? ` sur ${t}` : ''}`, verbe: l > 1 ? 'sont lues' : 'est lue' };
  };
  const od = pl(k.ishihara.od);
  const og = pl(k.ishihara.og);
  if (od && og && od.txt === og.txt) out.push(`Au test d'Ishihara, ${od.txt} ${od.verbe} à chaque œil.`);
  else if (od && og) out.push(`Au test d'Ishihara, ${od.txt} ${od.verbe} à l'œil droit et ${og.txt} à l'œil gauche.`);
  else if (od || og) out.push(`Au test d'Ishihara, ${(od || og).txt} ${(od || og).verbe} à l'œil ${od ? 'droit' : 'gauche'}.`);
  const test = TESTS_CLASSEMENT[k.classement.test];
  const res = (v) => (RESULTATS_CLASSEMENT.find((r) => r[0] === v) || [])[2];
  const cd = res(k.classement.od);
  const cg = res(k.classement.og);
  if (test && (cd || cg)) {
    if (cd && cg && cd === cg) out.push(`${test.au}, ${cd} à chaque œil.`);
    else out.push(`${test.au}, ${[cd && `${cd} à l'œil droit`, cg && `${cg} à l'œil gauche`].filter(Boolean).join(' ; ')}.`);
  }
  if (k.commentaire.trim()) out.push(phrase(k.commentaire));
  return out;
}
const conclusionCouleurs = (k) => (CONCLUSIONS_COULEURS.find((c) => c[0] === k.conclusion) || [])[2] || '';

/* ---------- Conclusion ---------- */
function elementsConclusion(d, normes) {
  const diag = d.conclusion.diag;
  const om = d.om;
  const items = [];
  const fus = evalFusion(om.fusion, normes);
  const ev = evalPPC(om.ppc.bris, normes);
  const ref = coverReference(om);
  const devPres = DEVIATIONS[ref.vp.type];
  const devLoin = DEVIATIONS[ref.vl.type];

  if (diag.ic) {
    const arg = [];
    if (ev && ev.eloigne) arg.push(`PPC à ${fr(num(om.ppc.bris))} cm`);
    if (fus.cBas.length) arg.push('amplitudes de convergence réduites');
    if (devPres && devPres.sens === 'exo') arg.push('exophorie de près');
    items.push(`une insuffisance de convergence${arg.length ? ` (${arg.join(', ')})` : ''}`);
  }
  if (diag.hetero) {
    const c = devPres && devPres.kind === 'phorie' ? ['près', ref.vp] : devLoin && devLoin.kind === 'phorie' ? ['loin', ref.vl] : null;
    items.push(`une hétérophorie décompensée${c ? ` (${descDeviation(c[1], false)} en vision de ${c[0]})` : ''}`);
  }
  if (diag.paralysie) {
    const det = sansPoint(d.conclusion.paralysieDetail);
    items.push(`un tableau évocateur de paralysie oculomotrice${det ? ` (${minuscule(det)})` : ''}`);
  }
  if (diag.amblyopie) {
    const o = d.conclusion.amblyopieOeil;
    const k = o === 'OD' ? 'od' : o === 'OG' ? 'og' : null;
    const av = k && (d.av.ac.vl[k] || d.av.sc.vl[k]);
    const corrigee = k && d.av.ac.vl[k];
    items.push(`une amblyopie${k ? ` de l'œil ${k === 'od' ? 'droit' : 'gauche'}` : ''}${av && av !== 'NM' ? ` (acuité ${corrigee ? 'corrigée ' : ''}${av === '< 1/10' ? 'inférieure à 1/10' : `de ${av}`} de loin)` : ''}`);
  }
  if (diag.strabisme) {
    const c = devLoin && devLoin.kind === 'tropie' ? ['loin', ref.vl] : devPres && devPres.kind === 'tropie' ? ['près', ref.vp] : null;
    items.push(`un strabisme${c ? ` (${descDeviation(c[1], false)} en vision de ${c[0]})` : ''}`);
  }
  if (diag.oculomot) {
    const arg = [om.poursuites && om.poursuites !== 'lisses' && `poursuites ${om.poursuites}`, om.saccades && om.saccades !== 'précises' && `saccades ${om.saccades}`].filter(Boolean);
    items.push(`un trouble de l'oculomotricité conjuguée${arg.length ? ` (${arg.join(', ')})` : ''}`);
  }
  if (diag.neurovisuel) items.push("des signes en faveur d'un trouble neurovisuel");
  return items;
}

function objectifs(d, type) {
  const diag = d.conclusion.diag;
  const o = [];
  if (type === 'basse-vision') o.push("optimiser l'utilisation de la vision fonctionnelle (fixation excentrée, stratégies de lecture) et favoriser l'autonomie au quotidien");
  if (diag.ic) o.push('rapprocher le punctum proximum de convergence et développer les amplitudes de fusion');
  if (diag.hetero) o.push('renforcer les capacités fusionnelles afin de mieux compenser la déviation');
  if (diag.amblyopie) o.push("stimuler l'œil amblyope et consolider la vision binoculaire");
  if (diag.strabisme && !diag.amblyopie) o.push("travailler l'équilibre oculomoteur et la coopération binoculaire");
  if (diag.oculomot) o.push('améliorer la précision des saccades et la fluidité des poursuites');
  if (diag.neurovisuel) o.push("développer les stratégies d'exploration visuelle");
  return o;
}

/* ---------- Courrier complet ----------
   ctx : { cabinet, praticien, normes } */
export function genererCorps(patient, bilan, ctx) {
  const d = bilan.data;
  const normes = ctx.normes || NORMES_DEFAUT;
  const id = identite(patient, bilan.date);
  const type = TYPES_BILAN[bilan.type] || TYPES_BILAN.bilan;
  const exploration = !!type.exploration;
  const technique = CV_TECHNIQUES[d.cv.technique];
  const un = bilan.type === 'cv' && technique ? (d.cv.technique === 'goldmann' ? 'un champ visuel de Goldmann' : 'un champ visuel automatisé') : type.un;
  const objet = bilan.type === 'cv' && technique ? (d.cv.technique === 'goldmann' ? 'champ visuel de Goldmann' : 'champ visuel automatisé') : type.objet;
  const out = [];
  const P = (s) => s && out.push(s);
  const titre = (t) => out.push('', t.toUpperCase());

  out.push(`Objet : compte-rendu de ${objet} – ${id.enfant ? '' : `${id.civ} `}${id.complet}, né${id.e} le ${dateCourte(patient.ddn)} (${id.age})`);
  out.push('', 'Docteur,', '');
  const adresse = patient.prescripteur && patient.prescripteur.nom;
  out.push(
    adresse
      ? `Je vous remercie de m'avoir adressé ${id.presentation}, âgé${id.e} de ${id.age}, que j'ai reçu${id.e} le ${dateLongue(bilan.date)} pour ${un}.`
      : `J'ai reçu le ${dateLongue(bilan.date)} ${id.presentation}, âgé${id.e} de ${id.age}, pour ${un}.`,
  );

  // Motif et anamnèse
  titre(exploration ? 'Contexte' : 'Motif et anamnèse');
  const m = d.motif;
  const plaintes = PLAINTES.filter((x) => x.txt && m.plaintes[x.k]).map((x) => (x.k === 'diplopie' ? `une diplopie${m.diplopieSens ? ` ${m.diplopieSens}` : ''}${m.diplopieFrequence ? ` ${m.diplopieFrequence}` : ''}` : x.txt));
  const circ = CIRCONSTANCES.filter((x) => m.circonstances[x.k]).map((x) => x.txt);
  const para = [];
  if (plaintes.length) {
    let s = `${cap(id.court)} consulte pour ${liste(plaintes)}`;
    if (circ.length) s += `, survenant principalement ${liste(circ)}`;
    if (m.anciennete) s += `, évoluant depuis ${m.anciennete}`;
    para.push(`${s}.`);
  }
  const appr = m.plaintes.troubleApprentissages;
  const dep = m.plaintes.depistage;
  if (appr && dep) para.push("Ce bilan s'inscrit dans le contexte d'un trouble des apprentissages et dans une démarche de dépistage.");
  else if (appr) para.push("Ce bilan s'inscrit dans le contexte d'un trouble des apprentissages.");
  else if (dep) para.push(plaintes.length ? "Ce bilan s'inscrit également dans une démarche de dépistage." : "Ce bilan est réalisé à titre de dépistage, en l'absence de plainte fonctionnelle rapportée.");
  const ecran = TEMPS_ECRAN.find((t) => t[0] === m.tempsEcran);
  if (ecran) para.push(`Le temps d'exposition aux écrans est estimé à ${ecran[2]} par jour.`);
  if (m.notes.trim()) para.push(phrase(m.notes));
  P(para.join(' '));
  const ao = sansPoint(patient.antecedentsOph);
  const ag = sansPoint(patient.antecedentsGen);
  if (ao || ag) P([ao && `Antécédents ophtalmologiques : ${minuscule(ao)}.`, ag && `Antécédents généraux : ${minuscule(ag)}.`].filter(Boolean).join(' '));
  else P("Aucun antécédent ophtalmologique ou général notable n'est rapporté.");

  // Acuité visuelle et réfraction
  const c = d.av.correction;
  const portee = c.type && c.type !== 'aucune';
  const avSC = avPhrase('Sans correction', d.av.sc);
  const avAC = avPhrase('Avec la correction portée', d.av.ac);
  if (!exploration || avSC || avAC || portee) {
    titre('Acuité visuelle et réfraction');
    if (portee) {
      const f = formuleCorrection(c);
      P(`Correction portée (${c.type === 'lentilles' ? 'lentilles de contact' : 'lunettes'})${f ? ` : ${f}` : ''}.`);
    } else P("Aucune correction optique n'est portée.");
    P(avSC);
    P(avAC);
    if (!avSC && !avAC && !exploration) P("L'acuité visuelle n'a pas pu être chiffrée lors de cet examen.");
    if (d.av.directeur === 'OD' || d.av.directeur === 'OG') P(`L'œil directeur est l'œil ${d.av.directeur === 'OD' ? 'droit' : 'gauche'}.`);
  }

  // Examen oculomoteur et binoculaire
  const examen = exploration ? [] : [coverTest(d), motilite(d.om), ppc(d.om, normes), fusionTexte(d.om, normes), worth(d.om), stereo(d.om)].filter(Boolean);
  if (examen.length) {
    titre('Examen oculomoteur et binoculaire');
    examen.forEach(P);
  }

  // Explorations
  const cv = bilan.type === 'cv' || d.cv.fait ? champVisuel(d.cv) : [];
  if (cv.length) {
    titre('Champ visuel');
    cv.forEach(P);
  }
  const couleurs = bilan.type === 'couleurs' || d.couleurs.fait ? visionCouleurs(d.couleurs) : [];
  if (couleurs.length) {
    titre('Vision des couleurs');
    couleurs.forEach(P);
  }

  // Conclusion
  const k = d.conclusion;
  const commentaire = k.commentaire.trim();
  titre('Conclusion');
  if (exploration) {
    if (bilan.type === 'couleurs') P(conclusionCouleurs(d.couleurs) || (!commentaire ? "[Conclusion de l'examen à préciser]" : ''));
    if (commentaire) P(phrase(commentaire));
    P(bilan.type === 'cv' ? 'Les relevés sont joints à ce courrier ; leur interprétation est laissée à votre appréciation.' : 'Les feuilles de résultats sont jointes à ce courrier.');
    if (k.controle) P(`Un examen de contrôle pourra être réalisé dans ${k.controle}, selon votre prescription.`);
  } else {
    const items = elementsConclusion(d, normes);
    if (items.length === 1) P(`Au total, ${type.le} met en évidence ${items[0]}.`);
    else if (items.length > 1) {
      P(`Au total, ${type.le} met en évidence :`);
      items.forEach((it, i) => out.push(`– ${it}${i === items.length - 1 ? '.' : ' ;'}`));
    } else if (k.diag.normal) P(`Au total, ${type.le} est dans les limites de la normale : l'équilibre oculomoteur est satisfaisant et la vision binoculaire est de bonne qualité.`);
    else if (!commentaire) P('[Conclusion diagnostique à préciser]');
    if (commentaire) P(phrase(commentaire));
    if (d.couleurs.fait) P(conclusionCouleurs(d.couleurs));

    // Projet thérapeutique : la rééducation n'est proposée qu'en présence de signes fonctionnels et cliniques concordants.
    const ind = indicationReeducation(d, normes, bilan.type);
    const propose = k.reeducation && ind.ok;
    const projet = [];
    if (k.diag.paralysie) projet.push("Compte tenu de ce tableau, un avis ophtalmologique ou neurologique rapide me paraît nécessaire ; un examen coordimétrique (Lancaster ou Hess-Weiss) pourra compléter le bilan.");
    if (propose) {
      const n = num(k.nbSeances) || 0;
      const f = FREQUENCES.find((x) => x[0] === k.frequence);
      const obj = objectifs(d, bilan.type);
      let s = `Les signes fonctionnels rapportés concordent avec les anomalies relevées à l'examen. Sous réserve de votre accord, je propose une rééducation orthoptique${n ? ` de ${n} séance${n > 1 ? 's' : ''}` : ''}${f ? `, ${f[2]}` : ''}`;
      if (obj.length) s += `, avec pour objectif${obj.length > 1 ? 's' : ''} : ${obj.join(' ; ')}`;
      projet.push(`${s}.`);
      if (k.exercices) projet.push("Des exercices d'entretien à réaliser à domicile y seront associés.");
      projet.push('Un bilan de fin de rééducation vous sera adressé.');
    } else if (!ind.ok && completude(d).om) {
      if (!ind.fonctionnels.length && !ind.cliniques.length) projet.push("En l'absence de signe fonctionnel et d'anomalie à l'examen, il n'y a pas d'indication de rééducation orthoptique.");
      else if (!ind.cliniques.length) projet.push("Les signes fonctionnels rapportés ne s'accompagnent d'aucune anomalie à l'examen orthoptique : il n'y a pas d'indication de rééducation orthoptique.");
      else projet.push("En l'absence de signe fonctionnel associé, les anomalies relevées à l'examen ne constituent pas, à ce jour, une indication de rééducation orthoptique.");
      if (k.exercices) projet.push('Des exercices simples à réaliser à domicile ont été expliqués.');
    } else if (k.exercices) projet.push('Des exercices à réaliser à domicile ont été expliqués.');
    if (k.occlusion) projet.push("Un traitement par occlusion ou pénalisation optique est à discuter selon votre appréciation.");
    if (k.prismation) projet.push('Une prismation pourra être discutée en cas de persistance de la gêne fonctionnelle.');
    if (k.avisOphtalmo && !k.diag.paralysie) projet.push('Un contrôle ophtalmologique avec vérification de la réfraction me paraît souhaitable.');
    if (k.conseils) projet.push("Des conseils d'hygiène visuelle ont été donnés (pauses régulières, distance de travail et éclairage adaptés).");
    if (k.controle) projet.push(`Je propose de revoir ${id.court} pour un bilan de contrôle dans ${k.controle}.`);
    if (projet.length) {
      titre(propose ? 'Projet thérapeutique' : 'Conduite à tenir');
      P(projet.join(' '));
    }
  }

  out.push('', "Je reste à votre disposition pour tout renseignement complémentaire et vous prie d'agréer, Docteur, l'expression de mes salutations respectueuses.");
  out.push('', nomUtilisateur(ctx.praticien), (ctx.praticien && ctx.praticien.titre) || 'Orthoptiste');
  return out.join('\n');
}

export function enteteLignes(cab, praticien) {
  const p = praticien || {};
  return [cab.nom, `${nomUtilisateur(p)} – ${p.titre || 'Orthoptiste'}`, cab.adresse, `${cab.cp} ${cab.ville}`.trim(), [cab.tel && `Tél. ${cab.tel}`, cab.email].filter(Boolean).join(' – '), p.rpps && `N° RPPS : ${p.rpps}`].filter(Boolean);
}
export function destinataireLignes(patient) {
  const p = patient.prescripteur || {};
  if (!p.nom) return ['Au médecin prescripteur'];
  return [`Dr ${p.nom.replace(/^(dr|docteur)\.?\s+/i, '')}`, p.specialite, p.ville].filter(Boolean);
}
export const lieuDate = (cab, bilan) => `${cab.ville || 'Le'}, le ${dateLongue(bilan.date)}`.replace(/^Le, le/, 'Le');

/** Assemble les éléments du courrier ; `corps` reprend le texte édité à la main s'il existe. */
export function courrier(patient, bilan, ctx) {
  const cab = ctx.cabinet;
  return {
    entete: enteteLignes(cab, ctx.praticien),
    destinataire: destinataireLignes(patient),
    lieuDate: lieuDate(cab, bilan),
    corps: bilan.cr ? bilan.cr.texte : genererCorps(patient, bilan, ctx),
    pied: `${cab.nom} – ${cab.adresse}, ${cab.cp} ${cab.ville}`,
  };
}
export function texteComplet(c) {
  return [...c.entete, '', "À l'attention de :", ...c.destinataire, '', c.lieuDate, '', c.corps].join('\n');
}

/** Découpe le corps en blocs typés : sert à l'aperçu A4 et à l'export PDF. */
export function blocs(corps) {
  return String(corps || '')
    .split('\n')
    .map((brut) => {
      const t = brut.replace(/\s+$/, '');
      if (!t.trim()) return { type: 'vide' };
      if (/^Objet\s*:/i.test(t)) return { type: 'objet', texte: t };
      if (/^[–\-•]\s+/.test(t)) return { type: 'puce', texte: t.replace(/^[–\-•]\s+/, '') };
      if (t.length >= 4 && t === t.toUpperCase() && /[A-ZÀ-Ý]{3}/.test(t) && !/[.:;,]$/.test(t)) return { type: 'titre', texte: t };
      return { type: 'texte', texte: t };
    });
}
