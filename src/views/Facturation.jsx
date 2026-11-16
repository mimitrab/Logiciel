// Facturation et cotation NGAP : lettre-clé AMY, barème du cabinet, répartition des parts.
import React, { useEffect, useMemo, useState } from 'react';
import { Check, Plus, Receipt, Sparkles } from 'lucide-react';
import { Btn, Card, CardHead, Empty, Field, Modal, Num, Segmented, Select, Text, cx, useApp } from '../ui.jsx';
import { EXONERATIONS, FAMILLES_ACTES, MODES, STATUTS_FACTURE, ZONES, acteDe, calculFacture, cotation, suggererActe, valeurAMY } from '../domain.js';
import { dateCourte, euro, moisDe, nomComplet, num, todayISO } from '../lib.js';

const TON_SELECT = { warn: 'border-transparent bg-warn-soft text-warn', info: 'border-transparent bg-info-soft text-info', ok: 'border-transparent bg-ok-soft text-ok' };

function Total({ label, valeur, detail }) {
  return (
    <div className="card flex min-w-0 flex-col gap-1 px-4 py-3.5">
      <span className="eyebrow">{label}</span>
      <span className="tnum font-display text-[24px] font-bold leading-none text-ink">{valeur}</span>
      <span className="text-[12.5px] text-ink-3">{detail}</span>
    </div>
  );
}

