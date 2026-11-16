// Référentiels métier : listes de saisie, repères cliniques, barème NGAP simplifié, statuts dérivés.
import { num, r2 } from './lib.js';

/* ---------- Rendez-vous ---------- */
export const MOTIFS = {
  bilan: { label: 'Bilan orthoptique', typeBilan: 'bilan' },
  reeducation: { label: 'Rééducation', typeBilan: 'bilan' },
  bebe: { label: 'Bébé vision', typeBilan: 'bebe' },
  'basse-vision': { label: 'Basse vision', typeBilan: 'basse-vision' },
};
export const STATUTS_RDV = {
  attendu: { label: 'Attendu', tone: 'neutral' },
  'en-salle': { label: "En salle d'attente", tone: 'info' },
  vu: { label: 'Vu', tone: 'ok' },
  absent: { label: 'Absent', tone: 'danger' },
};

/* ---------- Bilans ---------- */
export const TYPES_BILAN = {
  bilan: { label: 'Bilan orthoptique', un: 'un bilan orthoptique', objet: 'bilan orthoptique' },
  bebe: { label: 'Bébé vision', un: 'un bilan orthoptique du nourrisson (« bébé vision »)', objet: 'bilan orthoptique du nourrisson' },
  'basse-vision': { label: 'Basse vision', un: 'un bilan orthoptique basse vision', objet: 'bilan orthoptique basse vision' },
  neurovisuel: { label: 'Troubles neurovisuels', un: 'un bilan des troubles neurovisuels', objet: 'bilan des troubles neurovisuels' },
};
export const STATUTS_BILAN = {
  brouillon: { label: 'À rédiger', tone: 'warn' },
  'a-envoyer': { label: 'À envoyer', tone: 'info' },
  envoye: { label: 'Envoyé', tone: 'ok' },
};

export const PLAINTES = [
  { k: 'cephalees', label: 'Céphalées', txt: 'des céphalées' },
  { k: 'fatigueVisuelle', label: 'Fatigue visuelle', txt: 'une fatigue visuelle' },
  { k: 'diplopie', label: 'Diplopie', txt: 'une diplopie' },
  { k: 'troubleApprentissages', label: 'Trouble des apprentissages' },
  { k: 'depistage', label: 'Dépistage' },
  { k: 'visionFloue', label: 'Vision floue', txt: 'une vision floue' },
  { k: 'difficultesLecture', label: 'Difficultés de lecture', txt: 'des difficultés de lecture (sauts de lignes, perte de repères)' },
  { k: 'photophobie', label: 'Photophobie', txt: 'une photophobie' },
  { k: 'picotements', label: 'Picotements, larmoiement', txt: 'des picotements oculaires avec larmoiement' },
  { k: 'vertiges', label: 'Sensations vertigineuses', txt: 'des sensations vertigineuses' },
];
export const CIRCONSTANCES = [
  { k: 'ecran', label: 'Travail sur écran', txt: 'lors du travail sur écran' },
  { k: 'lecture', label: 'Lecture prolongée', txt: 'à la lecture prolongée' },
  { k: 'finJournee', label: 'Fin de journée', txt: 'en fin de journée' },
  { k: 'conduite', label: 'Conduite', txt: 'à la conduite' },
  { k: 'vp', label: 'Vision de près', txt: 'en vision de près' },
  { k: 'vl', label: 'Vision de loin', txt: 'en vision de loin' },
];
export const ANCIENNETES = ['quelques semaines', 'plusieurs mois', "plus d'un an", 'plusieurs années'];
export const TEMPS_ECRAN = [
  ['lt2', 'Moins de 2 h / jour', 'moins de 2 heures'],
  ['2a4', '2 à 4 h / jour', '2 à 4 heures'],
  ['4a6', '4 à 6 h / jour', '4 à 6 heures'],
  ['gt6', 'Plus de 6 h / jour', 'plus de 6 heures'],
];

