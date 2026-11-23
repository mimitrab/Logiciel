// Coque de l'application : connexion, rôles, navigation, état partagé, journal d'audit.
// En démonstration, l'état vit dans le navigateur. En mode serveur, il est chargé depuis l'API
// et chaque modification est synchronisée ; le serveur applique lui-même le cloisonnement.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, Building2, CalendarDays, ClipboardList, Cloud, CloudOff, Euro, Gift, HardDrive, KeyRound, LayoutDashboard, LogOut, Menu, Receipt, Settings, ShieldAlert, ShieldCheck, TriangleAlert, UserCog, Users } from 'lucide-react';
import { AppCtx, Btn, Field, IconBtn, Logo, Modal, Text, Toasts, cx } from './ui.jsx';
import { abonnementDemo, acteDuBilan, charger, enregistrer, etatDemo, normaliser, ops, session as stockSession, vuePraticien } from './store.js';
import { acteDe, cotation, nomUtilisateur } from './domain.js';
import { creerAuth, verifierAuth } from './crypto.js';
import { COLLECTIONS, api, differences } from './api.js';
import { MODE, SERVEUR } from './mode.js';
import { dateCourte, horodatage, nomComplet, todayISO, uid } from './lib.js';
import Login from './views/Login.jsx';
import Accueil from './views/Accueil.jsx';
import Mentions from './views/Mentions.jsx';
import Dashboard from './views/Dashboard.jsx';
import Agenda from './views/Agenda.jsx';
import Patients from './views/Patients.jsx';
import Bilans from './views/Bilan.jsx';
import Facturation from './views/Facturation.jsx';
import Conformite from './views/Conformite.jsx';
import Abonnement from './views/Abonnement.jsx';
import { Cabinets, Offre } from './views/Plateforme.jsx';
import { Reglages, Supervision, Utilisateurs } from './views/Admin.jsx';

const MODULES = {
  accueil: { label: 'Tableau de bord', court: 'Accueil', icon: LayoutDashboard, clinique: true },
  agenda: { label: 'Agenda', court: 'Agenda', icon: CalendarDays, clinique: true },
  patients: { label: 'Dossiers patients', court: 'Patients', icon: Users, clinique: true },
  bilans: { label: 'Bilans cliniques', court: 'Bilans', icon: ClipboardList, clinique: true },
  facturation: { label: 'Facturation', court: 'Factures', icon: Receipt, clinique: true },
  supervision: { label: 'Supervision du cabinet', court: 'Cabinet', icon: Activity },
  utilisateurs: { label: 'Utilisateurs', court: 'Comptes', icon: UserCog },
  conformite: { label: 'Conformité et sécurité', court: 'Conformité', icon: ShieldCheck },
  reglages: { label: 'Réglages du cabinet', court: 'Réglages', icon: Settings },
  abonnement: { label: 'Abonnement et parrainage', court: 'Abonnement', icon: Gift },
  cabinets: { label: 'Cabinets inscrits', court: 'Cabinets', icon: Building2 },
  offre: { label: 'Offre et inscriptions', court: 'Offre', icon: Euro },
};
const CLINIQUES = ['accueil', 'agenda', 'patients', 'bilans', 'facturation'];
const LONGUEUR_MDP = SERVEUR ? 12 : 10;

