// État de l'application : persistance dans le localStorage du navigateur et opérations métier.
import { todayISO, uid } from './lib.js';
import { acte, bilanVide, calculFacture, suggererActe } from './domain.js';
import { genererCorps } from './letter.js';
import { etatDemo } from './seed.js';

const CLE = 'binocle.cabinet.v1';

export function charger() {
  let etat = null;
  try {
    const brut = localStorage.getItem(CLE);
    if (brut) {
      const s = JSON.parse(brut);
      if (s && s.version === 1 && Array.isArray(s.patients)) etat = s;
    }
  } catch (e) {
    etat = null;
  }
  if (!etat) return etatDemo();
  // L'agenda de démonstration suit le calendrier : il est replacé à la date du jour s'il n'y a aucun rendez-vous aujourd'hui.
  const T = todayISO();
  if (!etat.rdvs.some((r) => r.date === T)) etat = { ...etat, rdvs: etat.rdvs.map((r) => (r.demo ? { ...r, date: T, statut: r.demo } : r)) };
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

const patientDe = (s, id) => s.patients.find((p) => p.id === id);
const maj = (liste, id, f) => liste.map((x) => (x.id === id ? f(x) : x));

/** Tant que le courrier n'a pas été retouché à la main, il suit la saisie en direct. */
function synchroniser(s, bilan) {
  if (!bilan.cr || bilan.cr.modifie) return bilan;
  const patient = patientDe(s, bilan.patientId);
  return patient ? { ...bilan, cr: { ...bilan.cr, texte: genererCorps(patient, bilan, s.cabinet) } } : bilan;
}

function nouvelleFacture(s, { patientId, acteCode, coef, qte = 1, date, statut = 'a-facturer', mode = '', exoneration, bilanId }) {
  const patient = patientDe(s, patientId);
  const a = acte(acteCode);
  const n = (s.compteurFacture || 0) + 1;
  const ex = exoneration || patient.exoneration || 'aucune';
  const c = coef != null ? coef : a.coef;
  const d = date || todayISO();
  return {
    compteurFacture: n,
    facture: {
      id: uid('f'), numero: `F-${d.slice(0, 4)}-${String(n).padStart(4, '0')}`, date: d, patientId, acteCode: a.code, libelle: a.libelle, coef: c, qte,
      exoneration: ex, statut, mode, bilanId: bilanId || null,
      ...calculFacture({ coef: c, qte, valeurAMY: s.cabinet.valeurAMY, exoneration: ex, mutuelle: patient.mutuelle }),
    },
  };
}

export const ops = {
  enregistrerPatient(s, patient) {
    const existe = s.patients.some((p) => p.id === patient.id);
    const patients = existe ? maj(s.patients, patient.id, () => patient) : [...s.patients, patient];
    const suivant = { ...s, patients };
    // Les courriers non retouchés reprennent les antécédents et l'identité à jour.
    return { ...suivant, bilans: suivant.bilans.map((b) => (b.patientId === patient.id && b.statut !== 'envoye' ? synchroniser(suivant, b) : b)) };
  },
  ajouterRdv(s, rdv) {
    return { ...s, rdvs: [...s.rdvs, rdv] };
  },
  statutRdv(s, id, statut) {
    return { ...s, rdvs: maj(s.rdvs, id, (r) => ({ ...r, statut })) };
  },
  creerBilan(s, { id, patientId, type, date }) {
    const patient = patientDe(s, patientId);
    const bilan = { id, patientId, date: date || todayISO(), type: type || 'bilan', statut: 'brouillon', data: bilanVide(patient), cr: null, updatedAt: Date.now() };
    return { ...s, bilans: [bilan, ...s.bilans] };
  },
  modifierBilan(s, id, f) {
    return { ...s, bilans: maj(s.bilans, id, (b) => synchroniser(s, { ...f(b), updatedAt: Date.now() })) };
  },
  genererCR(s, id) {
    return {
      ...s,
      bilans: maj(s.bilans, id, (b) => {
        const patient = patientDe(s, b.patientId);
        return { ...b, cr: { texte: genererCorps(patient, { ...b, cr: null }, s.cabinet), modifie: false }, statut: b.statut === 'brouillon' ? 'a-envoyer' : b.statut, updatedAt: Date.now() };
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
    const { facture, compteurFacture } = nouvelleFacture(s, { patientId, acteCode: o.acte || 'RB' });
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
  enregistrerCabinet(s, cabinet) {
    const suivant = { ...s, cabinet };
    return { ...suivant, bilans: suivant.bilans.map((b) => (b.statut !== 'envoye' ? synchroniser(suivant, b) : b)) };
  },
};

/** Acte proposé pour facturer un bilan donné. */
export const acteDuBilan = (s, bilan) => suggererActe({ patient: patientDe(s, bilan.patientId), bilan });
export { etatDemo };
