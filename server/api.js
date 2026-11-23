// API du serveur SACCADES. Toutes les règles d'accès sont appliquées ici, jamais seulement dans le navigateur :
// un praticien ne lit et n'écrit que ses dossiers ; le super-administrateur ne voit que des chiffres,
// sauf pendant un accès exceptionnel motivé, limité à une heure et consigné.
import express from 'express';
import QRCode from 'qrcode';
import { randomBytes } from 'node:crypto';
import { lireReglages, q, transaction } from './db.js';
import { LEURRE, empreinte, hacherMotDePasse, jeton, secretTotp, uriTotp, verifierMotDePasse, verifierTotp } from './securite.js';
import { compter } from '../src/stats.js';
import { MOTIFS_ACCES, ZONES } from '../src/domain.js';

export const routeur = express.Router();
const PROD = process.env.NODE_ENV === 'production';
const NOM_COOKIE = PROD ? '__Host-saccades' : 'saccades';
const DUREE_SESSION = 12 * 3600 * 1000;
const DUREE_ETAPE = 10 * 60 * 1000;
const DUREE_ACCES = 60 * 60 * 1000;
const COLLECTIONS = ['patients', 'rdvs', 'bilans', 'factures'];
const ID = /^[a-z]_[A-Za-z0-9_-]{1,64}$/;
const MDP_MIN = 12;
// Événements que le navigateur peut consigner ; les autres (connexions, accès, comptes) ne sont écrits que par le serveur.
const ACTIONS_CLIENT = new Set([
  'patient.consultation', 'patient.creation', 'patient.modification', 'rgpd.maj', 'bilan.consultation', 'bilan.creation', 'bilan.suppression',
  'cr.generation', 'cr.copie', 'cr.export', 'cr.envoi', 'rdv.creation', 'rdv.modification', 'rdv.suppression', 'seance.validation',
  'facture.creation', 'facture.modification', 'sauvegarde.export',
]);

/* ---------- Outils ---------- */
const h = (f) => (req, res, next) => Promise.resolve(f(req, res, next)).catch(next);
const court = (v, n = 400) => (v == null ? null : String(v).slice(0, n));
const texte = (v, n) => String(v == null ? '' : v).slice(0, n);
const nomDe = (u) => [u.prenom, u.nom].filter(Boolean).join(' ');
const erreur = (res, code, message, extra = {}) => res.status(code).json({ erreur: message, ...extra });

function poserCookie(res, valeur, secondes) {
  res.append('Set-Cookie', `${NOM_COOKIE}=${valeur}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${secondes}${PROD ? '; Secure' : ''}`);
}
function lireCookie(req) {
  const c = (req.headers.cookie || '').split(/;\s*/).find((x) => x.startsWith(`${NOM_COOKIE}=`));
  return c ? c.slice(NOM_COOKIE.length + 1) : null;
}
async function journaliser(req, action, { utilisateurId, praticienId, cible, detail } = {}) {
  const uid = utilisateurId !== undefined ? utilisateurId : req.s ? req.s.id : null;
  await q('insert into journal (utilisateur_id, action, praticien_id, cible, detail, ip) values ($1, $2, $3, $4, $5, $6)', [uid, action, praticienId || null, court(cible), court(detail), req.ip]);
}
const versJournal = (r) => ({ id: `j${r.id}`, ts: new Date(r.ts).getTime(), userId: r.utilisateur_id, action: r.action, praticienId: r.praticien_id || undefined, cible: r.cible || '', detail: r.detail || '' });
const publicUtilisateur = (u, complet) => ({
  id: u.id, role: u.role, prenom: u.prenom, nom: u.nom, titre: u.titre, rpps: u.rpps, actif: u.actif,
  ...(complet ? { identifiant: u.identifiant, mfa: u.totp_actif, derniereConnexion: u.derniere_connexion ? new Date(u.derniere_connexion).getTime() : 0 } : {}),
});

/* Réglages mis en cache quelques secondes (ils sont lus à chaque requête pour la durée d'inactivité). */
let cache = { t: 0, valeur: null };
async function reglages() {
  if (!cache.valeur || Date.now() - cache.t > 15000) cache = { t: Date.now(), valeur: await lireReglages() };
  return cache.valeur;
}

