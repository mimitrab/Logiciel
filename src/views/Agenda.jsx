// Agenda : calendrier jour et semaine, création, modification et suppression des rendez-vous.
// La durée est attribuée automatiquement d'après le motif et reste modulable.
import React, { useMemo, useState } from 'react';
import { CalendarDays, CalendarPlus, Check, ChevronLeft, ChevronRight, Clock, FilePlus2, FolderOpen, Trash2, TriangleAlert } from 'lucide-react';
import { Btn, Card, ConfirmBtn, Field, IconBtn, Modal, Num, Segmented, Select, Text, cx, useApp } from '../ui.jsx';
import { FAMILLES, MOTIFS, STATUTS_RDV, motifSelonAge, statutDossier } from '../domain.js';
import { addDays, ageTexte, cap, dateJour, dateLongue, dureeTexte, enHeure, enMinutes, jourCourt, lundiDe, nomComplet, parseISO, todayISO } from '../lib.js';

const POINT_FAMILLE = { bilan: 'bg-accent', reeducation: 'bg-info', exploration: 'bg-plum' };
const CLASSE_FAMILLE = { bilan: 'rdv-bilan', reeducation: 'rdv-reeducation', exploration: 'rdv-exploration' };
const parHeure = (a, b) => a.heure.localeCompare(b.heure);

