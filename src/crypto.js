// Mots de passe (empreinte salée) et sauvegarde chiffrée.
// Rappel : dans cette maquette, tout s'exécute dans le navigateur. L'authentification y est donc
// simulée ; seule la sauvegarde exportée bénéficie d'un vrai chiffrement (AES-256-GCM, WebCrypto).

/* ---------- SHA-256 synchrone ---------- */
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);
const rotr = (x, n) => (x >>> n) | (x << (32 - n));
const encodeur = new TextEncoder();

export function sha256(texte) {
  const octets = encodeur.encode(texte);
  const l = octets.length;
  const total = ((l + 9 + 63) >> 6) << 6;
  const data = new Uint8Array(total);
  data.set(octets);
  data[l] = 0x80;
  const dv = new DataView(data.buffer);
  dv.setUint32(total - 8, Math.floor((l * 8) / 4294967296));
  dv.setUint32(total - 4, (l * 8) >>> 0);
  const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const w = new Uint32Array(64);
  for (let off = 0; off < total; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const x = w[i - 15];
      const y = w[i - 2];
      w[i] = (w[i - 16] + (rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3)) + w[i - 7] + (rotr(y, 17) ^ rotr(y, 19) ^ (y >>> 10))) | 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      h = g;
      g = f;
      f = e;
      e = (d + t1) | 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) | 0;
    }
    [a, b, c, d, e, f, g, h].forEach((v, i) => {
      H[i] = (H[i] + v) | 0;
    });
  }
  return H.map((x) => (x >>> 0).toString(16).padStart(8, '0')).join('');
}

/* ---------- Mots de passe ---------- */
const TOURS = 1200;
const hexAleatoire = (n) => {
  const t = new Uint8Array(n);
  if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(t);
  else for (let i = 0; i < n; i++) t[i] = Math.floor(Math.random() * 256);
  return Array.from(t, (x) => x.toString(16).padStart(2, '0')).join('');
};
function empreinte(motDePasse, sel, tours) {
  let h = sha256(`${sel}:${motDePasse}`);
  for (let i = 0; i < tours; i++) h = sha256(h + sel);
  return h;
}
export const creerAuth = (motDePasse, sel = hexAleatoire(16)) => ({ sel, tours: TOURS, hash: empreinte(motDePasse, sel, TOURS) });
export const verifierAuth = (auth, motDePasse) => !!auth && empreinte(motDePasse, auth.sel, auth.tours) === auth.hash;

/* ---------- Sauvegarde chiffrée (AES-256-GCM, clé dérivée par PBKDF2-SHA-256) ---------- */
const ITERATIONS = 310000;
export const chiffrementDisponible = () => !!(window.crypto && window.crypto.subtle);
const b64 = (octets) => {
  let s = '';
  for (let i = 0; i < octets.length; i += 0x8000) s += String.fromCharCode.apply(null, octets.subarray(i, i + 0x8000));
  return btoa(s);
};
const deB64 = (texte) => Uint8Array.from(atob(texte), (c) => c.charCodeAt(0));
async function deriver(phrase, sel, iterations) {
  const base = await window.crypto.subtle.importKey('raw', encodeur.encode(phrase), 'PBKDF2', false, ['deriveKey']);
  return window.crypto.subtle.deriveKey({ name: 'PBKDF2', salt: sel, iterations, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
export async function chiffrer(contenu, phrase, meta) {
  const sel = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const cle = await deriver(phrase, sel, ITERATIONS);
  const chiffre = new Uint8Array(await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cle, encodeur.encode(JSON.stringify(contenu))));
  return { format: 'saccades-sauvegarde', version: 1, chiffrement: 'AES-256-GCM', derivation: 'PBKDF2-SHA-256', iterations: ITERATIONS, ...meta, sel: b64(sel), iv: b64(iv), donnees: b64(chiffre) };
}
/** Rejette si la phrase secrète est fausse ou si le fichier a été altéré. */
export async function dechiffrer(fichier, phrase) {
  if (!fichier || fichier.format !== 'saccades-sauvegarde') throw new Error('format');
  const cle = await deriver(phrase, deB64(fichier.sel), fichier.iterations || ITERATIONS);
  const clair = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv: deB64(fichier.iv) }, cle, deB64(fichier.donnees));
  return JSON.parse(new TextDecoder().decode(clair));
}