/* Limitation des tentatives par adresse IP (connexion et codes). */
const tentatives = new Map();
function limiter(req, res, next) {
  const t = Date.now();
  const l = (tentatives.get(req.ip) || []).filter((x) => t - x < 15 * 60000);
  if (l.length >= 30) return erreur(res, 429, 'Trop de tentatives depuis cette adresse : réessayez dans quelques minutes.');
  l.push(t);
  tentatives.set(req.ip, l);
  return next();
}
setInterval(() => {
  const t = Date.now();
  for (const [ip, l] of tentatives) if (!l.some((x) => t - x < 15 * 60000)) tentatives.delete(ip);
}, 10 * 60000).unref();

/* ---------- Session ---------- */
const etapeDe = (s) => (!s.mfa_ok ? (s.totp_actif ? 'mfa' : 'mfa-activation') : s.doit_changer ? 'changer' : 'ok');
const perimetre = (s) => (s.role === 'admin' ? s.acces_praticien || null : s.id);

async function lireSession(req) {
  const t = lireCookie(req);
  if (!t) return null;
  const sid = empreinte(t);
  const { rows } = await q(
    'select s.id as sid, s.cree as s_cree, s.vu, s.mfa_ok, s.acces_praticien, s.acces_motif, s.acces_debut, s.acces_fin, u.* from sessions s join utilisateurs u on u.id = s.utilisateur_id where s.id = $1',
    [sid],
  );
  const s = rows[0];
  if (!s) return null;
  const maintenant = Date.now();
  const inactivite = ((await reglages()).cabinet.inactivite || 15) * 60000;
  const expiree = !s.actif || maintenant - new Date(s.s_cree) > DUREE_SESSION || maintenant - new Date(s.vu) > inactivite || (!s.mfa_ok && maintenant - new Date(s.s_cree) > DUREE_ETAPE);
  if (expiree) {
    await q('delete from sessions where id = $1', [sid]);
    return null;
  }
  if (s.acces_praticien && s.acces_fin && new Date(s.acces_fin) < new Date()) {
    await q('update sessions set acces_praticien = null, acces_motif = null, acces_debut = null, acces_fin = null where id = $1', [sid]);
    await journaliser({ ip: null, s }, 'acces.fin', { praticienId: s.acces_praticien, detail: "Fin automatique après une heure d'accès" });
    s.acces_praticien = null;
  }
  if (maintenant - new Date(s.vu) > 20000) await q('update sessions set vu = now() where id = $1', [sid]);
  return s;
}
const avecSession = (niveau) =>
  h(async (req, res, next) => {
    const s = await lireSession(req);
    if (!s) return erreur(res, 401, 'Session expirée : reconnectez-vous.');
    const etape = etapeDe(s);
    if ((niveau === 'complet' || niveau === 'admin') && etape !== 'ok') return erreur(res, 401, "L'authentification n'est pas terminée.", { etape });
    if (niveau === 'admin' && s.role !== 'admin') return erreur(res, 403, 'Action réservée au super-administrateur.');
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
  const { cabinet } = await reglages();
  res.json({ cabinet: { nom: cabinet.nom, ville: cabinet.ville, editeur: cabinet.editeur, hebergeur: cabinet.hebergeur, contact: cabinet.contact } });
}));

