// API du serveur SACCADES. Toutes les règles d'accès sont appliquées ici, jamais seulement dans le navigateur :
// - chaque cabinet est isolé des autres ;
// - un praticien ne lit et n'écrit que ses dossiers ;
// - l'administrateur d'un cabinet ne voit que des chiffres, sauf pendant un accès exceptionnel motivé ;
// - le propriétaire de la plateforme gère inscriptions et abonnements, sans aucun accès aux dossiers.
import express from 'express';
import QRCode from 'qrcode';
import { randomBytes } from 'node:crypto';
import { PLATEFORME, creerReglagesCabinet, lireOffre, lireReglages, q, transaction } from './db.js';
import { LEURRE, empreinte, hacherMotDePasse, jeton, motDePasseProvisoire, secretTotp, uriTotp, verifierMotDePasse, verifierTotp } from './securite.js';
import { abonnementDeFacture, finDeFacture, finDePeriode, stripe, stripeActif, verifierSignature } from './stripe.js';
import { compter } from '../src/stats.js';
import { MOTIFS_ACCES, ZONES } from '../src/domain.js';
import { OFFRE_DEFAUT, ajouterMois, etatAbonnement, nouveauCodeParrainage } from '../src/offre.js';
import { toISO, todayISO } from '../src/lib.js';

export const routeur = express.Router();
const PROD = process.env.NODE_ENV === 'production';
const NOM_COOKIE = PROD ? '__Host-saccades' : 'saccades';
const DUREE_SESSION = 12 * 3600 * 1000;
const DUREE_ETAPE = 10 * 60 * 1000;
const DUREE_ACCES = 60 * 60 * 1000;
const COLLECTIONS = ['patients', 'rdvs', 'bilans', 'factures'];
const ID = /^[a-z]_[A-Za-z0-9_-]{1,64}$/;
const IDENTIFIANT = /^[a-z0-9._-]{3,60}$/;
const MDP_MIN = 12;
// Événements que le navigateur peut consigner ; les autres (connexions, accès, comptes) ne sont écrits que par le serveur.
const ACTIONS_CLIENT = new Set([
  'patient.consultation', 'patient.creation', 'patient.modification', 'rgpd.maj', 'bilan.consultation', 'bilan.creation', 'bilan.suppression',
  'cr.generation', 'cr.copie', 'cr.export', 'cr.envoi', 'rdv.creation', 'rdv.modification', 'rdv.suppression', 'seance.validation',
  'facture.creation', 'facture.modification', 'sauvegarde.export',
]);
// Événements visibles du propriétaire de la plateforme : jamais de donnée de patient.
const ACTIONS_PLATEFORME = ['cabinet.inscription', 'cabinet.validation', 'cabinet.refus', 'cabinet.suspension', 'cabinet.reactivation', 'cabinet.prolongation', 'abonnement.paiement', 'abonnement.stripe', 'parrainage.recompense', 'offre.modification'];

/* ---------- Outils ---------- */
const h = (f) => (req, res, next) => Promise.resolve(f(req, res, next)).catch(next);
const court = (v, n = 400) => (v == null ? null : String(v).slice(0, n));
const texte = (v, n) => String(v == null ? '' : v).slice(0, n);
const nomDe = (u) => [u.prenom, u.nom].filter(Boolean).join(' ');
const erreur = (res, code, message, extra = {}) => res.status(code).json({ erreur: message, ...extra });
const aleatoire = (n) => randomBytes(n).toString('base64url');

function poserCookie(res, valeur, secondes) {
  res.append('Set-Cookie', `${NOM_COOKIE}=${valeur}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${secondes}${PROD ? '; Secure' : ''}`);
}
function lireCookie(req) {
  const c = (req.headers.cookie || '').split(/;\s*/).find((x) => x.startsWith(`${NOM_COOKIE}=`));
  return c ? c.slice(NOM_COOKIE.length + 1) : null;
}
async function journaliser(req, action, { utilisateurId, cabinetId, praticienId, cible, detail } = {}, client = null) {
  const s = req.s || {};
  const uid = utilisateurId !== undefined ? utilisateurId : s.id || null;
  const cab = cabinetId !== undefined ? cabinetId : s.cabinet_id || null;
  await (client || { query: q }).query('insert into journal (cabinet_id, utilisateur_id, action, praticien_id, cible, detail, ip) values ($1, $2, $3, $4, $5, $6, $7)', [cab, uid, action, praticienId || null, court(cible), court(detail), req.ip || null]);
}
const versJournal = (r) => ({ id: `j${r.id}`, ts: new Date(r.ts).getTime(), userId: r.utilisateur_id, action: r.action, praticienId: r.praticien_id || undefined, cible: r.cible || '', detail: r.detail || '' });
const publicUtilisateur = (u, complet) => ({
  id: u.id, role: u.role, gestionnaire: u.gestionnaire, prenom: u.prenom, nom: u.nom, titre: u.titre, rpps: u.rpps, actif: u.actif,
  ...(complet ? { identifiant: u.identifiant, mfa: u.totp_actif, derniereConnexion: u.derniere_connexion ? new Date(u.derniere_connexion).getTime() : 0 } : {}),
});
const versCabinet = (c) => ({
  id: c.id, nom: c.nom, ville: c.ville, statut: c.statut, essaiFin: c.essai_fin, accesJusqu: c.acces_jusqu, codeParrainage: c.code_parrainage, parrainId: c.parrain_id,
  contactEmail: c.contact_email, fondateurRpps: c.fondateur_rpps, abonnementStatut: c.abonnement_statut, stripe: !!c.stripe_abonnement,
  premierPaiement: c.premier_paiement ? new Date(c.premier_paiement).getTime() : 0, cree: new Date(c.cree).getTime(), valideLe: c.valide_le ? new Date(c.valide_le).getTime() : 0,
});
const cabinetDe = async (id) => (id ? (await q('select * from cabinets where id = $1', [id])).rows[0] : null);

/* Réglages mis en cache quelques secondes (ils sont lus à chaque requête pour la durée d'inactivité). */
const cache = new Map();
async function reglages(cabinetId) {
  const c = cache.get(cabinetId);
  if (c && Date.now() - c.t < 15000) return c.valeur;
  const valeur = await lireReglages(cabinetId);
  cache.set(cabinetId, { t: Date.now(), valeur });
  return valeur;
}

/* Limitation des tentatives par adresse IP. */
const compteurs = new Map();
const limiter = (nom, max, fenetreMin) => (req, res, next) => {
  const cle = `${nom}:${req.ip}`;
  const t = Date.now();
  const l = (compteurs.get(cle) || []).filter((x) => t - x < fenetreMin * 60000);
  if (l.length >= max) return erreur(res, 429, 'Trop de tentatives depuis cette adresse : réessayez plus tard.');
  l.push(t);
  compteurs.set(cle, l);
  return next();
};
const limiteConnexion = limiter('connexion', 30, 15);
const limiteInscription = limiter('inscription', 10, 60);
setInterval(() => {
  q("delete from sessions where vu < now() - interval '1 day' or cree < now() - interval '13 hours'").catch(() => {});
}, 60 * 60000).unref();
setInterval(() => {
  const t = Date.now();
  for (const [cle, l] of compteurs) if (!l.some((x) => t - x < 60 * 60000)) compteurs.delete(cle);
}, 10 * 60000).unref();

