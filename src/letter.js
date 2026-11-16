// Générateur du compte-rendu : transforme les données saisies en courrier médical rédigé.
import { age, ageTexte, cap, dateCourte, dateLongue, fr, liste, num } from './lib.js';
import { CIRCONSTANCES, DEVIATIONS, FREQUENCES, PLAINTES, PRECISIONS, STEREO, TEMPS_ECRAN, TYPES_BILAN, evalFusion, evalPPC } from './domain.js';

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
const dpt = (n) => `${n > 0 ? '+' : n < 0 ? '-' : ''}${Math.abs(n).toFixed(2).replace('.', ',')}`;
function formuleOeil(o) {
  if (!o) return '';
  const sph = num(o.sph);
  const cyl = num(o.cyl);
  const axe = num(o.axe);
  const add = num(o.add);
  if (sph == null && !cyl && !add) return '';
  let s = sph == null || sph === 0 ? 'plan' : dpt(sph);
  if (cyl) s += ` (${dpt(cyl)}${axe != null ? ` à ${axe}°` : ''})`;
  if (add) s += ` add ${dpt(add)}`;
  return s;
}
export function formuleCorrection(c) {
  if (!c) return '';
  const od = formuleOeil(c.od);
  const og = formuleOeil(c.og);
  return [od && `OD ${od}`, og && `OG ${og}`].filter(Boolean).join(' ; ');
}
export const libelleCorrection = (c) => (!c || c.type === 'aucune' || !c.type ? 'Aucune correction' : c.type === 'lentilles' ? 'Lentilles de contact' : 'Lunettes');

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