export const AV_VL = ['NM', '< 1/10', '1/10', '2/10', '3/10', '4/10', '5/10', '6/10', '7/10', '8/10', '9/10', '10/10', '12/10'];
export const AV_VP = ['NM', 'P28', 'P20', 'P14', 'P10', 'P8', 'P6', 'P5', 'P4', 'P3', 'P2', 'P1,5'];
export const avLabel = (v) => (v === 'NM' ? 'Non mesurable' : v);

export const DEVIATIONS = {
  ortho: { label: 'Orthophorie', txt: 'une orthophorie', kind: 'ortho' },
  esoP: { label: 'Ésophorie (E)', txt: 'une ésophorie', kind: 'phorie', sens: 'eso' },
  exoP: { label: 'Exophorie (X)', txt: 'une exophorie', kind: 'phorie', sens: 'exo' },
  hyperPD: { label: 'Hyperphorie droite (HD)', txt: 'une hyperphorie droite', kind: 'phorie', sens: 'vert' },
  hyperPG: { label: 'Hyperphorie gauche (HG)', txt: 'une hyperphorie gauche', kind: 'phorie', sens: 'vert' },
  esoPT: { label: 'Ésophorie-tropie E(T)', txt: 'une ésophorie-tropie', kind: 'tropie', sens: 'eso' },
  exoPT: { label: 'Exophorie-tropie X(T)', txt: 'une exophorie-tropie', kind: 'tropie', sens: 'exo' },
  esoT: { label: 'Ésotropie (Et)', txt: 'une ésotropie', kind: 'tropie', sens: 'eso' },
  exoT: { label: 'Exotropie (Xt)', txt: 'une exotropie', kind: 'tropie', sens: 'exo' },
  hyperTD: { label: 'Hypertropie droite (HDt)', txt: 'une hypertropie droite', kind: 'tropie', sens: 'vert' },
  hyperTG: { label: 'Hypertropie gauche (HGt)', txt: 'une hypertropie gauche', kind: 'tropie', sens: 'vert' },
};
export const PRECISIONS = {
  phorie: [
    ['restBonne', 'Restitution rapide', { apres: 'avec une restitution rapide', court: 'restitution rapide' }],
    ['restLente', 'Restitution lente', { apres: 'avec une restitution lente', court: 'restitution lente' }],
    ['restDifficile', 'Restitution difficile', { apres: 'avec une restitution difficile', court: 'restitution difficile' }],
  ],
  tropie: [
    ['alternante', 'Alternante', { adj: ' alternante' }],
    ['intermittente', 'Intermittente', { adj: ' intermittente' }],
    ['fixOD', 'Œil droit fixateur', { apres: "l'œil droit étant fixateur", court: 'œil droit fixateur' }],
    ['fixOG', 'Œil gauche fixateur', { apres: "l'œil gauche étant fixateur", court: 'œil gauche fixateur' }],
  ],
};
export const POURSUITES = ['lisses', 'saccadées', 'irrégulières'];
export const SACCADES = ['précises', 'hypométriques', 'hypermétriques', 'lentes'];

export const STEREO = {
  lang1: { label: 'Lang I', au: 'au test de Lang I', kind: 'figures' },
  lang2: { label: 'Lang II', au: 'au test de Lang II', kind: 'figures' },
  tno: { label: 'TNO', au: 'au TNO', kind: 'arc', valeurs: [15, 30, 60, 120, 240, 480] },
  wirt: { label: 'Wirt (Titmus)', au: 'au test de Wirt', kind: 'arc', valeurs: [40, 50, 60, 80, 100, 140, 200, 400, 800] },
};
export const stereoOptions = (test) => {
  const t = STEREO[test];
  if (!t) return [];
  if (t.kind === 'figures')
    return [
      ['3', '3 figures sur 3'],
      ['2', '2 figures sur 3'],
      ['1', '1 figure sur 3'],
      ['0', 'Aucune figure'],
    ];
  return [...t.valeurs.map((v) => [String(v), `${v}″ d'arc`]), ['0', 'Absente']];
};

