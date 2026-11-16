// Coque de l'application : navigation, état partagé, réglages du cabinet.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardList, HardDrive, LayoutDashboard, Receipt, RotateCcw, Settings, TriangleAlert, Users } from 'lucide-react';
import { AppCtx, Btn, ConfirmBtn, Field, IconBtn, Modal, Num, Text, Toasts, cx } from './ui.jsx';
import { acteDuBilan, charger, enregistrer, etatDemo, ops } from './store.js';
import { uid } from './lib.js';
import Dashboard from './views/Dashboard.jsx';
import Patients from './views/Patients.jsx';
import Bilans from './views/Bilan.jsx';
import Facturation from './views/Facturation.jsx';

const NAV = [
  { vue: 'accueil', label: 'Tableau de bord', court: 'Accueil', icon: LayoutDashboard },
  { vue: 'patients', label: 'Dossiers patients', court: 'Patients', icon: Users },
  { vue: 'bilans', label: 'Bilans cliniques', court: 'Bilans', icon: ClipboardList },
  { vue: 'facturation', label: 'Facturation', court: 'Factures', icon: Receipt },
];

const Logo = ({ size = 30 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
    <circle cx="12" cy="16" r="8.4" fill="none" stroke="currentColor" strokeWidth="2.2" />
    <circle cx="20" cy="16" r="8.4" fill="none" stroke="currentColor" strokeWidth="2.2" opacity="0.5" />
    <circle cx="16" cy="16" r="2.3" fill="currentColor" />
  </svg>
);

function Reglages({ onClose }) {
  const { state, actions } = React.useContext(AppCtx);
  const [c, setC] = useState(state.cabinet);
  const set = (k) => (v) => setC((x) => ({ ...x, [k]: v }));
  return (
    <Modal
      title="Réglages du cabinet"
      subtitle="Ces informations composent l'en-tête et la signature des comptes-rendus."
      onClose={onClose}
      footer={
        <>
          <Btn onClick={onClose}>Annuler</Btn>
          <Btn variant="primary" onClick={() => { actions.enregistrerCabinet({ ...c, valeurAMY: parseFloat(String(c.valeurAMY).replace(',', '.')) || 2.6 }); onClose(); }}>
            Enregistrer
          </Btn>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nom du cabinet" htmlFor="cab-nom" className="sm:col-span-2"><Text id="cab-nom" value={c.nom} onChange={set('nom')} /></Field>
        <Field label="Praticien" htmlFor="cab-praticien"><Text id="cab-praticien" value={c.praticien} onChange={set('praticien')} /></Field>
        <Field label="Titre" htmlFor="cab-titre"><Text id="cab-titre" value={c.titre} onChange={set('titre')} /></Field>
        <Field label="Adresse" htmlFor="cab-adresse" className="sm:col-span-2"><Text id="cab-adresse" value={c.adresse} onChange={set('adresse')} /></Field>
        <Field label="Code postal" htmlFor="cab-cp"><Text id="cab-cp" value={c.cp} onChange={set('cp')} /></Field>
        <Field label="Ville" htmlFor="cab-ville"><Text id="cab-ville" value={c.ville} onChange={set('ville')} /></Field>
        <Field label="Téléphone" htmlFor="cab-tel"><Text id="cab-tel" value={c.tel} onChange={set('tel')} /></Field>
        <Field label="Courriel" htmlFor="cab-email"><Text id="cab-email" value={c.email} onChange={set('email')} /></Field>
        <Field label="N° RPPS" htmlFor="cab-rpps"><Text id="cab-rpps" value={c.rpps} onChange={set('rpps')} /></Field>
        <Field label="Valeur de la lettre-clé AMY" htmlFor="cab-amy" hint="Sert au calcul des montants. À ajuster selon la convention en vigueur.">
          <Num id="cab-amy" value={c.valeurAMY} onChange={set('valeurAMY')} step={0.01} unit="€" />
        </Field>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface-2 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-ink">Données de démonstration</p>
          <p className="text-[12px] text-ink-3">Efface vos saisies et recharge les patients fictifs d'origine.</p>
        </div>
        <ConfirmBtn label="Réinitialiser" confirmLabel="Tout effacer et recharger" icon={RotateCcw} onConfirm={() => { actions.reinitialiser(); onClose(); }} />
      </div>
    </Modal>
  );
}

function App() {
  const [state, setState] = useState(charger);
  const ref = useRef(state);
  ref.current = state;
  const [stockage, setStockage] = useState(true);
  const [route, setRoute] = useState({ vue: 'accueil' });
  const [toasts, setToasts] = useState([]);
  const [reglages, setReglages] = useState(false);

  useEffect(() => {
    setStockage(enregistrer(state));
  }, [state]);

  const toast = useCallback((message, tone) => {
    const id = uid('t');
    setToasts((l) => [...l.slice(-1), { id, message, tone }]);
    setTimeout(() => setToasts((l) => l.filter((x) => x.id !== id)), 3800);
  }, []);
  const go = useCallback((vue, params = {}) => {
    setRoute({ vue, ...params });
    const zone = document.getElementById('zone');
    if (zone) zone.scrollTop = 0;
  }, []);

  const actions = useMemo(() => {
    const run = (f) => setState((s) => f(s));
    const patient = (id) => ref.current.patients.find((p) => p.id === id);
    return {
      enregistrerPatient(p) {
        const complet = p.id ? p : { ...p, id: uid('p') };
        run((s) => ops.enregistrerPatient(s, complet));
        toast(p.id ? 'Dossier mis à jour' : `Dossier créé pour ${complet.prenom} ${complet.nom.toUpperCase()}`);
        return complet.id;
      },
      ajouterRdv(rdv) {
        run((s) => ops.ajouterRdv(s, { id: uid('r'), statut: 'attendu', ...rdv }));
        toast('Rendez-vous ajouté à l’agenda');
      },
      statutRdv: (id, statut) => run((s) => ops.statutRdv(s, id, statut)),
      /** Ouvre la saisie d'un bilan : reprend le brouillon en cours du patient, sinon en crée un. */
      nouveauBilan(patientId, type) {
        const brouillon = ref.current.bilans.find((b) => b.patientId === patientId && b.statut === 'brouillon');
        if (brouillon) {
          toast('Un bilan était déjà en cours pour ce patient : il est rouvert.');
          go('bilans', { bilanId: brouillon.id });
          return;
        }
        const id = uid('b');
        run((s) => ops.creerBilan(s, { id, patientId, type }));
        go('bilans', { bilanId: id });
      },
      modifierBilan: (id, f) => run((s) => ops.modifierBilan(s, id, f)),
      genererCR(id) {
        run((s) => ops.genererCR(s, id));
        toast('Compte-rendu généré');
      },
      editerCR: (id, texte) => run((s) => ops.editerCR(s, id, texte)),
      statutBilan(id, statut) {
        run((s) => ops.statutBilan(s, id, statut));
        if (statut === 'envoye') toast('Compte-rendu marqué comme envoyé');
      },
      supprimerBilan(id) {
        run((s) => ops.supprimerBilan(s, id));
        toast('Bilan supprimé');
      },
      validerSeance(patientId, rdvId) {
        const p = patient(patientId);
        const o = p && p.ordonnance;
        if (!o || !o.prescrites) return toast("Aucune ordonnance de rééducation n'est enregistrée pour ce patient.", 'danger');
        if ((o.effectuees || 0) >= o.prescrites) return toast("Toutes les séances prescrites ont été effectuées : l'ordonnance est à renouveler.", 'danger');
        run((s) => ops.validerSeance(s, patientId, rdvId));
        return toast(`Séance ${o.effectuees + 1}/${o.prescrites} validée pour ${p.prenom} : facture préparée.`);
      },
      facturerBilan(bilanId) {
        const s = ref.current;
        const bilan = s.bilans.find((b) => b.id === bilanId);
        if (!bilan) return;
        if (s.factures.some((f) => f.bilanId === bilanId)) {
          toast('Ce bilan est déjà facturé.');
          go('facturation');
          return;
        }
        const propose = acteDuBilan(s, bilan);
        run((st) => ops.ajouterFacture(st, { patientId: bilan.patientId, acteCode: propose.code, bilanId, date: bilan.date }));
        toast(`Facture préparée : acte sélectionné automatiquement (${propose.raison}).`);
        go('facturation');
      },
      ajouterFacture(params) {
        run((s) => ops.ajouterFacture(s, params));
        toast('Facture enregistrée');
      },
      modifierFacture: (id, patch) => run((s) => ops.modifierFacture(s, id, patch)),
      enregistrerCabinet(c) {
        run((s) => ops.enregistrerCabinet(s, c));
        toast('Réglages enregistrés');
      },
      reinitialiser() {
        setState(etatDemo());
        setRoute({ vue: 'accueil' });
        toast('Données de démonstration rechargées');
      },
    };
  }, []);

  const ctx = useMemo(() => ({ state, actions, go, toast, route }), [state, route]);
  const badges = {
    bilans: state.bilans.filter((b) => b.statut !== 'envoye').length,
    facturation: state.factures.filter((f) => f.statut === 'a-facturer').length,
  };

  return (
    <AppCtx.Provider value={ctx}>
      <div className="flex h-full flex-col md:flex-row">
        {/* Rail de navigation (écrans larges) */}
        <aside className="hidden w-[232px] flex-none flex-col bg-nav text-nav-ink md:flex">
          <div className="flex items-center gap-2.5 px-5 pb-5 pt-6">
            <Logo />
            <div className="leading-tight">
              <p className="font-display text-[19px] font-bold">Binocle</p>
              <p className="text-[11.5px] text-nav-ink-2">Cabinet d'orthoptie</p>
            </div>
          </div>
          <nav className="flex flex-1 flex-col gap-1 px-3" aria-label="Modules">
            {NAV.map((n) => {
              const actif = route.vue === n.vue;
              return (
                <button key={n.vue} type="button" aria-current={actif ? 'page' : undefined} onClick={() => go(n.vue)} className={cx('flex h-10 items-center gap-3 rounded-md px-3 text-left text-[13.5px] font-medium transition-colors', actif ? 'bg-nav-2 text-nav-ink' : 'text-nav-ink-2 hover:bg-nav-2 hover:text-nav-ink')}>
                  <n.icon size={17} aria-hidden="true" />
                  <span className="flex-1">{n.label}</span>
                  {badges[n.vue] > 0 && <span className="tnum rounded-full bg-accent-soft px-1.5 text-[11px] font-semibold leading-5 text-accent-strong">{badges[n.vue]}</span>}
                </button>
              );
            })}
          </nav>
          <div className="border-t border-nav-2 px-4 py-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 leading-tight">
                <p className="truncate text-[13px] font-medium">{state.cabinet.praticien}</p>
                <p className="truncate text-[11.5px] text-nav-ink-2">{state.cabinet.titre}</p>
              </div>
              <IconBtn icon={Settings} label="Réglages du cabinet" onClick={() => setReglages(true)} className="!text-nav-ink-2 hover:!bg-nav-2 hover:!text-nav-ink" />
            </div>
            <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-snug text-nav-ink-2">
              {stockage ? <HardDrive size={13} className="mt-px flex-none" aria-hidden="true" /> : <TriangleAlert size={13} className="mt-px flex-none" aria-hidden="true" />}
              {stockage ? 'Données fictives de démonstration, enregistrées dans ce navigateur.' : 'Stockage local indisponible : vos saisies seront perdues à la fermeture.'}
            </p>
          </div>
        </aside>

        {/* Bandeau (téléphone) */}
        <header className="gutter flex flex-none items-center justify-between bg-nav py-2.5 text-nav-ink md:hidden">
          <div className="flex items-center gap-2">
            <Logo size={24} />
            <span className="font-display text-[17px] font-bold">Binocle</span>
          </div>
          <IconBtn icon={Settings} label="Réglages du cabinet" onClick={() => setReglages(true)} className="!text-nav-ink-2 hover:!bg-nav-2 hover:!text-nav-ink" />
        </header>

        <main id="zone" className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <div className="gutter mx-auto w-full max-w-[1360px] py-5 lg:py-7">
            {route.vue === 'accueil' && <Dashboard />}
            {route.vue === 'patients' && <Patients patientId={route.patientId} />}
            {route.vue === 'bilans' && <Bilans bilanId={route.bilanId} />}
            {route.vue === 'facturation' && <Facturation />}
          </div>
        </main>

        {/* Onglets (téléphone) */}
        <nav className="gutter flex flex-none border-t border-line bg-surface md:hidden" aria-label="Modules">
          {NAV.map((n) => {
            const actif = route.vue === n.vue;
            return (
              <button key={n.vue} type="button" aria-current={actif ? 'page' : undefined} onClick={() => go(n.vue)} className={cx('relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium', actif ? 'text-accent' : 'text-ink-3')}>
                <n.icon size={19} aria-hidden="true" />
                {n.court}
                {badges[n.vue] > 0 && <span className="absolute right-[22%] top-1.5 h-2 w-2 rounded-full bg-warn" aria-hidden="true" />}
              </button>
            );
          })}
        </nav>
      </div>
      <Toasts items={toasts} />
      {reglages && <Reglages onClose={() => setReglages(false)} />}
    </AppCtx.Provider>
  );
}

window.ReactDOM.createRoot(document.getElementById('root')).render(<App />);
