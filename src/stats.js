// Chiffres d'activité d'un praticien. Partagé entre l'interface et le serveur.
import { statutRgpd } from './domain.js';
import { moisDe, todayISO } from './lib.js';

export function compter(v, T = todayISO()) {
  const jour = v.rdvs.filter((r) => r.date === T);
  const somme = (l) => l.reduce((n, f) => n + (f.montant || 0), 0);
  return {
    patients: v.patients.length,
    bilans: v.bilans.length,
    rdvs: v.rdvs.length,
    factures: v.factures.length,
    rdvJour: jour.length,
    minutesJour: jour.reduce((n, r) => n + (r.duree || 0), 0),
    aRediger: v.bilans.filter((b) => b.statut === 'brouillon').length,
    aEnvoyer: v.bilans.filter((b) => b.statut === 'a-envoyer').length,
    aFacturer: somme(v.factures.filter((f) => f.statut === 'a-facturer')),
    mois: somme(v.factures.filter((f) => moisDe(f.date) === moisDe(T))),
    rgpdOk: v.patients.filter((p) => statutRgpd(p).complet).length,
  };
}
/** Chiffres fournis par le serveur s'il y en a, sinon calculés sur les données présentes. */
export function statsDe(global, uid) {
  if (global.stats && global.stats[uid]) return global.stats[uid];
  const mien = (x) => x.praticienId === uid;
  return compter({ patients: global.patients.filter(mien), rdvs: global.rdvs.filter(mien), bilans: global.bilans.filter(mien), factures: global.factures.filter(mien) });
}
