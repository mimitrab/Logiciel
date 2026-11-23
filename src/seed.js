// Données de démonstration : comptes, patients, agenda, bilans et factures entièrement fictifs.
import { addDays, fusion, parseISO, todayISO } from './lib.js';
import { BAREME_DEFAUT, MOTIFS, NORMES_DEFAUT, acteDe, bilanVide, calculFacture, valeurAMY } from './domain.js';
import { genererCorps } from './letter.js';
import { creerAuth } from './crypto.js';

export const MOT_DE_PASSE_DEMO = 'demo';
export const CABINET_DEMO = {
  nom: "Cabinet d'orthoptie des Tilleuls",
  adresse: '12 rue des Tilleuls',
  cp: '69003',
  ville: 'Lyon',
  tel: '04 78 00 00 00',
  email: 'contact@orthoptie-tilleuls.example',
  zone: 'metropole',
  inactivite: 15,
};

const utilisateursDemo = () => [
  { id: 'u_admin', role: 'admin', identifiant: 'admin', prenom: '', nom: 'Super-Admin', titre: 'Administration du cabinet', rpps: '', actif: true, demo: true, derniereConnexion: 0, auth: creerAuth(MOT_DE_PASSE_DEMO, '5ac0adecab1e0000') },
  { id: 'u_camille', role: 'praticien', identifiant: 'camille.roussel', prenom: 'Camille', nom: 'Roussel', titre: 'Orthoptiste', rpps: '10 00 00 00 01 0 (fictif)', actif: true, demo: true, derniereConnexion: 0, auth: creerAuth(MOT_DE_PASSE_DEMO, '5ac0adecab1e0001') },
  { id: 'u_julien', role: 'praticien', identifiant: 'julien.marchetti', prenom: 'Julien', nom: 'Marchetti', titre: 'Orthoptiste', rpps: '10 00 00 00 02 0 (fictif)', actif: true, demo: true, derniereConnexion: 0, auth: creerAuth(MOT_DE_PASSE_DEMO, '5ac0adecab1e0002') },
];

const oeil = (sph = '', cyl = '', axe = '', add = '') => ({ sph, cyl, axe, add });
const sans = () => ({ type: 'aucune', od: oeil(), og: oeil() });
const lunettes = (od, og) => ({ type: 'lunettes', od, og });
const marchand = { nom: 'Hélène Marchand', specialite: 'Ophtalmologiste', ville: 'Lyon 6e', mssante: 'helene.marchand@medecin.mssante.example' };
const girard = { nom: 'Paul Girard', specialite: 'Médecin généraliste', ville: 'Bron', mssante: 'paul.girard@medecin.mssante.example' };