/* ---------- Session ---------- */
const etapeDe = (s) => (!s.mfa_ok ? (s.totp_actif ? 'mfa' : 'mfa-activation') : s.doit_changer ? 'changer' : 'ok');
const perimetre = (s) => (s.role === 'plateforme' ? null : s.role === 'admin' ? s.acces_praticien || null : s.id);
const gere = (s) => s.role === 'admin' || (s.role === 'praticien' && s.gestionnaire);
const BLOCAGES = {
  en_attente: 'Votre inscription est en cours de vérification : vous pourrez vous connecter dès l’ouverture de votre compte.',
  refuse: "Votre inscription n'a pas été acceptée.",
  suspendu: 'L’accès de votre cabinet est suspendu : contactez SACCADES.',
};

async function lireSession(req) {
  const t = lireCookie(req);
  if (!t) return null;
  const sid = empreinte(t);
  const { rows } = await q(
    `select s.id as sid, s.cree as s_cree, s.vu, s.mfa_ok, s.acces_praticien, s.acces_motif, s.acces_debut, s.acces_fin, u.*,
       c.statut as c_statut, c.acces_jusqu as c_acces_jusqu, c.abonnement_statut as c_abonnement_statut, c.premier_paiement as c_premier_paiement
     from sessions s join utilisateurs u on u.id = s.utilisateur_id left join cabinets c on c.id = u.cabinet_id where s.id = $1`,
    [sid],
  );
  const s = rows[0];
  if (!s) return null;
  const maintenant = Date.now();
  const inactivite = (s.cabinet_id ? (await reglages(s.cabinet_id)).cabinet.inactivite || 15 : 15) * 60000;
  const expiree =
    !s.actif || BLOCAGES[s.c_statut] || maintenant - new Date(s.s_cree) > DUREE_SESSION || maintenant - new Date(s.vu) > inactivite || (!s.mfa_ok && maintenant - new Date(s.s_cree) > DUREE_ETAPE);
  if (expiree) {
    await q('delete from sessions where id = $1', [sid]);
    return null;
  }
  if (s.acces_praticien && s.acces_fin && new Date(s.acces_fin) < new Date()) {
    await q('update sessions set acces_praticien = null, acces_motif = null, acces_debut = null, acces_fin = null where id = $1', [sid]);
    await journaliser({ s }, 'acces.fin', { praticienId: s.acces_praticien, detail: "Fin automatique après une heure d'accès" });
    s.acces_praticien = null;
  }
  if (maintenant - new Date(s.vu) > 20000) await q('update sessions set vu = now() where id = $1', [sid]);
  s.abonnement = s.cabinet_id ? etatAbonnement({ statut: s.c_statut, accesJusqu: s.c_acces_jusqu, abonnementStatut: s.c_abonnement_statut, premierPaiement: s.c_premier_paiement }) : null;
  return s;
}
const avecSession = (niveau) =>
  h(async (req, res, next) => {
    const s = await lireSession(req);
    if (!s) return erreur(res, 401, 'Session expirée : reconnectez-vous.');
    const etape = etapeDe(s);
    if (niveau !== 'partiel' && etape !== 'ok') return erreur(res, 401, "L'authentification n'est pas terminée.", { etape });
    if (niveau === 'plateforme' && s.role !== 'plateforme') return erreur(res, 403, 'Action réservée au propriétaire de la plateforme.');
    if (['cabinet', 'gestion', 'admin'].includes(niveau) && !s.cabinet_id) return erreur(res, 403, 'Action réservée aux comptes d’un cabinet.');
    if (niveau === 'gestion' && !gere(s)) return erreur(res, 403, 'Action réservée à la gestion du cabinet.');
    if (niveau === 'admin' && s.role !== 'admin') return erreur(res, 403, "Action réservée à l'administrateur du cabinet.");
    req.s = s;
    req.etape = etape;
    return next();
  });

/* ---------- Protections communes ---------- */
routeur.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  // Une requête d'un autre site ne peut pas poser cet en-tête sans autorisation préalable.
  if (req.method !== 'GET' && req.get('x-saccades') !== '1') return erreur(res, 403, 'Requête refusée.');
  return next();
});

routeur.get('/sante', h(async (req, res) => {
  await q('select 1');
  res.json({ ok: true });
}));

routeur.get('/public', h(async (req, res) => {
  const o = await lireOffre();
  res.json({
    plateforme: {
      editeur: o.editeur, hebergeur: o.hebergeur, contact: o.contact,
      inscriptions: !!(o.inscriptionsOuvertes && o.cgu.trim()),
      cgu: o.cgu,
      annonce: o.annonce ? { texte: o.annonce, ton: o.annonceTon } : null,
      offre: { prixMensuelHT: o.prixMensuelHT, essaiMois: o.essaiMois, moisParrain: o.moisParrain, moisFilleul: o.moisFilleul },
    },
  });
}));