export const DIAGNOSTICS = [
  { k: 'ic', label: 'Insuffisance de convergence' },
  { k: 'hetero', label: 'Hétérophorie décompensée' },
  { k: 'paralysie', label: 'Paralysie oculomotrice' },
  { k: 'amblyopie', label: 'Amblyopie' },
  { k: 'strabisme', label: 'Strabisme' },
  { k: 'oculomot', label: "Trouble de l'oculomotricité conjuguée" },
  { k: 'neurovisuel', label: 'Trouble neurovisuel' },
  { k: 'normal', label: 'Bilan dans les limites de la normale' },
];
export const FREQUENCES = [
  ['hebdo', '1 séance par semaine', "à raison d'une séance par semaine"],
  ['bi', '2 séances par semaine', 'à raison de deux séances par semaine'],
  ['quinzaine', '1 séance tous les 15 jours', "à raison d'une séance tous les quinze jours"],
];
export const CONTROLES = ['3 mois', '6 mois', '1 an'];

const vide3 = () => ({ od: '', og: '', odg: '' });
const videOeil = () => ({ sph: '', cyl: '', axe: '', add: '' });
const videPaire = () => ({ bris: '', recup: '' });
export const correctionVide = () => ({ type: 'aucune', od: videOeil(), og: videOeil() });

export function bilanVide(patient) {
  const c = patient && patient.correction ? JSON.parse(JSON.stringify(patient.correction)) : correctionVide();
  return {
    motif: { plaintes: {}, diplopieFrequence: '', diplopieSens: '', circonstances: {}, anciennete: '', tempsEcran: '', notes: '' },
    av: {
      correction: { ...correctionVide(), ...c },
      sc: { vl: vide3(), vp: vide3() },
      ac: { vl: vide3(), vp: vide3() },
      directeur: '',
    },
    om: {
      coverVL: { type: '', valeur: '', precision: '' },
      coverVP: { type: '', valeur: '', precision: '' },
      motilite: '',
      motiliteDetail: '',
      poursuites: '',
      saccades: '',
      ppc: videPaire(),
      fusion: { vl: { d: videPaire(), c: videPaire() }, vp: { d: videPaire(), c: videPaire() } },
      stereo: { test: '', resultat: '' },
    },
    conclusion: {
      diag: {},
      paralysieDetail: '',
      amblyopieOeil: '',
      reeducation: false,
      nbSeances: 12,
      frequence: 'hebdo',
      exercices: false,
      conseils: false,
      avisOphtalmo: false,
      prismation: false,
      occlusion: false,
      controle: '',
      commentaire: '',
    },
  };
}

/* ---------- Repères cliniques (indicatifs) ---------- */
export const REPERES = { ppcBon: 8, ppcLimite: 12, cVL: 16, cVP: 25, dVL: 4, dVP: 8 };

export function evalPPC(bris) {
  const b = num(bris);
  if (b == null) return null;
  if (b <= REPERES.ppcBon) return { label: 'Satisfaisant', tone: 'ok', niveau: 0 };
  if (b <= REPERES.ppcLimite) return { label: 'Limite', tone: 'warn', niveau: 1 };
  return { label: 'Insuffisant', tone: 'danger', niveau: 2 };
}
/** Amplitudes de fusion : quelles vergences sont sous les repères usuels ? */
export function evalFusion(f) {
  const v = { cVL: num(f.vl.c.bris), cVP: num(f.vp.c.bris), dVL: num(f.vl.d.bris), dVP: num(f.vp.d.bris) };
  const bas = (k) => v[k] != null && v[k] < REPERES[k];
  return {
    v,
    mesure: Object.values(v).some((x) => x != null),
    cBas: [bas('cVL') && 'loin', bas('cVP') && 'près'].filter(Boolean),
    dBas: [bas('dVL') && 'loin', bas('dVP') && 'près'].filter(Boolean),
    cMesure: v.cVL != null || v.cVP != null,
    dMesure: v.dVL != null || v.dVP != null,
  };
}

