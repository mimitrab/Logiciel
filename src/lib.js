// Utilitaires génériques : identifiants, dates, nombres, accès aux objets imbriqués.

export const uid = (p) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const pad = (n) => String(n).padStart(2, '0');
export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = () => toISO(new Date());
export const parseISO = (s) => {
  const [y, m, d] = String(s || '').split('-').map(Number);
  return new Date(y || 2000, (m || 1) - 1, d || 1);
};
export const addDays = (iso, n) => {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
};

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

export const dateLongue = (iso) => {
  const d = parseISO(iso);
  return `${d.getDate() === 1 ? '1er' : d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
};
export const dateJour = (iso) => `${JOURS[parseISO(iso).getDay()]} ${dateLongue(iso)}`;
export const dateCourte = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};
export const moisDe = (iso) => String(iso || '').slice(0, 7);

export function age(ddn, ref = todayISO()) {
  if (!ddn) return { ans: 0, mois: 0, inconnu: true };
  const a = parseISO(ddn);
  const b = parseISO(ref);
  let mois = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) mois -= 1;
  mois = Math.max(0, mois);
  return { ans: Math.floor(mois / 12), mois };
}
export function ageTexte(ddn, ref) {
  const a = age(ddn, ref);
  if (a.inconnu) return 'âge non renseigné';
  if (a.mois < 1) return "moins d'un mois";
  if (a.mois < 24) return `${a.mois} mois`;
  return `${a.ans} ans`;
}

/** Nombre saisi (virgule ou point) → number, ou null si vide / invalide. */
export const num = (v) => {
  if (v === '' || v == null) return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
export const fr = (n, dec) =>
  Number(n).toLocaleString('fr-FR', dec != null ? { minimumFractionDigits: dec, maximumFractionDigits: dec } : { maximumFractionDigits: 2 });
const EUR = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
export const euro = (n) => EUR.format(n || 0);
export const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/** ['a', 'b', 'c'] → « a, b et c » */
export const liste = (arr) => {
  const a = arr.filter(Boolean);
  if (a.length <= 1) return a[0] || '';
  return `${a.slice(0, -1).join(', ')} et ${a[a.length - 1]}`;
};
export const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
export const initiales = (p) => `${(p.prenom || '?').charAt(0)}${(p.nom || '?').charAt(0)}`.toUpperCase();
export const nomComplet = (p) => `${p.prenom} ${String(p.nom || '').toUpperCase()}`;
export const slug = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export const getIn = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
export function setIn(obj, path, value) {
  const keys = path.split('.');
  const out = { ...obj };
  let cur = out;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    cur[k] = cur[k] && typeof cur[k] === 'object' ? { ...cur[k] } : {};
    cur = cur[k];
  }
  cur[keys[keys.length - 1]] = value;
  return out;
}
/** Fusion profonde (objets simples uniquement) : sert à compléter un modèle vide. */
export function fusion(base, extra) {
  if (!extra) return base;
  const out = { ...base };
  for (const k of Object.keys(extra)) {
    const b = base ? base[k] : undefined;
    const e = extra[k];
    out[k] = e && typeof e === 'object' && !Array.isArray(e) && b && typeof b === 'object' ? fusion(b, e) : e;
  }
  return out;
}