/* ---------- Connexion ---------- */
routeur.post('/connexion', limiter, h(async (req, res) => {
  const identifiant = texte(req.body.identifiant, 80).trim().toLowerCase();
  const mdp = String(req.body.motDePasse || '').slice(0, 200);
  const { rows } = await q('select * from utilisateurs where identifiant = $1', [identifiant]);
  const u = rows[0];
  if (u && u.bloque_jusqu && new Date(u.bloque_jusqu) > new Date()) {
    await journaliser(req, 'connexion.echec', { utilisateurId: u.id, detail: 'Compte temporairement bloqué' });
    return erreur(res, 423, 'Compte temporairement bloqué après plusieurs échecs : réessayez dans 15 minutes.');
  }
  const ok = await verifierMotDePasse(mdp, u ? u.hash : LEURRE);
  if (!u || !ok || !u.actif) {
    if (u) {
      const echecs = u.echecs + 1;
      const bloque = echecs >= 5;
      await q('update utilisateurs set echecs = $2, bloque_jusqu = $3 where id = $1', [u.id, bloque ? 0 : echecs, bloque ? new Date(Date.now() + 15 * 60000) : null]);
      if (bloque) await journaliser(req, 'compte.bloque', { utilisateurId: u.id });
    }
    await journaliser(req, 'connexion.echec', { utilisateurId: u ? u.id : null, detail: `Identifiant saisi : ${identifiant || '(vide)'}${u && !u.actif ? ' (compte désactivé)' : ''}` });
    return erreur(res, 401, 'Identifiant ou mot de passe incorrect.');
  }
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
  const uri = uriTotp(secret, s.identifiant);
  const qr = await QRCode.toString(uri, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' });
  return res.json({ secret, qr });
}));

async function apresCode(req, res, s, pas) {
  await q('update utilisateurs set totp_dernier = $2, echecs = 0, derniere_connexion = now() where id = $1', [s.id, pas]);
  await q('update sessions set mfa_ok = true where id = $1', [s.sid]);
  await journaliser(req, 'connexion', { utilisateurId: s.id });
  return res.json({ etape: s.doit_changer ? 'changer' : 'ok' });
}
async function codeRefuse(req, res, s) {
  const echecs = s.echecs + 1;
  const bloque = echecs >= 5;
  await q('update utilisateurs set echecs = $2, bloque_jusqu = $3 where id = $1', [s.id, bloque ? 0 : echecs, bloque ? new Date(Date.now() + 15 * 60000) : null]);
  await journaliser(req, 'mfa.echec', { utilisateurId: s.id });
  if (bloque) {
    await q('delete from sessions where utilisateur_id = $1', [s.id]);
    await journaliser(req, 'compte.bloque', { utilisateurId: s.id });
    return erreur(res, 401, 'Trop de codes erronés : compte bloqué 15 minutes.');
  }
  return erreur(res, 400, 'Code incorrect ou expiré. Vérifiez l’heure de votre téléphone et réessayez.');
}
routeur.post('/mfa/activer', limiter, avecSession('partiel'), h(async (req, res) => {
  const s = req.s;
  if (s.totp_actif) return erreur(res, 409, 'La double authentification est déjà activée.');
  const pas = verifierTotp(s.totp_secret, req.body.code, s.totp_dernier);
  if (!pas) return codeRefuse(req, res, s);
  await q('update utilisateurs set totp_actif = true where id = $1', [s.id]);
  await journaliser(req, 'mfa.activation', { utilisateurId: s.id });
  return apresCode(req, res, s, pas);
}));
routeur.post('/mfa/verifier', limiter, avecSession('partiel'), h(async (req, res) => {
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
    const { rows } = await q('delete from sessions where id = $1 returning utilisateur_id', [empreinte(t)]);
    if (rows[0]) await journaliser(req, 'deconnexion', { utilisateurId: rows[0].utilisateur_id });
  }
  poserCookie(res, '', 0);
  res.json({ ok: true });
}));

/* ---------- Données ---------- */
async function lireJournal(s, limite) {
  const { rows } =
    s.role === 'admin'
      ? await q('select * from journal order by id desc limit $1', [limite])
      : await q('select * from journal where utilisateur_id = $1 or praticien_id = $1 order by id desc limit $2', [s.id, limite]);
  return rows.map(versJournal);
}
async function statistiques() {
  const praticiens = (await q("select id from utilisateurs where role = 'praticien'")).rows;
  const elements = (await q('select collection, praticien_id, donnees from elements')).rows;
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
  const P = perimetre(s);
  const admin = s.role === 'admin';
  const reg = await reglages();
  const utilisateurs = (await q('select * from utilisateurs order by role, nom, prenom')).rows;
  const elements = P ? (await q('select collection, donnees from elements where praticien_id = $1', [P])).rows : [];
  const col = (c) => elements.filter((e) => e.collection === c).map((e) => e.donnees);
  const compteur = P ? (await q('select valeur from reglages where cle = $1', [`compteur:${P}`])).rows[0] : null;
  if (P) await journaliser(req, 'etat.chargement', { praticienId: P, detail: admin ? 'Accès exceptionnel du super-administrateur' : undefined });
  res.json({
    version: 2,
    moi: s.id,
    acces: admin && P ? { praticienId: P, motif: s.acces_motif, debut: new Date(s.acces_debut).getTime() } : null,
    cabinet: reg.cabinet,
    normes: reg.normes,
    bareme: reg.bareme,
    utilisateurs: utilisateurs.map((u) => publicUtilisateur(u, admin || u.id === s.id)),
    patients: col('patients'),
    rdvs: col('rdvs'),
    bilans: col('bilans'),
    factures: col('factures'),
    journal: await lireJournal(s, 300),
    compteurFacture: compteur ? Number(compteur.valeur) || 0 : 0,
    stats: admin ? await statistiques() : undefined,
  });
}));

routeur.get('/journal', avecSession('complet'), h(async (req, res) => res.json({ journal: await lireJournal(req.s, 1000) })));
routeur.get('/stats', avecSession('admin'), h(async (req, res) => res.json({ stats: await statistiques() })));

