// Tests automatiques de l'API SACCADES : connexion, cloisonnement des cabinets, essai gratuit,
// lecture seule, paiement, parrainage, journal d'audit.
// Lancement : DATABASE_URL=postgres://… npm test   (sur une base de test VIDE, jamais la production)
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import pg from 'pg';

const PORT = 3199;
const BASE = `http://localhost:${PORT}`;
const MDP_PROPRIETAIRE = 'Provisoire-Tests-2026';
const SECRET_STRIPE = 'whsec_tests';
if (!process.env.DATABASE_URL) {
  console.error('Définissez DATABASE_URL vers une base PostgreSQL de test vide.');
  process.exit(2);
}
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
const existe = (await db.query("select to_regclass('public.utilisateurs') as t")).rows[0].t;
if (existe && (await db.query('select count(*)::int as n from utilisateurs')).rows[0].n > 0) {
  console.error('La base de test n’est pas vide : utilisez une base dédiée, vide.');
  process.exit(2);
}

const serveur = spawn(process.execPath, ['server/index.js'], {
  env: { ...process.env, PORT: String(PORT), PROPRIETAIRE_MOT_DE_PASSE: MDP_PROPRIETAIRE, STRIPE_WEBHOOK_SECRET: SECRET_STRIPE, NODE_ENV: 'test' },
  stdio: ['ignore', 'ignore', 'inherit'],
});
for (let i = 0; i < 50; i++) {
  try {
    if ((await fetch(`${BASE}/api/sante`)).ok) break;
  } catch (e) {
    /* le serveur démarre */
  }
  await new Promise((r) => setTimeout(r, 200));
}