/* ---------- Inscription d'un cabinet ---------- */
routeur.post('/inscription', limiteInscription, h(async (req, res) => {
  const o = await lireOffre();
  if (!o.inscriptionsOuvertes || !o.cgu.trim()) return erreur(res, 403, 'Les inscriptions ne sont pas encore ouvertes.');
  const b = req.body;
  const p = { prenom: texte(b.prenom, 80).trim(), nom: texte(b.nom, 80).trim() };
  const rpps = texte(b.rpps, 20).replace(/\s+/g, '');
  const email = texte(b.email, 160).trim().toLowerCase();
  const nomCabinet = texte(b.cabinet, 120).trim();
  const ville = texte(b.ville, 80).trim();
  const identifiant = texte(b.identifiant, 60).trim().toLowerCase();
  const mdp = String(b.motDePasse || '');
  if (!p.prenom || !p.nom || !nomCabinet || !ville) return erreur(res, 400, 'Renseignez votre nom, votre prénom, le nom du cabinet et sa ville.');
  if (!/^\d{11}$/.test(rpps)) return erreur(res, 400, 'Le numéro RPPS compte 11 chiffres.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return erreur(res, 400, 'Adresse e-mail invalide.');
  if (!IDENTIFIANT.test(identifiant)) return erreur(res, 400, "L'identifiant compte de 3 à 60 caractères : lettres minuscules, chiffres, point ou tiret.");
  if (mdp.length < MDP_MIN || mdp.length > 200) return erreur(res, 400, `Le mot de passe compte au moins ${MDP_MIN} caractères.`);
  if (mdp.toLowerCase().includes(identifiant)) return erreur(res, 400, "Le mot de passe ne doit pas contenir l'identifiant.");
  if (b.accepte !== true || b.atteste !== true) return erreur(res, 400, 'Acceptez les conditions et attestez votre qualité d’orthoptiste.');
  if ((await q('select 1 from utilisateurs where identifiant = $1', [identifiant])).rowCount) return erreur(res, 409, 'Cet identifiant est déjà utilisé : choisissez-en un autre.');
  const codeSaisi = texte(b.codeParrainage, 20).trim().toUpperCase();
  const parrain = codeSaisi ? (await q("select id from cabinets where code_parrainage = $1 and statut = 'actif'", [codeSaisi])).rows[0] : null;
  if (codeSaisi && !parrain) return erreur(res, 400, 'Code de parrainage inconnu : vérifiez-le ou laissez le champ vide.');

  const cabinetId = `c_${aleatoire(9)}`;
  const userId = `u_${aleatoire(9)}`;
  const hash = await hacherMotDePasse(mdp);
  await transaction(async (c) => {
    let code;
    do code = nouveauCodeParrainage(aleatoire(8));
    while ((await c.query('select 1 from cabinets where code_parrainage = $1', [code])).rowCount);
    await c.query('insert into cabinets (id, nom, ville, code_parrainage, parrain_id, contact_email, fondateur_rpps) values ($1, $2, $3, $4, $5, $6, $7)', [cabinetId, nomCabinet, ville, code, parrain ? parrain.id : null, email, rpps]);
    await c.query(
      "insert into utilisateurs (id, cabinet_id, identifiant, role, gestionnaire, prenom, nom, titre, rpps, email, hash, doit_changer) values ($1, $2, $3, 'praticien', true, $4, $5, 'Orthoptiste', $6, $7, $8, false)",
      [userId, cabinetId, identifiant, p.prenom, p.nom, rpps, email, hash],
    );
    await creerReglagesCabinet(c, cabinetId, { nom: nomCabinet, ville, email });
    if (parrain) await c.query('insert into parrainages (filleul_id, parrain_id) values ($1, $2)', [cabinetId, parrain.id]);
    await journaliser(req, 'cabinet.inscription', { utilisateurId: userId, cabinetId, cible: nomCabinet, detail: `${nomDe(p)}, RPPS ${rpps}${parrain ? ', avec un code de parrainage' : ''}` }, c);
  });
  res.json({ ok: true });
}));

/* ---------- Connexion ---------- */
routeur.post('/connexion', limiteConnexion, h(async (req, res) => {
  const identifiant = texte(req.body.identifiant, 80).trim().toLowerCase();
  const mdp = String(req.body.motDePasse || '').slice(0, 200);
  const { rows } = await q('select u.*, c.statut as c_statut from utilisateurs u left join cabinets c on c.id = u.cabinet_id where u.identifiant = $1', [identifiant]);
  const u = rows[0];
  if (u && u.bloque_jusqu && new Date(u.bloque_jusqu) > new Date()) {
    await journaliser(req, 'connexion.echec', { utilisateurId: u.id, cabinetId: u.cabinet_id, detail: 'Compte temporairement bloqué' });
    return erreur(res, 423, 'Compte temporairement bloqué après plusieurs échecs : réessayez dans 15 minutes.');
  }
  const ok = await verifierMotDePasse(mdp, u ? u.hash : LEURRE);
  if (!u || !ok || !u.actif) {
    if (u) {
      const echecs = u.echecs + 1;
      const bloque = echecs >= 5;
      await q('update utilisateurs set echecs = $2, bloque_jusqu = $3 where id = $1', [u.id, bloque ? 0 : echecs, bloque ? new Date(Date.now() + 15 * 60000) : null]);
      if (bloque) await journaliser(req, 'compte.bloque', { utilisateurId: u.id, cabinetId: u.cabinet_id });
    }
    await journaliser(req, 'connexion.echec', { utilisateurId: u ? u.id : null, cabinetId: u ? u.cabinet_id : null, detail: `Identifiant saisi : ${identifiant || '(vide)'}${u && !u.actif ? ' (compte désactivé)' : ''}` });
    return erreur(res, 401, 'Identifiant ou mot de passe incorrect.');
  }
  if (BLOCAGES[u.c_statut]) return erreur(res, 403, BLOCAGES[u.c_statut]);
  await q('update utilisateurs set echecs = 0, bloque_jusqu = null where id = $1', [u.id]);
  const t = jeton();
  await q('insert into sessions (id, utilisateur_id) values ($1, $2)', [empreinte(t), u.id]);
  poserCookie(res, t, DUREE_SESSION / 1000);
  return res.json({ etape: u.totp_actif ? 'mfa' : 'mfa-activation' });
}));

routeur.get('/session', h(async (req, res) => {
  const s = await lireSession(req);
  res.json({ etape: s ? etapeDe(s) : 'identifiants' });
}));

routeur.get('/mfa/activation', avecSession('partiel'), h(async (req, res) => {
  const s = req.s;
  if (s.totp_actif) return erreur(res, 409, 'La double authentification est déjà activée.');
  let secret = s.totp_secret;
  if (!secret) {
    secret = secretTotp();
    await q('update utilisateurs set totp_secret = $2 where id = $1', [s.id, secret]);
  }
  const qr = await QRCode.toString(uriTotp(secret, s.identifiant), { type: 'svg', margin: 0, errorCorrectionLevel: 'M' });
  return res.json({ secret, qr });
}));

async function apresCode(req, res, s, pas) {
  await q('update utilisateurs set totp_dernier = $2, echecs = 0, derniere_connexion = now() where id = $1', [s.id, pas]);
  await q('update sessions set mfa_ok = true where id = $1', [s.sid]);
  await journaliser(req, 'connexion');
  return res.json({ etape: s.doit_changer ? 'changer' : 'ok' });
}
async function codeRefuse(req, res, s) {
  const echecs = s.echecs + 1;
  const bloque = echecs >= 5;
  await q('update utilisateurs set echecs = $2, bloque_jusqu = $3 where id = $1', [s.id, bloque ? 0 : echecs, bloque ? new Date(Date.now() + 15 * 60000) : null]);
  await journaliser(req, 'mfa.echec');
  if (bloque) {
    await q('delete from sessions where utilisateur_id = $1', [s.id]);
    await journaliser(req, 'compte.bloque');
    return erreur(res, 401, 'Trop de codes erronés : compte bloqué 15 minutes.');
  }
  return erreur(res, 400, 'Code incorrect ou expiré. Vérifiez l’heure de votre téléphone et réessayez.');
}
routeur.post('/mfa/activer', limiteConnexion, avecSession('partiel'), h(async (req, res) => {
  const s = req.s;
  if (s.totp_actif) return erreur(res, 409, 'La double authentification est déjà activée.');
  const pas = verifierTotp(s.totp_secret, req.body.code, s.totp_dernier);
  if (!pas) return codeRefuse(req, res, s);
  await q('update utilisateurs set totp_actif = true where id = $1', [s.id]);
  await journaliser(req, 'mfa.activation');
  return apresCode(req, res, s, pas);
}));
routeur.post('/mfa/verifier', limiteConnexion, avecSession('partiel'), h(async (req, res) => {
  const s = req.s;
  if (!s.totp_actif) return erreur(res, 409, "La double authentification n'est pas encore activée.");
  const pas = verifierTotp(s.totp_secret, req.body.code, s.totp_dernier);
  if (!pas) return codeRefuse(req, res, s);
  return apresCode(req, res, s, pas);
}));

routeur.post('/motdepasse', avecSession('partiel'), h(async (req, res) => {
  const s = req.s;
  if (!s.mfa_ok) return erreur(res, 401, "L'authentification n'est pas terminée.");
  const nouveau = String(req.body.nouveau || '');
  if (!s.doit_changer && !(await verifierMotDePasse(String(req.body.actuel || ''), s.hash))) return erreur(res, 400, 'Le mot de passe actuel est incorrect.');
  if (nouveau.length < MDP_MIN || nouveau.length > 200) return erreur(res, 400, `Le nouveau mot de passe doit compter de ${MDP_MIN} à 200 caractères.`);
  if (nouveau.toLowerCase().includes(s.identifiant)) return erreur(res, 400, "Le mot de passe ne doit pas contenir l'identifiant.");
  if (await verifierMotDePasse(nouveau, s.hash)) return erreur(res, 400, "Choisissez un mot de passe différent de l'actuel.");
  await q('update utilisateurs set hash = $2, doit_changer = false where id = $1', [s.id, await hacherMotDePasse(nouveau)]);
  await q('delete from sessions where utilisateur_id = $1 and id <> $2', [s.id, s.sid]);
  await journaliser(req, 'utilisateur.motdepasse', { cible: nomDe(s) });
  return res.json({ etape: 'ok' });
}));

routeur.post('/deconnexion', h(async (req, res) => {
  const t = lireCookie(req);
  if (t) {
    const { rows } = await q('delete from sessions s using utilisateurs u where s.id = $1 and u.id = s.utilisateur_id returning u.id, u.cabinet_id', [empreinte(t)]);
    if (rows[0]) await journaliser(req, 'deconnexion', { utilisateurId: rows[0].id, cabinetId: rows[0].cabinet_id });
  }
  poserCookie(res, '', 0);
  res.json({ ok: true });
}));

/* ---------- Abonnement et parrainage ---------- */
async function praticiensActifs(cabinetId) {
  return (await q("select count(*)::int as n from utilisateurs where cabinet_id = $1 and role = 'praticien' and actif", [cabinetId])).rows[0].n;
}
/** Offre n mois : prolonge l'accès et, pour un abonné Stripe, décale le prochain prélèvement. */
async function offrirMois(req, cabinetId, mois, motif) {
  const c = await cabinetDe(cabinetId);
  if (!c || !mois) return;
  const T = todayISO();
  const base = c.acces_jusqu && c.acces_jusqu > T ? c.acces_jusqu : T;
  await q('update cabinets set acces_jusqu = $2 where id = $1', [cabinetId, ajouterMois(base, mois)]);
  let detail = `${mois} mois offert${mois > 1 ? 's' : ''} : ${motif}`;
  if (stripeActif() && c.stripe_abonnement && ['active', 'trialing', 'past_due'].includes(c.abonnement_statut)) {
    try {
      const sub = await stripe('GET', `/subscriptions/${c.stripe_abonnement}`);
      const fin = toISO(new Date(finDePeriode(sub) * 1000));
      await stripe('POST', `/subscriptions/${c.stripe_abonnement}`, { trial_end: Math.floor(new Date(`${ajouterMois(fin, mois)}T12:00:00Z`).getTime() / 1000), proration_behavior: 'none' });
    } catch (e) {
      console.error('Stripe : mois offert non appliqué :', e.message);
      detail += ' (à reporter à la main dans Stripe)';
    }
  }
  await journaliser(req, 'parrainage.recompense', { cabinetId, cible: c.nom, detail });
}
/** Au premier paiement d'un filleul : un mois (selon l'offre) au parrain et au filleul. */
async function recompenserParrainage(req, filleulId) {
  const p = (await q("update parrainages set statut = 'recompense', recompense_le = now() where filleul_id = $1 and statut = 'en_attente' returning parrain_id", [filleulId])).rows[0];
  if (!p) return;
  const o = await lireOffre();
  const filleul = await cabinetDe(filleulId);
  await offrirMois(req, p.parrain_id, o.moisParrain, `parrainage de ${filleul.nom}`);
  await offrirMois(req, filleulId, o.moisFilleul, 'bienvenue grâce au parrainage');
}
async function premierPaiement(req, cabinetId) {
  const r = await q('update cabinets set premier_paiement = now() where id = $1 and premier_paiement is null returning id', [cabinetId]);
  if (r.rowCount) await recompenserParrainage(req, cabinetId);
}
async function ajusterPlaces(cabinetId) {
  const c = await cabinetDe(cabinetId);
  if (!stripeActif() || !c || !c.stripe_abonnement) return;
  try {
    const sub = await stripe('GET', `/subscriptions/${c.stripe_abonnement}`);
    const item = sub.items && sub.items.data && sub.items.data[0];
    if (item) await stripe('POST', `/subscriptions/${c.stripe_abonnement}`, { items: [{ id: item.id, quantity: Math.max(1, await praticiensActifs(cabinetId)) }] });
  } catch (e) {
    console.error('Stripe : nombre de praticiens non mis à jour :', e.message);
  }
}
async function abonnementDuCabinet(cabinetId) {
  const c = await cabinetDe(cabinetId);
  const o = await lireOffre();
  const n = await praticiensActifs(cabinetId);
  const filleuls = (await q('select c.nom, c.ville, c.cree, p.statut from parrainages p join cabinets c on c.id = p.filleul_id where p.parrain_id = $1 order by p.cree desc', [cabinetId])).rows;
  return {
    ...etatAbonnement(versCabinet(c)),
    cabinet: versCabinet(c),
    prixMensuelHT: o.prixMensuelHT,
    essaiMois: o.essaiMois,
    moisParrain: o.moisParrain,
    moisFilleul: o.moisFilleul,
    contact: o.contact,
    praticiens: Math.max(1, n),
    paiementEnLigne: stripeActif(),
    codeParrainage: c.code_parrainage,
    filleuls: filleuls.map((f) => ({ nom: f.nom, ville: f.ville, cree: new Date(f.cree).getTime(), statut: f.statut })),
  };
}

routeur.post('/abonnement/paiement', avecSession('gestion'), h(async (req, res) => {
  if (!stripeActif()) return erreur(res, 503, 'Le paiement en ligne n’est pas encore activé : contactez SACCADES pour régler par virement.');
  const c = await cabinetDe(req.s.cabinet_id);
  const origine = process.env.URL_PUBLIQUE || `https://${req.get('host')}`;
  const finAcces = c.acces_jusqu ? new Date(`${c.acces_jusqu}T20:00:00Z`).getTime() : 0;
  const params = {
    mode: 'subscription',
    client_reference_id: c.id,
    success_url: `${origine}/?abonnement=merci`,
    cancel_url: `${origine}/?abonnement=annule`,
    locale: 'fr',
    billing_address_collection: 'required',
    line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: Math.max(1, await praticiensActifs(c.id)) }],
    subscription_data: { metadata: { cabinet: c.id }, ...(finAcces > Date.now() + 49 * 3600 * 1000 ? { trial_end: Math.floor(finAcces / 1000) } : {}) },
    metadata: { cabinet: c.id },
    ...(c.stripe_client ? { customer: c.stripe_client } : { customer_email: c.contact_email || undefined }),
  };
  const session = await stripe('POST', '/checkout/sessions', params);
  res.json({ url: session.url });
}));