function patientsDemo(j) {
  const rgpd = (jours, extra = {}) => ({ information: j(jours), transmission: 'ok', rappels: true, recherche: false, representant: '', maj: j(jours), ...extra });
  const C = 'u_camille';
  const J = 'u_julien';
  const P = (p) => ({ ins: { qualifiee: !['p_noe', 'p_paul'].includes(p.id) }, ...p });
  return [
    { id: 'p_lea', praticienId: C, nom: 'Martin', prenom: 'Léa', sexe: 'F', ddn: '1998-03-12', tel: '06 12 00 00 01', email: 'lea.martin@courriel.example', nir: '2 98 03 69 000 001 42', mutuelle: 'Harmonie Mutuelle', exoneration: 'aucune', prescripteur: marchand,
      antecedentsOph: 'Myopie légère corrigée depuis 2019', antecedentsGen: 'Migraines occasionnelles', correction: lunettes(oeil('-0.75'), oeil('-0.50')),
      ordonnance: { date: j(-34), prescrites: 12, effectuees: 4, acte: '5.4', derniere: j(0) }, rgpd: rgpd(-36) },
    { id: 'p_hugo', praticienId: C, nom: 'Petit', prenom: 'Hugo', sexe: 'M', ddn: '2018-06-21', tel: '06 12 00 00 02', email: '', nir: '1 18 06 69 000 002 17', mutuelle: 'MGEN', exoneration: 'aucune', prescripteur: { nom: 'Antoine Lefèvre', specialite: 'Pédiatre', ville: 'Villeurbanne', mssante: 'antoine.lefevre@medecin.mssante.example' },
      antecedentsOph: '', antecedentsGen: 'Suivi orthophonique en cours pour un retard de lecture', correction: sans(), ordonnance: null, rgpd: rgpd(0, { representant: 'Mme Claire Petit, mère' }) },
    { id: 'p_jeanne', praticienId: C, nom: 'Dubois', prenom: 'Jeanne', sexe: 'F', ddn: '1947-11-02', tel: '04 78 00 00 03', email: '', nir: '2 47 11 69 000 003 08', mutuelle: 'AG2R La Mondiale', exoneration: 'ald', prescripteur: marchand,
      antecedentsOph: 'DMLA atrophique bilatérale, pseudophakie bilatérale (2016)', antecedentsGen: 'Hypertension artérielle traitée', correction: lunettes(oeil('2.00', '', '', '3.50'), oeil('2.25', '', '', '3.50')), ordonnance: null, rgpd: rgpd(0, { rappels: false }) },
    { id: 'p_noe', praticienId: C, nom: 'Bernard', prenom: 'Noé', sexe: 'M', ddn: j(-282), tel: '06 12 00 00 04', email: '', nir: '1 26 02 69 000 004 63', mutuelle: 'Alan', exoneration: 'aucune', prescripteur: { nom: 'Sophie Nguyen', specialite: 'Pédiatre', ville: 'Lyon 3e', mssante: 'sophie.nguyen@medecin.mssante.example' },
      antecedentsOph: 'Strabisme convergent chez le père', antecedentsGen: 'Naissance à terme, sans particularité', correction: sans(), ordonnance: null, rgpd: { information: '', transmission: '', rappels: false, recherche: false, representant: '', maj: '' } },
    { id: 'p_karim', praticienId: C, nom: 'Benali', prenom: 'Karim', sexe: 'M', ddn: '1984-09-17', tel: '06 12 00 00 05', email: 'k.benali@courriel.example', nir: '1 84 09 69 000 005 31', mutuelle: 'Malakoff Humanis', exoneration: 'aucune', prescripteur: marchand,
      antecedentsOph: 'Hypermétropie faible', antecedentsGen: '', correction: lunettes(oeil('0.50', '-0.50', '90'), oeil('0.75')),
      ordonnance: { date: j(-90), prescrites: 15, effectuees: 13, acte: '5.4', derniere: j(-7) }, rgpd: rgpd(-95) },
    { id: 'p_chloe', praticienId: C, nom: 'Roux', prenom: 'Chloé', sexe: 'F', ddn: '2011-04-09', tel: '06 12 00 00 06', email: '', nir: '2 11 04 69 000 006 74', mutuelle: 'Mutuelle Générale', exoneration: 'aucune', prescripteur: girard,
      antecedentsOph: '', antecedentsGen: '', correction: sans(), ordonnance: { date: j(-5), prescrites: 10, effectuees: 0, acte: '5.4', derniere: '' }, rgpd: rgpd(-6, { representant: 'M. David Roux, père' }) },
    { id: 'p_marcel', praticienId: C, nom: 'Fontaine', prenom: 'Marcel', sexe: 'M', ddn: '1958-01-25', tel: '04 78 00 00 07', email: '', nir: '1 58 01 69 000 007 25', mutuelle: 'Groupama', exoneration: 'ald', prescripteur: { nom: 'Claire Morel', specialite: 'Neurologue', ville: 'Lyon 8e', mssante: 'claire.morel@medecin.mssante.example' },
      antecedentsOph: 'Presbytie', antecedentsGen: 'AVC ischémique du tronc cérébral il y a trois mois, diabète de type 2', correction: lunettes(oeil('1.25', '', '', '2.50'), oeil('1.00', '', '', '2.50')), ordonnance: null, rgpd: rgpd(-62) },
    { id: 'p_ines', praticienId: C, nom: 'Caron', prenom: 'Inès', sexe: 'F', ddn: '2020-08-30', tel: '06 12 00 00 08', email: '', nir: '2 20 08 69 000 008 56', mutuelle: 'MAAF Santé', exoneration: 'aucune', prescripteur: marchand,
      antecedentsOph: 'Anisométropie hypermétropique', antecedentsGen: '', correction: lunettes(oeil('1.50'), oeil('4.00', '-1.00', '10')),
      ordonnance: { date: j(-110), prescrites: 20, effectuees: 7, acte: '5.8', derniere: j(-7) }, rgpd: rgpd(-118, { representant: 'Mme Sonia Caron, mère' }) },

    { id: 'p_jules', praticienId: J, nom: 'Moreau', prenom: 'Jules', sexe: 'M', ddn: '2019-05-18', tel: '06 12 00 00 10', email: '', nir: '1 19 05 69 000 010 44', mutuelle: 'MGEN', exoneration: 'aucune', prescripteur: { nom: 'Sophie Nguyen', specialite: 'Pédiatre', ville: 'Lyon 3e', mssante: 'sophie.nguyen@medecin.mssante.example' },
      antecedentsOph: '', antecedentsGen: '', correction: sans(), ordonnance: null, rgpd: rgpd(-10, { representant: 'Mme Anne Moreau, mère' }) },
    { id: 'p_thomas', praticienId: J, nom: 'Leroy', prenom: 'Thomas', sexe: 'M', ddn: '1991-12-05', tel: '06 12 00 00 09', email: 't.leroy@courriel.example', nir: '1 91 12 69 000 009 90', mutuelle: '', exoneration: 'aucune', prescripteur: girard,
      antecedentsOph: '', antecedentsGen: '', correction: sans(), ordonnance: null, rgpd: rgpd(-30) },
    { id: 'p_robert', praticienId: J, nom: 'Lemaire', prenom: 'Robert', sexe: 'M', ddn: '1968-02-11', tel: '06 12 00 00 11', email: '', nir: '1 68 02 69 000 011 73', mutuelle: 'Groupama', exoneration: 'ald', prescripteur: { nom: 'Claire Morel', specialite: 'Neurologue', ville: 'Lyon 8e', mssante: 'claire.morel@medecin.mssante.example' },
      antecedentsOph: 'Presbytie', antecedentsGen: 'Accident vasculaire cérébral occipital droit il y a quatre mois', correction: lunettes(oeil('0.50', '', '', '2.00'), oeil('0.50', '', '', '2.00')), ordonnance: null, rgpd: rgpd(-3) },
    { id: 'p_monique', praticienId: J, nom: 'Faure', prenom: 'Monique', sexe: 'F', ddn: '1959-07-23', tel: '04 78 00 00 12', email: '', nir: '2 59 07 69 000 012 19', mutuelle: 'Harmonie Mutuelle', exoneration: 'aucune', prescripteur: marchand,
      antecedentsOph: 'Glaucome chronique à angle ouvert traité par collyre depuis 2021', antecedentsGen: '', correction: lunettes(oeil('-1.50', '-0.75', '85', '2.25'), oeil('-1.25', '', '', '2.25')), ordonnance: null, rgpd: rgpd(-200) },
    { id: 'p_lucas', praticienId: J, nom: 'Garnier', prenom: 'Lucas', sexe: 'M', ddn: '2009-03-30', tel: '06 12 00 00 13', email: '', nir: '1 09 03 69 000 013 02', mutuelle: 'MAIF', exoneration: 'aucune', prescripteur: girard,
      antecedentsOph: '', antecedentsGen: '', correction: sans(), ordonnance: null, rgpd: rgpd(0, { representant: 'M. Éric Garnier, père' }) },
    { id: 'p_nadia', praticienId: J, nom: 'Haddad', prenom: 'Nadia', sexe: 'F', ddn: '1997-10-08', tel: '06 12 00 00 14', email: 'n.haddad@courriel.example', nir: '2 97 10 69 000 014 88', mutuelle: 'Alan', exoneration: 'aucune', prescripteur: marchand,
      antecedentsOph: '', antecedentsGen: '', correction: sans(), ordonnance: { date: j(-38), prescrites: 12, effectuees: 6, acte: '5.4', derniere: j(-4) }, rgpd: rgpd(-40, { transmission: 'ok', recherche: true }) },
    { id: 'p_paul', praticienId: J, nom: 'Renard', prenom: 'Paul', sexe: 'M', ddn: '1981-06-02', tel: '06 12 00 00 15', email: '', nir: '1 81 06 69 000 015 61', mutuelle: 'Malakoff Humanis', exoneration: 'aucune', prescripteur: { nom: 'Claire Morel', specialite: 'Neurologue', ville: 'Lyon 8e', mssante: 'claire.morel@medecin.mssante.example' },
      antecedentsOph: '', antecedentsGen: 'Traumatisme crânien il y a six mois', correction: sans(), ordonnance: null, rgpd: { information: '', transmission: '', rappels: false, recherche: false, representant: '', maj: '' } },
  ].map(P);
}