routeur.post('/synchro', avecSession('complet'), h(async (req, res) => {
  const s = req.s;
  const P = perimetre(s);
  const ops = Array.isArray(req.body.ops) ? req.body.ops.slice(0, 1000) : [];
  const evenements = Array.isArray(req.body.journal) ? req.body.journal.slice(0, 200) : [];
  if (ops.length && !P) return erreur(res, 403, 'Aucun dossier accessible : ouvrez un accès exceptionnel motivé.');
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
      const texte = JSON.stringify({ ...d, praticienId: P });
      if (texte.length > 600000) {
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
        [o.collection, o.id, P, texte],
      );
    }
    for (const e of evenements) {
      if (!e || !ACTIONS_CLIENT.has(e.action)) continue;
      await c.query('insert into journal (utilisateur_id, action, praticien_id, cible, detail, ip) values ($1, $2, $3, $4, $5, $6)', [s.id, e.action, P, court(e.cible), court(e.detail), req.ip]);
    }
    const cf = Number(req.body.compteurFacture);
    if (P && Number.isInteger(cf) && cf > 0 && cf < 1e7) {
      await c.query(
        "insert into reglages (cle, valeur) values ($1, to_jsonb($2::int)) on conflict (cle) do update set valeur = to_jsonb(greatest((reglages.valeur #>> '{}')::int, $2::int))",
        [`compteur:${P}`, cf],
      );
    }
  });
  res.json({ ok: true, refuses });
}));