routeur.post('/abonnement/portail', avecSession('gestion'), h(async (req, res) => {
  const c = await cabinetDe(req.s.cabinet_id);
  if (!stripeActif() || !c.stripe_client) return erreur(res, 400, 'Aucun abonnement en ligne pour ce cabinet.');
  const origine = process.env.URL_PUBLIQUE || `https://${req.get('host')}`;
  const session = await stripe('POST', '/billing_portal/sessions', { customer: c.stripe_client, return_url: `${origine}/` });
  res.json({ url: session.url });
}));

/** Événements Stripe (route montée hors du routeur, avec le corps brut pour vérifier la signature). */
export const webhookStripe = h(async (req, res) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return res.status(503).json({ erreur: 'Webhook non configuré.' });
  const brut = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';
  if (!verifierSignature(brut, req.get('stripe-signature'), secret)) return res.status(400).json({ erreur: 'Signature invalide.' });
  const evt = JSON.parse(brut);
  const o = (evt.data && evt.data.object) || {};
  const parAbonnement = async (id) => (id ? (await q('select * from cabinets where stripe_abonnement = $1', [id])).rows[0] : null);
  const ctx = { ip: null, s: null };
  if (evt.type === 'checkout.session.completed' && o.client_reference_id) {
    const c = await cabinetDe(o.client_reference_id);
    if (c) {
      await q('update cabinets set stripe_client = $2, stripe_abonnement = $3 where id = $1', [c.id, o.customer, o.subscription]);
      await journaliser(ctx, 'abonnement.stripe', { cabinetId: c.id, cible: c.nom, detail: 'Abonnement souscrit en ligne' });
    }
  } else if (['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'].includes(evt.type)) {
    const id = (o.metadata && o.metadata.cabinet) || ((await parAbonnement(o.id)) || {}).id;
    if (id) await q('update cabinets set abonnement_statut = $2, stripe_abonnement = $3, stripe_client = coalesce(stripe_client, $4) where id = $1', [id, evt.type.endsWith('deleted') ? 'canceled' : o.status, o.id, o.customer]);
  } else if (evt.type === 'invoice.paid') {
    const c = await parAbonnement(abonnementDeFacture(o));
    if (c && o.amount_paid > 0) {
      const fin = toISO(new Date(finDeFacture(o) * 1000));
      await q('update cabinets set acces_jusqu = greatest(coalesce(acces_jusqu, $2::date), $2::date) where id = $1', [c.id, fin]);
      await journaliser(ctx, 'abonnement.paiement', { cabinetId: c.id, cible: c.nom, detail: `Paiement en ligne de ${(o.amount_paid / 100).toFixed(2).replace('.', ',')} €` });
      await premierPaiement(ctx, c.id);
    }
  }
  return res.json({ recu: true });
});