function MonCompte({ onClose }) {
  const { user, actions } = React.useContext(AppCtx);
  const [p, setP] = useState({ prenom: user.prenom, nom: user.nom, titre: user.titre, rpps: user.rpps });
  const [mdp, setMdp] = useState({ actuel: '', nouveau: '', confirmation: '' });
  const [erreur, setErreur] = useState('');
  const set = (k) => (v) => setP((x) => ({ ...x, [k]: v }));
  const setM = (k) => (v) => setMdp((x) => ({ ...x, [k]: v }));
  const enregistrer = async () => {
    if (mdp.nouveau || mdp.actuel) {
      if (mdp.nouveau.length < LONGUEUR_MDP) return setErreur(`Le nouveau mot de passe doit compter au moins ${LONGUEUR_MDP} caractères.`);
      if (mdp.nouveau !== mdp.confirmation) return setErreur('La confirmation ne correspond pas au nouveau mot de passe.');
      if (!(await actions.changerMotDePasse(mdp.actuel, mdp.nouveau))) return setErreur('Le mot de passe actuel est incorrect.');
    }
    await actions.enregistrerProfil(p);
    return onClose();
  };
  return (
    <Modal
      title="Mon compte"
      subtitle={`Identifiant : ${user.identifiant || '—'}`}
      onClose={onClose}
      footer={
        <>
          {erreur && <span className="mr-auto text-[12.5px] text-danger">{erreur}</span>}
          <Btn onClick={onClose}>Annuler</Btn>
          <Btn variant="primary" onClick={enregistrer}>Enregistrer</Btn>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Prénom" htmlFor="mc-prenom"><Text id="mc-prenom" value={p.prenom} onChange={set('prenom')} /></Field>
        <Field label="Nom" htmlFor="mc-nom"><Text id="mc-nom" value={p.nom} onChange={set('nom')} /></Field>
        <Field label="Titre" htmlFor="mc-titre" hint="Repris dans l'en-tête et la signature des comptes-rendus."><Text id="mc-titre" value={p.titre} onChange={set('titre')} /></Field>
        <Field label="N° RPPS" htmlFor="mc-rpps"><Text id="mc-rpps" value={p.rpps} onChange={set('rpps')} /></Field>
      </div>
      <h3 className="eyebrow mt-5 border-t border-line pt-4">Changer le mot de passe</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Field label="Mot de passe actuel" htmlFor="mc-actuel"><Text id="mc-actuel" type="password" autoComplete="current-password" value={mdp.actuel} onChange={setM('actuel')} /></Field>
        <Field label={`Nouveau (${LONGUEUR_MDP} caractères min.)`} htmlFor="mc-nouveau"><Text id="mc-nouveau" type="password" autoComplete="new-password" value={mdp.nouveau} onChange={setM('nouveau')} /></Field>
        <Field label="Confirmation" htmlFor="mc-confirmation"><Text id="mc-confirmation" type="password" autoComplete="new-password" value={mdp.confirmation} onChange={setM('confirmation')} /></Field>
      </div>
    </Modal>
  );
}

function App() {
  const [state, setState] = useState(() => (SERVEUR ? null : charger()));
  const [sess, setSess] = useState(() => (SERVEUR ? null : stockSession.lire()));
  const [etapeLogin, setEtapeLogin] = useState(SERVEUR ? 'chargement' : null);
  const ref = useRef(state);
  ref.current = state;
  const sessRef = useRef(sess);
  sessRef.current = sess;
  const lectureRef = useRef(false);
  const [stockage, setStockage] = useState(true);
  const [sync, setSync] = useState('ok');
  const [route, setRoute] = useState({ vue: null });
  const [toasts, setToasts] = useState([]);
  const [modal, setModal] = useState(null);
  // Visiteur non connecté : page d'accueil, connexion ou inscription.
  const [ecranPublic, setEcranPublic] = useState(() => (new URLSearchParams(window.location.search).get('parrain') ? 'connexion' : 'accueil'));
  const [infosPubliques, setInfosPubliques] = useState({});

  const toast = useCallback((message, tone) => {
    const id = uid('t');
    setToasts((l) => [...l.slice(-1), { id, message, tone }]);
    setTimeout(() => setToasts((l) => l.filter((x) => x.id !== id)), 3800);
  }, []);

  /* ---------- Démonstration : persistance dans le navigateur ---------- */
  useEffect(() => {
    if (!SERVEUR && state) setStockage(enregistrer(state));
  }, [state]);
  useEffect(() => {
    if (!SERVEUR) stockSession.ecrire(sess);
  }, [sess]);

  /* ---------- Serveur : chargement et synchronisation ---------- */
  const base = useRef(null);
  const envoi = useRef({ enCours: false, aRefaire: false, minuteur: null });
  const quitterSession = useCallback((message) => {
    base.current = null;
    setState(null);
    setSess(null);
    setModal(null);
    setEtapeLogin('identifiants');
    if (message) toast(message);
  }, []);
  const chargerEtat = useCallback(async () => {
    const e = normaliser(await api.get('/etat'));
    base.current = e;
    setState(e);
    setSess({ userId: e.moi, acces: e.acces });
    setEtapeLogin(null);
    return e;
  }, []);
  const synchroniser = useCallback(async () => {
    const s = envoi.current;
    clearTimeout(s.minuteur);
    if (s.enCours) {
      s.aRefaire = true;
      return;
    }
    const avant = base.current;
    const apres = ref.current;
    if (!avant || !apres || avant === apres) return;
    const { ops: o, journal } = differences(avant, apres);
    const compteurFacture = apres.compteurFacture !== avant.compteurFacture ? apres.compteurFacture : undefined;
    base.current = apres;
    if (!o.length && !journal.length && compteurFacture === undefined) return;
    s.enCours = true;
    setSync('envoi');
    try {
      const r = await api.post('/synchro', { ops: o, journal, compteurFacture });
      setSync('ok');
      if (r && r.refuses && r.refuses.length) toast(`${r.refuses.length} modification(s) refusée(s) par le serveur : droits insuffisants.`, 'danger');
    } catch (err) {
      if (err.status === 401) {
        s.enCours = false;
        quitterSession('Session expirée : reconnectez-vous. Les dernières modifications non enregistrées sont perdues.');
        return;
      }
      base.current = avant;
      setSync('erreur');
      s.minuteur = setTimeout(synchroniser, 5000);
    }
    s.enCours = false;
    if (s.aRefaire) {
      s.aRefaire = false;
      synchroniser();
    }
  }, []);
  useEffect(() => {
    if (!SERVEUR) return undefined;
    const retour = new URLSearchParams(window.location.search).get('abonnement');
    if (retour) {
      toast(retour === 'merci' ? 'Merci : votre abonnement est enregistré. Il apparaîtra dans quelques instants.' : "Paiement annulé : rien n'a été prélevé.");
      window.history.replaceState(null, '', window.location.pathname);
    }
    api
      .get('/session')
      .then((r) => (r.etape === 'ok' ? chargerEtat() : setEtapeLogin(r.etape)))
      .catch(() => setEtapeLogin('identifiants'));
    const avertir = (e) => {
      if (sync !== 'ok' || (base.current && base.current !== ref.current)) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', avertir);
    return () => window.removeEventListener('beforeunload', avertir);
  }, []);
  useEffect(() => {
    if (!SERVEUR || !state || !base.current || base.current === state) return;
    clearTimeout(envoi.current.minuteur);
    envoi.current.minuteur = setTimeout(synchroniser, 500);
  }, [state]);

  const user = sess && state ? state.utilisateurs.find((u) => u.id === sess.userId && u.actif !== false) : null;
  // Offre et annonce publiques : relues à chaque retour sur les écrans publics (après une déconnexion).
  useEffect(() => {
    if (SERVEUR && !user) api.get('/public').then((r) => setInfosPubliques(r.plateforme || {})).catch(() => {});
  }, [!!user]);
  const estAdmin = !!user && user.role === 'admin';
  const acces = estAdmin && sess.acces ? sess.acces : null;
  const portee = user ? (estAdmin ? (acces ? acces.praticienId : null) : user.id) : null;
  const praticien = portee ? state.utilisateurs.find((u) => u.id === portee) : null;
  const estPlateforme = !!user && user.role === 'plateforme';
  const gestion = !!user && (user.role === 'admin' || !!user.gestionnaire);
  const abonnement = state && !estPlateforme ? (SERVEUR ? state.abonnement : abonnementDemo(state)) : null;
  lectureRef.current = !!(abonnement && abonnement.lectureSeule);
  const offreLocale = !SERVEUR && state && state.plateforme && state.plateforme.offre;
  const annonce = SERVEUR ? state && state.annonce : offreLocale && offreLocale.annonce ? { texte: offreLocale.annonce, ton: offreLocale.annonceTon } : null;

  const actions = useMemo(() => {
    // En lecture seule (période gratuite terminée), les modifications de dossiers sont refusées.
    const run = (f) =>
      setState((s) => {
        const n = f(s);
        if (lectureRef.current && n !== s && COLLECTIONS.some((c) => n[c] !== s[c])) {
          setTimeout(() => toast('Lecture seule : la période gratuite est terminée. Vos dossiers restent consultables et exportables.', 'danger'));
          return s;
        }
        return n;
      });
    const moi = () => (sessRef.current ? sessRef.current.userId : null);
    const perimetre = () => {
      const s = sessRef.current;
      const u = s && ref.current && ref.current.utilisateurs.find((x) => x.id === s.userId);
      if (!u) return null;
      return u.role === 'admin' ? (s.acces ? s.acces.praticienId : null) : u.id;
    };
    const trace = (st, action, extra = {}) => ops.journal(st, { userId: moi(), action, praticienId: perimetre() || undefined, ...extra });
    const patient = (id) => ref.current.patients.find((p) => p.id === id);
    const nomDe = (id) => {
      const p = patient(id);
      return p ? nomComplet(p) : '';
    };
    /** Appel au serveur puis rechargement de l'état ; l'erreur est affichée plutôt que levée. */
    const serveur = async (f, message) => {
      try {
        await synchroniser();
        await f();
        await chargerEtat();
        if (message) toast(message);
        return true;
      } catch (e) {
        if (e.status === 401) quitterSession('Session expirée : reconnectez-vous.');
        else toast(e.message, 'danger');
        return false;
      }
    };

    const api_ = {
      /* ----- Connexion et session ----- */
      connexion(identifiant, motDePasse) {
        const saisi = identifiant.trim();
        const u = ref.current.utilisateurs.find((x) => x.identifiant.toLowerCase() === saisi.toLowerCase());
        if (!u || !u.actif || !verifierAuth(u.auth, motDePasse)) {
          run((st) => ops.journal(st, { userId: u ? u.id : null, action: 'connexion.echec', detail: `Identifiant saisi : ${saisi.slice(0, 60) || '(vide)'}${u && !u.actif ? ' (compte désactivé)' : ''}` }));
          return false;
        }
        run((st) => ops.journal({ ...st, utilisateurs: st.utilisateurs.map((x) => (x.id === u.id ? { ...x, derniereConnexion: Date.now() } : x)) }, { userId: u.id, action: 'connexion' }));
        setSess({ userId: u.id, acces: null });
        setRoute({ vue: null });
        return true;
      },
      async connecte() {
        try {
          await chargerEtat();
          setRoute({ vue: null });
        } catch (e) {
          setEtapeLogin('identifiants');
          toast(e.message, 'danger');
        }
      },
      async deconnexion(auto) {
        const s = sessRef.current;
        if (!s) return;
        setEcranPublic('connexion');
        if (SERVEUR) {
          await synchroniser();
          try {
            await api.post('/deconnexion');
          } catch (e) {
            /* la session est de toute façon fermée côté navigateur */
          }
          quitterSession(auto ? "Session fermée après une période d'inactivité." : null);
          return;
        }
        if (s.acces) api_.fermerAcces(true);
        run((st) => ops.journal(st, { userId: s.userId, action: auto ? 'deconnexion.auto' : 'deconnexion' }));
        setSess(null);
        setModal(null);
        if (auto) toast("Session fermée après une période d'inactivité.");
      },
      async ouvrirAcces(praticienId, motif, precision) {
        if (SERVEUR) {
          if (await serveur(() => api.post('/acces', { praticienId, motif, precision }))) setRoute({ vue: 'accueil' });
          return;
        }
        const p = ref.current.utilisateurs.find((u) => u.id === praticienId);
        run((st) => ops.journal(st, { userId: moi(), action: 'acces.debut', praticienId, cible: `Dossiers de ${nomUtilisateur(p)}`, detail: `Motif : ${motif.charAt(0).toLowerCase() + motif.slice(1)}.${precision.trim() ? ` ${precision.trim()}` : ''}` }));
        setSess((s) => ({ ...s, acces: { praticienId, motif, debut: Date.now() } }));
        setRoute({ vue: 'accueil' });
      },
      async fermerAcces(silencieux) {
        const a = sessRef.current && sessRef.current.acces;
        if (!a) return;
        if (SERVEUR) {
          if (await serveur(() => api.post('/acces/fin'), silencieux ? null : 'Accès exceptionnel terminé et consigné au journal.')) setRoute({ vue: 'supervision' });
          return;
        }
        const p = ref.current.utilisateurs.find((u) => u.id === a.praticienId);
        run((st) => ops.journal(st, { userId: moi(), action: 'acces.fin', praticienId: a.praticienId, cible: `Dossiers de ${nomUtilisateur(p)}`, detail: `Durée : ${Math.max(1, Math.round((Date.now() - a.debut) / 60000))} min` }));
        setSess((s) => (s ? { ...s, acces: null } : s));
        setRoute({ vue: 'supervision' });
        if (!silencieux) toast('Accès exceptionnel terminé et consigné au journal.');
      },
      tracer: (action, cible, detail) => run((st) => trace(st, action, { cible, detail })),

      /* ----- Dossiers ----- */
      enregistrerPatient(p) {
        const nouveau = !p.id;
        const complet = nouveau ? { ...p, id: uid('p'), praticienId: perimetre() } : p;
        run((s) => trace(ops.enregistrerPatient(s, complet), nouveau ? 'patient.creation' : 'patient.modification', { cible: nomComplet(complet) }));
        toast(nouveau ? `Dossier créé pour ${nomComplet(complet)}` : 'Dossier mis à jour');
        return complet.id;
      },
      majRgpd(patientId, rgpd) {
        const p = patient(patientId);
        run((s) => trace(ops.enregistrerPatient(s, { ...p, rgpd: { ...rgpd, maj: todayISO() } }), 'rgpd.maj', { cible: nomComplet(p) }));
        toast('Information et consentements mis à jour');
      },

      /* ----- Agenda ----- */
      enregistrerRdv(rdv) {
        const nouveau = !rdv.id;
        const p = patient(rdv.patientId);
        const complet = nouveau ? { statut: 'attendu', note: '', ...rdv, id: uid('r'), praticienId: p.praticienId } : { ...rdv, praticienId: p.praticienId, demo: false };
        run((s) => trace(ops.enregistrerRdv(s, complet), nouveau ? 'rdv.creation' : 'rdv.modification', { cible: `${nomComplet(p)}, le ${dateCourte(complet.date)} à ${complet.heure}` }));
        toast(nouveau ? 'Rendez-vous ajouté à l’agenda' : 'Rendez-vous modifié');
      },
      supprimerRdv(id) {
        const r = ref.current.rdvs.find((x) => x.id === id);
        if (!r) return;
        run((s) => trace(ops.supprimerRdv(s, id), 'rdv.suppression', { cible: `${nomDe(r.patientId)}, le ${dateCourte(r.date)} à ${r.heure}` }));
        toast('Rendez-vous supprimé');
      },
      statutRdv: (id, statut) => run((s) => ops.statutRdv(s, id, statut)),
      validerSeance(patientId, rdvId) {
        const p = patient(patientId);
        const o = p && p.ordonnance;
        if (!o || !o.prescrites) return toast("Aucune ordonnance de rééducation n'est enregistrée pour ce patient.", 'danger');
        if ((o.effectuees || 0) >= o.prescrites) return toast("Toutes les séances prescrites ont été effectuées : l'ordonnance est à renouveler.", 'danger');
        run((s) => trace(ops.validerSeance(s, patientId, rdvId), 'seance.validation', { cible: nomComplet(p), detail: `Séance ${o.effectuees + 1}/${o.prescrites}` }));
        return toast(`Séance ${o.effectuees + 1}/${o.prescrites} validée pour ${p.prenom} : facture préparée.`);
      },

      /* ----- Bilans ----- */
      /** Ouvre la saisie d'un bilan : reprend le brouillon en cours du patient, sinon en crée un. */
      nouveauBilan(patientId, type, technique) {
        const brouillon = ref.current.bilans.find((b) => b.patientId === patientId && b.statut === 'brouillon');
        if (brouillon) {
          toast('Un bilan était déjà en cours pour ce patient : il est rouvert.');
          api_.go('bilans', { bilanId: brouillon.id });
          return;
        }
        const id = uid('b');
        run((s) => trace(ops.creerBilan(s, { id, patientId, type, technique }), 'bilan.creation', { cible: nomDe(patientId) }));
        setRoute({ vue: 'bilans', bilanId: id });
      },
      modifierBilan: (id, f) => run((s) => ops.modifierBilan(s, id, f)),
      genererCR(id) {
        const b = ref.current.bilans.find((x) => x.id === id);
        run((s) => trace(ops.genererCR(s, id), 'cr.generation', { cible: b ? nomDe(b.patientId) : '' }));
        toast('Compte-rendu généré');
      },
      editerCR: (id, texte) => run((s) => ops.editerCR(s, id, texte)),
      statutBilan: (id, statut) => run((s) => ops.statutBilan(s, id, statut)),
      enregistrerEnvoi(id, envois) {
        const b = ref.current.bilans.find((x) => x.id === id);
        const horodates = envois.map((e) => ({ ...e, ts: Date.now() }));
        run((s) => trace(ops.enregistrerEnvoi(s, id, horodates), 'cr.envoi', { cible: b ? nomDe(b.patientId) : '', detail: envois.map((e) => `${e.canal === 'mssante' ? 'MSSanté' : e.canal === 'mes' ? 'Mon espace santé' : 'remis au patient'} : ${e.destinataire}`).join(' ; ') }));
        toast('Envoi enregistré dans le dossier et au journal');
      },
      supprimerBilan(id) {
        const b = ref.current.bilans.find((x) => x.id === id);
        run((s) => trace(ops.supprimerBilan(s, id), 'bilan.suppression', { cible: b ? nomDe(b.patientId) : '' }));
        toast('Bilan supprimé');
      },

      /* ----- Facturation ----- */
      facturerBilan(bilanId) {
        const s = ref.current;
        const bilan = s.bilans.find((b) => b.id === bilanId);
        if (!bilan) return;
        if (s.factures.some((f) => f.bilanId === bilanId)) {
          toast('Ce bilan est déjà facturé.');
          api_.go('facturation');
          return;
        }
        const propose = acteDuBilan(s, bilan);
        run((st) => trace(ops.ajouterFacture(st, { patientId: bilan.patientId, acteCode: propose.code, bilanId, date: bilan.date }), 'facture.creation', { cible: nomDe(bilan.patientId), detail: cotation(acteDe(s.bareme, propose.code).coef) }));
        toast(`Facture préparée : acte sélectionné automatiquement (${propose.raison}).`);
        api_.go('facturation');
      },
      ajouterFacture(params) {
        run((s) => trace(ops.ajouterFacture(s, params), 'facture.creation', { cible: nomDe(params.patientId), detail: cotation(params.coef) }));
        toast('Facture enregistrée');
      },
      modifierFacture(id, patch) {
        const f = ref.current.factures.find((x) => x.id === id);
        run((s) => trace(ops.modifierFacture(s, id, patch), 'facture.modification', { cible: f ? `${f.numero}, ${nomDe(f.patientId)}` : '' }));
      },

      /* ----- Administration ----- */
      async enregistrerReglages(payload) {
        if (SERVEUR) return serveur(() => api.put('/reglages', payload), 'Réglages enregistrés');
        run((s) => trace(ops.enregistrerReglages(s, payload), 'reglages.modification'));
        toast('Réglages enregistrés');
        return true;
      },
      async enregistrerUtilisateur(u, motDePasse) {
        const nouveau = !u.id;
        if (SERVEUR) {
          const corps = { identifiant: u.identifiant, role: u.role, gestionnaire: !!u.gestionnaire, prenom: u.prenom, nom: u.nom, titre: u.titre, rpps: u.rpps, motDePasse };
          return serveur(() => (nouveau ? api.post('/utilisateurs', corps) : api.put(`/utilisateurs/${u.id}`, corps)), nouveau ? `Compte créé pour ${nomUtilisateur(u)}` : 'Compte mis à jour');
        }
        const complet = nouveau ? { ...u, id: uid('u'), actif: true, derniereConnexion: 0, auth: creerAuth(motDePasse) } : motDePasse ? { ...u, auth: creerAuth(motDePasse) } : u;
        run((s) => {
          let st = trace(ops.enregistrerUtilisateur(s, complet), nouveau ? 'utilisateur.creation' : 'utilisateur.modification', { cible: nomUtilisateur(complet) });
          if (!nouveau && motDePasse) st = trace(st, 'utilisateur.motdepasse', { cible: nomUtilisateur(complet), detail: "Réinitialisé par l'administrateur" });
          return st;
        });
        toast(nouveau ? `Compte créé pour ${nomUtilisateur(complet)}` : 'Compte mis à jour');
        return true;
      },
      async basculerActif(id) {
        const u = ref.current.utilisateurs.find((x) => x.id === id);
        if (!u) return;
        if (u.id === moi()) {
          toast('Vous ne pouvez pas désactiver votre propre compte.', 'danger');
          return;
        }
        const message = u.actif ? 'Compte désactivé : la connexion est bloquée, les dossiers sont conservés.' : 'Compte réactivé';
        if (SERVEUR) {
          await serveur(() => api.put(`/utilisateurs/${id}`, { actif: !u.actif }), message);
          return;
        }
        run((st) => trace(ops.enregistrerUtilisateur(st, { ...u, actif: !u.actif }), u.actif ? 'utilisateur.desactivation' : 'utilisateur.reactivation', { cible: nomUtilisateur(u) }));
        toast(message);
      },
      async reinitialiserMfa(id) {
        await serveur(() => api.put(`/utilisateurs/${id}`, { reinitialiserMfa: true }), 'Double authentification réinitialisée : elle sera à réactiver à la prochaine connexion.');
      },
      async enregistrerProfil(profil) {
        if (SERVEUR) return serveur(() => api.put('/profil', profil), 'Compte mis à jour');
        const u = ref.current.utilisateurs.find((x) => x.id === moi());
        if (!u) return false;
        run((s) => trace(ops.enregistrerUtilisateur(s, { ...u, ...profil }), 'utilisateur.modification', { cible: nomUtilisateur({ ...u, ...profil }) }));
        toast('Compte mis à jour');
        return true;
      },
      async changerMotDePasse(actuel, nouveau) {
        if (SERVEUR) {
          try {
            await api.post('/motdepasse', { actuel, nouveau });
            return true;
          } catch (e) {
            return false;
          }
        }
        const u = ref.current.utilisateurs.find((x) => x.id === moi());
        if (!u || !verifierAuth(u.auth, actuel)) return false;
        run((s) => trace(ops.enregistrerUtilisateur(s, { ...u, auth: creerAuth(nouveau), demo: false }), 'utilisateur.motdepasse', { cible: nomUtilisateur(u) }));
        return true;
      },
      restaurer(contenu) {
        setState(trace(normaliser({ ...contenu, journal: contenu.journal || [] }), 'sauvegarde.restauration'));
        setRoute({ vue: null });
        toast('Sauvegarde restaurée.');
      },
      reinitialiser() {
        setState(ops.journal(etatDemo(), { userId: null, action: 'demo.reinitialisation' }));
        setSess(null);
        setModal(null);
      },
      recharger: () => chargerEtat(),
      async reinitialiserAcces(userId) {
        if (SERVEUR) {
          try {
            return (await api.post(`/plateforme/comptes/${userId}/reinitialiser`)).motDePasse;
          } catch (e) {
            toast(e.message, 'danger');
            return null;
          }
        }
        const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
        const t = new Uint8Array(16);
        window.crypto.getRandomValues(t);
        const c = Array.from(t, (o) => A[o % A.length]).join('');
        run((st) => trace(st, 'utilisateur.motdepasse', { detail: 'Démonstration : réinitialisation simulée' }));
        return `${c.slice(0, 4)}-${c.slice(4, 8)}-${c.slice(8, 12)}-${c.slice(12, 16)}`;
      },
      async portailAbonnement() {
        if (!SERVEUR) {
          toast("Démonstration : le portail de paiement n'est pas activé.");
          return;
        }
        try {
          window.location.assign((await api.post('/abonnement/portail')).url);
        } catch (e) {
          toast(e.message, 'danger');
        }
      },

      /* ----- Plateforme, abonnement ----- */
      async plateforme(action, cabinetId, params = {}) {
        const libelles = { valider: 'Compte du cabinet ouvert : la période gratuite commence.', refuser: 'Inscription refusée.', suspendre: 'Cabinet suspendu.', reactiver: 'Cabinet réactivé.', prolonger: 'Mois offert ajouté.', payer: 'Paiement enregistré.' };
        if (SERVEUR) return serveur(() => api.post(`/plateforme/cabinets/${cabinetId}`, { action, ...params }), libelles[action]);
        run((s) => trace(ops.plateforme(s, action, cabinetId, params), { valider: 'cabinet.validation', refuser: 'cabinet.refus', suspendre: 'cabinet.suspension', reactiver: 'cabinet.reactivation', prolonger: 'cabinet.prolongation', payer: 'abonnement.paiement' }[action], { cible: ((ref.current.plateforme.cabinets.find((c) => c.id === cabinetId)) || {}).nom }));
        toast(libelles[action]);
        return true;
      },
      async enregistrerOffre(offre) {
        if (SERVEUR) return serveur(() => api.put('/plateforme/offre', offre), 'Offre enregistrée');
        run((s) => trace(ops.enregistrerOffre(s, offre), 'offre.modification'));
        toast('Offre enregistrée');
        return true;
      },
      async payerEnLigne() {
        if (!SERVEUR) {
          toast("Démonstration : le paiement en ligne n'est pas activé.");
          return;
        }
        try {
          const r = await api.post('/abonnement/paiement');
          window.location.assign(r.url);
        } catch (e) {
          toast(e.message, 'danger');
        }
      },
      enregistrerMaintenant: () => synchroniser(),

      /* ----- Navigation (la consultation d'un dossier est tracée) ----- */
      go(vue, params = {}) {
        setRoute({ vue, ...params });
        const zone = document.getElementById('zone');
        if (zone) zone.scrollTop = 0;
        const action = vue === 'patients' && params.patientId ? 'patient.consultation' : vue === 'bilans' && params.bilanId ? 'bilan.consultation' : null;
        if (!action) return;
        const b = params.bilanId && ref.current.bilans.find((x) => x.id === params.bilanId);
        const cible = nomDe(params.patientId || (b && b.patientId));
        const recent = ref.current.journal.find((e) => e.action === action && e.userId === moi() && e.cible === cible);
        if (cible && !(recent && Date.now() - recent.ts < 5 * 60000)) run((st) => trace(st, action, { cible }));
      },
    };
    // En lecture seule, toute action qui modifierait un dossier est arrêtée avant d'annoncer un succès.
    const MUTANTES = ['enregistrerPatient', 'majRgpd', 'enregistrerRdv', 'supprimerRdv', 'statutRdv', 'validerSeance', 'nouveauBilan', 'modifierBilan', 'genererCR', 'editerCR', 'statutBilan', 'enregistrerEnvoi', 'supprimerBilan', 'facturerBilan', 'ajouterFacture', 'modifierFacture'];
    for (const k of MUTANTES) {
      const f = api_[k];
      api_[k] = (...args) => {
        if (lectureRef.current) {
          toast('Lecture seule : la période gratuite est terminée. Vos dossiers restent consultables et exportables.', 'danger');
          return null;
        }
        return f(...args);
      };
    }
    return api_;
  }, []);

  // Déconnexion automatique après une période d'inactivité.
  useEffect(() => {
    if (!user) return undefined;
    let dernier = Date.now();
    const actif = () => {
      dernier = Date.now();
    };
    window.addEventListener('pointerdown', actif, true);
    window.addEventListener('keydown', actif, true);
    const t = setInterval(() => {
      if (Date.now() - dernier > ((ref.current && ref.current.cabinet.inactivite) || 15) * 60000) actions.deconnexion(true);
    }, 15000);
    return () => {
      clearInterval(t);
      window.removeEventListener('pointerdown', actif, true);
      window.removeEventListener('keydown', actif, true);
    };
  }, [user && user.id]);

  const vueDonnees = useMemo(() => (!state ? null : { ...(portee ? vuePraticien(state, portee) : { ...state, patients: [], rdvs: [], bilans: [], factures: [] }), abonnement }), [state, portee, abonnement]);
  const ctx = useMemo(() => ({ state: vueDonnees, global: state, user, praticien, estAdmin, acces, portee, actions, go: actions.go, toast, route }), [vueDonnees, state, user, praticien, acces, route]);

  // Titre de l'onglet : la page ouverte (la vue par défaut dépend du rôle).
  const vueTitre = user ? route.vue || (estPlateforme ? 'cabinets' : estAdmin ? 'supervision' : 'accueil') : null;
  useEffect(() => {
    document.title = vueTitre && MODULES[vueTitre] ? `${MODULES[vueTitre].label} · SACCADES` : 'SACCADES';
  }, [vueTitre]);

  if (!user) {
    if (SERVEUR && etapeLogin === 'chargement') return <p className="boot">Connexion au serveur…</p>;
    const offreDemo = state && state.plateforme && state.plateforme.offre;
    const infos = SERVEUR ? infosPubliques : { ...(state ? state.cabinet : {}), offre: offreDemo, annonce: offreDemo && offreDemo.annonce ? { texte: offreDemo.annonce, ton: offreDemo.annonceTon } : null };
    if (ecranPublic === 'accueil' && (!SERVEUR || etapeLogin === 'identifiants'))
      return <Accueil infos={infos} onConnexion={() => setEcranPublic('connexion')} onEssai={() => setEcranPublic(SERVEUR ? 'inscription' : 'connexion')} />;
    return (
      <>
        <Login key={ecranPublic} utilisateurs={state ? state.utilisateurs : []} cabinet={state ? state.cabinet : {}} plateforme={state ? state.plateforme : null} onLogin={actions.connexion} etapeInitiale={etapeLogin} onConnecte={actions.connecte} ecranInitial={ecranPublic} onAccueil={() => setEcranPublic('accueil')} />
        <Toasts items={toasts} />
      </>
    );
  }

  const defaut = estPlateforme ? 'cabinets' : estAdmin ? 'supervision' : 'accueil';
  const ADMINISTRATION = ['supervision', 'utilisateurs', 'abonnement', 'conformite', 'reglages'];
  const CABINET = gestion ? ['abonnement', 'utilisateurs', 'reglages', 'conformite'] : ['conformite'];
  const permises = estPlateforme ? ['cabinets', 'offre'] : estAdmin ? [...(acces ? CLINIQUES : []), ...ADMINISTRATION] : [...CLINIQUES, ...CABINET];
  let vue = route.vue || defaut;
  if (!permises.includes(vue)) vue = defaut;

  const groupes = estPlateforme
    ? [{ titre: 'Propriétaire de SACCADES', items: ['cabinets', 'offre'] }]
    : estAdmin
      ? [...(acces ? [{ titre: `Dossiers de ${nomUtilisateur(praticien)}`, items: CLINIQUES }] : []), { titre: 'Administration', items: ADMINISTRATION }]
      : [{ items: CLINIQUES }, { titre: 'Cabinet', items: CABINET }];
  const onglets = estPlateforme ? ['cabinets', 'offre'] : estAdmin && !acces ? ADMINISTRATION : CLINIQUES;
  const horsOnglets = groupes.flatMap((g) => g.items).filter((v) => !onglets.includes(v));
  const badges = {
    bilans: vueDonnees.bilans.filter((b) => b.statut !== 'envoye').length,
    facturation: vueDonnees.factures.filter((f) => f.statut === 'a-facturer').length,
  };
  const boutonNav = (v) => {
    const m = MODULES[v];
    const actif = vue === v;
    return (
      <button key={v} type="button" aria-current={actif ? 'page' : undefined} onClick={() => actions.go(v)} className={cx('flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-[13.5px] font-medium transition-colors', actif ? 'bg-nav-2 text-nav-ink' : 'text-nav-ink-2 hover:bg-nav-2 hover:text-nav-ink')}>
        <m.icon size={17} aria-hidden="true" />
        <span className="flex-1 truncate">{m.label}</span>
        {badges[v] > 0 && <span className="tnum rounded-full bg-accent-soft px-1.5 text-[11px] font-semibold leading-5 text-accent-strong">{badges[v]}</span>}
      </button>
    );
  };
  const etatStockage = SERVEUR
    ? {
        ok: [Cloud, 'Enregistré sur le serveur sécurisé.'],
        envoi: [Cloud, 'Enregistrement en cours…'],
        erreur: [CloudOff, "Serveur injoignable : nouvel essai dans quelques secondes. Ne fermez pas l'onglet."],
      }[sync]
    : stockage
      ? [HardDrive, 'Démonstration : données fictives, enregistrées dans ce navigateur.']
      : [TriangleAlert, 'Stockage local indisponible : vos saisies seront perdues à la fermeture.'];
  const IconeStockage = etatStockage[0];

  return (
    <AppCtx.Provider value={ctx}>
      <div className="flex h-full flex-col md:flex-row">
        <aside className="hidden w-[240px] flex-none flex-col bg-nav text-nav-ink md:flex">
          <div className="flex items-center gap-2.5 px-5 pb-4 pt-6">
            <Logo />
            <div className="leading-tight">
              <p className="font-display text-[19px] font-bold tracking-[0.06em]">SACCADES</p>
              <p className="truncate text-[11.5px] text-nav-ink-2">{estPlateforme ? 'Console du propriétaire' : state.cabinet.nom || "Cabinet d'orthoptie"}</p>
            </div>
          </div>
          <nav className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3 pb-3" aria-label="Modules">
            {groupes.map((g, i) => (
              <div key={i} className="flex flex-col gap-1">
                {g.titre && <p className="truncate px-3 pb-0.5 pt-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-nav-ink-2">{g.titre}</p>}
                {g.items.map(boutonNav)}
              </div>
            ))}
          </nav>
          <div className="border-t border-nav-2 px-4 py-3.5">
            <div className="flex items-center justify-between gap-1">
              <div className="min-w-0 leading-tight">
                <p className="truncate text-[13px] font-medium">{nomUtilisateur(user)}</p>
                <p className="truncate text-[11.5px] text-nav-ink-2">{estPlateforme ? 'Propriétaire de la plateforme' : estAdmin ? 'Administrateur du cabinet' : user.titre}</p>
              </div>
              <div className="flex flex-none">
                <IconBtn icon={KeyRound} label="Mon compte" onClick={() => setModal('compte')} className="!text-nav-ink-2 hover:!bg-nav-2 hover:!text-nav-ink" />
                <IconBtn icon={LogOut} label="Se déconnecter" onClick={() => actions.deconnexion(false)} className="!text-nav-ink-2 hover:!bg-nav-2 hover:!text-nav-ink" />
              </div>
            </div>
            <p className={cx('mt-2.5 flex items-start gap-1.5 text-[11px] leading-snug', sync === 'erreur' ? 'text-warn' : 'text-nav-ink-2')} role="status">
              <IconeStockage size={13} className="mt-px flex-none" aria-hidden="true" />
              {etatStockage[1]}
            </p>
            <button type="button" onClick={() => setModal('mentions')} className="mt-1.5 rounded text-[11px] text-nav-ink-2 underline-offset-2 hover:text-nav-ink hover:underline">Mentions légales</button>
          </div>
        </aside>

        <header className="gutter flex flex-none items-center justify-between bg-nav py-2.5 text-nav-ink md:hidden">
          <div className="flex items-center gap-2">
            <Logo size={24} />
            <span className="font-display text-[17px] font-bold tracking-[0.06em]">SACCADES</span>
          </div>
          <IconBtn icon={Menu} label="Menu" onClick={() => setModal('menu')} className="!text-nav-ink-2 hover:!bg-nav-2 hover:!text-nav-ink" />
        </header>

        <main id="zone" className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          {MODE !== 'serveur' && (
            <p className="gutter border-b border-warn bg-warn-soft py-1.5 text-center text-[12px] text-ink">
              Démonstration : tous les patients sont fictifs. N'y saisissez aucune donnée réelle.
            </p>
          )}
          {annonce && !estPlateforme && (
            <p className={cx('gutter border-b py-2 text-center text-[13px] text-ink', annonce.ton === 'warn' ? 'border-warn bg-warn-soft' : 'border-info bg-info-soft')} role="status">{annonce.texte}</p>
          )}
          <div className="gutter mx-auto w-full max-w-[1360px] py-5 lg:py-7">
            {abonnement && abonnement.lectureSeule && (
              <div className="mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border border-danger bg-danger-soft px-4 py-3">
                <p className="flex min-w-0 items-start gap-2 text-[13px] leading-snug text-ink">
                  <TriangleAlert size={16} className="mt-0.5 flex-none text-danger" aria-hidden="true" />
                  <span>
                    <span className="font-semibold">{abonnement.libelle}.</span> Vos dossiers restent consultables et exportables ; la saisie reprend dès l'abonnement.
                  </span>
                </p>
                {gestion ? <Btn size="sm" variant="primary" onClick={() => actions.go('abonnement')}>S'abonner</Btn> : <span className="text-[12.5px] text-ink-2">Contactez la gestion de votre cabinet.</span>}
              </div>
            )}
            {abonnement && abonnement.code === 'essai' && abonnement.joursRestants <= 14 && gestion && vue !== 'abonnement' && (
              <p className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warn bg-warn-soft px-4 py-2.5 text-[13px] text-ink">
                <span>Période gratuite : plus que {abonnement.joursRestants} jour{abonnement.joursRestants > 1 ? 's' : ''}.</span>
                <Btn size="sm" onClick={() => actions.go('abonnement')}>Voir l'abonnement</Btn>
              </p>
            )}
            {acces && (
              <div className="mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border border-warn bg-warn-soft px-4 py-3">
                <p className="flex min-w-0 items-start gap-2 text-[13px] leading-snug text-ink">
                  <ShieldAlert size={16} className="mt-0.5 flex-none text-warn" aria-hidden="true" />
                  <span>
                    <span className="font-semibold">Accès exceptionnel aux dossiers de {nomUtilisateur(praticien)}</span>, ouvert le {horodatage(acces.debut)}. Motif : {acces.motif.toLowerCase()}. Chaque action est consignée au journal d'audit, consultable par le praticien.
                  </span>
                </p>
                <Btn size="sm" onClick={() => actions.fermerAcces()}>Terminer l'accès</Btn>
              </div>
            )}
            {vue === 'accueil' && <Dashboard />}
            {vue === 'agenda' && <Agenda />}
            {vue === 'patients' && <Patients patientId={route.patientId} />}
            {vue === 'bilans' && <Bilans bilanId={route.bilanId} />}
            {vue === 'facturation' && <Facturation />}
            {vue === 'conformite' && <Conformite />}
            {vue === 'supervision' && <Supervision />}
            {vue === 'utilisateurs' && <Utilisateurs />}
            {vue === 'reglages' && <Reglages />}
            {vue === 'abonnement' && <Abonnement />}
            {vue === 'cabinets' && <Cabinets />}
            {vue === 'offre' && <Offre />}
          </div>
        </main>

        <nav className="gutter flex flex-none border-t border-line bg-surface md:hidden" aria-label="Modules">
          {onglets.map((v) => {
            const m = MODULES[v];
            const actif = vue === v;
            return (
              <button key={v} type="button" aria-current={actif ? 'page' : undefined} onClick={() => actions.go(v)} className={cx('relative flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[10.5px] font-medium', actif ? 'text-accent' : 'text-ink-3')}>
                <m.icon size={19} aria-hidden="true" />
                <span className="max-w-full truncate">{m.court}</span>
                {badges[v] > 0 && <span className="absolute right-[22%] top-1.5 h-2 w-2 rounded-full bg-warn" aria-hidden="true" />}
              </button>
            );
          })}
        </nav>
      </div>

      <Toasts items={toasts} />
      {modal === 'compte' && <MonCompte onClose={() => setModal(null)} />}
      {modal === 'mentions' && <Mentions cabinet={state.cabinet} onClose={() => setModal(null)} />}
      {modal === 'menu' && (
        <Modal size="sm" title={nomUtilisateur(user)} subtitle={estPlateforme ? 'Propriétaire de la plateforme' : estAdmin ? 'Administrateur du cabinet' : user.titre} onClose={() => setModal(null)}>
          <div className="flex flex-col gap-1">
            {horsOnglets.map((v) => {
              const m = MODULES[v];
              return (
                <button key={v} type="button" onClick={() => { setModal(null); actions.go(v); }} className="flex h-11 items-center gap-3 rounded-md px-3 text-left text-[14px] font-medium text-ink hover:bg-surface-2">
                  <m.icon size={17} className="text-accent" aria-hidden="true" /> {m.label}
                </button>
              );
            })}
            <button type="button" onClick={() => setModal('compte')} className="flex h-11 items-center gap-3 rounded-md px-3 text-left text-[14px] font-medium text-ink hover:bg-surface-2">
              <KeyRound size={17} className="text-accent" aria-hidden="true" /> Mon compte
            </button>
            <button type="button" onClick={() => setModal('mentions')} className="flex h-11 items-center gap-3 rounded-md px-3 text-left text-[14px] font-medium text-ink hover:bg-surface-2">
              <ShieldCheck size={17} className="text-accent" aria-hidden="true" /> Mentions légales
            </button>
            <button type="button" onClick={() => actions.deconnexion(false)} className="flex h-11 items-center gap-3 rounded-md px-3 text-left text-[14px] font-medium text-danger hover:bg-danger-soft">
              <LogOut size={17} aria-hidden="true" /> Se déconnecter
            </button>
          </div>
        </Modal>
      )}
    </AppCtx.Provider>
  );
}

createRoot(document.getElementById('root')).render(<App />);
