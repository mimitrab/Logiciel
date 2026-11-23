// Offre commerciale : période gratuite, abonnement, parrainage. Partagé entre l'interface et le serveur.
import { dateCourte, parseISO, toISO, todayISO } from './lib.js';

export const OFFRE_DEFAUT = {
  prixMensuelHT: 39,
  essaiMois: 3,
  moisParrain: 1,
  moisFilleul: 1,
  inscriptionsOuvertes: false,
  cgu: '',
  contact: '',
  editeur: '',
  hebergeur: '',
};

/** Ajoute n mois à une date ISO (le 31 janvier + 1 mois donne le 28 ou 29 février). */
export function ajouterMois(iso, n) {
  const d = parseISO(iso);
  const jour = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + Number(n || 0));
  const dernier = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(jour, dernier));
  return toISO(d);
}

const STRIPE_ACTIFS = ['active', 'trialing', 'past_due'];

/** État d'accès d'un cabinet. lectureSeule : consultation et export possibles, saisie bloquée. */
export function etatAbonnement(c, T = todayISO()) {
  if (!c) return { code: 'inconnu', libelle: '', ton: 'neutral', lectureSeule: false };
  if (c.statut === 'en_attente') return { code: 'en_attente', libelle: 'En attente de validation', ton: 'warn', lectureSeule: true };
  if (c.statut === 'refuse') return { code: 'refuse', libelle: 'Inscription refusée', ton: 'neutral', lectureSeule: true };
  if (c.statut === 'suspendu') return { code: 'suspendu', libelle: 'Accès suspendu', ton: 'danger', lectureSeule: true };
  const stripe = STRIPE_ACTIFS.includes(c.abonnementStatut);
  const paye = !!c.premierPaiement || stripe;
  const jusqu = c.accesJusqu || '';
  const joursRestants = jusqu ? Math.round((parseISO(jusqu) - parseISO(T)) / 86400000) : 0;
  if ((jusqu && jusqu >= T) || stripe) {
    if (!paye) return { code: 'essai', libelle: `Gratuit jusqu'au ${dateCourte(jusqu)}`, ton: joursRestants <= 14 ? 'warn' : 'info', jusqu, joursRestants, lectureSeule: false };
    return { code: 'abonne', libelle: 'Abonné', ton: 'ok', jusqu, joursRestants, lectureSeule: false };
  }
  return { code: 'expire', libelle: paye ? 'Abonnement expiré' : 'Période gratuite terminée', ton: 'danger', jusqu, joursRestants, lectureSeule: true };
}

export const nouveauCodeParrainage = (alea) => `SAC-${alea.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6).padEnd(6, 'X')}`;