/* ---------- Console du propriétaire ---------- */
async function donneesPlateforme() {
  const cabinets = (await q('select * from cabinets order by cree desc')).rows;
  const fondateurs = (await q("select distinct on (cabinet_id) cabinet_id, prenom, nom, email, rpps from utilisateurs where gestionnaire or role = 'admin' order by cabinet_id, cree")).rows;
  const nb = (await q("select cabinet_id, count(*)::int as n from utilisateurs where role = 'praticien' and actif group by cabinet_id")).rows;
  const parrainages = (await q('select filleul_id, parrain_id, statut from parrainages')).rows;
  const F = Object.fromEntries(fondateurs.map((f) => [f.cabinet_id, f]));
  const N = Object.fromEntries(nb.map((x) => [x.cabinet_id, x.n]));
  const journal = (await q('select * from journal where cabinet_id is null or action = any($1) order by id desc limit 300', [ACTIONS_PLATEFORME])).rows;
  return {
    offre: await lireOffre(),
    paiementEnLigne: stripeActif(),
    cabinets: cabinets.map((c) => ({
      ...versCabinet(c),
      fondateur: F[c.id] ? { nom: nomDe(F[c.id]), email: F[c.id].email, rpps: F[c.id].rpps } : null,
      praticiens: N[c.id] || 0,
    })),
    parrainages: parrainages.map((p) => ({ filleulId: p.filleul_id, parrainId: p.parrain_id, statut: p.statut })),
    journal: journal.map(versJournal),
  };
}

routeur.post('/plateforme/cabinets/:id', avecSession('plateforme'), h(async (req, res) => {
  const c = await cabinetDe(req.params.id);
  if (!c) return erreur(res, 404, 'Cabinet introuvable.');
  const { action } = req.body;
  const o = await lireOffre();
  const T = todayISO();
  const trace = (a, detail) => journaliser(req, a, { cabinetId: c.id, cible: c.nom, detail });
  if (action === 'valider' && c.statut === 'en_attente') {
    const fin = ajouterMois(T, o.essaiMois);
    await q("update cabinets set statut = 'actif', valide_le = now(), essai_fin = $2, acces_jusqu = $2 where id = $1", [c.id, fin]);
    await trace('cabinet.validation', `Période gratuite jusqu'au ${fin}`);
  } else if (action === 'refuser' && c.statut === 'en_attente') {
    await q("update cabinets set statut = 'refuse' where id = $1", [c.id]);
    await trace('cabinet.refus', court(req.body.motif, 200) || undefined);
  } else if (action === 'suspendre' && c.statut === 'actif') {
    await q("update cabinets set statut = 'suspendu' where id = $1", [c.id]);
    await q('delete from sessions s using utilisateurs u where u.id = s.utilisateur_id and u.cabinet_id = $1', [c.id]);
    await trace('cabinet.suspension', court(req.body.motif, 200) || undefined);
  } else if (action === 'reactiver' && c.statut === 'suspendu') {
    await q("update cabinets set statut = 'actif' where id = $1", [c.id]);
    await trace('cabinet.reactivation');
  } else if (action === 'prolonger') {
    const mois = Math.min(24, Math.max(1, parseInt(req.body.mois, 10) || 1));
    const base = c.acces_jusqu && c.acces_jusqu > T ? c.acces_jusqu : T;
    await q('update cabinets set acces_jusqu = $2 where id = $1', [c.id, ajouterMois(base, mois)]);
    await trace('cabinet.prolongation', `${mois} mois offert${mois > 1 ? 's' : ''}`);
  } else if (action === 'payer') {
    const jusqu = String(req.body.jusqu || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(jusqu) || jusqu < T) return erreur(res, 400, 'Indiquez une date de fin d’abonnement à venir.');
    await q('update cabinets set acces_jusqu = $2 where id = $1', [c.id, jusqu]);
    await trace('abonnement.paiement', `Paiement enregistré à la main, accès jusqu'au ${jusqu}`);
    await premierPaiement(req, c.id);
  } else return erreur(res, 400, 'Action impossible pour ce cabinet.');
  res.json({ ok: true });
}));

