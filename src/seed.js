// Données de démonstration : patients, agenda du jour, bilans et factures entièrement fictifs.
import { addDays, fusion, todayISO } from './lib.js';
import { acte, bilanVide, calculFacture } from './domain.js';
import { genererCorps } from './letter.js';

export const CABINET_DEMO = {
  nom: "Cabinet d'orthoptie des Tilleuls",
  praticien: 'Camille Roussel',
  titre: 'Orthoptiste',
  adresse: '12 rue des Tilleuls',
  cp: '69003',
  ville: 'Lyon',
  tel: '04 78 00 00 00',
  email: 'contact@orthoptie-tilleuls.example',
  rpps: '10 00 00 00 00 0 (fictif)',
  valeurAMY: 2.6,
};

const oeil = (sph = '', cyl = '', axe = '', add = '') => ({ sph, cyl, axe, add });
const sansCorrection = { type: 'aucune', od: oeil(), og: oeil() };
const marchand = { nom: 'Hélène Marchand', specialite: 'Ophtalmologiste', ville: 'Lyon 6e' };

export function etatDemo() {
  const T = todayISO();
  const j = (n) => addDays(T, n);

  const patients = [
    {
      id: 'p_lea', nom: 'Martin', prenom: 'Léa', sexe: 'F', ddn: '1998-03-12', tel: '06 12 00 00 01', email: 'lea.martin@courriel.example',
      nir: '2 98 03 69 000 001 42', mutuelle: 'Harmonie Mutuelle', exoneration: 'aucune', prescripteur: marchand,
      antecedentsOph: 'Myopie légère corrigée depuis 2019', antecedentsGen: 'Migraines occasionnelles',
      correction: { type: 'lunettes', od: oeil('-0.75'), og: oeil('-0.50') },
      ordonnance: { date: j(-40), prescrites: 12, effectuees: 4, acte: 'RB', derniere: T },
    },
    {
      id: 'p_hugo', nom: 'Petit', prenom: 'Hugo', sexe: 'M', ddn: '2018-06-21', tel: '06 12 00 00 02', email: '',
      nir: '1 18 06 69 000 002 17', mutuelle: 'MGEN', exoneration: 'aucune', prescripteur: { nom: 'Antoine Lefèvre', specialite: 'Pédiatre', ville: 'Villeurbanne' },
      antecedentsOph: '', antecedentsGen: 'Suivi orthophonique en cours pour un retard de lecture',
      correction: sansCorrection, ordonnance: null,
    },
    {
      id: 'p_jeanne', nom: 'Dubois', prenom: 'Jeanne', sexe: 'F', ddn: '1947-11-02', tel: '04 78 00 00 03', email: '',
      nir: '2 47 11 69 000 003 08', mutuelle: 'AG2R La Mondiale', exoneration: 'ald', prescripteur: marchand,
      antecedentsOph: 'DMLA atrophique bilatérale, pseudophakie bilatérale (2016)', antecedentsGen: 'Hypertension artérielle traitée',
      correction: { type: 'lunettes', od: oeil('2.00', '', '', '3.50'), og: oeil('2.25', '', '', '3.50') },
      ordonnance: { date: j(-75), prescrites: 10, effectuees: 9, acte: 'RBV', derniere: T },
    },
    {
      id: 'p_noe', nom: 'Bernard', prenom: 'Noé', sexe: 'M', ddn: j(-282), tel: '06 12 00 00 04', email: '',
      nir: '1 26 02 69 000 004 63', mutuelle: 'Alan', exoneration: 'aucune', prescripteur: { nom: 'Sophie Nguyen', specialite: 'Pédiatre', ville: 'Lyon 3e' },
      antecedentsOph: 'Strabisme convergent chez le père', antecedentsGen: 'Naissance à terme, sans particularité',
      correction: sansCorrection, ordonnance: null,
    },
    {
      id: 'p_karim', nom: 'Benali', prenom: 'Karim', sexe: 'M', ddn: '1984-09-17', tel: '06 12 00 00 05', email: 'k.benali@courriel.example',
      nir: '1 84 09 69 000 005 31', mutuelle: 'Malakoff Humanis', exoneration: 'aucune', prescripteur: marchand,
      antecedentsOph: 'Hypermétropie faible', antecedentsGen: '',
      correction: { type: 'lunettes', od: oeil('0.50', '-0.50', '90'), og: oeil('0.75') },
      ordonnance: { date: j(-90), prescrites: 15, effectuees: 11, acte: 'RB', derniere: j(-7) },
    },
    {
      id: 'p_chloe', nom: 'Roux', prenom: 'Chloé', sexe: 'F', ddn: '2011-04-09', tel: '06 12 00 00 06', email: '',
      nir: '2 11 04 69 000 006 74', mutuelle: 'Mutuelle Générale', exoneration: 'aucune', prescripteur: { nom: 'Paul Girard', specialite: 'Médecin généraliste', ville: 'Bron' },
      antecedentsOph: '', antecedentsGen: '',
      correction: sansCorrection,
      ordonnance: { date: j(-5), prescrites: 10, effectuees: 0, acte: 'RB', derniere: '' },
    },
    {
      id: 'p_marcel', nom: 'Fontaine', prenom: 'Marcel', sexe: 'M', ddn: '1958-01-25', tel: '04 78 00 00 07', email: '',
      nir: '1 58 01 69 000 007 25', mutuelle: 'Groupama', exoneration: 'ald', prescripteur: { nom: 'Claire Morel', specialite: 'Neurologue', ville: 'Lyon 8e' },
      antecedentsOph: 'Presbytie', antecedentsGen: 'AVC ischémique du tronc cérébral il y a trois mois, diabète de type 2',
      correction: { type: 'lunettes', od: oeil('1.25', '', '', '2.50'), og: oeil('1.00', '', '', '2.50') },
      ordonnance: null,
    },
    {
      id: 'p_ines', nom: 'Caron', prenom: 'Inès', sexe: 'F', ddn: '2020-08-30', tel: '06 12 00 00 08', email: '',
      nir: '2 20 08 69 000 008 56', mutuelle: 'MAAF Santé', exoneration: 'aucune', prescripteur: marchand,
      antecedentsOph: 'Anisométropie hypermétropique dépistée en moyenne section', antecedentsGen: '',
      correction: { type: 'lunettes', od: oeil('1.50'), og: oeil('4.00', '-1.00', '10') },
      ordonnance: { date: j(-110), prescrites: 20, effectuees: 7, acte: 'RA', derniere: j(-7) },
    },
    {
      id: 'p_thomas', nom: 'Leroy', prenom: 'Thomas', sexe: 'M', ddn: '1991-12-05', tel: '06 12 00 00 09', email: 't.leroy@courriel.example',
      nir: '1 91 12 69 000 009 90', mutuelle: '', exoneration: 'aucune', prescripteur: { nom: 'Paul Girard', specialite: 'Médecin généraliste', ville: 'Bron' },
      antecedentsOph: '', antecedentsGen: '',
      correction: sansCorrection, ordonnance: null,
    },
  ];
  const P = Object.fromEntries(patients.map((p) => [p.id, p]));

  const paire = (bris, recup) => ({ bris: String(bris), recup: String(recup) });
  const fusionMesure = (dvl, cvl, dvp, cvp) => ({ vl: { d: paire(...dvl), c: paire(...cvl) }, vp: { d: paire(...dvp), c: paire(...cvp) } });
  const av3 = (od, og, odg) => ({ od, og, odg });

  const modeles = [
    {
      id: 'b_lea', patientId: 'p_lea', date: j(-36), type: 'bilan', statut: 'envoye',
      data: {
        motif: { plaintes: { cephalees: true, fatigueVisuelle: true, visionFloue: true }, circonstances: { ecran: true, finJournee: true }, anciennete: 'plusieurs mois', tempsEcran: 'gt6' },
        av: { sc: { vl: av3('8/10', '9/10', '10/10'), vp: av3('P2', 'P2', 'P2') }, ac: { vl: av3('10/10', '10/10', '10/10'), vp: av3('P2', 'P2', 'P2') }, directeur: 'OD' },
        om: {
          coverVL: { type: 'exoP', valeur: '2', precision: 'restBonne' }, coverVP: { type: 'exoP', valeur: '10', precision: 'restLente' },
          motilite: 'normale', poursuites: 'lisses', saccades: 'précises', ppc: paire(14, 18),
          fusion: fusionMesure([6, 4], [14, 10], [12, 10], [16, 12]), stereo: { test: 'tno', resultat: '120' },
        },
        conclusion: { diag: { ic: true }, reeducation: true, nbSeances: 12, frequence: 'hebdo', exercices: true, conseils: true },
      },
    },
    {
      id: 'b_hugo', patientId: 'p_hugo', date: T, type: 'bilan', statut: 'brouillon',
      data: {
        motif: { plaintes: { difficultesLecture: true, fatigueVisuelle: true, troubleApprentissages: true }, circonstances: { lecture: true }, notes: "Sauts de lignes signalés par l'enseignante depuis la rentrée" },
        av: { sc: { vl: av3('10/10', '10/10', '10/10'), vp: av3('P2', 'P2', 'P2') } },
      },
    },
    {
      id: 'b_chloe', patientId: 'p_chloe', date: j(-6), type: 'bilan', statut: 'a-envoyer',
      data: {
        motif: { plaintes: { fatigueVisuelle: true, cephalees: true }, circonstances: { ecran: true, lecture: true, finJournee: true }, anciennete: 'quelques semaines', tempsEcran: '4a6' },
        av: { sc: { vl: av3('10/10', '10/10', '10/10'), vp: av3('P2', 'P2', 'P2') }, directeur: 'OD' },
        om: {
          coverVL: { type: 'ortho' }, coverVP: { type: 'exoP', valeur: '8', precision: 'restLente' },
          motilite: 'normale', poursuites: 'lisses', saccades: 'précises', ppc: paire(11, 15),
          fusion: fusionMesure([6, 4], [18, 14], [12, 10], [20, 16]), stereo: { test: 'lang2', resultat: '3' },
        },
        conclusion: { diag: { ic: true }, reeducation: true, nbSeances: 10, frequence: 'hebdo', exercices: true, conseils: true },
      },
    },
    {
      id: 'b_karim', patientId: 'p_karim', date: j(-95), type: 'bilan', statut: 'envoye',
      data: {
        motif: { plaintes: { diplopie: true, fatigueVisuelle: true }, diplopieFrequence: 'intermittente', diplopieSens: 'horizontale', circonstances: { finJournee: true, conduite: true }, anciennete: 'plusieurs mois' },
        av: { ac: { vl: av3('10/10', '10/10', '10/10'), vp: av3('P2', 'P2', 'P2') }, directeur: 'OD' },
        om: {
          coverVL: { type: 'esoP', valeur: '6', precision: 'restLente' }, coverVP: { type: 'esoP', valeur: '8', precision: 'restLente' },
          motilite: 'normale', ppc: paire(6, 8), fusion: fusionMesure([2, 1], [20, 16], [6, 4], [30, 25]), stereo: { test: 'tno', resultat: '60' },
        },
        conclusion: { diag: { hetero: true }, reeducation: true, nbSeances: 15, frequence: 'hebdo', prismation: true },
      },
    },
    {
      id: 'b_marcel', patientId: 'p_marcel', date: j(-62), type: 'bilan', statut: 'envoye',
      data: {
        motif: { plaintes: { diplopie: true }, diplopieFrequence: 'constante', diplopieSens: 'horizontale', circonstances: { vl: true }, anciennete: 'quelques semaines' },
        av: { ac: { vl: av3('8/10', '9/10', '9/10'), vp: av3('P3', 'P3', 'P3') } },
        om: {
          coverVL: { type: 'esoT', valeur: '18', precision: 'fixOG' }, coverVP: { type: 'esoT', valeur: '10', precision: 'fixOG' },
          motilite: 'limitation', motiliteDetail: "déficit de l'abduction de l'œil droit", stereo: { test: 'lang1', resultat: '0' },
        },
        conclusion: { diag: { paralysie: true }, paralysieDetail: 'atteinte du VI droit', prismation: true, controle: '3 mois' },
      },
    },
    {
      id: 'b_thomas', patientId: 'p_thomas', date: j(-30), type: 'bilan', statut: 'envoye',
      data: {
        motif: { plaintes: { depistage: true }, tempsEcran: '4a6' },
        av: { sc: { vl: av3('10/10', '10/10', '12/10'), vp: av3('P2', 'P2', 'P2') }, directeur: 'OD' },
        om: {
          coverVL: { type: 'ortho' }, coverVP: { type: 'exoP', valeur: '2', precision: 'restBonne' },
          motilite: 'normale', poursuites: 'lisses', saccades: 'précises', ppc: paire(6, 8),
          fusion: fusionMesure([8, 6], [20, 18], [14, 12], [35, 30]), stereo: { test: 'tno', resultat: '60' },
        },
        conclusion: { diag: { normal: true }, conseils: true },
      },
    },
    {
      id: 'b_ines', patientId: 'p_ines', date: j(-118), type: 'bilan', statut: 'envoye',
      data: {
        motif: { plaintes: { depistage: true }, notes: 'Baisse de vision de l’œil gauche repérée lors du dépistage scolaire' },
        av: { ac: { vl: av3('10/10', '5/10', '10/10'), vp: av3('P2', 'P4', 'P2') } },
        om: { coverVL: { type: 'esoT', valeur: '6', precision: 'fixOD' }, coverVP: { type: 'esoT', valeur: '8', precision: 'fixOD' }, motilite: 'normale', stereo: { test: 'lang1', resultat: '0' } },
        conclusion: { diag: { amblyopie: true, strabisme: true }, amblyopieOeil: 'OG', reeducation: true, nbSeances: 20, frequence: 'hebdo', occlusion: true, controle: '3 mois' },
      },
    },
    {
      id: 'b_jeanne', patientId: 'p_jeanne', date: j(-80), type: 'basse-vision', statut: 'envoye',
      data: {
        motif: { plaintes: { difficultesLecture: true, photophobie: true }, anciennete: 'plusieurs années', notes: 'La patiente souhaite pouvoir relire son courrier et continuer à cuisiner seule' },
        av: { ac: { vl: av3('2/10', '1/10', '2/10'), vp: av3('P10', 'P14', 'P10') } },
        om: { motilite: 'normale', poursuites: 'irrégulières' },
        conclusion: { commentaire: "Déficience visuelle sévère dans le cadre d'une DMLA bilatérale, avec scotome central gênant la lecture et la reconnaissance des visages", reeducation: true, nbSeances: 10, frequence: 'hebdo' },
      },
    },
  ];

  const bilans = modeles.map((b) => {
    const patient = P[b.patientId];
    // Le bilan reprend la correction portée du dossier, puis les mesures du modèle.
    const bilan = { ...b, data: fusion(bilanVide(patient), b.data), cr: null, updatedAt: Date.now() };
    if (b.statut !== 'brouillon') bilan.cr = { texte: genererCorps(patient, bilan, CABINET_DEMO), modifie: false };
    return bilan;
  });

  const rdvs = [
    ['09:00', 'p_lea', 'reeducation', 'vu'],
    ['09:40', 'p_hugo', 'bilan', 'vu'],
    ['10:30', 'p_jeanne', 'basse-vision', 'vu'],
    ['11:15', 'p_noe', 'bebe', 'en-salle'],
    ['14:00', 'p_karim', 'reeducation', 'attendu'],
    ['14:40', 'p_chloe', 'reeducation', 'attendu'],
    ['15:30', 'p_marcel', 'bilan', 'attendu'],
    ['16:20', 'p_ines', 'reeducation', 'attendu'],
  ].map(([heure, patientId, motif, statut], i) => ({ id: `r_demo${i}`, date: T, heure, patientId, motif, statut, demo: statut }));

  let n = 131;
  const facture = (patientId, code, date, statut, mode = '') => {
    const p = P[patientId];
    const a = acte(code);
    n += 1;
    return {
      id: `f_demo${n}`, numero: `F-${date.slice(0, 4)}-${String(n).padStart(4, '0')}`, date, patientId, acteCode: code, libelle: a.libelle, coef: a.coef, qte: 1,
      exoneration: p.exoneration, statut, mode,
      ...calculFacture({ coef: a.coef, valeurAMY: CABINET_DEMO.valeurAMY, exoneration: p.exoneration, mutuelle: p.mutuelle }),
    };
  };
  const factures = [
    facture('p_lea', 'BO', j(-36), 'payee', 'cb'),
    facture('p_thomas', 'BO', j(-30), 'payee', 'cheque'),
    facture('p_lea', 'RB', j(-21), 'payee', 'tiers-payant'),
    facture('p_karim', 'RB', j(-14), 'payee', 'tiers-payant'),
    facture('p_lea', 'RB', j(-14), 'payee', 'tiers-payant'),
    facture('p_ines', 'RA', j(-7), 'en-attente', 'tiers-payant'),
    facture('p_karim', 'RB', j(-7), 'en-attente', 'tiers-payant'),
    facture('p_lea', 'RB', j(-7), 'en-attente', 'tiers-payant'),
    facture('p_chloe', 'BO', j(-6), 'en-attente', 'tiers-payant'),
    facture('p_lea', 'RB', T, 'a-facturer'),
    facture('p_jeanne', 'RBV', T, 'a-facturer'),
  ];

  return { version: 1, cabinet: { ...CABINET_DEMO }, patients, rdvs, bilans, factures, compteurFacture: n };
}