/* ---------- Formulaire de rendez-vous (création et modification) ---------- */
export function RdvForm({ rdv, defaut = {}, onClose }) {
  const { state, actions, go } = useApp();
  const tries = [...state.patients].sort((a, b) => a.nom.localeCompare(b.nom));
  const trouver = (id) => state.patients.find((p) => p.id === id);
  const [f, setF] = useState(() => {
    if (rdv) return { ...rdv };
    const patientId = defaut.patientId || (tries[0] ? tries[0].id : '');
    const motif = motifSelonAge(defaut.motif || 'bilan', trouver(patientId));
    return { patientId, date: defaut.date || todayISO(), heure: defaut.heure || '09:00', motif, duree: MOTIFS[motif].duree, statut: 'attendu', note: '' };
  });
  const [auto, setAuto] = useState(!rdv);
  const patient = trouver(f.patientId);
  const m = MOTIFS[f.motif] || MOTIFS.bilan;
  const duree = Math.max(5, parseInt(f.duree, 10) || 0);
  const debut = enMinutes(f.heure);
  const conflit = state.rdvs.find((r) => r.id !== f.id && r.date === f.date && enMinutes(r.heure) < debut + duree && enMinutes(r.heure) + r.duree > debut);
  const o = patient && patient.ordonnance;
  const seance = !!rdv && m.seance && o && o.prescrites > 0 && rdv.statut !== 'vu';

  const choisirMotif = (motif) => {
    setF((x) => ({ ...x, motif, duree: MOTIFS[motif].duree }));
    setAuto(true);
  };
  const choisirPatient = (patientId) =>
    setF((x) => {
      const motif = motifSelonAge(x.motif, trouver(patientId));
      return { ...x, patientId, motif, duree: motif !== x.motif ? MOTIFS[motif].duree : x.duree };
    });
  const fixerDuree = (v) => {
    setF((x) => ({ ...x, duree: v }));
    setAuto(Number(v) === m.duree);
  };

  return (
    <Modal
      title={rdv ? 'Rendez-vous' : 'Nouveau rendez-vous'}
      subtitle={f.date ? `${cap(dateJour(f.date))}, de ${f.heure} à ${enHeure(debut + duree)}` : undefined}
      onClose={onClose}
      footer={
        <>
          {rdv && (
            <span className="mr-auto">
              <ConfirmBtn label="Supprimer" confirmLabel="Supprimer ce rendez-vous" icon={Trash2} size="md" onConfirm={() => { actions.supprimerRdv(rdv.id); onClose(); }} />
            </span>
          )}
          <Btn onClick={onClose}>Annuler</Btn>
          <Btn variant="primary" icon={Check} disabled={!f.patientId || !f.date || !f.heure} onClick={() => { actions.enregistrerRdv({ ...f, duree }); onClose(); }}>
            {rdv ? 'Enregistrer' : "Ajouter à l'agenda"}
          </Btn>
        </>
      }
    >
      {rdv && patient && (
        <div className="mb-4 flex flex-wrap gap-2 border-b border-line pb-4">
          <Btn size="sm" icon={FolderOpen} onClick={() => { onClose(); go('patients', { patientId: patient.id }); }}>Ouvrir le dossier</Btn>
          <Btn size="sm" variant="soft" icon={FilePlus2} onClick={() => { onClose(); actions.nouveauBilan(patient.id, m.typeBilan, m.technique); }}>Nouveau bilan</Btn>
          {seance && <Btn size="sm" icon={Check} onClick={() => { actions.validerSeance(patient.id, rdv.id); onClose(); }}>Valider la séance {o.effectuees + 1}/{o.prescrites}</Btn>}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Patient" htmlFor="rdv-patient" className="sm:col-span-2" hint={patient ? ageTexte(patient.ddn) : undefined}>
          <Select id="rdv-patient" value={f.patientId} onChange={choisirPatient} placeholder={null} options={tries.map((p) => [p.id, `${p.nom.toUpperCase()} ${p.prenom}`])} />
        </Field>
        <Field label="Date" htmlFor="rdv-date">
          <Text id="rdv-date" type="date" value={f.date} onChange={(v) => v && setF((x) => ({ ...x, date: v }))} />
        </Field>
        <Field label="Heure de début" htmlFor="rdv-heure">
          <Text id="rdv-heure" type="time" step={300} value={f.heure} onChange={(v) => v && setF((x) => ({ ...x, heure: v }))} />
        </Field>
        <Field label="Motif" htmlFor="rdv-motif" className="sm:col-span-2">
          <select id="rdv-motif" className="inp" value={f.motif} onChange={(e) => choisirMotif(e.target.value)}>
            {Object.entries(FAMILLES).map(([k, fam]) => (
              <optgroup key={k} label={fam.label}>
                {Object.entries(MOTIFS).filter(([, x]) => x.famille === k).map(([id, x]) => (
                  <option key={id} value={id}>{x.label} · {dureeTexte(x.duree)}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <span className="lbl">Durée</span>
          <div className="flex flex-wrap items-center gap-2">
            {m.options.map((n) => (
              <button key={n} type="button" onClick={() => fixerDuree(n)} className={cx('tnum h-[34px] rounded-md border px-3 text-[13px] font-medium transition-colors', duree === n ? 'border-accent bg-accent text-on-accent' : 'border-line-strong bg-surface text-ink-2 hover:border-ink-3')}>
                {dureeTexte(n)}
              </button>
            ))}
            <Num id="rdv-duree" aria-label="Durée en minutes" className="w-[112px]" min={5} step={5} unit="min" value={f.duree} onChange={fixerDuree} />
            <span className="text-[12.5px] text-ink-2">fin à <span className="tnum font-mono font-medium text-ink">{enHeure(debut + duree)}</span></span>
          </div>
          <p className="mt-1.5 flex items-start gap-1.5 text-[12px] leading-snug text-ink-3">
            <Clock size={13} className="mt-px flex-none" aria-hidden="true" />
            {auto ? `Durée attribuée automatiquement d'après le motif. Repère : ${m.plage}.` : `Durée ajustée à la main. Repère pour ce motif : ${m.plage}.`}
          </p>
        </div>
        {rdv && (
          <Field label="Statut" htmlFor="rdv-statut">
            <Select id="rdv-statut" value={f.statut} onChange={(v) => setF((x) => ({ ...x, statut: v }))} placeholder={null} options={Object.entries(STATUTS_RDV).map(([k, v]) => [k, v.label])} />
          </Field>
        )}
        <Field label="Note" htmlFor="rdv-note" className={rdv ? '' : 'sm:col-span-2'}>
          <Text id="rdv-note" value={f.note} onChange={(v) => setF((x) => ({ ...x, note: v }))} placeholder="Facultatif" />
        </Field>
      </div>
      {conflit && (
        <p className="mt-3 flex items-start gap-2 rounded-md bg-warn-soft px-3 py-2 text-[12.5px] text-warn">
          <TriangleAlert size={14} className="mt-0.5 flex-none" aria-hidden="true" />
          <span className="text-ink">Ce créneau chevauche le rendez-vous de {conflit.heure} ({trouver(conflit.patientId) ? nomComplet(trouver(conflit.patientId)) : 'autre patient'}, {dureeTexte(conflit.duree)}).</span>
        </p>
      )}
    </Modal>
  );
}

/* ---------- Placement des rendez-vous qui se chevauchent ---------- */
function placer(rdvs) {
  const evts = rdvs.map((r) => ({ rdv: r, s: enMinutes(r.heure), e: enMinutes(r.heure) + Math.max(r.duree || 20, 10) })).sort((a, b) => a.s - b.s || a.e - b.e);
  const out = [];
  let groupe = [];
  let fin = -1;
  const vider = () => {
    const cols = [];
    groupe.forEach((ev) => {
      let c = cols.findIndex((f) => f <= ev.s);
      if (c < 0) {
        c = cols.length;
        cols.push(ev.e);
      } else cols[c] = ev.e;
      ev.col = c;
    });
    groupe.forEach((ev) => out.push({ ...ev, cols: cols.length }));
    groupe = [];
    fin = -1;
  };
  evts.forEach((ev) => {
    if (groupe.length && ev.s >= fin) vider();
    groupe.push(ev);
    fin = Math.max(fin, ev.e);
  });
  if (groupe.length) vider();
  return out;
}

function Bloc({ rdv, patient, large, style, onOpen }) {
  const { state, actions } = useApp();
  const m = MOTIFS[rdv.motif] || MOTIFS.bilan;
  const fin = enHeure(enMinutes(rdv.heure) + rdv.duree);
  const o = patient.ordonnance;
  const seance = m.seance && o && o.prescrites > 0;
  const nom = large ? nomComplet(patient) : `${patient.prenom} ${patient.nom.charAt(0).toUpperCase()}.`;
  return (
    <div className={cx('rdv', CLASSE_FAMILLE[m.famille], rdv.statut === 'vu' && 'rdv-vu', rdv.statut === 'absent' && 'rdv-absent')} style={style} onClick={(e) => e.stopPropagation()}>
      <button type="button" className="rdv-main" onClick={onOpen} title={`${rdv.heure} à ${fin} · ${nomComplet(patient)} · ${m.label} · ${dureeTexte(rdv.duree)} · ${STATUTS_RDV[rdv.statut].label}`}>
        <span className="rdv-l1">
          <span className="tnum flex-none font-mono text-[11.5px] font-medium">{large ? `${rdv.heure}–${fin}` : rdv.heure}</span>
          {rdv.statut === 'vu' && <Check size={12} className="flex-none self-center" aria-hidden="true" />}
          <span className="rdv-nom">{nom}</span>
          {large && <span className="truncate">{m.court}</span>}
          <span className="rdv-duree text-[11px] font-medium">{dureeTexte(rdv.duree)}</span>
        </span>
        <span className="rdv-l2">
          <span className="truncate">
            {large ? `${ageTexte(patient.ddn)} · ${seance ? `séance ${o.effectuees}/${o.prescrites}` : statutDossier(state, patient).label.toLowerCase()} · ${STATUTS_RDV[rdv.statut].label.toLowerCase()}` : m.court}
          </span>
        </span>
      </button>
      {large && (
        <div className="rdv-actions">
          <select aria-label={`Statut du rendez-vous de ${patient.prenom}`} id={`rdv-statut-${rdv.id}`} value={rdv.statut} onChange={(e) => actions.statutRdv(rdv.id, e.target.value)} className="inp !min-h-0 h-7 w-[148px] py-0 text-[12px]">
            {Object.entries(STATUTS_RDV).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          {seance && rdv.statut !== 'vu' && <Btn size="sm" className="!h-7" icon={Check} onClick={() => actions.validerSeance(patient.id, rdv.id)}>Valider la séance</Btn>}
          <Btn size="sm" className="!h-7" icon={FilePlus2} onClick={() => actions.nouveauBilan(patient.id, m.typeBilan, m.technique)}>Nouveau bilan</Btn>
        </div>
      )}
    </div>
  );
}

function titreSemaine(jours) {
  const a = parseISO(jours[0]);
  const b = parseISO(jours[jours.length - 1]);
  const debut = a.getMonth() === b.getMonth() ? `${a.getDate() === 1 ? '1er' : a.getDate()}` : dateLongue(jours[0]).replace(/ \d{4}$/, '');
  return `Semaine du ${debut} au ${dateLongue(jours[jours.length - 1])}`;
}
function resume(rdvs) {
  const total = rdvs.reduce((n, r) => n + (r.duree || 0), 0);
  const par = (f) => rdvs.filter((r) => (MOTIFS[r.motif] || {}).famille === f).length;
  const b = par('bilan');
  const s = par('reeducation');
  const e = par('exploration');
  return { total, detail: [b && `${b} bilan${b > 1 ? 's' : ''}`, s && `${s} séance${s > 1 ? 's' : ''} de rééducation`, e && `${e} exploration${e > 1 ? 's' : ''}`].filter(Boolean).join(' · ') };
}

/* ---------- Calendrier ---------- */
export function Calendrier({ vueInitiale = 'semaine' }) {
  const { state } = useApp();
  const T = todayISO();
  const [date, setDate] = useState(T);
  const [vue, setVue] = useState(vueInitiale);
  const [form, setForm] = useState(null);
  const patient = (id) => state.patients.find((p) => p.id === id);
  const jours = useMemo(() => {
    if (vue === 'jour') return [date];
    const lundi = lundiDe(date);
    const semaine = [0, 1, 2, 3, 4, 5].map((n) => addDays(lundi, n));
    const dimanche = addDays(lundi, 6);
    return date === dimanche || state.rdvs.some((r) => r.date === dimanche) ? [...semaine, dimanche] : semaine;
  }, [vue, date, state.rdvs]);
  const duJour = (d) => state.rdvs.filter((r) => r.date === d && patient(r.patientId)).sort(parHeure);
  const tous = jours.flatMap(duJour);
  const debut = Math.min(8 * 60, ...tous.map((r) => Math.floor(enMinutes(r.heure) / 60) * 60));
  const fin = Math.max(19 * 60, ...tous.map((r) => Math.ceil((enMinutes(r.heure) + r.duree) / 60) * 60));
  const ppm = vue === 'jour' ? 1.9 : 1.3;
  const hauteur = (fin - debut) * ppm;
  const heures = [];
  for (let h = debut; h <= fin; h += 60) heures.push(h);
  const now = new Date();
  const minNow = now.getHours() * 60 + now.getMinutes();
  const bilan = resume(tous);
  const large = vue === 'jour';

  const creer = (d) => (e) => {
    const haut = e.currentTarget.getBoundingClientRect().top;
    const min = Math.round((debut + (e.clientY - haut) / ppm) / 10) * 10;
    setForm({ defaut: { date: d, heure: enHeure(Math.max(debut, Math.min(fin - 10, min))) } });
  };
  const lignes = {
    backgroundImage: 'linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(var(--surface-2) 1px, transparent 1px)',
    backgroundSize: `100% ${60 * ppm}px, 100% ${60 * ppm}px`,
    backgroundPosition: `0 0, 0 ${30 * ppm}px`,
  };

  return (
    <Card className="min-w-0 overflow-hidden">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2.5 border-b border-line px-4 py-3">
        <div className="flex items-center gap-1">
          <IconBtn icon={ChevronLeft} label={large ? 'Jour précédent' : 'Semaine précédente'} onClick={() => setDate(addDays(date, large ? -1 : -7))} />
          <IconBtn icon={ChevronRight} label={large ? 'Jour suivant' : 'Semaine suivante'} onClick={() => setDate(addDays(date, large ? 1 : 7))} />
          <Btn size="sm" variant="ghost" disabled={date === T} onClick={() => setDate(T)}>Aujourd'hui</Btn>
        </div>
        <h2 className="min-w-[180px] flex-1 text-[15.5px] font-semibold leading-tight text-ink">{large ? cap(dateJour(date)) : titreSemaine(jours)}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <input id="agenda-date" type="date" aria-label="Aller à une date" className="inp !w-[150px]" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
          <Segmented id="agenda-vue" label="Vue de l'agenda" allowEmpty={false} value={vue} onChange={setVue} options={[['jour', 'Jour'], ['semaine', 'Semaine']]} />
          <Btn variant="primary" icon={CalendarPlus} onClick={() => setForm({ defaut: { date } })}>Nouveau rendez-vous</Btn>
        </div>
      </header>

      <div className="overflow-x-auto">
        <div className="grid pb-3 pr-3 pt-3" style={{ gridTemplateColumns: `50px repeat(${jours.length}, minmax(0, 1fr))`, minWidth: large ? undefined : 780 }}>
          {!large && (
            <>
              <span />
              {jours.map((d) => {
                const r = resume(duJour(d));
                const n = duJour(d).length;
                return (
                  <button key={d} type="button" onClick={() => { setDate(d); setVue('jour'); }} className="mb-2 flex flex-col items-center rounded-md py-1 leading-tight transition-colors hover:bg-surface-2" title="Ouvrir la vue jour">
                    <span className={cx('text-[12.5px] font-semibold', d === T ? 'text-accent' : 'text-ink')}>
                      {cap(jourCourt(d))} <span className={cx('tnum', d === T && 'rounded-full bg-accent px-1.5 text-on-accent')}>{parseISO(d).getDate()}</span>
                    </span>
                    <span className="tnum text-[11px] text-ink-3">{n ? `${n} RDV · ${dureeTexte(r.total)}` : 'aucun RDV'}</span>
                  </button>
                );
              })}
            </>
          )}
          <div className="relative" style={{ height: hauteur }}>
            {heures.map((h) => (
              <span key={h} className="tnum absolute right-2 -translate-y-1/2 font-mono text-[11px] text-ink-3" style={{ top: (h - debut) * ppm }}>{enHeure(h)}</span>
            ))}
          </div>
          {jours.map((d) => (
            <div key={d} className={cx('cal-col', d === T && !large && 'bg-surface-2')} style={{ height: hauteur, ...lignes }} onClick={creer(d)} title="Cliquer sur un créneau libre pour ajouter un rendez-vous">
              {d === T && minNow > debut && minNow < fin && <span className="cal-now" style={{ top: (minNow - debut) * ppm }} />}
              {placer(duJour(d)).map(({ rdv, s, col, cols }) => (
                <Bloc
                  key={rdv.id}
                  rdv={rdv}
                  patient={patient(rdv.patientId)}
                  large={large}
                  onOpen={() => setForm({ rdv })}
                  style={{ top: (s - debut) * ppm + 1, height: Math.max(rdv.duree * ppm - 2, 20), left: `calc(${(col / cols) * 100}% + 3px)`, width: `calc(${100 / cols}% - 6px)` }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-line px-4 py-2.5 text-[12.5px] text-ink-2">
        <span>
          <span className="font-medium text-ink">{tous.length} rendez-vous</span>
          {tous.length > 0 && <> · {dureeTexte(bilan.total)} de consultation · {bilan.detail}</>}
        </span>
        <span className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-ink-3">
          {Object.entries(FAMILLES).map(([k, f]) => (
            <span key={k} className="inline-flex items-center gap-1.5"><span className={cx('h-2 w-2 rounded-sm', POINT_FAMILLE[k])} aria-hidden="true" />{f.label}</span>
          ))}
        </span>
      </footer>
      {form && <RdvForm rdv={form.rdv} defaut={form.defaut} onClose={() => setForm(null)} />}
    </Card>
  );
}

/** Durées attribuées automatiquement à chaque motif. */
export function DureesReference() {
  return (
    <Card>
      <header className="flex flex-wrap items-baseline gap-x-2 border-b border-line px-4 py-3">
        <h2 className="text-[14.5px] font-semibold text-ink">Durées de référence par motif</h2>
        <span className="text-[12px] text-ink-3">attribuées automatiquement, modulables selon les besoins cliniques</span>
      </header>
      <ul className="grid gap-x-8 gap-y-2 px-4 py-3.5 md:grid-cols-2 xl:grid-cols-3">
        {Object.entries(MOTIFS).map(([k, m]) => (
          <li key={k} className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="flex min-w-0 items-baseline gap-2 text-ink-2">
              <span className={cx('h-2 w-2 flex-none translate-y-[-1px] rounded-sm', POINT_FAMILLE[m.famille])} aria-hidden="true" />
              <span className="min-w-0">
                {m.label}
                {m.options.length > 1 && <span className="block text-[11.5px] text-ink-3">{m.plage}</span>}
              </span>
            </span>
            <span className="tnum flex-none font-mono text-[12.5px] font-medium text-ink">{dureeTexte(m.duree)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function Agenda() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="eyebrow">Planning</p>
        <h1 className="mt-1 flex items-center gap-2 text-[25px] font-bold leading-tight text-ink">
          <CalendarDays size={22} className="text-accent" aria-hidden="true" /> Agenda
        </h1>
        <p className="mt-1 text-[13.5px] text-ink-2">Vue jour ou semaine, sur n'importe quelle date. Un clic sur un créneau libre crée un rendez-vous, un clic sur un rendez-vous permet de le modifier ou de le supprimer.</p>
      </div>
      <Calendrier vueInitiale="semaine" />
      <DureesReference />
    </div>
  );
}