routeur.get('/plateforme/cabinets/:id/comptes', avecSession('plateforme'), h(async (req, res) => {
  const { rows } = await q('select id, prenom, nom, identifiant, role, gestionnaire, actif, totp_actif from utilisateurs where cabinet_id = $1 order by cree', [req.params.id]);
  res.json({ comptes: rows.map((u) => ({ id: u.id, prenom: u.prenom, nom: u.nom, identifiant: u.identifiant, role: u.role, gestionnaire: u.gestionnaire, actif: u.actif, mfa: u.totp_actif })) });
}));

routeur.post('/plateforme/comptes/:id/reinitialiser', avecSession('plateforme'), h(async (req, res) => {
  const u = (await q("select * from utilisateurs where id = $1 and role <> 'plateforme'", [req.params.id])).rows[0];
  if (!u) return erreur(res, 404, 'Compte introuvable.');
  const mdp = motDePasseProvisoire();
  await q('update utilisateurs set hash = $2, doit_changer = true, totp_actif = false, totp_secret = null, totp_dernier = 0, echecs = 0, bloque_jusqu = null where id = $1', [u.id, await hacherMotDePasse(mdp)]);
  await q('delete from sessions where utilisateur_id = $1', [u.id]);
  await journaliser(req, 'utilisateur.motdepasse', { cabinetId: u.cabinet_id, cible: nomDe(u), detail: 'Accès réinitialisé par SACCADES : mot de passe provisoire et double authentification à réactiver' });
  res.json({ motDePasse: mdp });
}));

routeur.put('/plateforme/offre', avecSession('plateforme'), h(async (req, res) => {
  const b = req.body;
  const nombre = (v, min, max, defaut) => (Number.isFinite(Number(v)) && Number(v) >= min && Number(v) <= max ? Number(v) : defaut);
  const o = {
    prixMensuelHT: nombre(b.prixMensuelHT, 0, 10000, OFFRE_DEFAUT.prixMensuelHT),
    essaiMois: Math.round(nombre(b.essaiMois, 0, 24, OFFRE_DEFAUT.essaiMois)),
    moisParrain: Math.round(nombre(b.moisParrain, 0, 12, OFFRE_DEFAUT.moisParrain)),
    moisFilleul: Math.round(nombre(b.moisFilleul, 0, 12, OFFRE_DEFAUT.moisFilleul)),
    inscriptionsOuvertes: b.inscriptionsOuvertes === true,
    cgu: texte(b.cgu, 60000),
    contact: texte(b.contact, 200),
    editeur: texte(b.editeur, 600),
    hebergeur: texte(b.hebergeur, 600),
    annonce: texte(b.annonce, 500).trim(),
    annonceTon: b.annonceTon === 'warn' ? 'warn' : 'info',
  };
  if (o.inscriptionsOuvertes && !o.cgu.trim()) return erreur(res, 400, 'Rédigez les conditions générales avant d’ouvrir les inscriptions.');
  await q('insert into reglages (cabinet_id, cle, valeur) values ($1, $2, $3) on conflict (cabinet_id, cle) do update set valeur = excluded.valeur', [PLATEFORME, 'offre', JSON.stringify(o)]);
  await journaliser(req, 'offre.modification', { detail: `${o.prixMensuelHT} € HT par mois et par praticien, ${o.essaiMois} mois gratuits, inscriptions ${o.inscriptionsOuvertes ? 'ouvertes' : 'fermées'}` });
  res.json({ ok: true });
}));

/* ---------- Données du cabinet ---------- */
async function lireJournal(s, limite) {
  if (s.role === 'plateforme') return (await donneesPlateforme()).journal;
  const { rows } = s.role === 'admin'
    ? await q('select * from journal where cabinet_id = $1 order by id desc limit $2', [s.cabinet_id, limite])
    : await q('select * from journal where cabinet_id = $1 and (utilisateur_id = $2 or praticien_id = $2) order by id desc limit $3', [s.cabinet_id, s.id, limite]);
  return rows.map(versJournal);
}
async function statistiques(cabinetId) {
  const praticiens = (await q("select id from utilisateurs where cabinet_id = $1 and role = 'praticien'", [cabinetId])).rows;
  const elements = (await q('select e.collection, e.praticien_id, e.donnees from elements e join utilisateurs u on u.id = e.praticien_id where u.cabinet_id = $1', [cabinetId])).rows;
  const out = {};
  for (const { id } of praticiens) {
    const v = { patients: [], rdvs: [], bilans: [], factures: [] };
    for (const e of elements) if (e.praticien_id === id) v[e.collection].push(e.donnees);
    out[id] = compter(v);
  }
  return out;
}

routeur.get('/etat', avecSession('complet'), h(async (req, res) => {
  const s = req.s;
  if (s.role === 'plateforme') {
    const o = await lireOffre();
    return res.json({
      version: 3, moi: s.id, acces: null, cabinet: { nom: 'SACCADES', zone: 'metropole', inactivite: 15, editeur: o.editeur, hebergeur: o.hebergeur, contact: o.contact },
      normes: null, bareme: [], utilisateurs: [publicUtilisateur(s, true)], patients: [], rdvs: [], bilans: [], factures: [], journal: [], compteurFacture: 0,
      plateforme: await donneesPlateforme(),
    });
  }
  const P = perimetre(s);
  const admin = s.role === 'admin';
  const reg = await reglages(s.cabinet_id);
  const utilisateurs = (await q('select * from utilisateurs where cabinet_id = $1 order by role, nom, prenom', [s.cabinet_id])).rows;
  const elements = P ? (await q('select collection, donnees from elements where praticien_id = $1', [P])).rows : [];
  const col = (c) => elements.filter((e) => e.collection === c).map((e) => e.donnees);
  const compteur = P ? (await q('select valeur from reglages where cabinet_id = $1 and cle = $2', [s.cabinet_id, `compteur:${P}`])).rows[0] : null;
  if (P) await journaliser(req, 'etat.chargement', { praticienId: P, detail: admin ? "Accès exceptionnel de l'administrateur" : undefined });
  const o = await lireOffre();
  return res.json({
    version: 3,
    moi: s.id,
    acces: admin && P ? { praticienId: P, motif: s.acces_motif, debut: new Date(s.acces_debut).getTime() } : null,
    cabinet: { ...reg.cabinet, editeur: o.editeur, hebergeur: o.hebergeur, contact: o.contact },
    normes: reg.normes,
    bareme: reg.bareme,
    utilisateurs: utilisateurs.map((u) => publicUtilisateur(u, gere(s) || u.id === s.id)),
    patients: col('patients'),
    rdvs: col('rdvs'),
    bilans: col('bilans'),
    factures: col('factures'),
    journal: await lireJournal(s, 300),
    compteurFacture: compteur ? Number(compteur.valeur) || 0 : 0,
    stats: admin || gere(s) ? await statistiques(s.cabinet_id) : undefined,
    abonnement: gere(s) ? await abonnementDuCabinet(s.cabinet_id) : { ...s.abonnement },
    annonce: o.annonce ? { texte: o.annonce, ton: o.annonceTon } : null,
  });
}));