/* ---------- Bilans de démonstration ---------- */
const dev = (type, valeur = '', precision = '') => ({ type, valeur: String(valeur), precision });
const paire = (b, r) => ({ bris: String(b), recup: String(r) });
const amplitudes = (dvl, cvl, dvp, cvp) => ({ vl: { d: paire(...dvl), c: paire(...cvl) }, vp: { d: paire(...dvp), c: paire(...cvp) } });
const av3 = (od, og, odg) => ({ od, og, odg });
const lang = (test, ...figures) => ({ test, figures: Object.fromEntries(figures.map((f) => [f, true])), saisi: true, resultat: '' });
const arc = (test, v) => ({ test, figures: {}, saisi: false, resultat: String(v) });
const normal10 = { vl: av3('10/10', '10/10', '10/10'), vp: av3('P2', 'P2', 'P2') };

function modelesBilans(j) {
  return [
    // Insuffisance de convergence chez une jeune adulte travaillant sur écran
    { id: 'b_lea', patientId: 'p_lea', date: j(-36), type: 'bilan', statut: 'envoye', data: {
      motif: { plaintes: { cephalees: true, fatigueVisuelle: true, visionFloue: true }, circonstances: { ecran: true, finJournee: true }, anciennete: 'plusieurs mois', tempsEcran: 'gt6' },
      av: { sc: { vl: av3('8/10', '9/10', '10/10'), vp: av3('P2', 'P2', 'P2') }, ac: normal10, directeur: 'OD' },
      om: { cover: { sc: { vl: dev('exoP', 4, 'restBonne'), vp: dev('exoP', 12, 'restLente') }, ac: { vl: dev('exoP', 2, 'restBonne'), vp: dev('exoP', 10, 'restLente') } }, worth: { vl: 'fusion', vp: 'fusion' },
        motilite: 'normale', poursuites: 'lisses', saccades: 'précises', ppc: paire(14, 18), fusion: amplitudes([6, 4], [14, 10], [12, 10], [18, 14]), stereo: arc('tno', 120) },
      conclusion: { diag: { ic: true }, reeducation: true, nbSeances: 12, frequence: 'hebdo', exercices: true, conseils: true } } },
    // Bilan en cours de saisie
    { id: 'b_hugo', patientId: 'p_hugo', date: j(0), type: 'bilan', statut: 'brouillon', data: {
      motif: { plaintes: { difficultesLecture: true, fatigueVisuelle: true, troubleApprentissages: true }, circonstances: { lecture: true }, notes: "Sauts de lignes signalés par l'enseignante depuis la rentrée" },
      av: { sc: normal10 } } },
    { id: 'b_chloe', patientId: 'p_chloe', date: j(-6), type: 'bilan', statut: 'a-envoyer', data: {
      motif: { plaintes: { fatigueVisuelle: true, cephalees: true }, circonstances: { ecran: true, lecture: true, finJournee: true }, anciennete: 'quelques semaines', tempsEcran: '4a6' },
      av: { sc: normal10, directeur: 'OD' },
      om: { cover: { sc: { vl: dev('ortho'), vp: dev('exoP', 8, 'restLente') } }, worth: { vl: 'fusion', vp: 'fusion' }, motilite: 'normale', poursuites: 'lisses', saccades: 'précises', ppc: paire(12, 15),
        fusion: amplitudes([6, 4], [18, 14], [12, 10], [22, 18]), stereo: lang('lang2', 'elephant', 'camion', 'lune', 'etoile') },
      conclusion: { diag: { ic: true }, reeducation: true, nbSeances: 10, frequence: 'hebdo', exercices: true, conseils: true } } },
    // Ésophorie décompensée
    { id: 'b_karim', patientId: 'p_karim', date: j(-95), type: 'bilan', statut: 'envoye', data: {
      motif: { plaintes: { diplopie: true, fatigueVisuelle: true }, diplopieFrequence: 'intermittente', diplopieSens: 'horizontale', circonstances: { finJournee: true, conduite: true }, anciennete: 'plusieurs mois' },
      av: { ac: normal10, directeur: 'OD' },
      om: { cover: { ac: { vl: dev('esoP', 6, 'restLente'), vp: dev('esoP', 8, 'restLente') } }, worth: { vl: 'fusion', vp: 'fusion' }, motilite: 'normale', poursuites: 'lisses', saccades: 'précises', ppc: paire(6, 8),
        fusion: amplitudes([2, 1], [22, 18], [6, 4], [36, 30]), stereo: arc('tno', 60) },
      conclusion: { diag: { hetero: true }, reeducation: true, nbSeances: 15, frequence: 'hebdo', prismation: true } } },
    { id: 'b_marcel', patientId: 'p_marcel', date: j(-62), type: 'bilan', statut: 'envoye', data: {
      motif: { plaintes: { diplopie: true }, diplopieFrequence: 'constante', diplopieSens: 'horizontale', circonstances: { vl: true }, anciennete: 'quelques semaines' },
      av: { ac: { vl: av3('8/10', '9/10', '9/10'), vp: av3('P3', 'P3', 'P3') } },
      om: { cover: { ac: { vl: dev('esoT', 18, 'fixOG'), vp: dev('esoT', 10, 'fixOG') } }, worth: { vl: 'diplopieH', vp: 'diplopieH' }, motilite: 'limitation', motiliteDetail: "déficit de l'abduction de l'œil droit", stereo: lang('lang1') },
      conclusion: { diag: { paralysie: true }, paralysieDetail: 'atteinte du VI droit', prismation: true, controle: '3 mois' } } },
    { id: 'b_ines', patientId: 'p_ines', date: j(-118), type: 'bilan', statut: 'envoye', data: {
      motif: { plaintes: { baisseAV: true, deviation: true }, notes: "La baisse de vision de l'œil gauche a été repérée lors du dépistage scolaire" },
      av: { ac: { vl: av3('10/10', '5/10', '10/10'), vp: av3('P2', 'P4', 'P2') } },
      om: { cover: { ac: { vl: dev('esoT', 6, 'fixOD'), vp: dev('esoT', 8, 'fixOD') } }, worth: { vl: 'neutOG', vp: 'neutOG' }, motilite: 'normale', stereo: lang('lang1') },
      conclusion: { diag: { amblyopie: true, strabisme: true }, amblyopieOeil: 'OG', reeducation: true, nbSeances: 20, frequence: 'hebdo', controle: '3 mois',
        amblyo: { traitement: 'occlusion', statut: 'proposer', heures: '2', jours: '7', activitesVP: true, reevaluation: '6 semaines', bascule: true } } } },
    // Bilan basse vision, DMLA
    { id: 'b_jeanne', patientId: 'p_jeanne', date: j(0), type: 'basse-vision', statut: 'a-envoyer', data: {
      motif: { plaintes: { baisseAV: true, difficultesLecture: true, photophobie: true }, anciennete: 'plusieurs années', notes: 'La patiente souhaite pouvoir relire son courrier et continuer à cuisiner seule' },
      av: { ac: { vl: av3('2/10', '1/10', '2/10'), vp: av3('P10', 'P14', 'P10') }, directeur: 'OD' },
      om: { motilite: 'normale', poursuites: 'irrégulières' },
      conclusion: { commentaire: "Déficience visuelle sévère dans le cadre d'une DMLA atrophique bilatérale, avec un scotome central gênant la lecture et la reconnaissance des visages. La fixation de l'œil droit, meilleur œil, est excentrée et encore instable", reeducation: true, nbSeances: 10, frequence: 'hebdo' } } },

    // Dépistage d'un enfant asymptomatique : bilan normal, pas de rééducation
    { id: 'b_jules', patientId: 'p_jules', date: j(-10), type: 'bilan', statut: 'envoye', data: {
      motif: { plaintes: { depistage: true }, notes: "Aucune difficulté scolaire n'est signalée par les parents ni par l'enseignante" },
      av: { sc: normal10, directeur: 'OD' },
      om: { cover: { sc: { vl: dev('ortho'), vp: dev('exoP', 2, 'restBonne') } }, worth: { vl: 'fusion', vp: 'fusion' }, motilite: 'normale', poursuites: 'lisses', saccades: 'précises', ppc: paire(6, 8),
        fusion: amplitudes([6, 4], [22, 18], [12, 10], [36, 32]), stereo: lang('lang2', 'elephant', 'camion', 'lune', 'etoile') },
      conclusion: { diag: { normal: true }, controle: '1 an' } } },
    // Plainte fonctionnelle sans anomalie à l'examen : pas de rééducation
    { id: 'b_thomas', patientId: 'p_thomas', date: j(-30), type: 'bilan', statut: 'envoye', data: {
      motif: { plaintes: { fatigueVisuelle: true }, circonstances: { ecran: true, finJournee: true }, anciennete: 'quelques semaines', tempsEcran: 'gt6' },
      av: { sc: { vl: av3('9/10', '9/10', '10/10'), vp: av3('P2', 'P2', 'P2') }, directeur: 'OD' },
      om: { cover: { sc: { vl: dev('ortho'), vp: dev('exoP', 2, 'restBonne') } }, worth: { vl: 'fusion', vp: 'fusion' }, motilite: 'normale', poursuites: 'lisses', saccades: 'précises', ppc: paire(7, 9),
        fusion: amplitudes([6, 4], [22, 18], [14, 12], [38, 34]), stereo: arc('tno', 60) },
      conclusion: { diag: { normal: true }, avisOphtalmo: true, conseils: true } } },
    { id: 'b_nadia', patientId: 'p_nadia', date: j(-40), type: 'bilan', statut: 'envoye', data: {
      motif: { plaintes: { fatigueVisuelle: true, visionFloue: true, diplopie: true }, diplopieFrequence: 'intermittente', circonstances: { vp: true, lecture: true }, anciennete: "plus d'un an", tempsEcran: '4a6' },
      av: { sc: normal10, directeur: 'OG' },
      om: { cover: { sc: { vl: dev('exoP', 6, 'restLente'), vp: dev('exoP', 14, 'restDifficile') } }, worth: { vl: 'fusion', vp: 'diplopieC' }, motilite: 'normale', poursuites: 'lisses', saccades: 'précises', ppc: paire(13, 17),
        fusion: amplitudes([8, 6], [12, 8], [14, 12], [20, 14]), stereo: arc('wirt', 100) },
      conclusion: { diag: { ic: true, hetero: true }, reeducation: true, nbSeances: 12, frequence: 'bi', exercices: true } } },
    // Champ visuel de Goldmann
    { id: 'b_robert', patientId: 'p_robert', date: j(-3), type: 'cv', statut: 'a-envoyer', data: {
      motif: { notes: "Ce champ visuel est demandé dans les suites d'un accident vasculaire cérébral occipital droit, avant avis sur l'aptitude à la conduite. Le patient décrit une gêne dans l'hémichamp gauche, avec des heurts d'obstacles et une difficulté à retrouver le début des lignes" },
      av: { ac: normal10 },
      cv: { fait: true, technique: 'goldmann', programme: 'isoptères V4e, I4e et I2e',
        od: { fiabilite: 'bonne', deficits: { hlhG: true }, notes: "Épargne maculaire d'environ 5 degrés" }, og: { fiabilite: 'bonne', deficits: { hlhG: true }, notes: "Épargne maculaire d'environ 5 degrés" },
        commentaire: 'Le déficit est congruent entre les deux yeux et respecte le méridien vertical' },
      conclusion: { controle: '6 mois' } } },
    // Champ visuel automatisé de surveillance
    { id: 'b_monique', patientId: 'p_monique', date: j(0), type: 'cv', statut: 'a-envoyer', data: {
      motif: { notes: "Champ visuel de surveillance, le précédent datant de six mois" },
      av: { ac: { vl: av3('9/10', '10/10', '10/10'), vp: av3('P2', 'P2', 'P2') } },
      cv: { fait: true, technique: 'auto', programme: 'programme 24-2, stratégie SITA Standard',
        od: { fiabilite: 'bonne', md: '-4.2', deficits: { ressautNasal: true }, notes: 'Le déficit prédomine dans le quadrant nasal supérieur' }, og: { fiabilite: 'bonne', md: '-1.1', normal: true } },
      conclusion: { controle: '6 mois' } } },
    // Vision des couleurs
    { id: 'b_lucas', patientId: 'p_lucas', date: j(0), type: 'couleurs', statut: 'a-envoyer', data: {
      motif: { notes: "Cet examen est demandé dans le cadre d'un projet d'orientation professionnelle en électrotechnique. Un oncle maternel présente un trouble de la vision des couleurs" },
      av: { sc: normal10 },
      couleurs: { fait: true, ishihara: { od: { lues: '7', total: '17' }, og: { lues: '8', total: '17' } }, classement: { test: '15hue', od: 'deutan', og: 'deutan' }, conclusion: 'deutan' } } },
  ];
}

