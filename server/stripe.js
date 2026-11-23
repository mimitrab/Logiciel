// Paiement en ligne par Stripe (facultatif). Sans clés, le propriétaire enregistre les paiements à la main.
// Variables : STRIPE_SECRET_KEY, STRIPE_PRICE_ID (prix mensuel par praticien), STRIPE_WEBHOOK_SECRET.
import { createHmac, timingSafeEqual } from 'node:crypto';

export const stripeActif = () => !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);

/** Stripe attend des paramètres « à plat » : line_items[0][price]=… */
function aplatir(objet, prefixe = '', out = {}) {
  for (const [k, v] of Object.entries(objet)) {
    if (v === undefined || v === null) continue;
    const cle = prefixe ? `${prefixe}[${k}]` : k;
    if (typeof v === 'object') aplatir(v, cle, out);
    else out[cle] = String(v);
  }
  return out;
}

export async function stripe(methode, chemin, params) {
  const r = await fetch(`https://api.stripe.com/v1${chemin}`, {
    method: methode,
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params ? new URLSearchParams(aplatir(params)).toString() : undefined,
  });
  const j = await r.json();
  if (!r.ok) throw new Error((j.error && j.error.message) || `Stripe a répondu ${r.status}`);
  return j;
}

/** Vérifie l'en-tête Stripe-Signature (HMAC SHA-256, tolérance de 5 minutes). */
export function verifierSignature(brut, entete, secret, tolerance = 300) {
  const morceaux = String(entete || '').split(',');
  const t = (morceaux.find((m) => m.startsWith('t=')) || '').slice(2);
  const signatures = morceaux.filter((m) => m.startsWith('v1=')).map((m) => m.slice(3));
  if (!t || !signatures.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > tolerance) return false;
  const attendu = createHmac('sha256', secret).update(`${t}.${brut}`).digest('hex');
  return signatures.some((s) => s.length === attendu.length && timingSafeEqual(Buffer.from(s), Buffer.from(attendu)));
}

/** Fin de la période en cours d'un abonnement (champ déplacé dans les versions récentes de l'API). */
export const finDePeriode = (sub) => Math.max(sub.trial_end || 0, sub.current_period_end || 0, ...((sub.items && sub.items.data) || []).map((i) => i.current_period_end || 0));
/** Abonnement d'une facture (champ déplacé dans les versions récentes de l'API). */
export const abonnementDeFacture = (inv) => inv.subscription || (inv.parent && inv.parent.subscription_details && inv.parent.subscription_details.subscription) || null;
export const finDeFacture = (inv) => Math.max(inv.period_end || 0, ...((inv.lines && inv.lines.data) || []).map((l) => (l.period && l.period.end) || 0));
