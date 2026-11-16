// Référentiels métier : motifs et durées, listes de saisie, normes cliniques, règle de décision
// thérapeutique, barème NGAP, statuts dérivés.
import { age, num, r2 } from './lib.js';

/* ---------- Rendez-vous : motifs et durées ---------- */
export const FAMILLES = {
  bilan: { label: 'Bilans' },
  reeducation: { label: 'Rééducation' },
  exploration: { label: 'Explorations fonctionnelles' },
};
// `duree` est attribuée automatiquement ; `options` propose les variantes usuelles ; tout reste modulable.
export const MOTIFS = {
  bilan: { label: 'Bilan orthoptique (plus de 6 ans)', court: 'Bilan orthoptique', famille: 'bilan', duree: 40, options: [40, 45, 60], plage: '40 min, ou 45 min à 1 h selon les besoins', typeBilan: 'bilan' },
  'bilan-enfant': { label: 'Bilan enfant de moins de 6 ans (bébé vision)', court: 'Bébé vision', famille: 'bilan', duree: 40, options: [30, 40], plage: '40 min', typeBilan: 'bebe' },
  neurovisuel: { label: 'Bilan neurovisuel', court: 'Bilan neurovisuel', famille: 'bilan', duree: 70, options: [70], plage: '1 h 10', typeBilan: 'neurovisuel' },
  'basse-vision': { label: 'Bilan basse vision', court: 'Basse vision', famille: 'bilan', duree: 70, options: [70], plage: '1 h 10', typeBilan: 'basse-vision' },
  'reeduc-adulte': { label: 'Rééducation orthoptique adulte', court: 'Rééducation adulte', famille: 'reeducation', duree: 20, options: [20, 25], plage: '20 à 25 min selon les besoins', typeBilan: 'bilan', seance: true },
  'reeduc-enfant': { label: 'Rééducation orthoptique enfant', court: 'Rééducation enfant', famille: 'reeducation', duree: 30, options: [30], plage: '30 min', typeBilan: 'bilan', seance: true },
  'cv-auto': { label: 'Champ visuel automatisé', court: 'Champ visuel automatisé', famille: 'exploration', duree: 30, options: [30], plage: '30 min', typeBilan: 'cv', technique: 'auto' },
  'cv-goldmann': { label: 'Champ visuel de Goldmann', court: 'Champ visuel Goldmann', famille: 'exploration', duree: 40, options: [40], plage: '40 min', typeBilan: 'cv', technique: 'goldmann' },
  couleurs: { label: 'Vision des couleurs', court: 'Vision des couleurs', famille: 'exploration', duree: 20, options: [20], plage: '20 min', typeBilan: 'couleurs' },
};
export const AGE_REEDUC_ENFANT = 16;
/** Une rééducation bascule sur la variante adulte ou enfant selon l'âge du patient. */
export function motifSelonAge(motif, patient) {
  const m = MOTIFS[motif];
  if (!m || m.famille !== 'reeducation' || !patient || !patient.ddn) return motif;
  return age(patient.ddn).ans < AGE_REEDUC_ENFANT ? 'reeduc-enfant' : 'reeduc-adulte';
}
export const STATUTS_RDV = {
  attendu: { label: 'Attendu', tone: 'neutral' },
  'en-salle': { label: "En salle d'attente", tone: 'info' },
  vu: { label: 'Vu', tone: 'ok' },
  absent: { label: 'Absent', tone: 'danger' },
};

/* ---------- Bilans ---------- */
export const TYPES_BILAN = {
  bilan: { label: 'Bilan orthoptique', un: 'un bilan orthoptique', objet: 'bilan orthoptique', le: 'le bilan orthoptique' },
  bebe: { label: 'Bébé vision', un: 'un bilan orthoptique du jeune enfant', objet: 'bilan orthoptique du jeune enfant', le: 'le bilan orthoptique' },
  'basse-vision': { label: 'Basse vision', un: 'un bilan orthoptique basse vision', objet: 'bilan orthoptique basse vision', le: 'le bilan orthoptique basse vision' },
  neurovisuel: { label: 'Troubles neurovisuels', un: 'un bilan des troubles neurovisuels', objet: 'bilan des troubles neurovisuels', le: 'le bilan neurovisuel' },
  cv: { label: 'Champ visuel', un: 'un champ visuel', objet: 'champ visuel', le: "l'examen", exploration: true },
  couleurs: { label: 'Vision des couleurs', un: 'un examen de la vision des couleurs', objet: 'examen de la vision des couleurs', le: "l'examen", exploration: true },
};
export const STATUTS_BILAN = {
  brouillon: { label: 'À rédiger', tone: 'warn' },
  'a-envoyer': { label: 'À envoyer', tone: 'info' },
  envoye: { label: 'Envoyé', tone: 'ok' },
};

