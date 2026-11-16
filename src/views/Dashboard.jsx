// Module 1 : tableau de bord et agenda du jour.
import React, { useState } from 'react';
import { CalendarDays, CalendarPlus, Check, ChevronLeft, ChevronRight, ClipboardList, FilePlus2, UserPlus } from 'lucide-react';
import { Avatar, Btn, Card, CardHead, Empty, Field, IconBtn, Modal, Pill, Select, Tag, Text, cx, useApp } from '../ui.jsx';
import { MOTIFS, STATUTS_BILAN, STATUTS_RDV, TYPES_BILAN, seancesRestantes, statutDossier } from '../domain.js';
import { addDays, ageTexte, cap, dateCourte, dateJour, euro, nomComplet, todayISO } from '../lib.js';
import { ICONES_MOTIF, SuiviOrdonnance } from './commun.jsx';
import { PatientForm } from './Patients.jsx';

const TON_SELECT = { neutral: 'bg-surface text-ink-2', info: 'border-transparent bg-info-soft text-info', ok: 'border-transparent bg-ok-soft text-ok', danger: 'border-transparent bg-danger-soft text-danger' };

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

function RdvForm({ jour, onClose }) {
  const { state, actions } = useApp();
  const tries = [...state.patients].sort((a, b) => a.nom.localeCompare(b.nom));
  const [f, setF] = useState({ patientId: tries[0] ? tries[0].id : '', heure: '17:00', motif: 'bilan' });
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  return (
    <Modal
      size="sm"
      title="Ajouter un rendez-vous"
      subtitle={cap(dateJour(jour))}
      onClose={onClose}
      footer={
        <>
          <Btn onClick={onClose}>Annuler</Btn>
          <Btn variant="primary" disabled={!f.patientId || !f.heure} onClick={() => { actions.ajouterRdv({ ...f, date: jour }); onClose(); }}>
            Ajouter à l'agenda
          </Btn>
        </>
      }
    >
      <div className="grid gap-3">
        <Field label="Patient" htmlFor="rdv-patient">
          <Select id="rdv-patient" value={f.patientId} onChange={set('patientId')} placeholder={null} options={tries.map((p) => [p.id, `${p.nom.toUpperCase()} ${p.prenom}`])} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Heure" htmlFor="rdv-heure">
            <Text id="rdv-heure" type="time" value={f.heure} onChange={set('heure')} />
          </Field>
          <Field label="Motif" htmlFor="rdv-motif">
            <Select id="rdv-motif" value={f.motif} onChange={set('motif')} placeholder={null} options={Object.entries(MOTIFS).map(([k, m]) => [k, m.label])} />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

function LigneRdv({ rdv, patient }) {
  const { state, actions, go } = useApp();
  const dossier = statutDossier(state, patient);
  const o = patient.ordonnance;
  const seance = (rdv.motif === 'reeducation' || rdv.motif === 'basse-vision') && o && o.prescrites > 0;
  const st = STATUTS_RDV[rdv.statut] || STATUTS_RDV.attendu;
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2.5 px-4 py-3">
      <span className="tnum w-[46px] flex-none font-mono text-[14px] font-medium text-ink">{rdv.heure}</span>
      <button type="button" onClick={() => go('patients', { patientId: patient.id })} className="flex min-w-[180px] flex-1 items-center gap-3 rounded-md text-left" title="Ouvrir le dossier">
        <Avatar patient={patient} />
        <span className="min-w-0">
          <span className="block truncate text-[14px] font-medium text-ink">{nomComplet(patient)}</span>
          <span className="block truncate text-[12.5px] text-ink-3">
            {ageTexte(patient.ddn)}
            {seance ? ` · séance ${o.effectuees}/${o.prescrites}` : ''}
          </span>
        </span>
      </button>
      <div className="flex min-w-0 flex-wrap items-center gap-2 xl:w-[340px] xl:flex-nowrap">
        <span className="flex-none xl:w-[150px]"><Tag icon={ICONES_MOTIF[rdv.motif]}>{MOTIFS[rdv.motif].label}</Tag></span>
        <Pill tone={dossier.tone}>{dossier.label}</Pill>
      </div>
      <select aria-label={`Statut du rendez-vous de ${patient.prenom}`} id={`rdv-statut-${rdv.id}`} value={rdv.statut} onChange={(e) => actions.statutRdv(rdv.id, e.target.value)} className={cx('inp !min-h-0 h-8 w-[156px] flex-none py-0 text-[12.5px] font-medium', TON_SELECT[st.tone])}>
        {Object.entries(STATUTS_RDV).map(([k, v]) => (
          <option key={k} value={k}>{v.label}</option>
        ))}
      </select>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2 xl:w-[292px] xl:flex-nowrap">
        {seance && rdv.statut !== 'vu' && (
          <Btn size="sm" icon={Check} onClick={() => actions.validerSeance(patient.id, rdv.id)}>
            Valider la séance
          </Btn>
        )}
        <Btn size="sm" variant="soft" icon={FilePlus2} onClick={() => actions.nouveauBilan(patient.id, MOTIFS[rdv.motif].typeBilan)}>
          Nouveau bilan
        </Btn>
      </div>
    </li>
  );
}

export default function Dashboard() {
  const { state, go } = useApp();
  const T = todayISO();
  const [jour, setJour] = useState(T);
  const [modal, setModal] = useState(null);
  const patient = (id) => state.patients.find((p) => p.id === id);

  const duJour = state.rdvs.filter((r) => r.date === T);
  const vus = duJour.filter((r) => r.statut === 'vu').length;
  const aRediger = state.bilans.filter((b) => b.statut === 'brouillon');
  const aEnvoyer = state.bilans.filter((b) => b.statut === 'a-envoyer');
  const suivis = state.patients.filter((p) => seancesRestantes(p) != null).sort((a, b) => seancesRestantes(a) - seancesRestantes(b));
  const restantes = suivis.reduce((n, p) => n + seancesRestantes(p), 0);
  const bientot = suivis.filter((p) => seancesRestantes(p) <= 2).length;
  const impayees = state.factures.filter((f) => f.statut !== 'payee');
  const aEncaisser = impayees.reduce((n, f) => n + f.montant, 0);

  const rdvs = state.rdvs.filter((r) => r.date === jour && patient(r.patientId)).sort((a, b) => a.heure.localeCompare(b.heure));
  const enAttente = [...aRediger, ...aEnvoyer];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">Tableau de bord</p>
          <h1 className="mt-1 text-[25px] font-bold leading-tight text-ink">{cap(dateJour(T))}</h1>
          <p className="mt-1 text-[13.5px] text-ink-2">
            {duJour.length} rendez-vous aujourd'hui, {vus} patient{vus > 1 ? 's' : ''} déjà vu{vus > 1 ? 's' : ''}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn icon={UserPlus} onClick={() => setModal('patient')}>Nouveau patient</Btn>
          <Btn variant="primary" icon={CalendarPlus} onClick={() => setModal('rdv')}>Ajouter un rendez-vous</Btn>
        </div>
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

      <div className="flex flex-col gap-5">
        <Card className="min-w-0">
          <CardHead
            icon={CalendarDays}
            title={jour === T ? 'Agenda du jour' : 'Agenda'}
            hint={jour === T ? `${rdvs.length} rendez-vous` : cap(dateJour(jour))}
            right={
              <div className="flex items-center gap-1">
                {jour !== T && <Btn size="sm" variant="ghost" onClick={() => setJour(T)}>Aujourd'hui</Btn>}
                <IconBtn icon={ChevronLeft} label="Jour précédent" onClick={() => setJour(addDays(jour, -1))} />
                <IconBtn icon={ChevronRight} label="Jour suivant" onClick={() => setJour(addDays(jour, 1))} />
              </div>
            }
          />
          {rdvs.length ? (
            <ul className="divide-y divide-line">
              {rdvs.map((r) => (
                <LigneRdv key={r.id} rdv={r} patient={patient(r.patientId)} />
              ))}
            </ul>
          ) : (
            <Empty icon={CalendarDays} title="Aucun rendez-vous ce jour-là">
              <Btn size="sm" variant="primary" icon={CalendarPlus} className="mt-2" onClick={() => setModal('rdv')}>Ajouter un rendez-vous</Btn>
            </Empty>
          )}
        </Card>

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
          </Card>
        </div>
      </div>

      {modal === 'rdv' && <RdvForm jour={jour} onClose={() => setModal(null)} />}
      {modal === 'patient' && <PatientForm onClose={() => setModal(null)} onSaved={(id) => go('patients', { patientId: id })} />}
    </div>
  );
}
