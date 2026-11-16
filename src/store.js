// État de l'application : persistance dans le navigateur, session, opérations métier.
import { todayISO, uid } from './lib.js';
import { acteDe, bilanVide, calculFacture, indicationReeducation, suggererActe, valeurAMY } from './domain.js';
import { genererCorps } from './letter.js';
import { etatDemo, rdvsDemo } from './seed.js';

const CLE = 'saccades.cabinet.v2';
const CLE_SESSION = 'saccades.session';
const TAILLE_JOURNAL = 1500;

export function charger() {
  let etat = null;
  try {
    const brut = localStorage.getItem(CLE);
    if (brut) {
      const s = JSON.parse(brut);
      if (s && s.version === 2 && Array.isArray(s.patients) && Array.isArray(s.utilisateurs)) etat = s;
    }
  } catch (e) {
    etat = null;
  }
  if (!etat) return etatDemo();
  // L'agenda de démonstration suit le calendrier : il est reconstruit autour de la date du jour
  // lorsqu'aucun rendez-vous n'existe aujourd'hui.
  const T = todayISO();
  if (!etat.rdvs.some((r) => r.date === T)) {
    const connus = new Set(etat.patients.map((p) => p.id));
    etat = { ...etat, rdvs: [...etat.rdvs.filter((r) => !r.demo), ...rdvsDemo(T).filter((r) => connus.has(r.patientId))] };
  }
  return etat;
}
export function enregistrer(etat) {
  try {
    localStorage.setItem(CLE, JSON.stringify(etat));
    return true;
  } catch (e) {
    return false;
  }
}
/** La session ne vit que le temps de l'onglet. */
export const session = {
  lire() {
    try {
      return JSON.parse(sessionStorage.getItem(CLE_SESSION) || 'null');
    } catch (e) {
      return null;
    }
  },
  ecrire(s) {
    try {
      if (s) sessionStorage.setItem(CLE_SESSION, JSON.stringify(s));
      else sessionStorage.removeItem(CLE_SESSION);
    } catch (e) {
      /* stockage indisponible : la session reste en mémoire */
    }
  },
};

const patientDe = (s, id) => s.patients.find((p) => p.id === id);
const maj = (liste, id, f) => liste.map((x) => (x.id === id ? f(x) : x));
export const contexteCourrier = (s, praticienId) => ({ cabinet: s.cabinet, praticien: s.utilisateurs.find((u) => u.id === praticienId), normes: s.normes });

/** Règle de décision : la rééducation est décochée dès que les signes fonctionnels et cliniques ne concordent plus. */
function appliquerRegle(s, bilan) {
  const k = bilan.data.conclusion;
  if (!k.reeducation || indicationReeducation(bilan.data, s.normes, bilan.type).ok) return bilan;
  return { ...bilan, data: { ...bilan.data, conclusion: { ...k, reeducation: false } } };
}
/** Tant que le courrier n'a pas été retouché à la main, il suit la saisie en direct. */
function synchroniser(s, bilan) {
  if (!bilan.cr || bilan.cr.modifie) return bilan;
  const patient = patientDe(s, bilan.patientId);
  return patient ? { ...bilan, cr: { ...bilan.cr, texte: genererCorps(patient, bilan, contexteCourrier(s, bilan.praticienId)) } } : bilan;
}
const resynchroniser = (s, filtre) => ({ ...s, bilans: s.bilans.map((b) => (b.statut !== 'envoye' && filtre(b) ? synchroniser(s, appliquerRegle(s, b)) : b)) });

function nouvelleFacture(s, { patientId, acteCode, coef, qte = 1, date, statut = 'a-facturer', mode = '', exoneration, bilanId }) {
  const patient = patientDe(s, patientId);
  const a = acteDe(s.bareme, acteCode);
  const n = (s.compteurFacture || 0) + 1;
  const ex = exoneration || patient.exoneration || 'aucune';
  const c = coef != null ? coef : a.coef;
  const d = date || todayISO();
  return {
    compteurFacture: n,
    facture: {
      id: uid('f'), numero: `F-${d.slice(0, 4)}-${String(n).padStart(4, '0')}`, praticienId: patient.praticienId, date: d, patientId, acteCode: a.code, libelle: a.libelle, coef: c, qte,
      exoneration: ex, statut, mode, bilanId: bilanId || null,
      ...calculFacture({ coef: c, qte, valeur: valeurAMY(s.cabinet), exoneration: ex, mutuelle: patient.mutuelle }),
    },
  };
}