// `fonctionnel` : la plainte compte comme signe fonctionnel dans la règle de décision thérapeutique.
export const PLAINTES = [
  { k: 'cephalees', label: 'Céphalées', txt: 'des céphalées', fonctionnel: true },
  { k: 'fatigueVisuelle', label: 'Fatigue visuelle', txt: 'une fatigue visuelle', fonctionnel: true },
  { k: 'diplopie', label: 'Diplopie', txt: 'une diplopie', fonctionnel: true },
  { k: 'troubleApprentissages', label: 'Trouble des apprentissages' },
  { k: 'depistage', label: 'Dépistage' },
  { k: 'visionFloue', label: 'Vision floue', txt: 'une vision floue', fonctionnel: true },
  { k: 'baisseAV', label: "Baisse d'acuité visuelle", txt: "une baisse d'acuité visuelle", fonctionnel: true },
  { k: 'difficultesLecture', label: 'Difficultés de lecture', txt: 'des difficultés de lecture (sauts de lignes, perte de repères)', fonctionnel: true },
  { k: 'deviation', label: 'Déviation oculaire constatée', txt: "une déviation oculaire constatée par l'entourage", fonctionnel: true },
  { k: 'photophobie', label: 'Photophobie', txt: 'une photophobie', fonctionnel: true },
  { k: 'picotements', label: 'Picotements, larmoiement', txt: 'des picotements oculaires avec larmoiement', fonctionnel: true },
  { k: 'vertiges', label: 'Sensations vertigineuses', txt: 'des sensations vertigineuses', fonctionnel: true },
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

// Test de Worth, verre rouge devant l'œil droit.
export const WORTH = [
  ['fusion', 'Vision simultanée, fusion (4)', 'une fusion (4 lumières perçues)'],
  ['neutOD', 'Neutralisation OD (3 vertes)', "une neutralisation de l'œil droit (3 lumières vertes perçues)", true],
  ['neutOG', 'Neutralisation OG (2 rouges)', "une neutralisation de l'œil gauche (2 lumières rouges perçues)", true],
  ['alternance', 'Neutralisation alternante', 'une neutralisation alternante', true],
  ['diplopieH', 'Diplopie homonyme (5)', 'une diplopie homonyme (5 lumières perçues)', true],
  ['diplopieC', 'Diplopie croisée (5)', 'une diplopie croisée (5 lumières perçues)', true],
];

// Lang I : 3 figures. Lang II : 4 figures, dont l'étoile visible en monoculaire.
// Chaque figure : [clé, libellé, nom avec article, disparité en secondes d'arc, visible en monoculaire].
export const STEREO = {
  lang1: { label: 'Lang I', au: 'au test de Lang I', kind: 'figures', figures: [['chat', 'Chat', 'le chat', 1200], ['etoile', 'Étoile', "l'étoile", 600], ['voiture', 'Voiture', 'la voiture', 550]] },
  lang2: { label: 'Lang II', au: 'au test de Lang II', kind: 'figures', figures: [['elephant', 'Éléphant', "l'éléphant", 600], ['camion', 'Camion', 'le camion', 400], ['lune', 'Lune', 'la lune', 200], ['etoile', 'Étoile', "l'étoile", 200, true]] },
  tno: { label: 'TNO', au: 'au TNO', kind: 'arc', valeurs: [15, 30, 60, 120, 240, 480] },
  wirt: { label: 'Wirt (Titmus)', au: 'au test de Wirt', kind: 'arc', valeurs: [40, 50, 60, 80, 100, 140, 200, 400, 800] },
};
export const stereoOptions = (test) => {
  const t = STEREO[test];
  if (!t || t.kind !== 'arc') return [];
  return [...t.valeurs.map((v) => [String(v), `${v}″ d'arc`]), ['0', 'Absente']];
};
/** Résultat d'un test de Lang : figures reconnues, dont celles qui prouvent une stéréoscopie. */
export function lectureLang(stereo) {
  const t = STEREO[stereo.test];
  if (!t || t.kind !== 'figures') return null;
  const vues = t.figures.filter((f) => stereo.figures && stereo.figures[f[0]]);
  if (!vues.length && !stereo.saisi) return null;
  const stereoscopiques = t.figures.filter((f) => !f[4]);
  return { test: t, total: t.figures.length, vues, vuesStereo: vues.filter((f) => !f[4]), totalStereo: stereoscopiques.length };
}

/* ---------- Champ visuel ---------- */
export const CV_TECHNIQUES = {
  auto: { label: 'Périmétrie statique automatisée', phrase: 'en périmétrie statique automatisée' },
  goldmann: { label: 'Périmétrie cinétique de Goldmann', phrase: 'en périmétrie cinétique de Goldmann' },
};
export const CV_FIABILITE = ['bonne', 'moyenne', 'médiocre'];
export const CV_DEFICITS = [
  ['scotomeCentral', 'Scotome central', 'un scotome central'],
  ['scotomeParacentral', 'Scotome paracentral', 'un scotome paracentral'],
  ['arciforme', 'Scotome arciforme', 'un scotome arciforme'],
  ['ressautNasal', 'Ressaut nasal', 'un ressaut nasal'],
  ['retrecissement', 'Rétrécissement concentrique', 'un rétrécissement concentrique'],
  ['altitudinal', 'Déficit altitudinal', 'un déficit altitudinal'],
  ['hlhD', 'Hémianopsie latérale homonyme droite', 'une hémianopsie latérale homonyme droite'],
  ['hlhG', 'Hémianopsie latérale homonyme gauche', 'une hémianopsie latérale homonyme gauche'],
  ['bitemporale', 'Hémianopsie bitemporale', 'une hémianopsie bitemporale'],
  ['quadranopsie', 'Quadranopsie', 'une quadranopsie'],
  ['tacheAveugle', 'Élargissement de la tache aveugle', 'un élargissement de la tache aveugle'],
];

/* ---------- Vision des couleurs ---------- */
export const TESTS_CLASSEMENT = {
  '15hue': { label: '15 Hue saturé (Farnsworth)', au: 'Au test 15 Hue saturé de Farnsworth' },
  '15hue-desat': { label: '15 Hue désaturé (Lanthony)', au: 'Au test 15 Hue désaturé de Lanthony' },
  '28hue': { label: '28 Hue (Roth)', au: 'Au test 28 Hue de Roth' },
  '100hue': { label: '100 Hue (Farnsworth-Munsell)', au: 'Au test 100 Hue de Farnsworth-Munsell' },
};
export const RESULTATS_CLASSEMENT = [
  ['normal', 'Classement sans erreur', 'le classement est réalisé sans erreur'],
  ['mineures', 'Erreurs mineures sans axe', 'le classement comporte quelques erreurs mineures, sans axe de confusion'],
  ['protan', 'Confusions, axe protan', 'le classement met en évidence des confusions selon un axe protan'],
  ['deutan', 'Confusions, axe deutan', 'le classement met en évidence des confusions selon un axe deutan'],
  ['tritan', 'Confusions, axe tritan', 'le classement met en évidence des confusions selon un axe tritan'],
  ['diffus', 'Confusions sans axe défini', 'le classement met en évidence des confusions diffuses, sans axe défini'],
];
export const CONCLUSIONS_COULEURS = [
  ['normale', 'Vision des couleurs normale', 'La vision des couleurs est normale aux tests réalisés.'],
  ['protan', 'Dyschromatopsie rouge-vert, type protan', "Ces résultats sont en faveur d'une dyschromatopsie d'axe rouge-vert de type protan."],
  ['deutan', 'Dyschromatopsie rouge-vert, type deutan', "Ces résultats sont en faveur d'une dyschromatopsie d'axe rouge-vert de type deutan."],
  ['rougeVert', 'Dyschromatopsie rouge-vert non typée', "Ces résultats sont en faveur d'une dyschromatopsie d'axe rouge-vert, dont le type reste à préciser."],
  ['tritan', 'Dyschromatopsie bleu-jaune (tritan)', "Ces résultats sont en faveur d'une dyschromatopsie d'axe bleu-jaune."],
  ['acquise', 'Dyschromatopsie acquise à explorer', "L'asymétrie des résultats entre les deux yeux fait évoquer une dyschromatopsie acquise, à explorer."],
];

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
const videDev = () => ({ type: '', valeur: '', precision: '' });
const videCV = () => ({ fiabilite: '', normal: false, deficits: {}, md: '', notes: '' });
export const correctionVide = () => ({ type: 'aucune', od: videOeil(), og: videOeil() });

export function bilanVide(patient, type) {
  const c = patient && patient.correction ? JSON.parse(JSON.stringify(patient.correction)) : correctionVide();
  return {
    motif: { plaintes: {}, diplopieFrequence: '', diplopieSens: '', circonstances: {}, anciennete: '', tempsEcran: '', notes: '' },
    av: { correction: { ...correctionVide(), ...c }, sc: { vl: vide3(), vp: vide3() }, ac: { vl: vide3(), vp: vide3() }, directeur: '' },
    om: {
      cover: { sc: { vl: videDev(), vp: videDev() }, ac: { vl: videDev(), vp: videDev() } },
      worth: { vl: '', vp: '' },
      motilite: '',
      motiliteDetail: '',
      poursuites: '',
      saccades: '',
      ppc: videPaire(),
      fusion: { vl: { d: videPaire(), c: videPaire() }, vp: { d: videPaire(), c: videPaire() } },
      stereo: { test: '', figures: {}, saisi: false, resultat: '' },
    },
    cv: { fait: type === 'cv', technique: '', programme: '', od: videCV(), og: videCV(), commentaire: '' },
    couleurs: { fait: type === 'couleurs', ishihara: { od: { lues: '', total: '' }, og: { lues: '', total: '' } }, classement: { test: '', od: '', og: '' }, conclusion: '', commentaire: '' },
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

/* ---------- Normes de référence ---------- */
// Amplitudes de fusion selon Hugonnier (les valeurs publiées varient légèrement d'un ouvrage à l'autre :
// elles se règlent dans les réglages du cabinet). Le seuil du PPC est un repère usuel, lui aussi réglable.
export const NORMES_DEFAUT = {
  ppc: 10,
  fusion: { vl: { d: [4, 8], c: [20, 25] }, vp: { d: [12, 14], c: [35, 40] } },
};
export const normesTexte = (n) => `D ${n.fusion.vl.d.join(' à ')}, C ${n.fusion.vl.c.join(' à ')} ; D' ${n.fusion.vp.d.join(' à ')}, C' ${n.fusion.vp.c.join(' à ')}`;

export function evalPPC(bris, normes = NORMES_DEFAUT) {
  const b = num(bris);
  if (b == null) return null;
  return b <= normes.ppc ? { label: 'Dans la norme', tone: 'ok', eloigne: false } : { label: 'Éloigné', tone: 'danger', eloigne: true };
}
/** Amplitudes de fusion : quelles vergences sont sous la borne basse de la norme ? */
export function evalFusion(f, normes = NORMES_DEFAUT) {
  const v = { cVL: num(f.vl.c.bris), cVP: num(f.vp.c.bris), dVL: num(f.vl.d.bris), dVP: num(f.vp.d.bris) };
  const seuil = { cVL: normes.fusion.vl.c[0], cVP: normes.fusion.vp.c[0], dVL: normes.fusion.vl.d[0], dVP: normes.fusion.vp.d[0] };
  const bas = (k) => v[k] != null && v[k] < seuil[k];
  return {
    v,
    mesure: Object.values(v).some((x) => x != null),
    cBas: [bas('cVL') && 'loin', bas('cVP') && 'près'].filter(Boolean),
    dBas: [bas('dVL') && 'loin', bas('dVP') && 'près'].filter(Boolean),
    cMesure: v.cVL != null || v.cVP != null,
    dMesure: v.dVL != null || v.dVP != null,
  };
}

/** Cover-test de référence pour les conclusions : avec correction s'il a été mesuré, sinon sans. */
export function coverReference(om) {
  const rempli = (p) => !!(p.vl.type || p.vp.type);
  return rempli(om.cover.ac) ? om.cover.ac : om.cover.sc;
}
const acuite = (d, o) => {
  const v = d.av.ac.vl[o] || d.av.sc.vl[o];
  return v && v !== 'NM' ? AV_VL.indexOf(v) : -1;
};

/* ---------- Règle de décision thérapeutique ----------
   Une rééducation orthoptique n'est proposée que si des signes fonctionnels ET des signes cliniques
   sont présents. Un bilan normal ou asymptomatique conclut à l'absence d'indication. */
export function signesFonctionnels(d) {
  return PLAINTES.filter((p) => p.fonctionnel && d.motif.plaintes[p.k]).map((p) => p.label.toLowerCase());
}
export function signesCliniques(d, normes = NORMES_DEFAUT, type = 'bilan') {
  const om = d.om;
  const s = [];
  const ppc = evalPPC(om.ppc.bris, normes);
  const fus = evalFusion(om.fusion, normes);
  const ref = coverReference(om);
  const devs = [ref.vl, ref.vp].map((c) => ({ ...c, def: DEVIATIONS[c.type] })).filter((c) => c.def);
  if (ppc && ppc.eloigne) s.push('PPC éloigné');
  if (fus.cBas.length) s.push('convergence fusionnelle réduite');
  if (fus.dBas.length) s.push('divergence fusionnelle réduite');
  if (devs.some((c) => c.def.kind === 'tropie')) s.push('déviation manifeste (tropie)');
  if (devs.some((c) => c.def.kind === 'phorie' && (c.precision === 'restLente' || c.precision === 'restDifficile'))) s.push('hétérophorie de restitution lente');
  if (om.motilite === 'limitation' || om.motilite === 'hyperaction') s.push('motilité oculaire anormale');
  if ((om.poursuites && om.poursuites !== 'lisses') || (om.saccades && om.saccades !== 'précises')) s.push('oculomotricité conjuguée perturbée');
  if ([om.worth.vl, om.worth.vp].some((w) => w && w !== 'fusion')) s.push('neutralisation ou diplopie au test de Worth');
  const lang = lectureLang(om.stereo);
  const arc = STEREO[om.stereo.test] && STEREO[om.stereo.test].kind === 'arc' && om.stereo.resultat !== '' ? Number(om.stereo.resultat) : null;
  if ((lang && lang.vuesStereo.length < lang.totalStereo) || (arc != null && (arc === 0 || arc > 120))) s.push('vision stéréoscopique altérée');
  const od = acuite(d, 'od');
  const og = acuite(d, 'og');
  if (od > 0 && og > 0 && Math.abs(od - og) >= 2) s.push("asymétrie d'acuité visuelle");
  if (type === 'basse-vision' && [od, og].some((x) => x >= 0 && x <= AV_VL.indexOf('5/10'))) s.push('acuité visuelle abaissée');
  return s;
}
export function indicationReeducation(d, normes = NORMES_DEFAUT, type = 'bilan') {
  const fonctionnels = signesFonctionnels(d);
  const cliniques = signesCliniques(d, normes, type);
  return { fonctionnels, cliniques, ok: fonctionnels.length > 0 && cliniques.length > 0 && !TYPES_BILAN[type].exploration };
}

/** Propose des conclusions à partir des mesures saisies (aide à la décision, jamais appliquée d'office). */
export function suggererDiagnostics(d, normes = NORMES_DEFAUT, type = 'bilan') {
  const s = {};
  const om = d.om;
  const ppc = evalPPC(om.ppc.bris, normes);
  const fus = evalFusion(om.fusion, normes);
  const ref = coverReference(om);
  const devs = [ref.vl, ref.vp].map((c) => ({ ...c, def: DEVIATIONS[c.type], val: num(c.valeur) || 0 })).filter((c) => c.def);
  const gene = signesFonctionnels(d).length > 0;

  if ((ppc && ppc.eloigne) || (fus.cBas.includes('près') && devs.some((c) => c.def.sens === 'exo'))) s.ic = true;
  if (devs.some((c) => c.def.kind === 'tropie')) s.strabisme = true;
  const lente = (c) => c.precision === 'restLente' || c.precision === 'restDifficile';
  if (gene && devs.some((c) => c.def.kind === 'phorie' && (lente(c) || (c.val >= 6 && ((c.def.sens === 'exo' && fus.cBas.length) || (c.def.sens === 'eso' && fus.dBas.length)))))) s.hetero = true;
  if (om.motilite === 'limitation' && d.motif.plaintes.diplopie) s.paralysie = true;
  if ((om.poursuites && om.poursuites !== 'lisses') || (om.saccades && om.saccades !== 'précises')) s.oculomot = true;
  const od = acuite(d, 'od');
  const og = acuite(d, 'og');
  if (od > 0 && og > 0 && Math.abs(od - og) >= 2 && Math.min(od, og) <= AV_VL.indexOf('7/10')) {
    s.amblyopie = true;
    s.amblyopieOeil = od < og ? 'OD' : 'OG';
  }
  if (devs.length > 0 && ppc && !signesCliniques(d, normes, type).length) s.normal = true;
  return s;
}

/** Quelles parties du bilan contiennent des données ? (témoin de complétude avant génération) */
export function completude(d) {
  const any = (o) => Object.values(o).some((x) => (x && typeof x === 'object' ? any(x) : x !== '' && x != null && x !== false));
  return {
    motif: any(d.motif),
    av: any(d.av.sc) || any(d.av.ac),
    om: any(d.om),
    cv: any(d.cv.od) || any(d.cv.og) || !!d.cv.technique,
    couleurs: any(d.couleurs.ishihara) || any(d.couleurs.classement) || !!d.couleurs.conclusion,
    conclusion: any(d.conclusion.diag) || d.conclusion.reeducation || !!d.conclusion.commentaire.trim() || !!d.conclusion.controle,
  };
}

export function resumeBilan(b) {
  if (b.type === 'cv') return CV_TECHNIQUES[b.data.cv.technique] ? CV_TECHNIQUES[b.data.cv.technique].label : 'Champ visuel';
  if (b.type === 'couleurs') return (CONCLUSIONS_COULEURS.find((c) => c[0] === b.data.couleurs.conclusion) || [0, 'Vision des couleurs'])[1];
  const diag = DIAGNOSTICS.filter((x) => b.data.conclusion.diag[x.k]).map((x) => x.label);
  if (diag.length) return diag.join(' · ');
  if (b.statut === 'brouillon') return 'Saisie en cours';
  return 'Conclusion rédigée en texte libre';
}

/* ---------- Facturation : barème NGAP ----------
   Coefficients fournis par le cabinet. Les libellés marqués `aPreciser` n'ont pas été communiqués :
   ils se complètent dans les réglages. Le code d'un acte est son coefficient. */
export const ZONES = { metropole: { label: 'Métropole', valeur: 2.6 }, dom: { label: "Départements d'outre-mer", valeur: 2.72 } };
export const valeurAMY = (cabinet) => (ZONES[cabinet && cabinet.zone] || ZONES.metropole).valeur;
const A = (coef, famille, libelle, aPreciser) => ({ code: String(coef), coef, famille, libelle, aPreciser: !!aPreciser });
export const BAREME_DEFAUT = [
  A(30.5, 'bilan', 'Bilan des troubles neurovisuels'),
  A(30, 'bilan', 'Bilan basse vision'),
  A(19.2, 'bilan', 'Bilan orthoptique des déséquilibres oculomoteurs et de la vision binoculaire (cotation 19,2)'),
  A(15.2, 'bilan', 'Bilan orthoptique des déséquilibres oculomoteurs et de la vision binoculaire'),
  A(10.6, 'bilan', 'Bilan de renouvellement (déséquilibres binoculaires)'),
  A(8.7, 'bilan', 'Bilan : acuité visuelle et réfraction'),
  A(6.1, 'bilan', 'Renouvellement : acuité visuelle et réfraction'),
  A(12.3, 'exploration', 'Champ visuel avec mesure de seuil'),
  A(11.5, 'exploration', 'Champ visuel sans mesure de seuil'),
  A(6, 'exploration', 'Exploration du sens chromatique (vision des couleurs)'),
  A(6.7, 'exploration', 'Rétinographie non mydriatique'),
  A(18, 'seance', 'Séance de rééducation basse vision'),
  A(13.2, 'seance', "Séance de rééducation de l'ordre de 30 minutes", true),
  A(6.8, 'seance', 'Séance de rééducation : strabisme'),
  A(5.8, 'seance', "Séance de traitement de l'amblyopie"),
  A(5.4, 'seance', 'Séance de rééducation binoculaire'),
  A(15, 'autre', 'Acte coté AMY 15', true),
  A(14.5, 'autre', 'Acte coté AMY 14,5', true),
  A(10, 'autre', 'Acte coté AMY 10', true),
  A(9, 'autre', 'Acte coté AMY 9', true),
  A(8.4, 'autre', 'Acte coté AMY 8,4', true),
  A(8, 'autre', 'Acte coté AMY 8', true),
  A(7.7, 'autre', 'Acte coté AMY 7,7', true),
  A(7, 'autre', 'Acte coté AMY 7', true),
  A(4, 'autre', 'Acte coté AMY 4', true),
];
export const FAMILLES_ACTES = [['bilan', 'Bilans'], ['exploration', 'Explorations'], ['seance', 'Séances de rééducation'], ['autre', 'Autres cotations']];
export const acteDe = (bareme, code) => bareme.find((a) => a.code === String(code)) || bareme.find((a) => a.code === '15.2') || bareme[0];
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

export function calculFacture({ coef, qte = 1, valeur, exoneration = 'aucune', mutuelle }) {
  const ex = EXONERATIONS[exoneration] || EXONERATIONS.aucune;
  const montant = r2((num(coef) || 0) * (num(valeur) || 0) * (num(qte) || 1));
  const partAMO = r2(montant * ex.taux);
  const reste = r2(montant - partAMO);
  const partAMC = ex.amcIntegrale || mutuelle ? reste : 0;
  return { montant, taux: ex.taux, partAMO, partAMC, partPatient: r2(reste - partAMC) };
}

/** Sélection automatique de l'acte : d'après le bilan saisi, sinon le rendez-vous, sinon l'ordonnance. */
export function suggererActe({ patient, bilan, rdv, anterieurs = 0 }) {
  if (bilan) {
    if (bilan.type === 'cv') return bilan.data.cv.technique === 'goldmann' ? { code: '11.5', raison: 'champ visuel de Goldmann, sans mesure de seuil' } : { code: '12.3', raison: 'champ visuel automatisé, avec mesure de seuil' };
    if (bilan.type === 'couleurs') return { code: '6', raison: 'examen de la vision des couleurs' };
    if (bilan.type === 'basse-vision') return { code: '30', raison: 'bilan basse vision' };
    if (bilan.type === 'neurovisuel') return { code: '30.5', raison: 'bilan des troubles neurovisuels' };
    if (!completude(bilan.data).om) return { code: '8.7', raison: "bilan limité à l'acuité visuelle et à la réfraction" };
    if (anterieurs > 0 && patient && patient.ordonnance) return { code: '10.6', raison: 'bilan de renouvellement, un bilan antérieur figure au dossier' };
    return { code: '15.2', raison: 'examen oculomoteur et binoculaire renseigné dans le bilan' };
  }
  if (rdv) {
    const m = MOTIFS[rdv.motif];
    if (m && m.seance && patient && patient.ordonnance) return { code: patient.ordonnance.acte || '5.4', raison: 'séance sur ordonnance de rééducation en cours' };
    if (rdv.motif === 'cv-auto') return { code: '12.3', raison: 'rendez-vous de champ visuel automatisé' };
    if (rdv.motif === 'cv-goldmann') return { code: '11.5', raison: 'rendez-vous de champ visuel de Goldmann' };
    if (rdv.motif === 'couleurs') return { code: '6', raison: 'rendez-vous de vision des couleurs' };
    if (rdv.motif === 'basse-vision') return { code: '30', raison: 'rendez-vous de bilan basse vision' };
    if (rdv.motif === 'neurovisuel') return { code: '30.5', raison: 'rendez-vous de bilan neurovisuel' };
    if (m && m.famille === 'bilan') return { code: '15.2', raison: 'rendez-vous de bilan orthoptique' };
  }
  if (patient && patient.ordonnance && patient.ordonnance.prescrites) return { code: patient.ordonnance.acte || '5.4', raison: 'ordonnance de rééducation en cours' };
  return { code: '15.2', raison: 'acte le plus courant en première consultation' };
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

/* ---------- RGPD : information et consentements du patient ---------- */
export const rgpdVide = () => ({ information: '', transmission: '', rappels: false, recherche: false, representant: '', maj: '' });
export const TRANSMISSIONS = {
  '': { label: 'Non renseigné', tone: 'warn' },
  ok: { label: 'Patient informé, sans opposition', tone: 'ok' },
  opposition: { label: 'Opposition du patient', tone: 'danger' },
};
export function statutRgpd(p) {
  const r = p.rgpd || rgpdVide();
  if (!r.information) return { label: 'Information à remettre', tone: 'warn', complet: false };
  if (r.transmission === 'opposition') return { label: 'Opposition à la transmission', tone: 'danger', complet: true };
  if (!r.transmission) return { label: 'Transmission à renseigner', tone: 'warn', complet: false };
  return { label: 'Information tracée', tone: 'ok', complet: true };
}

/* ---------- Journal d'audit ---------- */
export const ACTIONS_JOURNAL = {
  connexion: ['Connexion', 'acces'],
  'connexion.echec': ['Échec de connexion', 'acces'],
  deconnexion: ['Déconnexion', 'acces'],
  'deconnexion.auto': ['Déconnexion automatique (inactivité)', 'acces'],
  'acces.debut': ["Accès exceptionnel de l'administrateur : début", 'securite'],
  'acces.fin': ["Accès exceptionnel de l'administrateur : fin", 'securite'],
  'patient.consultation': ['Consultation du dossier', 'dossiers'],
  'patient.creation': ['Création du dossier', 'dossiers'],
  'patient.modification': ['Modification du dossier', 'dossiers'],
  'rgpd.maj': ['Mise à jour information et consentements', 'dossiers'],
  'bilan.consultation': ['Ouverture du bilan', 'bilans'],
  'bilan.creation': ['Création du bilan', 'bilans'],
  'bilan.suppression': ['Suppression du bilan', 'bilans'],
  'cr.generation': ['Génération du compte-rendu', 'bilans'],
  'cr.copie': ['Copie du compte-rendu', 'bilans'],
  'cr.export': ['Export PDF du compte-rendu', 'bilans'],
  'cr.envoi': ['Compte-rendu marqué comme envoyé', 'bilans'],
  'rdv.creation': ['Création du rendez-vous', 'agenda'],
  'rdv.modification': ['Modification du rendez-vous', 'agenda'],
  'rdv.suppression': ['Suppression du rendez-vous', 'agenda'],
  'seance.validation': ['Validation de la séance', 'agenda'],
  'facture.creation': ['Création de la facture', 'facturation'],
  'facture.modification': ['Modification de la facture', 'facturation'],
  'sauvegarde.export': ['Export de la sauvegarde chiffrée', 'securite'],
  'sauvegarde.restauration': ['Restauration de la sauvegarde', 'securite'],
  'utilisateur.creation': ['Création du compte', 'administration'],
  'utilisateur.modification': ['Modification du compte', 'administration'],
  'utilisateur.desactivation': ['Désactivation du compte', 'administration'],
  'utilisateur.reactivation': ['Réactivation du compte', 'administration'],
  'utilisateur.motdepasse': ['Changement du mot de passe', 'administration'],
  'reglages.modification': ['Modification des réglages du cabinet', 'administration'],
  'demo.reinitialisation': ['Réinitialisation des données de démonstration', 'administration'],
};
export const CATEGORIES_JOURNAL = [['acces', 'Connexions'], ['securite', 'Sécurité'], ['dossiers', 'Dossiers'], ['bilans', 'Bilans'], ['agenda', 'Agenda'], ['facturation', 'Facturation'], ['administration', 'Administration']];
export const MOTIFS_ACCES = ['Assistance technique demandée par le praticien', 'Correction d’une erreur de saisie ou d’un doublon', 'Continuité des soins en l’absence du praticien', 'Demande d’un patient (droit d’accès ou de rectification)', 'Contrôle ou audit de sécurité'];
export const nomUtilisateur = (u) => (u ? [u.prenom, u.nom].filter(Boolean).join(' ') : 'Compte supprimé');