routeur.get('/journal', avecSession('complet'), h(async (req, res) => res.json({ journal: await lireJournal(req.s, 1000) })));

routeur.post('/synchro', avecSession('cabinet'), h(async (req, res) => {
  const s = req.s;
  const P = perimetre(s);
  const ops = Array.isArray(req.body.ops) ? req.body.ops.slice(0, 1000) : [];
  const evenements = Array.isArray(req.body.journal) ? req.body.journal.slice(0, 200) : [];
  if (ops.length && !P) return erreur(res, 403, 'Aucun dossier accessible : ouvrez un accès exceptionnel motivé.');
  if (ops.length && s.abonnement && s.abonnement.lectureSeule) return erreur(res, 402, 'Période gratuite terminée : vos dossiers restent consultables et exportables. Abonnez-vous pour continuer la saisie.');
  const refuses = [];
  const rang = (o) => (o.op === 'put' ? (o.collection === 'patients' ? 0 : 1) : o.collection === 'patients' ? 3 : 2);
  await transaction(async (c) => {
    for (const o of [...ops].sort((a, b) => rang(a) - rang(b))) {
      if (!o || !COLLECTIONS.includes(o.collection) || typeof o.id !== 'string' || !ID.test(o.id) || !['put', 'del'].includes(o.op)) {
        refuses.push(String(o && o.id));
        continue;
      }
      const existant = (await c.query('select praticien_id from elements where collection = $1 and id = $2', [o.collection, o.id])).rows[0];
      if (existant && existant.praticien_id !== P) {
        refuses.push(o.id);
        continue;
      }
      if (o.op === 'del') {
        await c.query('delete from elements where collection = $1 and id = $2', [o.collection, o.id]);
        continue;
      }
      const d = o.donnees;
      if (!d || typeof d !== 'object' || Array.isArray(d) || d.id !== o.id) {
        refuses.push(o.id);
        continue;
      }
      const json = JSON.stringify({ ...d, praticienId: P });
      if (json.length > 600000) {
        refuses.push(o.id);
        continue;
      }
      if (o.collection !== 'patients') {
        const patient = await c.query("select 1 from elements where collection = 'patients' and id = $1 and praticien_id = $2", [String(d.patientId), P]);
        if (!patient.rowCount) {
          refuses.push(o.id);
          continue;
        }
      }
      await c.query(
        'insert into elements (collection, id, praticien_id, donnees, maj) values ($1, $2, $3, $4, now()) on conflict (collection, id) do update set donnees = excluded.donnees, maj = now()',
        [o.collection, o.id, P, json],
      );
    }
    for (const e of evenements) {
      if (!e || !ACTIONS_CLIENT.has(e.action)) continue;
      await journaliser(req, e.action, { praticienId: P, cible: e.cible, detail: e.detail }, c);
    }
    const cf = Number(req.body.compteurFacture);
    if (P && Number.isInteger(cf) && cf > 0 && cf < 1e7) {
      await c.query(
        "insert into reglages (cabinet_id, cle, valeur) values ($1, $2, to_jsonb($3::int)) on conflict (cabinet_id, cle) do update set valeur = to_jsonb(greatest((reglages.valeur #>> '{}')::int, $3::int))",
        [s.cabinet_id, `compteur:${P}`, cf],
      );
    }
  });
  res.json({ ok: true, refuses });
}));

/* ---------- Accès exceptionnel de l'administrateur du cabinet ---------- */
routeur.post('/acces', avecSession('admin'), h(async (req, res) => {
  const s = req.s;
  const praticien = (await q("select * from utilisateurs where id = $1 and role = 'praticien' and cabinet_id = $2", [String(req.body.praticienId), s.cabinet_id])).rows[0];
  const motif = String(req.body.motif || '');
  const precision = texte(req.body.precision, 300).trim();
  if (!praticien) return erreur(res, 404, 'Praticien introuvable dans votre cabinet.');
  if (!MOTIFS_ACCES.includes(motif)) return erreur(res, 400, 'Choisissez un motif dans la liste.');
  if (precision.length < 10) return erreur(res, 400, 'La précision doit compter au moins 10 caractères.');
  await q('update sessions set acces_praticien = $2, acces_motif = $3, acces_debut = now(), acces_fin = $4 where id = $1', [s.sid, praticien.id, motif, new Date(Date.now() + DUREE_ACCES)]);
  await journaliser(req, 'acces.debut', { praticienId: praticien.id, cible: `Dossiers de ${nomDe(praticien)}`, detail: `Motif : ${motif.charAt(0).toLowerCase()}${motif.slice(1)}. ${precision}` });
  res.json({ ok: true });
}));
routeur.post('/acces/fin', avecSession('admin'), h(async (req, res) => {
  const s = req.s;
  if (s.acces_praticien) {
    const p = (await q('select prenom, nom from utilisateurs where id = $1', [s.acces_praticien])).rows[0] || {};
    const minutes = Math.max(1, Math.round((Date.now() - new Date(s.acces_debut)) / 60000));
    await q('update sessions set acces_praticien = null, acces_motif = null, acces_debut = null, acces_fin = null where id = $1', [s.sid]);
    await journaliser(req, 'acces.fin', { praticienId: s.acces_praticien, cible: `Dossiers de ${nomDe(p)}`, detail: `Durée : ${minutes} min` });
  }
  res.json({ ok: true });
}));

/* ---------- Comptes du cabinet ---------- */
const profil = (b) => ({ prenom: texte(b.prenom, 80).trim(), nom: texte(b.nom, 80).trim(), titre: texte(b.titre, 80).trim(), rpps: texte(b.rpps, 40).trim() });

routeur.post('/utilisateurs', avecSession('gestion'), h(async (req, res) => {
  const b = req.body;
  const identifiant = texte(b.identifiant, 60).trim().toLowerCase();
  const p = profil(b);
  const role = b.role === 'admin' ? 'admin' : 'praticien';
  if (!IDENTIFIANT.test(identifiant)) return erreur(res, 400, "L'identifiant compte de 3 à 60 caractères : lettres minuscules, chiffres, point ou tiret.");
  if (!p.nom) return erreur(res, 400, 'Le nom est obligatoire.');
  if (String(b.motDePasse || '').length < MDP_MIN) return erreur(res, 400, `Le mot de passe provisoire compte au moins ${MDP_MIN} caractères.`);
  if ((await q('select 1 from utilisateurs where identifiant = $1', [identifiant])).rowCount) return erreur(res, 409, 'Cet identifiant est déjà utilisé.');
  const id = `u_${aleatoire(9)}`;
  await q('insert into utilisateurs (id, cabinet_id, identifiant, role, gestionnaire, prenom, nom, titre, rpps, hash, doit_changer) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)', [
    id, req.s.cabinet_id, identifiant, role, role === 'praticien' && b.gestionnaire === true, p.prenom, p.nom, p.titre || (role === 'admin' ? 'Administration du cabinet' : 'Orthoptiste'), p.rpps, await hacherMotDePasse(b.motDePasse),
  ]);
  await journaliser(req, 'utilisateur.creation', { cible: nomDe(p), detail: role === 'admin' ? 'Rôle : administrateur du cabinet' : `Rôle : praticien${b.gestionnaire === true ? ', gestionnaire' : ''}` });
  if (role === 'praticien') await ajusterPlaces(req.s.cabinet_id);
  res.json({ ok: true, id });
}));