export const ops = {
  /** Ajoute une ligne au journal d'audit (les plus récentes en tête). */
  journal(s, e) {
    return { ...s, journal: [{ id: uid('j'), ts: Date.now(), ...e }, ...s.journal].slice(0, TAILLE_JOURNAL) };
  },
  enregistrerPatient(s, patient) {
    const existe = s.patients.some((p) => p.id === patient.id);
    const suivant = { ...s, patients: existe ? maj(s.patients, patient.id, () => patient) : [...s.patients, patient] };
    return resynchroniser(suivant, (b) => b.patientId === patient.id);
  },
  enregistrerRdv(s, rdv) {
    return { ...s, rdvs: s.rdvs.some((r) => r.id === rdv.id) ? maj(s.rdvs, rdv.id, () => rdv) : [...s.rdvs, rdv] };
  },
  supprimerRdv(s, id) {
    return { ...s, rdvs: s.rdvs.filter((r) => r.id !== id) };
  },
  statutRdv(s, id, statut) {
    return { ...s, rdvs: maj(s.rdvs, id, (r) => ({ ...r, statut })) };
  },
  creerBilan(s, { id, patientId, type, date, technique }) {
    const patient = patientDe(s, patientId);
    const t = type || 'bilan';
    const data = bilanVide(patient, t);
    if (t === 'cv' && technique) data.cv.technique = technique;
    return { ...s, bilans: [{ id, patientId, praticienId: patient.praticienId, date: date || todayISO(), type: t, statut: 'brouillon', data, cr: null, updatedAt: Date.now() }, ...s.bilans] };
  },
  modifierBilan(s, id, f) {
    return { ...s, bilans: maj(s.bilans, id, (b) => synchroniser(s, appliquerRegle(s, { ...f(b), updatedAt: Date.now() }))) };
  },
  genererCR(s, id) {
    return {
      ...s,
      bilans: maj(s.bilans, id, (b0) => {
        const b = appliquerRegle(s, b0);
        const patient = patientDe(s, b.patientId);
        return { ...b, cr: { texte: genererCorps(patient, { ...b, cr: null }, contexteCourrier(s, b.praticienId)), modifie: false }, statut: b.statut === 'brouillon' ? 'a-envoyer' : b.statut, updatedAt: Date.now() };
      }),
    };
  },
  editerCR(s, id, texte) {
    return { ...s, bilans: maj(s.bilans, id, (b) => ({ ...b, cr: { texte, modifie: true }, updatedAt: Date.now() })) };
  },
  statutBilan(s, id, statut) {
    return { ...s, bilans: maj(s.bilans, id, (b) => ({ ...b, statut })) };
  },
  supprimerBilan(s, id) {
    return { ...s, bilans: s.bilans.filter((b) => b.id !== id) };
  },
  /** Valide une séance : incrémente le suivi de l'ordonnance et prépare la facture correspondante. */
  validerSeance(s, patientId, rdvId) {
    const patient = patientDe(s, patientId);
    if (!patient || !patient.ordonnance) return s;
    const o = patient.ordonnance;
    const { facture, compteurFacture } = nouvelleFacture(s, { patientId, acteCode: o.acte || '5.4' });
    return {
      ...s,
      compteurFacture,
      patients: maj(s.patients, patientId, (p) => ({ ...p, ordonnance: { ...o, effectuees: (o.effectuees || 0) + 1, derniere: todayISO() } })),
      rdvs: rdvId ? maj(s.rdvs, rdvId, (r) => ({ ...r, statut: 'vu' })) : s.rdvs,
      factures: [facture, ...s.factures],
    };
  },
  ajouterFacture(s, params) {
    const { facture, compteurFacture } = nouvelleFacture(s, params);
    return { ...s, compteurFacture, factures: [facture, ...s.factures] };
  },
  modifierFacture(s, id, patch) {
    return { ...s, factures: maj(s.factures, id, (f) => ({ ...f, ...patch })) };
  },
  enregistrerReglages(s, { cabinet, normes, bareme }) {
    const suivant = { ...s, cabinet: cabinet || s.cabinet, normes: normes || s.normes, bareme: bareme || s.bareme };
    return resynchroniser(suivant, () => true);
  },
  enregistrerUtilisateur(s, u) {
    const existe = s.utilisateurs.some((x) => x.id === u.id);
    const suivant = { ...s, utilisateurs: existe ? maj(s.utilisateurs, u.id, () => u) : [...s.utilisateurs, u] };
    return resynchroniser(suivant, (b) => b.praticienId === u.id);
  },
};

/** Acte proposé pour facturer un bilan donné. */
export function acteDuBilan(s, bilan) {
  const anterieurs = s.bilans.filter((b) => b.patientId === bilan.patientId && b.id !== bilan.id && b.date < bilan.date && b.type === bilan.type).length;
  return suggererActe({ patient: patientDe(s, bilan.patientId), bilan, anterieurs });
}
/** Vue cloisonnée : uniquement les données du praticien indiqué. */
export function vuePraticien(s, praticienId) {
  const mien = (x) => x.praticienId === praticienId;
  return { ...s, patients: s.patients.filter(mien), rdvs: s.rdvs.filter(mien), bilans: s.bilans.filter(mien), factures: s.factures.filter(mien) };
}
export { etatDemo };
