// Empreintes de mots de passe (scrypt), jetons de session, double authentification (TOTP, RFC 6238).
import { createHash, createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb);
const COUT = { N: 32768, r: 8, p: 1, maxmem: 96 * 1024 * 1024 };

export async function hacherMotDePasse(mdp) {
  const sel = randomBytes(16);
  const h = await scrypt(String(mdp), sel, 64, COUT);
  return ['scrypt', COUT.N, COUT.r, COUT.p, sel.toString('base64'), h.toString('base64')].join(':');
}
export async function verifierMotDePasse(mdp, stocke) {
  const [algo, n, r, p, sel, h] = String(stocke || '').split(':');
  if (algo !== 'scrypt' || !sel || !h) return false;
  const attendu = Buffer.from(h, 'base64');
  const calcule = await scrypt(String(mdp), Buffer.from(sel, 'base64'), attendu.length, { N: Number(n), r: Number(r), p: Number(p), maxmem: COUT.maxmem });
  return calcule.length === attendu.length && timingSafeEqual(calcule, attendu);
}
/** Empreinte de comparaison utilisée quand l'identifiant n'existe pas : la réponse prend le même temps. */
export const LEURRE = await hacherMotDePasse(randomBytes(12).toString('hex'));

/** Mot de passe provisoire lisible à dicter au téléphone : 4 groupes de 4 caractères sans ambiguïté. */
export function motDePasseProvisoire() {
  const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const octets = randomBytes(16);
  const c = Array.from(octets, (o) => A[o % A.length]).join('');
  return `${c.slice(0, 4)}-${c.slice(4, 8)}-${c.slice(8, 12)}-${c.slice(12, 16)}`;
}

export const jeton = () => randomBytes(32).toString('base64url');
export const empreinte = (texte) => createHash('sha256').update(String(texte)).digest('hex');

/* ---------- TOTP ---------- */
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function versBase32(buf) {
  let bits = 0;
  let valeur = 0;
  let out = '';
  for (const octet of buf) {
    valeur = (valeur << 8) | octet;
    bits += 8;
    while (bits >= 5) {
      out += B32[(valeur >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(valeur << (5 - bits)) & 31];
  return out;
}
function depuisBase32(texte) {
  let bits = 0;
  let valeur = 0;
  const out = [];
  for (const c of String(texte).replace(/=+$/, '').toUpperCase()) {
    const i = B32.indexOf(c);
    if (i < 0) continue;
    valeur = (valeur << 5) | i;
    bits += 5;
    if (bits >= 8) {
      out.push((valeur >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}
export const secretTotp = () => versBase32(randomBytes(20));
const PAS = 30;
export const pasActuel = (t = Date.now()) => Math.floor(t / 1000 / PAS);
export function codeTotp(secret, pas) {
  const compteur = Buffer.alloc(8);
  compteur.writeBigUInt64BE(BigInt(pas));
  const h = createHmac('sha1', depuisBase32(secret)).update(compteur).digest();
  const o = h[h.length - 1] & 15;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1000000).padStart(6, '0');
}
/** Renvoie le pas accepté (fenêtre de ±30 s), ou null. Un code déjà utilisé est refusé. */
export function verifierTotp(secret, code, dernierPas = 0) {
  const c = String(code || '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(c) || !secret) return null;
  const maintenant = pasActuel();
  for (const d of [0, -1, 1]) {
    const pas = maintenant + d;
    if (pas <= Number(dernierPas)) continue;
    if (timingSafeEqual(Buffer.from(codeTotp(secret, pas)), Buffer.from(c))) return pas;
  }
  return null;
}
export const uriTotp = (secret, identifiant, emetteur = 'SACCADES') =>
  `otpauth://totp/${encodeURIComponent(emetteur)}:${encodeURIComponent(identifiant)}?secret=${secret}&issuer=${encodeURIComponent(emetteur)}&algorithm=SHA1&digits=6&period=${PAS}`;