/* ---------- Accès exceptionnel du super-administrateur ---------- */
routeur.post('/acces', avecSession('admin'), h(async (req, res) => {
  const s = req.s;
  const praticien = (await q("select * from utilisateurs where id = $1 and role = 'praticien'", [String(req.body.praticienId)])).rows[0];
  const motif = String(req.body.motif || '');
  const precision = texte(req.body.precision, 300).trim();
  if (!praticien) return erreur(res, 404, 'Praticien introuvable.');
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

/* ---------- Comptes ---------- */
const IDENTIFIANT = /^[a-z0-9._-]{3,60}$/;
const profil = (b) => ({ prenom: texte(b.prenom, 80).trim(), nom: texte(b.nom, 80).trim(), titre: texte(b.titre, 80).trim(), rpps: texte(b.rpps, 40).trim() });

routeur.post('/utilisateurs', avecSession('admin'), h(async (req, res) => {
  const b = req.body;
  const identifiant = String(b.identifiant || '').trim().toLowerCase();
  const p = profil(b);
  const role = b.role === 'admin' ? 'admin' : 'praticien';
  if (!IDENTIFIANT.test(identifiant)) return erreur(res, 400, "L'identifiant compte de 3 à 60 caractères : lettres minuscules, chiffres, point ou tiret.");
  if (!p.nom) return erreur(res, 400, 'Le nom est obligatoire.');
  if (String(b.motDePasse || '').length < MDP_MIN) return erreur(res, 400, `Le mot de passe provisoire compte au moins ${MDP_MIN} caractères.`);
  if ((await q('select 1 from utilisateurs where identifiant = $1', [identifiant])).rowCount) return erreur(res, 409, 'Cet identifiant est déjà utilisé.');
  const id = `u_${randomBytes(9).toString('base64url')}`;
  await q('insert into utilisateurs (id, identifiant, role, prenom, nom, titre, rpps, hash, doit_changer) values ($1, $2, $3, $4, $5, $6, $7, $8, true)', [
    id, identifiant, role, p.prenom, p.nom, p.titre || 'Orthoptiste', p.rpps, await hacherMotDePasse(b.motDePasse),
  ]);
  await journaliser(req, 'utilisateur.creation', { cible: nomDe(p), detail: role === 'admin' ? 'Rôle : super-administrateur' : 'Rôle : praticien' });
  res.json({ ok: true, id });
}));

routeur.put('/utilisateurs/:id', avecSession('admin'), h(async (req, res) => {
  const u = (await q('select * from utilisateurs where id = $1', [req.params.id])).rows[0];
  if (!u) return erreur(res, 404, 'Compte introuvable.');
  const b = req.body;
  const cible = nomDe(u);
  if (b.prenom !== undefined || b.nom !== undefined) {
    const p = profil({ ...u, ...b });
    if (!p.nom) return erreur(res, 400, 'Le nom est obligatoire.');
    const identifiant = b.identifiant !== undefined ? String(b.identifiant).trim().toLowerCase() : u.identifiant;
    if (!IDENTIFIANT.test(identifiant)) return erreur(res, 400, "L'identifiant compte de 3 à 60 caractères : lettres minuscules, chiffres, point ou tiret.");
    if (identifiant !== u.identifiant && (await q('select 1 from utilisateurs where identifiant = $1', [identifiant])).rowCount) return erreur(res, 409, 'Cet identifiant est déjà utilisé.');
    await q('update utilisateurs set prenom = $2, nom = $3, titre = $4, rpps = $5, identifiant = $6 where id = $1', [u.id, p.prenom, p.nom, p.titre, p.rpps, identifiant]);
    await journaliser(req, 'utilisateur.modification', { cible: nomDe(p) });
  }
  if (b.motDePasse) {
    if (String(b.motDePasse).length < MDP_MIN) return erreur(res, 400, `Le mot de passe provisoire compte au moins ${MDP_MIN} caractères.`);
    await q('update utilisateurs set hash = $2, doit_changer = true, echecs = 0, bloque_jusqu = null where id = $1', [u.id, await hacherMotDePasse(b.motDePasse)]);
    await q('delete from sessions where utilisateur_id = $1', [u.id]);
    await journaliser(req, 'utilisateur.motdepasse', { cible, detail: "Mot de passe provisoire défini par l'administrateur" });
  }
  if (typeof b.actif === 'boolean' && b.actif !== u.actif) {
    if (u.id === req.s.id) return erreur(res, 400, 'Vous ne pouvez pas désactiver votre propre compte.');
    await q('update utilisateurs set actif = $2 where id = $1', [u.id, b.actif]);
    if (!b.actif) await q('delete from sessions where utilisateur_id = $1', [u.id]);
    await journaliser(req, b.actif ? 'utilisateur.reactivation' : 'utilisateur.desactivation', { cible });
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
const CHAMPS_CABINET = ['nom', 'adresse', 'cp', 'ville', 'tel', 'email', 'editeur', 'hebergeur', 'contact'];
routeur.put('/reglages', avecSession('admin'), h(async (req, res) => {
  const { cabinet, normes, bareme } = req.body;
  const actuels = await lireReglages();
  if (cabinet) {
    const propre = { ...actuels.cabinet };
    for (const k of CHAMPS_CABINET) if (cabinet[k] !== undefined) propre[k] = court(cabinet[k], 600);
    if (ZONES[cabinet.zone]) propre.zone = cabinet.zone;
    if ([5, 10, 15, 30, 60].includes(Number(cabinet.inactivite))) propre.inactivite = Number(cabinet.inactivite);
    await q("update reglages set valeur = $1 where cle = 'cabinet'", [JSON.stringify(propre)]);
  }
  if (normes) {
    const n = (v) => Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) < 200;
    const f = normes.fusion || {};
    const ok = n(normes.ppc) && ['vl', 'vp'].every((d) => f[d] && ['d', 'c'].every((x) => Array.isArray(f[d][x]) && f[d][x].length === 2 && f[d][x].every(n)));
    if (!ok) return erreur(res, 400, 'Normes cliniques invalides.');
    await q("update reglages set valeur = $1 where cle = 'normes'", [JSON.stringify({ ppc: Number(normes.ppc), fusion: f })]);
  }
  if (bareme) {
    const ok = Array.isArray(bareme) && bareme.length <= 200 && bareme.every((a) => a && typeof a.code === 'string' && Number.isFinite(Number(a.coef)) && typeof a.libelle === 'string');
    if (!ok) return erreur(res, 400, 'Barème invalide.');
    const propre = bareme.map((a) => ({ code: court(a.code, 20), coef: Number(a.coef), famille: court(a.famille, 20), libelle: court(a.libelle, 200), aPreciser: !!a.aPreciser }));
    await q("update reglages set valeur = $1 where cle = 'bareme'", [JSON.stringify(propre)]);
  }
  cache = { t: 0, valeur: null };
  await journaliser(req, 'reglages.modification');
  res.json({ ok: true });
}));

/* ---------- Erreurs ---------- */
// eslint-disable-next-line no-unused-vars
routeur.use((err, req, res, next) => {
  console.error(`Erreur sur ${req.method} ${req.path} :`, err.message);
  if (err.type === 'entity.too.large') return erreur(res, 413, 'Envoi trop volumineux.');
  return erreur(res, 500, 'Erreur interne du serveur. Réessayez dans un instant.');
});