routeur.put('/utilisateurs/:id', avecSession('gestion'), h(async (req, res) => {
  const u = (await q('select * from utilisateurs where id = $1 and cabinet_id = $2', [req.params.id, req.s.cabinet_id])).rows[0];
  if (!u) return erreur(res, 404, 'Compte introuvable dans votre cabinet.');
  const b = req.body;
  const cible = nomDe(u);
  if (b.prenom !== undefined || b.nom !== undefined) {
    const p = profil({ ...u, ...b });
    if (!p.nom) return erreur(res, 400, 'Le nom est obligatoire.');
    const identifiant = b.identifiant !== undefined ? String(b.identifiant).trim().toLowerCase() : u.identifiant;
    if (!IDENTIFIANT.test(identifiant)) return erreur(res, 400, "L'identifiant compte de 3 à 60 caractères : lettres minuscules, chiffres, point ou tiret.");
    if (identifiant !== u.identifiant && (await q('select 1 from utilisateurs where identifiant = $1', [identifiant])).rowCount) return erreur(res, 409, 'Cet identifiant est déjà utilisé.');
    const gestionnaire = u.role === 'praticien' && typeof b.gestionnaire === 'boolean' && u.id !== req.s.id ? b.gestionnaire : u.gestionnaire;
    await q('update utilisateurs set prenom = $2, nom = $3, titre = $4, rpps = $5, identifiant = $6, gestionnaire = $7 where id = $1', [u.id, p.prenom, p.nom, p.titre, p.rpps, identifiant, gestionnaire]);
    await journaliser(req, 'utilisateur.modification', { cible: nomDe(p) });
  }
  if (b.motDePasse) {
    if (String(b.motDePasse).length < MDP_MIN) return erreur(res, 400, `Le mot de passe provisoire compte au moins ${MDP_MIN} caractères.`);
    await q('update utilisateurs set hash = $2, doit_changer = true, echecs = 0, bloque_jusqu = null where id = $1', [u.id, await hacherMotDePasse(b.motDePasse)]);
    await q('delete from sessions where utilisateur_id = $1', [u.id]);
    await journaliser(req, 'utilisateur.motdepasse', { cible, detail: 'Mot de passe provisoire défini par la gestion du cabinet' });
  }
  if (typeof b.actif === 'boolean' && b.actif !== u.actif) {
    if (u.id === req.s.id) return erreur(res, 400, 'Vous ne pouvez pas désactiver votre propre compte.');
    await q('update utilisateurs set actif = $2 where id = $1', [u.id, b.actif]);
    if (!b.actif) await q('delete from sessions where utilisateur_id = $1', [u.id]);
    await journaliser(req, b.actif ? 'utilisateur.reactivation' : 'utilisateur.desactivation', { cible });
    if (u.role === 'praticien') await ajusterPlaces(req.s.cabinet_id);
  }
  if (b.reinitialiserMfa) {
    await q('update utilisateurs set totp_actif = false, totp_secret = null, totp_dernier = 0 where id = $1', [u.id]);
    await q('delete from sessions where utilisateur_id = $1', [u.id]);
    await journaliser(req, 'mfa.reinitialisation', { cible });
  }
  res.json({ ok: true });
}));

routeur.put('/profil', avecSession('complet'), h(async (req, res) => {
  const p = profil({ ...req.s, ...req.body });
  if (!p.nom) return erreur(res, 400, 'Le nom est obligatoire.');
  await q('update utilisateurs set prenom = $2, nom = $3, titre = $4, rpps = $5 where id = $1', [req.s.id, p.prenom, p.nom, p.titre, p.rpps]);
  await journaliser(req, 'utilisateur.modification', { cible: nomDe(p) });
  res.json({ ok: true });
}));

/* ---------- Réglages du cabinet ---------- */
const CHAMPS_CABINET = ['nom', 'adresse', 'cp', 'ville', 'tel', 'email'];
routeur.put('/reglages', avecSession('gestion'), h(async (req, res) => {
  const { cabinet, normes, bareme } = req.body;
  const id = req.s.cabinet_id;
  const actuels = await lireReglages(id);
  const ecrire = (cle, valeur) => q('insert into reglages (cabinet_id, cle, valeur) values ($1, $2, $3) on conflict (cabinet_id, cle) do update set valeur = excluded.valeur', [id, cle, JSON.stringify(valeur)]);
  if (cabinet) {
    const propre = { ...actuels.cabinet };
    for (const k of CHAMPS_CABINET) if (cabinet[k] !== undefined) propre[k] = texte(cabinet[k], 300);
    if (ZONES[cabinet.zone]) propre.zone = cabinet.zone;
    if ([5, 10, 15, 30, 60].includes(Number(cabinet.inactivite))) propre.inactivite = Number(cabinet.inactivite);
    await ecrire('cabinet', propre);
    if (propre.nom) await q('update cabinets set nom = $2, ville = $3 where id = $1', [id, propre.nom, propre.ville || '']);
  }
  if (normes) {
    const n = (v) => Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) < 200;
    const f = normes.fusion || {};
    const ok = n(normes.ppc) && ['vl', 'vp'].every((d) => f[d] && ['d', 'c'].every((x) => Array.isArray(f[d][x]) && f[d][x].length === 2 && f[d][x].every(n)));
    if (!ok) return erreur(res, 400, 'Normes cliniques invalides.');
    await ecrire('normes', { ppc: Number(normes.ppc), fusion: f });
  }
  if (bareme) {
    const ok = Array.isArray(bareme) && bareme.length <= 200 && bareme.every((a) => a && typeof a.code === 'string' && Number.isFinite(Number(a.coef)) && typeof a.libelle === 'string');
    if (!ok) return erreur(res, 400, 'Barème invalide.');
    await ecrire('bareme', bareme.map((a) => ({ code: texte(a.code, 20), coef: Number(a.coef), famille: texte(a.famille, 20), libelle: texte(a.libelle, 200), aPreciser: !!a.aPreciser })));
  }
  cache.delete(id);
  await journaliser(req, 'reglages.modification');
  res.json({ ok: true });
}));

/* ---------- Erreurs ---------- */
routeur.use((req, res) => erreur(res, 404, 'Adresse inconnue.'));
// eslint-disable-next-line no-unused-vars
routeur.use((err, req, res, next) => {
  console.error(`Erreur sur ${req.method} ${req.path} :`, err.message);
  if (err.type === 'entity.too.large') return erreur(res, 413, 'Envoi trop volumineux.');
  return erreur(res, 500, 'Erreur interne du serveur. Réessayez dans un instant.');
});