/* ---------- Agenda de démonstration : reconstruit autour de la date du jour ---------- */
const SUIVI = { p_lea: 'u_camille', p_hugo: 'u_camille', p_jeanne: 'u_camille', p_noe: 'u_camille', p_karim: 'u_camille', p_chloe: 'u_camille', p_marcel: 'u_camille', p_ines: 'u_camille',
  p_jules: 'u_julien', p_thomas: 'u_julien', p_robert: 'u_julien', p_monique: 'u_julien', p_lucas: 'u_julien', p_nadia: 'u_julien', p_paul: 'u_julien' };
const AUJOURDHUI = [
  ['08:30', 'p_lea', 'reeduc-adulte', 'vu'], ['09:00', 'p_hugo', 'bilan', 'vu', 45], ['10:00', 'p_jeanne', 'basse-vision', 'vu'], ['11:20', 'p_noe', 'bilan-enfant', 'en-salle'],
  ['14:00', 'p_karim', 'reeduc-adulte', 'attendu', 25], ['14:30', 'p_chloe', 'reeduc-enfant', 'attendu'], ['15:10', 'p_marcel', 'bilan', 'attendu'], ['16:00', 'p_ines', 'reeduc-enfant', 'attendu'],
  ['09:00', 'p_monique', 'cv-auto', 'vu'], ['09:40', 'p_lucas', 'couleurs', 'vu'], ['10:10', 'p_nadia', 'reeduc-adulte', 'en-salle'], ['14:00', 'p_paul', 'neurovisuel', 'attendu'],
];
const JOUR_A = [
  ['09:00', 'p_ines', 'reeduc-enfant'], ['09:40', 'p_lea', 'reeduc-adulte'], ['10:10', 'p_karim', 'reeduc-adulte', 25], ['11:00', 'p_marcel', 'bilan', 60], ['14:30', 'p_chloe', 'reeduc-enfant'],
  ['09:00', 'p_nadia', 'reeduc-adulte'], ['09:30', 'p_robert', 'cv-goldmann'], ['10:30', 'p_jules', 'bilan'], ['14:00', 'p_monique', 'cv-auto'],
];
const JOUR_B = [
  ['08:30', 'p_karim', 'reeduc-adulte'], ['09:00', 'p_noe', 'bilan-enfant'], ['10:00', 'p_chloe', 'reeduc-enfant'], ['14:00', 'p_hugo', 'bilan', 45], ['15:00', 'p_lea', 'reeduc-adulte', 25],
  ['10:00', 'p_thomas', 'bilan'], ['11:00', 'p_lucas', 'couleurs'], ['14:00', 'p_nadia', 'reeduc-adulte'], ['14:30', 'p_paul', 'neurovisuel'],
];
export function rdvsDemo(T = todayISO()) {
  const out = [];
  const ajouter = (date, [heure, patientId, motif, statut, duree]) =>
    out.push({ id: `r_demo_${out.length}`, praticienId: SUIVI[patientId], patientId, date, heure, motif, duree: duree || MOTIFS[motif].duree, statut, note: '', demo: true });
  for (let d = -5; d <= 9; d++) {
    const date = addDays(T, d);
    if (d === 0) AUJOURDHUI.forEach((r) => ajouter(date, r));
    else if (parseISO(date).getDay() !== 0)
      (Math.abs(d) % 2 ? JOUR_A : JOUR_B).forEach((r, i) => ajouter(date, [r[0], r[1], r[2], d > 0 ? 'attendu' : d === -2 && i === 2 ? 'absent' : 'vu', r[3]]));
  }
  return out;
}

