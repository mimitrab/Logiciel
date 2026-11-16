// Tableau de bord : indicateurs du jour, planning de la journée, bilans à traiter, ordonnances.
import React, { useState } from 'react';
import { ClipboardList, UserPlus } from 'lucide-react';
import { Btn, Card, CardHead, Pill, cx, useApp } from '../ui.jsx';
import { STATUTS_BILAN, TYPES_BILAN, seancesRestantes } from '../domain.js';
import { cap, dateCourte, dateJour, dureeTexte, euro, nomComplet, todayISO } from '../lib.js';
import { SuiviOrdonnance } from './commun.jsx';
import { Calendrier } from './Agenda.jsx';
import { PatientForm } from './Patients.jsx';

function Indicateur({ label, valeur, detail, onClick, children }) {
  const C = onClick ? 'button' : 'div';
  return (
    <C type={onClick ? 'button' : undefined} onClick={onClick} className={cx('card flex min-w-0 flex-col gap-1 px-4 py-3.5 text-left', onClick && 'transition-colors hover:border-line-strong')}>
      <span className="eyebrow">{label}</span>
      <span className="tnum font-display text-[28px] font-bold leading-none text-ink">{valeur}</span>
      {children}
      <span className="text-[12.5px] leading-snug text-ink-3">{detail}</span>
    </C>
  );
}

export default function Dashboard() {
  const { state, go, praticien } = useApp();
  const T = todayISO();
  const [creation, setCreation] = useState(false);
  const patient = (id) => state.patients.find((p) => p.id === id);

  const duJour = state.rdvs.filter((r) => r.date === T && patient(r.patientId));
  const vus = duJour.filter((r) => r.statut === 'vu').length;
  const minutes = duJour.reduce((n, r) => n + (r.duree || 0), 0);
  const aRediger = state.bilans.filter((b) => b.statut === 'brouillon');
  const aEnvoyer = state.bilans.filter((b) => b.statut === 'a-envoyer');
  const suivis = state.patients.filter((p) => seancesRestantes(p) != null).sort((a, b) => seancesRestantes(a) - seancesRestantes(b));
  const restantes = suivis.reduce((n, p) => n + seancesRestantes(p), 0);
  const bientot = suivis.filter((p) => seancesRestantes(p) <= 2).length;
  const impayees = state.factures.filter((f) => f.statut !== 'payee');
  const aEncaisser = impayees.reduce((n, f) => n + f.montant, 0);
  const enAttente = [...aRediger, ...aEnvoyer];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">Tableau de bord{praticien ? ` · ${praticien.prenom} ${praticien.nom}` : ''}</p>
          <h1 className="mt-1 text-[25px] font-bold leading-tight text-ink">{cap(dateJour(T))}</h1>
          <p className="mt-1 text-[13.5px] text-ink-2">
            {duJour.length} rendez-vous aujourd'hui ({dureeTexte(minutes)} de consultation), {vus} patient{vus > 1 ? 's' : ''} déjà vu{vus > 1 ? 's' : ''}.
          </p>
        </div>
        <Btn icon={UserPlus} onClick={() => setCreation(true)}>Nouveau patient</Btn>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicateur label="Patients vus" valeur={`${vus}/${duJour.length}`} detail={duJour.length - vus > 0 ? `${duJour.length - vus} encore attendu${duJour.length - vus > 1 ? 's' : ''} aujourd'hui` : 'Journée terminée'}>
          <div className="my-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-accent" style={{ width: `${duJour.length ? (vus / duJour.length) * 100 : 0}%` }} />
          </div>
        </Indicateur>
        <Indicateur label="Bilans en attente" valeur={enAttente.length} detail={`${aRediger.length} à rédiger · ${aEnvoyer.length} à envoyer`} onClick={() => go('bilans')} />
        <Indicateur label="Séances restantes" valeur={restantes} detail={`sur ${suivis.length} ordonnance${suivis.length > 1 ? 's' : ''} · ${bientot} bientôt terminée${bientot > 1 ? 's' : ''}`} />
        <Indicateur label="À encaisser" valeur={euro(aEncaisser)} detail={`${impayees.length} facture${impayees.length > 1 ? 's' : ''} non réglée${impayees.length > 1 ? 's' : ''}`} onClick={() => go('facturation')} />
      </div>

      <Calendrier vueInitiale="jour" />

      <div className="grid min-w-0 items-start gap-5 lg:grid-cols-2">
        <Card>
          <CardHead icon={ClipboardList} title="Bilans à traiter" hint={enAttente.length ? `${enAttente.length}` : undefined} />
          {enAttente.length ? (
            <ul className="divide-y divide-line">
              {enAttente.map((b) => {
                const p = patient(b.patientId);
                if (!p) return null;
                return (
                  <li key={b.id}>
                    <button type="button" onClick={() => go('bilans', { bilanId: b.id })} className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-2">
                      <span className="min-w-0">
                        <span className="block truncate text-[13.5px] font-medium text-ink">{nomComplet(p)}</span>
                        <span className="block truncate text-[12px] text-ink-3">{TYPES_BILAN[b.type].label} du {dateCourte(b.date)}</span>
                      </span>
                      <Pill tone={STATUTS_BILAN[b.statut].tone}>{STATUTS_BILAN[b.statut].label}</Pill>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-4 py-5 text-[13px] text-ink-3">Tous les comptes-rendus sont rédigés et envoyés.</p>
          )}
        </Card>
        <Card>
          <CardHead title="Ordonnances en cours" hint="séances effectuées / prescrites" />
          {suivis.length ? (
            <ul className="divide-y divide-line">
              {suivis.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => go('patients', { patientId: p.id })} className="block w-full px-4 py-2.5 text-left transition-colors hover:bg-surface-2">
                    <span className="mb-1 block truncate text-[13px] font-medium text-ink">{nomComplet(p)}</span>
                    <SuiviOrdonnance patient={p} compact />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-5 text-[13px] text-ink-3">Aucune ordonnance de rééducation en cours.</p>
          )}
        </Card>
      </div>
      {creation && <PatientForm onClose={() => setCreation(false)} onSaved={(id) => go('patients', { patientId: id })} />}
    </div>
  );
}