/** Propose des conclusions à partir des mesures saisies (aide à la décision, jamais appliquée d'office). */
export function suggererDiagnostics(d) {
  const s = {};
  const ppc = evalPPC(d.om.ppc.bris);
  const fus = evalFusion(d.om.fusion);
  const devs = [d.om.coverVL, d.om.coverVP].map((c) => ({ ...c, def: DEVIATIONS[c.type], val: num(c.valeur) || 0 })).filter((c) => c.def);
  const p = d.motif.plaintes;
  const gene = p.cephalees || p.fatigueVisuelle || p.diplopie || p.visionFloue || p.difficultesLecture;

  if ((ppc && ppc.niveau === 2) || (ppc && ppc.niveau === 1 && fus.cBas.length) || (fus.cBas.includes('près') && devs.some((c) => c.def.sens === 'exo'))) s.ic = true;
  if (devs.some((c) => c.def.kind === 'tropie')) s.strabisme = true;
  const phories = devs.filter((c) => c.def.kind === 'phorie' && c.val >= 6);
  if (gene && phories.some((c) => (c.def.sens === 'exo' && fus.cBas.length) || (c.def.sens === 'eso' && fus.dBas.length) || c.def.sens === 'vert' || c.precision === 'restLente' || c.precision === 'restDifficile'))
    s.hetero = true;
  if (d.om.motilite === 'limitation' && p.diplopie) s.paralysie = true;
  if ((d.om.poursuites && d.om.poursuites !== 'lisses') || (d.om.saccades && d.om.saccades !== 'précises')) s.oculomot = true;

  const av = (o) => {
    const v = d.av.ac.vl[o] || d.av.sc.vl[o];
    return v ? AV_VL.indexOf(v) : -1;
  };
  const od = av('od');
  const og = av('og');
  if (od > 0 && og > 0 && Math.abs(od - og) >= 2 && Math.min(od, og) <= AV_VL.indexOf('7/10')) {
    s.amblyopie = true;
    s.amblyopieOeil = od < og ? 'OD' : 'OG';
  }
  const examine = devs.length > 0 && ppc;
  if (examine && !Object.keys(s).length && ppc.niveau === 0 && !fus.cBas.length && !fus.dBas.length) s.normal = true;
  return s;
}

/** Quelles parties du bilan contiennent des données ? (témoin de complétude avant génération) */
export function completude(d) {
  const any = (o) => Object.values(o).some((x) => (x && typeof x === 'object' ? any(x) : x !== '' && x != null && x !== false));
  return {
    motif: any(d.motif),
    av: any(d.av.sc) || any(d.av.ac),
    om: any(d.om),
    conclusion: any(d.conclusion.diag) || d.conclusion.reeducation || !!d.conclusion.commentaire.trim(),
  };
}

export function resumeBilan(b) {
  const diag = DIAGNOSTICS.filter((x) => b.data.conclusion.diag[x.k]).map((x) => x.label);
  if (diag.length) return diag.join(' · ');
  if (b.statut === 'brouillon') return 'Saisie en cours';
  return 'Conclusion rédigée en texte libre';
}

/* ---------- Facturation : barème NGAP simplifié (valeurs indicatives, modifiables) ---------- */
export const ACTES = [
  { code: 'AV', coef: 8.7, famille: 'bilan', libelle: 'Bilan orthoptique : acuité visuelle et réfraction' },
  { code: 'BO', coef: 15.2, famille: 'bilan', libelle: 'Bilan orthoptique : déséquilibres oculomoteurs et vision binoculaire' },
  { code: 'BNV', coef: 30.5, famille: 'bilan', libelle: 'Bilan des troubles neurovisuels' },
  { code: 'BBV', coef: 30, famille: 'bilan', libelle: 'Bilan orthoptique basse vision' },
  { code: 'RB', coef: 5.4, famille: 'seance', libelle: 'Séance de rééducation : déséquilibres binoculaires (20 min)' },
  { code: 'RS', coef: 6.8, famille: 'seance', libelle: 'Séance de rééducation : strabisme (20 min)' },
  { code: 'RA', coef: 5.8, famille: 'seance', libelle: "Séance de traitement de l'amblyopie (20 min)" },
  { code: 'RBV', coef: 18, famille: 'seance', libelle: 'Séance de rééducation basse vision (60 min)' },
];
export const acte = (code) => ACTES.find((a) => a.code === code) || ACTES[1];
export const cotation = (coef) => `AMY ${String(coef).replace('.', ',')}`;