export function etatDemo() {
  const T = todayISO();
  const j = (n) => addDays(T, n);
  const cabinet = { ...CABINET_DEMO };
  const utilisateurs = utilisateursDemo();
  const patients = patientsDemo(j);
  const P = Object.fromEntries(patients.map((p) => [p.id, p]));
  const U = Object.fromEntries(utilisateurs.map((u) => [u.id, u]));
  const normes = JSON.parse(JSON.stringify(NORMES_DEFAUT));
  const bareme = BAREME_DEFAUT.map((a) => ({ ...a }));

  const bilans = modelesBilans(j).map((b) => {
    const patient = P[b.patientId];
    const bilan = { ...b, praticienId: patient.praticienId, data: fusion(bilanVide(patient, b.type), b.data), cr: null, updatedAt: Date.now() };
    if (b.statut !== 'brouillon') bilan.cr = { texte: genererCorps(patient, bilan, { cabinet, praticien: U[patient.praticienId], normes }), modifie: false };
    return bilan;
  });

  let n = 140;
  const facture = (patientId, code, date, statut, mode = '', bilanId = null) => {
    const p = P[patientId];
    const a = acteDe(bareme, code);
    n += 1;
    return { id: `f_demo${n}`, numero: `F-${date.slice(0, 4)}-${String(n).padStart(4, '0')}`, praticienId: p.praticienId, date, patientId, acteCode: a.code, libelle: a.libelle, coef: a.coef, qte: 1, exoneration: p.exoneration, statut, mode, bilanId,
      ...calculFacture({ coef: a.coef, valeur: valeurAMY(cabinet), exoneration: p.exoneration, mutuelle: p.mutuelle }) };
  };
  const factures = [
    facture('p_nadia', '15.2', j(-40), 'payee', 'cb', 'b_nadia'),
    facture('p_lea', '15.2', j(-36), 'payee', 'cb', 'b_lea'),
    facture('p_thomas', '15.2', j(-30), 'payee', 'cheque', 'b_thomas'),
    facture('p_lea', '5.4', j(-21), 'payee', 'tiers-payant'),
    facture('p_karim', '5.4', j(-14), 'payee', 'tiers-payant'),
    facture('p_lea', '5.4', j(-14), 'payee', 'tiers-payant'),
    facture('p_jules', '15.2', j(-10), 'payee', 'cb', 'b_jules'),
    facture('p_ines', '5.8', j(-7), 'en-attente', 'tiers-payant'),
    facture('p_karim', '5.4', j(-7), 'en-attente', 'tiers-payant'),
    facture('p_lea', '5.4', j(-7), 'en-attente', 'tiers-payant'),
    facture('p_chloe', '15.2', j(-6), 'en-attente', 'tiers-payant', 'b_chloe'),
    facture('p_nadia', '5.4', j(-4), 'en-attente', 'tiers-payant'),
    facture('p_robert', '11.5', j(-3), 'en-attente', 'tiers-payant', 'b_robert'),
    facture('p_lea', '5.4', T, 'a-facturer'),
    facture('p_jeanne', '30', T, 'a-facturer', '', 'b_jeanne'),
    facture('p_monique', '12.3', T, 'a-facturer', '', 'b_monique'),
    facture('p_lucas', '6', T, 'a-facturer', '', 'b_lucas'),
  ].reverse();

  const le = (jour, h, m) => {
    const d = parseISO(jour);
    d.setHours(h, m, 0, 0);
    return d.getTime();
  };
  const journal = [
    { ts: le(j(-1), 18, 34), userId: 'u_camille', action: 'deconnexion' },
    { ts: le(j(-1), 16, 5), userId: 'u_admin', action: 'acces.fin', praticienId: 'u_julien', cible: 'Dossiers de Julien Marchetti', detail: 'Durée : 6 min' },
    { ts: le(j(-1), 15, 59), userId: 'u_admin', action: 'acces.debut', praticienId: 'u_julien', cible: 'Dossiers de Julien Marchetti', detail: 'Motif : correction d’une erreur de saisie ou d’un doublon. Doublon du dossier Renard signalé par le praticien.' },
    { ts: le(j(-1), 15, 58), userId: 'u_admin', action: 'connexion' },
    { ts: le(j(-1), 9, 2), userId: 'u_julien', action: 'connexion' },
    { ts: le(j(-1), 8, 49), userId: 'u_camille', action: 'connexion' },
    { ts: le(j(-1), 8, 47), userId: null, action: 'connexion.echec', detail: 'Identifiant saisi : camille.rousel' },
    { ts: le(j(-3), 10, 22), userId: 'u_julien', action: 'cr.generation', praticienId: 'u_julien', cible: 'Robert LEMAIRE' },
    { ts: le(j(-3), 9, 31), userId: 'u_julien', action: 'patient.consultation', praticienId: 'u_julien', cible: 'Robert LEMAIRE' },
  ].map((e, i) => ({ id: `j_demo${i}`, demo: true, ...e }));

  return { version: 2, cabinet, normes, bareme, utilisateurs, patients, rdvs: rdvsDemo(T), bilans, factures, journal, compteurFacture: n };
}