/** Répartition du montant entre Sécurité sociale, mutuelle et patient. */
function Repartition({ c, mutuelle, exoneration }) {
  const parts = [
    ['Sécurité sociale', c.partAMO, 'bg-accent', `${Math.round(c.taux * 100)} %`],
    ['Mutuelle', c.partAMC, 'bg-info', exoneration === 'css' ? 'CSS' : mutuelle || 'aucune'],
    ['Reste à charge du patient', c.partPatient, 'bg-warn', ''],
  ];
  return (
    <div className="rounded-lg border border-line bg-surface-2 p-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[12.5px] font-medium text-ink-2">Montant total</span>
        <span className="tnum font-display text-[24px] font-bold leading-none text-ink">{euro(c.montant)}</span>
      </div>
      <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-line" aria-hidden="true">
        {parts.map(([l, v, cl]) => (v > 0 ? <div key={l} className={cl} style={{ width: `${(v / (c.montant || 1)) * 100}%` }} /> : null))}
      </div>
      <dl className="mt-3 grid gap-1.5">
        {parts.map(([l, v, cl, note]) => (
          <div key={l} className="flex items-center justify-between gap-3 text-[13px]">
            <dt className="flex min-w-0 items-center gap-2 text-ink-2">
              <span className={cx('h-2 w-2 flex-none rounded-sm', cl)} aria-hidden="true" />
              <span className="truncate">
                {l}
                {note && <span className="text-ink-3"> · {note}</span>}
              </span>
            </dt>
            <dd className="tnum flex-none font-mono text-ink">{euro(v)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function FactureForm({ onClose }) {
  const { state, actions } = useApp();
  const T = todayISO();
  const valeur = valeurAMY(state.cabinet);
  const tries = [...state.patients].sort((a, b) => a.nom.localeCompare(b.nom));
  const [patientId, setPatientId] = useState(tries[0] ? tries[0].id : '');
  const patient = state.patients.find((p) => p.id === patientId);

  // Sélection automatique : séance si le rendez-vous du jour est une rééducation, sinon dernier examen non facturé.
  const propose = useMemo(() => {
    if (!patient) return { code: '15.2', raison: '' };
    const rdv = state.rdvs.find((r) => r.date === T && r.patientId === patientId);
    const seanceDuJour = rdv && rdv.motif.startsWith('reeduc');
    const bilan = seanceDuJour ? null : state.bilans.filter((b) => b.patientId === patientId && !state.factures.some((f) => f.bilanId === b.id)).sort((a, b) => b.date.localeCompare(a.date))[0];
    const anterieurs = bilan ? state.bilans.filter((b) => b.patientId === patientId && b.id !== bilan.id && b.date < bilan.date && b.type === bilan.type).length : 0;
    return { ...suggererActe({ patient, bilan, rdv, anterieurs }), bilanId: bilan ? bilan.id : null };
  }, [patientId]);

  const [code, setCode] = useState(propose.code);
  const [coef, setCoef] = useState(acteDe(state.bareme, propose.code).coef);
  const [qte, setQte] = useState(1);
  const [exoneration, setExoneration] = useState(patient ? patient.exoneration : 'aucune');
  const [date, setDate] = useState(T);
  const [statut, setStatut] = useState('a-facturer');
  const [mode, setMode] = useState('');
  useEffect(() => {
    setCode(propose.code);
    setCoef(acteDe(state.bareme, propose.code).coef);
    setExoneration(patient ? patient.exoneration || 'aucune' : 'aucune');
  }, [patientId]);

  const calcul = calculFacture({ coef, qte, valeur, exoneration, mutuelle: patient && patient.mutuelle });
  const auto = code === propose.code;
  const choisir = (c) => {
    setCode(c);
    setCoef(acteDe(state.bareme, c).coef);
  };

  return (
    <Modal
      size="lg"
      title="Nouvelle facture"
      subtitle="L'acte est proposé d'après le dossier du patient. Tout reste modifiable."
      onClose={onClose}
      footer={
        <>
          <Btn onClick={onClose}>Annuler</Btn>
          <Btn variant="primary" icon={Check} disabled={!patient || !(num(coef) > 0)} onClick={() => { actions.ajouterFacture({ patientId, acteCode: code, coef: num(coef), qte: num(qte) || 1, date, statut, mode, exoneration, bilanId: auto ? propose.bilanId : null }); onClose(); }}>
            Enregistrer la facture
          </Btn>
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="grid content-start gap-3 sm:grid-cols-2">
          <Field label="Patient" htmlFor="ff-patient" className="sm:col-span-2">
            <Select id="ff-patient" value={patientId} onChange={setPatientId} placeholder={null} options={tries.map((p) => [p.id, `${p.nom.toUpperCase()} ${p.prenom}`])} />
          </Field>
          <Field label="Acte NGAP" htmlFor="ff-acte" className="sm:col-span-2">
            <select id="ff-acte" className="inp" value={code} onChange={(e) => choisir(e.target.value)}>
              {FAMILLES_ACTES.map(([f, l]) => (
                <optgroup key={f} label={l}>
                  {state.bareme.filter((a) => a.famille === f).map((a) => (
                    <option key={a.code} value={a.code}>{cotation(a.coef)} · {a.libelle}{a.aPreciser ? ' (libellé à préciser)' : ''}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <p className="mt-1.5 flex items-start gap-1.5 text-[12px] leading-snug text-ink-3">
              <Sparkles size={13} className={cx('mt-px flex-none', auto ? 'text-accent' : 'text-ink-3')} aria-hidden="true" />
              {auto ? `Sélection automatique : ${propose.raison}.` : (
                <span>
                  Acte choisi à la main.{' '}
                  <button type="button" className="font-medium text-accent hover:underline" onClick={() => choisir(propose.code)}>Revenir à l'acte proposé</button>
                </span>
              )}
            </p>
          </Field>
          <Field label="Coefficient AMY" htmlFor="ff-coef"><Num id="ff-coef" step={0.1} min={0} value={coef} onChange={setCoef} /></Field>
          <Field label="Quantité" htmlFor="ff-qte"><Num id="ff-qte" min={1} value={qte} onChange={setQte} /></Field>
          <Field label="Prise en charge" htmlFor="ff-exo"><Select id="ff-exo" value={exoneration} onChange={setExoneration} placeholder={null} options={Object.entries(EXONERATIONS).map(([k, v]) => [k, v.label])} /></Field>
          <Field label="Date de l'acte" htmlFor="ff-date"><Text id="ff-date" type="date" value={date} onChange={(v) => v && setDate(v)} /></Field>
          <Field label="Statut du paiement" htmlFor="ff-statut"><Select id="ff-statut" value={statut} onChange={setStatut} placeholder={null} options={Object.entries(STATUTS_FACTURE).map(([k, v]) => [k, v.label])} /></Field>
          <Field label="Mode de règlement" htmlFor="ff-mode"><Select id="ff-mode" value={mode} onChange={setMode} placeholder="Non précisé" options={MODES} /></Field>
        </div>
        <div className="flex flex-col gap-3">
          <p className="tnum font-mono text-[13px] text-ink-2">
            {cotation(num(coef) || 0)}
            {(num(qte) || 1) > 1 ? ` × ${num(qte)}` : ''} × {euro(valeur)}
          </p>
          <Repartition c={calcul} mutuelle={patient && patient.mutuelle} exoneration={exoneration} />
        </div>
      </div>
    </Modal>
  );
}

export default function Facturation() {
  const { state, actions } = useApp();
  const [filtre, setFiltre] = useState('toutes');
  const [creation, setCreation] = useState(false);
  const valeur = valeurAMY(state.cabinet);
  const zone = ZONES[state.cabinet.zone] || ZONES.metropole;
  const mois = moisDe(todayISO());
  const somme = (l) => l.reduce((n, f) => n + f.montant, 0);
  const duMois = state.factures.filter((f) => moisDe(f.date) === mois);
  const parStatut = (s) => state.factures.filter((f) => f.statut === s);
  const lignes = state.factures.filter((f) => filtre === 'toutes' || f.statut === filtre).sort((a, b) => b.date.localeCompare(a.date) || b.numero.localeCompare(a.numero));
  const patient = (id) => state.patients.find((p) => p.id === id);
  const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Cotation NGAP</p>
          <h1 className="mt-1 text-[25px] font-bold leading-tight text-ink">Facturation</h1>
          <p className="mt-1 text-[13.5px] text-ink-2">Lettre-clé AMY à {euro(valeur)} ({zone.label.toLowerCase()}). Le montant d'un acte est son coefficient multiplié par la lettre-clé.</p>
        </div>
        <Btn variant="primary" icon={Plus} onClick={() => setCreation(true)}>Nouvelle facture</Btn>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Total label="Facturé ce mois-ci" valeur={euro(somme(duMois))} detail={pluriel(duMois.length, 'acte')} />
        <Total label="Encaissé ce mois-ci" valeur={euro(somme(duMois.filter((f) => f.statut === 'payee')))} detail="factures réglées" />
        <Total label="En attente de règlement" valeur={euro(somme(parStatut('en-attente')))} detail={`${pluriel(parStatut('en-attente').length, 'facture')} transmise${parStatut('en-attente').length > 1 ? 's' : ''}`} />
        <Total label="À facturer" valeur={euro(somme(parStatut('a-facturer')))} detail={`${pluriel(parStatut('a-facturer').length, 'acte')} à finaliser`} />
      </div>

      <Segmented id="factures-filtre" label="Filtrer les factures" allowEmpty={false} value={filtre} onChange={setFiltre} options={[['toutes', `Toutes (${state.factures.length})`], ...Object.entries(STATUTS_FACTURE).map(([k, v]) => [k, `${v.label} (${parStatut(k).length})`])]} />

      <Card className="overflow-hidden">
        {lignes.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[940px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-[11.5px] font-semibold uppercase tracking-wider text-ink-3">
                  <th className="px-4 py-2.5 font-semibold">Date</th>
                  <th className="px-2 py-2.5 font-semibold">Patient</th>
                  <th className="px-2 py-2.5 font-semibold">Acte</th>
                  <th className="px-2 py-2.5 text-right font-semibold">Montant</th>
                  <th className="px-2 py-2.5 text-right font-semibold">Sécu</th>
                  <th className="px-2 py-2.5 text-right font-semibold">Mutuelle</th>
                  <th className="px-2 py-2.5 text-right font-semibold">Patient</th>
                  <th className="px-2 py-2.5 font-semibold">Paiement</th>
                  <th className="px-4 py-2.5 font-semibold">Règlement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {lignes.map((f) => {
                  const p = patient(f.patientId);
                  const st = STATUTS_FACTURE[f.statut];
                  return (
                    <tr key={f.id} className="align-middle">
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <span className="tnum block font-mono text-[12.5px] text-ink">{dateCourte(f.date)}</span>
                        <span className="tnum block font-mono text-[11px] text-ink-3">{f.numero}</span>
                      </td>
                      <td className="whitespace-nowrap px-2 py-2.5 font-medium text-ink">{p ? nomComplet(p) : 'Patient supprimé'}</td>
                      <td className="max-w-[250px] px-2 py-2.5">
                        <span className="tnum block font-mono text-[12.5px] font-medium text-ink">{cotation(f.coef)}{f.qte > 1 ? ` × ${f.qte}` : ''}</span>
                        <span className="block truncate text-[12px] text-ink-3" title={f.libelle}>{f.libelle}</span>
                      </td>
                      <td className="tnum whitespace-nowrap px-2 py-2.5 text-right font-mono font-medium text-ink">{euro(f.montant)}</td>
                      <td className="tnum whitespace-nowrap px-2 py-2.5 text-right font-mono text-ink-2">{euro(f.partAMO)}</td>
                      <td className="tnum whitespace-nowrap px-2 py-2.5 text-right font-mono text-ink-2">{euro(f.partAMC)}</td>
                      <td className="tnum whitespace-nowrap px-2 py-2.5 text-right font-mono text-ink-2">{euro(f.partPatient)}</td>
                      <td className="px-2 py-2.5">
                        <select id={`f-statut-${f.id}`} aria-label={`Statut du paiement, facture ${f.numero}`} value={f.statut} onChange={(e) => actions.modifierFacture(f.id, { statut: e.target.value, mode: e.target.value === 'payee' && !f.mode ? (f.partPatient > 0 ? 'cb' : 'tiers-payant') : f.mode })} className={cx('inp !min-h-0 h-8 w-[128px] py-0 text-[12.5px] font-medium', TON_SELECT[st.tone])}>
                          {Object.entries(STATUTS_FACTURE).map(([k, v]) => (
                            <option key={k} value={k}>{v.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2.5">
                        <Select id={`f-mode-${f.id}`} aria-label={`Mode de règlement, facture ${f.numero}`} className="!min-h-0 h-8 w-[134px] py-0 text-[12.5px]" value={f.mode} onChange={(v) => actions.modifierFacture(f.id, { mode: v })} options={MODES} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-line-strong bg-surface-2 font-medium">
                  <td className="px-4 py-2.5 text-ink-2" colSpan={3}>Total des {lignes.length} lignes affichées</td>
                  <td className="tnum px-2 py-2.5 text-right font-mono text-ink">{euro(somme(lignes))}</td>
                  <td className="tnum px-2 py-2.5 text-right font-mono text-ink-2">{euro(lignes.reduce((n, f) => n + f.partAMO, 0))}</td>
                  <td className="tnum px-2 py-2.5 text-right font-mono text-ink-2">{euro(lignes.reduce((n, f) => n + f.partAMC, 0))}</td>
                  <td className="tnum px-2 py-2.5 text-right font-mono text-ink-2">{euro(lignes.reduce((n, f) => n + f.partPatient, 0))}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <Empty icon={Receipt} title="Aucune facture dans cette liste">Changez de filtre ou enregistrez une nouvelle facture.</Empty>
        )}
      </Card>

      <Bareme bareme={state.bareme} valeur={valeur} zone={zone} />
      {creation && <FactureForm onClose={() => setCreation(false)} />}
    </div>
  );
}

/** Barème du cabinet : cotations et tarifs à la valeur courante de la lettre-clé. */
export function Bareme({ bareme, valeur, zone }) {
  return (
    <Card>
      <CardHead title="Barème NGAP du cabinet" hint={`AMY à ${euro(valeur)}, ${zone.label.toLowerCase()}`} />
      <div className="grid gap-x-8 gap-y-4 px-4 py-3.5 lg:grid-cols-2">
        {FAMILLES_ACTES.map(([f, titre]) => (
          <div key={f} className="min-w-0">
            <p className="eyebrow mb-1.5">{titre}</p>
            <ul className="grid gap-1.5">
              {bareme.filter((a) => a.famille === f).map((a) => (
                <li key={a.code} className="flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="min-w-0 text-ink-2">
                    <span className="tnum mr-2 inline-block w-[74px] font-mono text-[12.5px] font-medium text-ink">{cotation(a.coef)}</span>
                    {a.aPreciser ? <span className="text-ink-3">Libellé à préciser</span> : a.libelle}
                  </span>
                  <span className="tnum flex-none font-mono text-[12.5px] text-ink">{euro(a.coef * valeur)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="border-t border-line px-4 py-2.5 text-[12px] leading-snug text-ink-3">
        Prise en charge standard : 60 % par la Sécurité sociale, le reste par la mutuelle si le patient en a une. Les libellés et la zone tarifaire se règlent dans les réglages du cabinet (super-administrateur).
      </p>
    </Card>
  );
}