/* ---------- Outils ---------- */
function b32(t) {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let v = 0;
  const o = [];
  for (const c of t) {
    v = (v << 5) | A.indexOf(c);
    bits += 5;
    if (bits >= 8) {
      o.push((v >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(o);
}
function totp(secret) {
  const b = Buffer.alloc(8);
  b.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const h = createHmac('sha1', b32(secret)).update(b).digest();
  return String((h.readUInt32BE(h[19] & 15) & 0x7fffffff) % 1e6).padStart(6, '0');
}
function client() {
  let cookie = '';
  return async (methode, chemin, corps, entetes = { 'X-Saccades': '1' }) => {
    const r = await fetch(`${BASE}/api${chemin}`, { method: methode, headers: { 'Content-Type': 'application/json', ...entetes, ...(cookie ? { Cookie: cookie } : {}) }, body: corps ? JSON.stringify(corps) : undefined });
    const sc = r.headers.get('set-cookie');
    if (sc) cookie = sc.split(';')[0];
    let j = {};
    try {
      j = await r.json();
    } catch (e) {
      j = {};
    }
    return { status: r.status, ...j };
  };
}
async function premiereConnexion(c, identifiant, mdp, nouveau) {
  let r = await c('POST', '/connexion', { identifiant, motDePasse: mdp });
  if (r.status !== 200) return r;
  const a = await c('GET', '/mfa/activation');
  r = await c('POST', '/mfa/activer', { code: totp(a.secret) });
  if (r.etape === 'changer') r = await c('POST', '/motdepasse', { nouveau });
  return r;
}
const jour = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const accesDe = async (id) => String((await db.query("select to_char(acces_jusqu, 'YYYY-MM-DD') as d from cabinets where id = $1", [id])).rows[0].d);
const inscription = (x) => ({ prenom: 'Camille', nom: 'Roussel', rpps: '10000000010', cabinet: 'Cabinet des Tilleuls', ville: 'Lyon', email: 'camille@exemple.example', identifiant: 'camille.roussel', motDePasse: 'Orthoptie-Tilleuls-2026', accepte: true, atteste: true, ...x });

let echecs = 0;
async function test(nom, f) {
  try {
    await f();
    console.log(`ok      ${nom}`);
  } catch (e) {
    echecs += 1;
    console.log(`ÉCHEC   ${nom}\n        ${e.message.split('\n')[0]}`);
  }
}

/* ---------- Scénario ---------- */
const anonyme = client();
const prop = client();
const cam = client();
const jul = client();
const ctx = {};

await test('La page publique répond, inscriptions fermées par défaut', async () => {
  const r = await anonyme('GET', '/public');
  assert.equal(r.status, 200);
  assert.equal(r.plateforme.inscriptions, false);
  assert.equal((await anonyme('POST', '/inscription', inscription())).status, 403);
});
await test('Une requête sans en-tête de protection est refusée', async () => {
  assert.equal((await anonyme('POST', '/connexion', { identifiant: 'x', motDePasse: 'y' }, {})).status, 403);
});
await test("Une adresse d'API inconnue répond 404", async () => {
  assert.equal((await anonyme('GET', '/nimporte-quoi')).status, 404);
});
await test('Sans session, aucune donnée ne sort', async () => {
  assert.equal((await anonyme('GET', '/etat')).status, 401);
});
await test('Le propriétaire entre avec double authentification et change son mot de passe', async () => {
  assert.equal((await prop('POST', '/connexion', { identifiant: 'proprietaire', motDePasse: 'faux' })).status, 401);
  const r = await premiereConnexion(prop, 'proprietaire', MDP_PROPRIETAIRE, 'Plateforme-Saccades-2026');
  assert.equal(r.etape, 'ok');
  const e = await prop('GET', '/etat');
  assert.ok(e.plateforme, 'console attendue');
  assert.equal(e.patients.length, 0);
});
await test('Les inscriptions ne s’ouvrent pas sans conditions générales', async () => {
  assert.equal((await prop('PUT', '/plateforme/offre', { inscriptionsOuvertes: true, cgu: '' })).status, 400);
  const r = await prop('PUT', '/plateforme/offre', { inscriptionsOuvertes: true, cgu: 'Conditions de test.', prixMensuelHT: 39, essaiMois: 3, moisParrain: 1, moisFilleul: 1, annonce: 'Maintenance dimanche', annonceTon: 'warn' });
  assert.equal(r.ok, true);
  const pub = await anonyme('GET', '/public');
  assert.equal(pub.plateforme.inscriptions, true);
  assert.equal(pub.plateforme.annonce.texte, 'Maintenance dimanche');
});
await test('Inscription : RPPS vérifié, connexion bloquée avant validation', async () => {
  assert.equal((await anonyme('POST', '/inscription', inscription({ rpps: '123' }))).status, 400);
  assert.equal((await anonyme('POST', '/inscription', inscription())).ok, true);
  assert.equal((await cam('POST', '/connexion', { identifiant: 'camille.roussel', motDePasse: 'Orthoptie-Tilleuls-2026' })).status, 403);
});
await test('Après validation, la période gratuite de 3 mois démarre', async () => {
  const p = await prop('GET', '/etat');
  ctx.A = p.plateforme.cabinets.find((c) => c.nom === 'Cabinet des Tilleuls').id;
  assert.equal((await prop('POST', `/plateforme/cabinets/${ctx.A}`, { action: 'valider' })).ok, true);
  assert.equal((await premiereConnexion(cam, 'camille.roussel', 'Orthoptie-Tilleuls-2026')).etape, 'ok');
  const e = await cam('GET', '/etat');
  assert.equal(e.abonnement.code, 'essai');
  assert.ok(e.abonnement.joursRestants >= 89 && e.abonnement.joursRestants <= 92);
  assert.equal(e.annonce.texte, 'Maintenance dimanche');
  ctx.code = e.abonnement.codeParrainage;
});
await test('Parrainage : code inconnu refusé, code valide accepté', async () => {
  assert.equal((await anonyme('POST', '/inscription', inscription({ identifiant: 'x.y', codeParrainage: 'SAC-FAUX00' }))).status, 400);
  const r = await anonyme('POST', '/inscription', inscription({ prenom: 'Julien', nom: 'Marchetti', rpps: '10000000020', cabinet: 'Vision Sud', identifiant: 'julien.marchetti', motDePasse: 'Vision-Sud-Orthoptie-1', codeParrainage: ctx.code }));
  assert.equal(r.ok, true);
  const p = await prop('GET', '/etat');
  ctx.B = p.plateforme.cabinets.find((c) => c.nom === 'Vision Sud').id;
  await prop('POST', `/plateforme/cabinets/${ctx.B}`, { action: 'valider' });
  assert.equal((await premiereConnexion(jul, 'julien.marchetti', 'Vision-Sud-Orthoptie-1')).etape, 'ok');
});
await test('Les cabinets sont étanches', async () => {
  assert.equal((await jul('POST', '/synchro', { ops: [{ op: 'put', collection: 'patients', id: 'p_b1', donnees: { id: 'p_b1', nom: 'Confidentiel' } }] })).ok, true);
  const e = await cam('GET', '/etat');
  assert.equal(e.patients.length, 0);
  assert.ok(e.utilisateurs.every((u) => u.nom !== 'Marchetti'));
  const idJulien = (await jul('GET', '/etat')).moi;
  assert.equal((await cam('PUT', `/utilisateurs/${idJulien}`, { actif: false })).status, 404);
  assert.deepEqual((await cam('POST', '/synchro', { ops: [{ op: 'put', collection: 'patients', id: 'p_b1', donnees: { id: 'p_b1', nom: 'Pirate' } }] })).refuses, ['p_b1']);
  assert.equal((await db.query("select donnees->>'nom' as n from elements where id = 'p_b1'")).rows[0].n, 'Confidentiel');
});
await test('Le propriétaire n’accède à aucun dossier', async () => {
  assert.equal((await prop('POST', '/synchro', { ops: [{ op: 'put', collection: 'patients', id: 'p_x', donnees: { id: 'p_x' } }] })).status, 403);
  assert.equal((await prop('GET', '/etat')).patients.length, 0);
});
await test('Fin de la période gratuite : lecture seule', async () => {
  await db.query('update cabinets set acces_jusqu = $2 where id = $1', [ctx.B, jour(-1)]);
  assert.equal((await jul('POST', '/synchro', { ops: [{ op: 'put', collection: 'patients', id: 'p_b2', donnees: { id: 'p_b2' } }] })).status, 402);
  const e = await jul('GET', '/etat');
  assert.equal(e.abonnement.code, 'expire');
  assert.equal(e.patients.length, 1, 'les dossiers restent lisibles');
});
await test('Premier paiement du filleul : un mois offert à chacun, une seule fois', async () => {
  const avant = await accesDe(ctx.A);
  assert.equal((await prop('POST', `/plateforme/cabinets/${ctx.B}`, { action: 'payer', jusqu: jour(30) })).ok, true);
  const apres = await accesDe(ctx.A);
  assert.notEqual(apres, avant);
  assert.equal(await accesDe(ctx.B) > jour(30), true);
  await prop('POST', `/plateforme/cabinets/${ctx.B}`, { action: 'payer', jusqu: jour(90) });
  assert.equal(await accesDe(ctx.A), apres, 'pas de seconde récompense');
  assert.equal((await jul('POST', '/synchro', { ops: [{ op: 'put', collection: 'patients', id: 'p_b2', donnees: { id: 'p_b2' } }] })).ok, true);
});
await test('Notification Stripe : signature vérifiée', async () => {
  const corps = JSON.stringify({ type: 'invoice.paid', data: { object: { subscription: 'sub_x', amount_paid: 100 } } });
  const t = Math.floor(Date.now() / 1000);
  const signer = (s) => `t=${t},v1=${createHmac('sha256', s).update(`${t}.${corps}`).digest('hex')}`;
  const poster = (sig) => fetch(`${BASE}/api/stripe/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Stripe-Signature': sig }, body: corps }).then((r) => r.status);
  assert.equal(await poster(signer('whsec_faux')), 400);
  assert.equal(await poster(signer(SECRET_STRIPE)), 200);
});
await test('Le propriétaire réinitialise l’accès d’un praticien', async () => {
  const comptes = (await prop('GET', `/plateforme/cabinets/${ctx.A}/comptes`)).comptes;
  const r = await prop('POST', `/plateforme/comptes/${comptes[0].id}/reinitialiser`);
  assert.match(r.motDePasse, /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  assert.equal((await cam('GET', '/etat')).status, 401, 'ancienne session fermée');
  const nouvelle = client();
  assert.equal((await nouvelle('POST', '/connexion', { identifiant: 'camille.roussel', motDePasse: r.motDePasse })).etape, 'mfa-activation');
});
await test('Le journal du propriétaire ne contient aucune donnée de patient', async () => {
  const p = await prop('GET', '/etat');
  assert.ok(p.plateforme.journal.length > 0);
  assert.equal(JSON.stringify(p.plateforme.journal).includes('Confidentiel'), false);
});
await test("Le journal d'audit ne peut être ni modifié ni supprimé", async () => {
  await assert.rejects(db.query("update journal set detail = 'falsifié'"));
  await assert.rejects(db.query('delete from journal'));
});
await test('Cinq échecs de connexion bloquent le compte', async () => {
  const c = client();
  for (let i = 0; i < 5; i++) await c('POST', '/connexion', { identifiant: 'julien.marchetti', motDePasse: `faux-${i}` });
  assert.equal((await c('POST', '/connexion', { identifiant: 'julien.marchetti', motDePasse: 'Vision-Sud-Orthoptie-1' })).status, 423);
});

serveur.kill('SIGTERM');
await db.end();
console.log(echecs ? `\n${echecs} test(s) en échec.` : '\nTous les tests passent.');
process.exit(echecs ? 1 : 0);