export const EXONERATIONS = {
  aucune: { label: 'Régime général (60 %)', court: '60 %', taux: 0.6 },
  ald: { label: 'ALD (100 %)', court: 'ALD 100 %', taux: 1 },
  maternite: { label: 'Maternité (100 %)', court: 'Maternité 100 %', taux: 1 },
  css: { label: 'Complémentaire santé solidaire', court: 'CSS', taux: 0.6, amcIntegrale: true },
};
export const STATUTS_FACTURE = {
  'a-facturer': { label: 'À facturer', tone: 'warn' },
  'en-attente': { label: 'En attente', tone: 'info' },
  payee: { label: 'Payée', tone: 'ok' },
};
export const MODES = [
  ['tiers-payant', 'Tiers payant'],
  ['cb', 'Carte bancaire'],
  ['cheque', 'Chèque'],
  ['especes', 'Espèces'],
];

export function calculFacture({ coef, qte = 1, valeurAMY, exoneration = 'aucune', mutuelle }) {
  const ex = EXONERATIONS[exoneration] || EXONERATIONS.aucune;
  const montant = r2((num(coef) || 0) * (num(valeurAMY) || 0) * (num(qte) || 1));
  const partAMO = r2(montant * ex.taux);
  const reste = r2(montant - partAMO);
  const partAMC = ex.amcIntegrale || mutuelle ? reste : 0;
  return { montant, taux: ex.taux, partAMO, partAMC, partPatient: r2(reste - partAMC) };
}

/** Sélection automatique de l'acte : d'après le bilan saisi, sinon d'après le rendez-vous ou l'ordonnance. */
export function suggererActe({ patient, bilan, rdv }) {
  if (bilan) {
    if (bilan.type === 'basse-vision') return { code: 'BBV', raison: 'bilan basse vision' };
    if (bilan.type === 'neurovisuel') return { code: 'BNV', raison: 'bilan des troubles neurovisuels' };
    const c = completude(bilan.data);
    if (c.om) return { code: 'BO', raison: 'examen oculomoteur et binoculaire renseigné dans le bilan' };
    return { code: 'AV', raison: "bilan limité à l'acuité visuelle et à la réfraction" };
  }
  if (rdv && rdv.motif !== 'reeducation') {
    if (rdv.motif === 'basse-vision' && !(patient.ordonnance && patient.ordonnance.prescrites)) return { code: 'BBV', raison: 'rendez-vous basse vision' };
    if (rdv.motif === 'bilan' || rdv.motif === 'bebe') return { code: 'BO', raison: `rendez-vous « ${MOTIFS[rdv.motif].label} »` };
  }
  if (patient && patient.ordonnance && patient.ordonnance.prescrites) return { code: patient.ordonnance.acte || 'RB', raison: 'ordonnance de rééducation en cours' };
  return { code: 'BO', raison: 'acte le plus courant en première consultation' };
}

/* ---------- Statuts dérivés ---------- */
export function seancesRestantes(p) {
  const o = p.ordonnance;
  if (!o || !o.prescrites) return null;
  return Math.max(0, o.prescrites - (o.effectuees || 0));
}
export function statutDossier(state, p) {
  const bs = state.bilans.filter((b) => b.patientId === p.id);
  if (bs.some((b) => b.statut === 'brouillon')) return { label: 'Bilan à rédiger', tone: 'warn' };
  if (bs.some((b) => b.statut === 'a-envoyer')) return { label: 'Compte-rendu à envoyer', tone: 'info' };
  const reste = seancesRestantes(p);
  if (reste === 0) return { label: 'Ordonnance à renouveler', tone: 'danger' };
  if (reste != null && reste <= 2) return { label: 'Ordonnance bientôt terminée', tone: 'warn' };
  if (!bs.length) return { label: 'Nouveau dossier', tone: 'neutral' };
  return { label: 'Dossier à jour', tone: 'ok' };
}
