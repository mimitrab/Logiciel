// Connexion à PostgreSQL, création du schéma, valeurs initiales et premier compte administrateur.
import pg from 'pg';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { BAREME_DEFAUT, NORMES_DEFAUT } from '../src/domain.js';
import { hacherMotDePasse } from './securite.js';

const ici = path.dirname(fileURLToPath(import.meta.url));
const url = process.env.DATABASE_URL || process.env.SCALINGO_POSTGRESQL_URL;
if (!url) {
  console.error("Aucune base de données : définissez DATABASE_URL (ou ajoutez l'extension PostgreSQL chez l'hébergeur).");
  process.exit(1);
}

/** TLS vers la base : vérification complète du certificat si l'autorité est fournie (DATABASE_CA_CERT). */
function configuration(adresse) {
  const u = new URL(adresse);
  const mode = u.searchParams.get('sslmode');
  u.searchParams.delete('sslmode');
  const base = { connectionString: u.toString(), max: 10 };
  if (process.env.DATABASE_CA_CERT) return { ...base, ssl: { ca: process.env.DATABASE_CA_CERT, rejectUnauthorized: true } };
  if (mode && mode !== 'disable') {
    console.warn('Base de données : connexion chiffrée sans vérification du certificat. Renseignez DATABASE_CA_CERT pour la vérifier.');
    return { ...base, ssl: { rejectUnauthorized: false } };
  }
  return base;
}

export const pool = new pg.Pool(configuration(url));
export const q = (texte, params) => pool.query(texte, params);
export async function transaction(f) {
  const c = await pool.connect();
  try {
    await c.query('begin');
    const r = await f(c);
    await c.query('commit');
    return r;
  } catch (e) {
    await c.query('rollback');
    throw e;
  } finally {
    c.release();
  }
}

export const CABINET_DEFAUT = { nom: "Cabinet d'orthoptie", adresse: '', cp: '', ville: '', tel: '', email: '', zone: 'metropole', inactivite: 15, editeur: '', hebergeur: '', contact: '' };

export async function initialiser() {
  await q(readFileSync(path.join(ici, 'schema.sql'), 'utf8'));
  for (const [cle, valeur] of [['cabinet', CABINET_DEFAUT], ['normes', NORMES_DEFAUT], ['bareme', BAREME_DEFAUT]]) {
    await q('insert into reglages (cle, valeur) values ($1, $2) on conflict (cle) do nothing', [cle, JSON.stringify(valeur)]);
  }
  const { rows } = await q('select count(*)::int as n from utilisateurs');
  if (rows[0].n > 0) return;
  const identifiant = (process.env.ADMIN_IDENTIFIANT || 'admin').trim().toLowerCase();
  const mdp = process.env.ADMIN_MOT_DE_PASSE || '';
  if (mdp.length < 12) {
    console.error('Aucun compte : définissez ADMIN_MOT_DE_PASSE (12 caractères au moins) puis redémarrez pour créer le compte super-administrateur.');
    return;
  }
  const id = `u_${randomBytes(9).toString('base64url')}`;
  await q("insert into utilisateurs (id, identifiant, role, nom, titre, hash, doit_changer) values ($1, $2, 'admin', 'Super-Admin', 'Administration du cabinet', $3, true)", [id, identifiant, await hacherMotDePasse(mdp)]);
  await q("insert into journal (utilisateur_id, action, detail) values ($1, 'utilisateur.creation', 'Compte super-administrateur créé au premier démarrage')", [id]);
  console.log(`Compte super-administrateur « ${identifiant} » créé : mot de passe provisoire à changer à la première connexion.`);
}

export async function lireReglages() {
  const { rows } = await q('select cle, valeur from reglages');
  const r = Object.fromEntries(rows.map((x) => [x.cle, x.valeur]));
  return { cabinet: { ...CABINET_DEFAUT, ...(r.cabinet || {}) }, normes: r.normes || NORMES_DEFAUT, bareme: r.bareme || BAREME_DEFAUT, brut: r };
}