function coverTest(om) {
  const a = partiesDeviation(om.coverVL);
  const b = partiesDeviation(om.coverVP);
  if (!a && !b) return '';
  if (a && b && a.ortho && b.ortho) return "L'examen sous écran (cover-test) ne met pas en évidence de déviation : orthophorie en vision de loin comme en vision de près.";
  const debut = "À l'examen sous écran (cover-test), on observe";
  const suite = (p) => (p.apres ? `, ${p.apres}` : '');
  const entre = (p) => (p.court ? ` (${p.court})` : '');
  if (!a || !b) {
    const p = a || b;
    return `${debut} ${nomDeviation(p)} en vision de ${a ? 'loin' : 'près'}${suite(p)}.`;
  }
  if (a.base === b.base && !a.ortho) {
    if (a.val === b.val && a.apres === b.apres) return `${debut} ${nomDeviation(a)} en vision de loin comme en vision de près${suite(a)}.`;
    if (a.val && b.val) {
      if (a.apres === b.apres) return `${debut} ${a.base} ${a.val} en vision de loin et ${b.val} en vision de près${suite(a)}.`;
      return `${debut} ${a.base} ${a.val} en vision de loin${entre(a)} et ${b.val} en vision de près${entre(b)}.`;
    }
  }
  return `${debut} ${nomDeviation(a)}${entre(a)} en vision de loin et ${nomDeviation(b)}${entre(b)} en vision de près.`;
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

function ppc(om) {
  const b = num(om.ppc.bris);
  const r = num(om.ppc.recup);
  const ev = evalPPC(om.ppc.bris);
  if (!ev) return '';
  const suite = ['ce qui est satisfaisant', 'ce qui reste limite', 'ce qui est insuffisant'][ev.niveau];
  return `Le punctum proximum de convergence (PPC) est rompu à ${fr(b)} cm${r != null ? ` et récupéré à ${fr(r)} cm` : ''}, ${suite}.`;
}

function fusionTexte(om) {
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

  const ev = evalFusion(F);
  const ou = (a) => (a.length === 2 ? 'de loin comme de près' : `en vision de ${a[0]}`);
  if (ev.cBas.length && ev.dBas.length) s += ` Les amplitudes sont réduites en convergence (${ou(ev.cBas)}) comme en divergence (${ou(ev.dBas)}).`;
  else if (ev.cBas.length) s += ` La convergence fusionnelle est réduite ${ou(ev.cBas)}${ev.dMesure ? ', la divergence étant conservée' : ''}.`;
  else if (ev.dBas.length) s += ` La divergence fusionnelle est réduite ${ou(ev.dBas)}${ev.cMesure ? ', la convergence étant conservée' : ''}.`;
  else s += ' Ces amplitudes sont satisfaisantes.';
  return s;
}

function stereo(om) {
  const t = STEREO[om.stereo.test];
  const r = om.stereo.resultat;
  if (!t || r === '' || r == null) return '';
  const n = Number(r);
  if (n === 0) return `Aucune vision stéréoscopique n'est mise en évidence ${t.au}.`;
  if (t.kind === 'figures') {
    if (n === 3) return `La vision stéréoscopique est présente ${t.au} (3 figures reconnues sur 3).`;
    return `La vision stéréoscopique est partielle ${t.au} (${n} figure${n > 1 ? 's' : ''} reconnue${n > 1 ? 's' : ''} sur 3).`;
  }
  const qualite = n <= 60 ? "témoignant d'une stéréoscopie fine" : n <= 120 ? 'ce qui est satisfaisant' : "témoignant d'une stéréoscopie grossière";
  return `La vision stéréoscopique est mesurée à ${n} secondes d'arc ${t.au}, ${qualite}.`;
}

/* ---------- Conclusion ---------- */
function elementsConclusion(d, id) {
  const diag = d.conclusion.diag;
  const om = d.om;
  const items = [];
  const fus = evalFusion(om.fusion);
  const ev = evalPPC(om.ppc.bris);
  const devPres = DEVIATIONS[om.coverVP.type];
  const devLoin = DEVIATIONS[om.coverVL.type];

  if (diag.ic) {
    const arg = [];
    if (ev && ev.niveau > 0) arg.push(`PPC à ${fr(num(om.ppc.bris))} cm`);
    if (fus.cBas.length) arg.push('amplitudes de convergence réduites');
    if (devPres && devPres.sens === 'exo') arg.push('exophorie de près');
    items.push(`une insuffisance de convergence${arg.length ? ` (${arg.join(', ')})` : ''}`);
  }
  if (diag.hetero) {
    const c = devPres && devPres.kind === 'phorie' ? ['près', om.coverVP] : devLoin && devLoin.kind === 'phorie' ? ['loin', om.coverVL] : null;
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
    const c = devLoin && devLoin.kind === 'tropie' ? ['loin', om.coverVL] : devPres && devPres.kind === 'tropie' ? ['près', om.coverVP] : null;
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

/* ---------- Courrier complet ---------- */
export function genererCorps(patient, bilan, cabinet) {
  const d = bilan.data;
  const id = identite(patient, bilan.date);
  const type = TYPES_BILAN[bilan.type] || TYPES_BILAN.bilan;
  const out = [];
  const P = (s) => s && out.push(s);
  const titre = (t) => out.push('', t.toUpperCase());

  out.push(`Objet : compte-rendu de ${type.objet} – ${id.enfant ? '' : `${id.civ} `}${id.complet}, né${id.e} le ${dateCourte(patient.ddn)} (${id.age})`);
  out.push('', 'Docteur,', '');
  const adresse = patient.prescripteur && patient.prescripteur.nom;
  out.push(
    adresse
      ? `Je vous remercie de m'avoir adressé ${id.presentation}, âgé${id.e} de ${id.age}, que j'ai reçu${id.e} le ${dateLongue(bilan.date)} pour ${type.un}.`
      : `J'ai reçu le ${dateLongue(bilan.date)} ${id.presentation}, âgé${id.e} de ${id.age}, pour ${type.un}.`,
  );

  // Motif et anamnèse
  titre('Motif et anamnèse');
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
  titre('Acuité visuelle et réfraction');
  if (portee) {
    const f = formuleCorrection(c);
    P(`Correction portée (${c.type === 'lentilles' ? 'lentilles de contact' : 'lunettes'})${f ? ` : ${f}` : ''}.`);
  } else P("Aucune correction optique n'est portée.");
  P(avSC);
  P(avAC);
  if (!avSC && !avAC) P("L'acuité visuelle n'a pas pu être chiffrée lors de cet examen.");
  if (d.av.directeur === 'OD' || d.av.directeur === 'OG') P(`L'œil directeur est l'œil ${d.av.directeur === 'OD' ? 'droit' : 'gauche'}.`);

  // Examen oculomoteur et binoculaire
  const examen = [coverTest(d.om), motilite(d.om), ppc(d.om), fusionTexte(d.om), stereo(d.om)].filter(Boolean);
  if (examen.length) {
    titre('Examen oculomoteur et binoculaire');
    examen.forEach(P);
  }

  // Conclusion
  titre('Conclusion');
  const items = elementsConclusion(d, id);
  const commentaire = d.conclusion.commentaire.trim();
  if (items.length === 1) P(`Au total, le bilan orthoptique met en évidence ${items[0]}.`);
  else if (items.length > 1) {
    P('Au total, le bilan orthoptique met en évidence :');
    items.forEach((it, i) => out.push(`– ${it}${i === items.length - 1 ? '.' : ' ;'}`));
  } else if (d.conclusion.diag.normal) P("Au total, le bilan orthoptique est dans les limites de la normale : l'équilibre oculomoteur est satisfaisant et la vision binoculaire est de bonne qualité.");
  else if (!commentaire) P('[Conclusion diagnostique à préciser]');
  if (commentaire) P(phrase(commentaire));

  // Projet thérapeutique
  const k = d.conclusion;
  const projet = [];
  if (k.diag.paralysie) projet.push("Compte tenu de ce tableau, un avis ophtalmologique ou neurologique rapide me paraît nécessaire ; un examen coordimétrique (Lancaster ou Hess-Weiss) pourra compléter le bilan.");
  if (k.reeducation) {
    const n = num(k.nbSeances) || 0;
    const f = FREQUENCES.find((x) => x[0] === k.frequence);
    const obj = objectifs(d, bilan.type);
    let s = `Sous réserve de votre accord, je propose une rééducation orthoptique${n ? ` de ${n} séance${n > 1 ? 's' : ''}` : ''}${f ? `, ${f[2]}` : ''}`;
    if (obj.length) s += `, avec pour objectif${obj.length > 1 ? 's' : ''} : ${obj.join(' ; ')}`;
    projet.push(`${s}.`);
    if (k.exercices) projet.push("Des exercices d'entretien à réaliser à domicile y seront associés.");
    projet.push('Un bilan de fin de rééducation vous sera adressé.');
  } else if (k.exercices) projet.push('Des exercices à réaliser à domicile ont été expliqués.');
  if (!k.reeducation && k.diag.normal && !items.length) projet.push("Aucune rééducation orthoptique n'est indiquée à ce jour.");
  if (k.occlusion) projet.push("Un traitement par occlusion ou pénalisation optique est à discuter selon votre appréciation.");
  if (k.prismation) projet.push('Une prismation pourra être discutée en cas de persistance de la gêne fonctionnelle.');
  if (k.avisOphtalmo && !k.diag.paralysie) projet.push('Un contrôle ophtalmologique avec vérification de la réfraction me paraît souhaitable.');
  if (k.conseils) projet.push("Des conseils d'hygiène visuelle ont été donnés (pauses régulières, distance de travail et éclairage adaptés).");
  if (k.controle) projet.push(`Je propose de revoir ${id.court} pour un bilan de contrôle dans ${k.controle}.`);
  if (projet.length) {
    titre('Projet thérapeutique');
    P(projet.join(' '));
  }

  out.push('', "Je reste à votre disposition pour tout renseignement complémentaire et vous prie d'agréer, Docteur, l'expression de mes salutations respectueuses.");
  out.push('', cabinet.praticien, cabinet.titre);
  return out.join('\n');
}

export function enteteLignes(cab) {
  return [cab.nom, `${cab.praticien} – ${cab.titre}`, cab.adresse, `${cab.cp} ${cab.ville}`.trim(), [cab.tel && `Tél. ${cab.tel}`, cab.email].filter(Boolean).join(' – '), cab.rpps && `N° RPPS : ${cab.rpps}`].filter(Boolean);
}
export function destinataireLignes(patient) {
  const p = patient.prescripteur || {};
  if (!p.nom) return ['Au médecin prescripteur'];
  return [`Dr ${p.nom.replace(/^(dr|docteur)\.?\s+/i, '')}`, p.specialite, p.ville].filter(Boolean);
}
export const lieuDate = (cab, bilan) => `${cab.ville || 'Le'}, le ${dateLongue(bilan.date)}`.replace(/^Le, le/, 'Le');

/** Assemble les éléments du courrier ; `corps` reprend le texte édité à la main s'il existe. */
export function courrier(patient, bilan, cabinet) {
  return {
    entete: enteteLignes(cabinet),
    destinataire: destinataireLignes(patient),
    lieuDate: lieuDate(cabinet, bilan),
    corps: bilan.cr ? bilan.cr.texte : genererCorps(patient, bilan, cabinet),
    pied: `${cabinet.nom} – ${cabinet.adresse}, ${cabinet.cp} ${cabinet.ville}`,
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
