// Dossiers patients : identité, couverture, antécédents, correction, ordonnance, consentements, historique.
import React, { useState } from 'react';
import { ArrowLeft, Check, ChevronRight, FilePlus2, FolderOpen, Pencil, Search, ShieldCheck, Shuffle, UserPlus, Users } from 'lucide-react';
import { Area, Avatar, Btn, Card, CardHead, Chip, Empty, Field, Modal, Num, Pill, Segmented, Select, Text, cx, useApp } from '../ui.jsx';
import { EXONERATIONS, MOTIFS, STATUTS_BILAN, STATUTS_FACTURE, TRANSMISSIONS, TYPES_BILAN, acteDe, correctionVide, cotation, motifSelonAge, resumeBilan, rgpdVide, statutDossier, statutRgpd } from '../domain.js';
import { formuleCorrection, libelleCorrection } from '../letter.js';
import { age, ageTexte, dateCourte, euro, nomComplet, todayISO } from '../lib.js';
import { CorrectionFields, SuiviOrdonnance } from './commun.jsx';

const patientVide = () => ({
  id: '', nom: '', prenom: '', sexe: 'F', ddn: '', tel: '', email: '', nir: '', mutuelle: '', exoneration: 'aucune',
  prescripteur: { nom: '', specialite: '', ville: '' }, antecedentsOph: '', antecedentsGen: '', correction: correctionVide(), ordonnance: null, rgpd: rgpdVide(),
});

const nirFictif = (p) => {
  const [a, m] = (p.ddn || '2000-01').split('-');
  const al = (n) => String(Math.floor(Math.random() * 10 ** n)).padStart(n, '0');
  return `${p.sexe === 'F' ? 2 : 1} ${a.slice(2)} ${m} 69 000 ${al(3)} ${al(2)}`;
};
const mineur = (p) => !!p.ddn && age(p.ddn).ans < 18;

function Titre({ children }) {
  return <h3 className="eyebrow col-span-full mt-2 border-t border-line pt-4 first:mt-0 first:border-0 first:pt-0">{children}</h3>;
}

/** Information du patient et consentements facultatifs. */
function ChampsRgpd({ r, set, patient, idp }) {
  return (
    <>
      <Field label="Note d'information remise le" htmlFor={`${idp}-info`} hint="Finalités, durée de conservation, destinataires, droits du patient.">
        <div className="flex gap-2">
          <Text id={`${idp}-info`} type="date" max={todayISO()} value={r.information} onChange={set('information')} />
          <Btn onClick={() => set('information')(todayISO())}>Aujourd'hui</Btn>
        </div>
      </Field>
      <Field label="Transmission des comptes-rendus au médecin prescripteur">
        <Segmented id={`${idp}-transmission`} label="Transmission des comptes-rendus" value={r.transmission} onChange={set('transmission')} options={[['ok', 'Informé, sans opposition'], ['opposition', 'Opposition du patient']]} />
      </Field>
      <Field label={mineur(patient) ? 'Représentant légal (patient mineur)' : 'Représentant légal, le cas échéant'} htmlFor={`${idp}-representant`}>
        <Text id={`${idp}-representant`} value={r.representant} onChange={set('representant')} placeholder="Nom et qualité" />
      </Field>
      <div className="col-span-full flex flex-wrap gap-2">
        <Chip id={`${idp}-rappels`} checked={r.rappels} onChange={set('rappels')}>Consent aux rappels de rendez-vous par SMS ou courriel</Chip>
        <Chip id={`${idp}-recherche`} checked={r.recherche} onChange={set('recherche')}>Consent à l'usage de données anonymisées pour l'enseignement ou la recherche</Chip>
      </div>
    </>
  );
}

function RgpdForm({ patient, onClose }) {
  const { actions } = useApp();
  const [r, setR] = useState({ ...rgpdVide(), ...(patient.rgpd || {}) });
  const set = (k) => (v) => setR((x) => ({ ...x, [k]: v }));
  return (
    <Modal
      title="Information et consentements"
      subtitle={nomComplet(patient)}
      onClose={onClose}
      footer={
        <>
          <Btn onClick={onClose}>Annuler</Btn>
          <Btn variant="primary" icon={Check} onClick={() => { actions.majRgpd(patient.id, r); onClose(); }}>Enregistrer</Btn>
        </>
      }
    >
      <p className="mb-4 rounded-md bg-surface-2 px-3 py-2.5 text-[12.5px] leading-relaxed text-ink-2">
        La tenue du dossier de soins ne repose pas sur le consentement du patient, mais il doit en être informé. Le consentement ne concerne que les usages facultatifs, et il peut être retiré à tout moment.
      </p>
      <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
        <ChampsRgpd r={r} set={set} patient={patient} idp="rg" />
      </div>
    </Modal>
  );
}

export function PatientForm({ patient, onClose, onSaved }) {
  const { state, actions } = useApp();
  const [p, setP] = useState(() => (patient ? { ...patientVide(), ...JSON.parse(JSON.stringify(patient)) } : patientVide()));
  const [essai, setEssai] = useState(false);
  const set = (k) => (v) => setP((x) => ({ ...x, [k]: v }));
  const setPresc = (k) => (v) => setP((x) => ({ ...x, prescripteur: { ...x.prescripteur, [k]: v } }));
  const setOrdo = (k) => (v) => setP((x) => ({ ...x, ordonnance: { ...x.ordonnance, [k]: v } }));
  const setRgpd = (k) => (v) => setP((x) => ({ ...x, rgpd: { ...x.rgpd, [k]: v } }));
  const manque = { nom: !p.nom.trim(), prenom: !p.prenom.trim(), ddn: !p.ddn };
  const valide = !manque.nom && !manque.prenom && !manque.ddn;
  const erreur = (k) => essai && manque[k] && '!border-danger';
  const seances = state.bareme.filter((a) => a.famille === 'seance');

  const enregistrer = () => {
    setEssai(true);
    if (!valide) return;
    const o = p.ordonnance;
    const propre = {
      ...p,
      nom: p.nom.trim(),
      prenom: p.prenom.trim(),
      ordonnance: o ? { ...o, prescrites: Math.max(0, parseInt(o.prescrites, 10) || 0), effectuees: Math.max(0, parseInt(o.effectuees, 10) || 0) } : null,
      rgpd: { ...p.rgpd, maj: patient ? p.rgpd.maj : todayISO() },
    };
    const id = actions.enregistrerPatient(propre);
    onClose();
    if (onSaved) onSaved(id);
  };

  return (
    <Modal
      size="lg"
      title={patient ? `Modifier le dossier de ${nomComplet(patient)}` : 'Nouveau patient'}
      subtitle="Maquette : n'y saisissez que des données fictives."
      onClose={onClose}
      footer={
        <>
          {essai && !valide && <span className="mr-auto text-[12.5px] text-danger">Renseignez le nom, le prénom et la date de naissance.</span>}
          <Btn onClick={onClose}>Annuler</Btn>
          <Btn variant="primary" icon={Check} onClick={enregistrer}>{patient ? 'Enregistrer' : 'Créer le dossier'}</Btn>
        </>
      }
    >
      <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        <Titre>Identité</Titre>
        <Field label="Nom" htmlFor="pf-nom"><Text id="pf-nom" value={p.nom} onChange={set('nom')} className={erreur('nom')} autoComplete="off" /></Field>
        <Field label="Prénom" htmlFor="pf-prenom"><Text id="pf-prenom" value={p.prenom} onChange={set('prenom')} className={erreur('prenom')} autoComplete="off" /></Field>
        <Field label="Sexe" htmlFor="pf-sexe"><Select id="pf-sexe" value={p.sexe} onChange={set('sexe')} placeholder={null} options={[['F', 'Féminin'], ['M', 'Masculin']]} /></Field>
        <Field label="Date de naissance" htmlFor="pf-ddn" hint={p.ddn ? ageTexte(p.ddn) : undefined}><Text id="pf-ddn" type="date" value={p.ddn} max={todayISO()} onChange={set('ddn')} className={erreur('ddn')} /></Field>
        <Field label="Téléphone" htmlFor="pf-tel"><Text id="pf-tel" value={p.tel} onChange={set('tel')} inputMode="tel" /></Field>
        <Field label="Courriel" htmlFor="pf-email"><Text id="pf-email" value={p.email} onChange={set('email')} inputMode="email" /></Field>

        <Titre>Couverture sociale</Titre>
        <Field label="N° de sécurité sociale (fictif)" htmlFor="pf-nir">
          <div className="flex gap-2">
            <Text id="pf-nir" value={p.nir} onChange={set('nir')} className="num" placeholder="2 98 03 69 000 000 00" />
            <Btn icon={Shuffle} onClick={() => set('nir')(nirFictif(p))} title="Générer un numéro fictif">Fictif</Btn>
          </div>
        </Field>
        <Field label="Mutuelle" htmlFor="pf-mutuelle" hint="Laisser vide en l'absence de complémentaire."><Text id="pf-mutuelle" value={p.mutuelle} onChange={set('mutuelle')} /></Field>
        <Field label="Prise en charge" htmlFor="pf-exo"><Select id="pf-exo" value={p.exoneration} onChange={set('exoneration')} placeholder={null} options={Object.entries(EXONERATIONS).map(([k, v]) => [k, v.label])} /></Field>

        <Titre>Médecin prescripteur</Titre>
        <Field label="Nom du médecin" htmlFor="pf-presc"><Text id="pf-presc" value={p.prescripteur.nom} onChange={setPresc('nom')} placeholder="Hélène Marchand" /></Field>
        <Field label="Spécialité" htmlFor="pf-spec"><Text id="pf-spec" value={p.prescripteur.specialite} onChange={setPresc('specialite')} placeholder="Ophtalmologiste" /></Field>
        <Field label="Ville" htmlFor="pf-pville"><Text id="pf-pville" value={p.prescripteur.ville} onChange={setPresc('ville')} /></Field>

        <Titre>Antécédents</Titre>
        <Field label="Ophtalmologiques" htmlFor="pf-atcd-oph" className="sm:col-span-2 lg:col-span-3"><Area id="pf-atcd-oph" value={p.antecedentsOph} onChange={set('antecedentsOph')} placeholder="Strabisme dans l'enfance, chirurgie, amblyopie traitée…" /></Field>
        <Field label="Généraux" htmlFor="pf-atcd-gen" className="sm:col-span-2 lg:col-span-3"><Area id="pf-atcd-gen" value={p.antecedentsGen} onChange={set('antecedentsGen')} placeholder="Prématurité, diabète, traitement en cours…" /></Field>

        <Titre>Correction optique</Titre>
        <div className="col-span-full"><CorrectionFields idp="pf-corr" value={p.correction} onChange={set('correction')} /></div>

        <Titre>Ordonnance de rééducation</Titre>
        <div className="col-span-full">
          <Chip id="pf-ordo" checked={!!p.ordonnance} onChange={(v) => set('ordonnance')(v ? { date: todayISO(), prescrites: 12, effectuees: 0, acte: '5.4', derniere: '' } : null)}>
            Une ordonnance de rééducation est en cours
          </Chip>
        </div>
        {p.ordonnance && (
          <>
            <Field label="Date de l'ordonnance" htmlFor="pf-odate"><Text id="pf-odate" type="date" value={p.ordonnance.date} onChange={setOrdo('date')} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Séances prescrites" htmlFor="pf-opresc"><Num id="pf-opresc" min={0} value={p.ordonnance.prescrites} onChange={setOrdo('prescrites')} /></Field>
              <Field label="Effectuées" htmlFor="pf-oeff"><Num id="pf-oeff" min={0} value={p.ordonnance.effectuees} onChange={setOrdo('effectuees')} /></Field>
            </div>
            <Field label="Cotation de la séance" htmlFor="pf-oacte">
              <Select id="pf-oacte" value={p.ordonnance.acte} onChange={setOrdo('acte')} placeholder={null} options={seances.map((a) => [a.code, `${cotation(a.coef)} · ${a.libelle}`])} />
            </Field>
          </>
        )}

        <Titre>Information et consentements (RGPD)</Titre>
        <ChampsRgpd r={p.rgpd} set={setRgpd} patient={p} idp="pf-rgpd" />
      </div>
    </Modal>
  );
}

function Info({ label, children, mono }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11.5px] font-medium text-ink-3">{label}</dt>
      <dd className={cx('mt-0.5 break-words text-[13.5px] text-ink', mono && children && 'tnum font-mono text-[13px]')}>{children || <span className="text-ink-3">Non renseigné</span>}</dd>
    </div>
  );
}

function Fiche({ patient, onBack }) {
  const { state, actions, go } = useApp();
  const [modal, setModal] = useState(null);
  const dossier = statutDossier(state, patient);
  const bilans = state.bilans.filter((b) => b.patientId === patient.id).sort((a, b) => b.date.localeCompare(a.date));
  const factures = state.factures.filter((f) => f.patientId === patient.id).sort((a, b) => b.date.localeCompare(a.date));
  const o = patient.ordonnance;
  const formule = formuleCorrection(patient.correction);
  const presc = patient.prescripteur || {};
  const rgpd = { ...rgpdVide(), ...(patient.rgpd || {}) };
  const etatRgpd = statutRgpd(patient);
  const seance = MOTIFS[motifSelonAge('reeduc-adulte', patient)];

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 self-start text-[13px] font-medium text-ink-2 hover:text-ink lg:hidden">
        <ArrowLeft size={15} aria-hidden="true" /> Tous les patients
      </button>
      <Card className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4">
        <Avatar patient={patient} size={52} />
        <div className="min-w-[160px] flex-1">
          <h1 className="text-[21px] font-bold leading-tight text-ink">{nomComplet(patient)}</h1>
          <p className="mt-0.5 text-[13px] text-ink-2">
            {patient.sexe === 'F' ? 'Née' : 'Né'} le {dateCourte(patient.ddn)} · {ageTexte(patient.ddn)}
          </p>
          <div className="mt-2"><Pill tone={dossier.tone}>{dossier.label}</Pill></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn icon={Pencil} onClick={() => setModal('edition')}>Modifier</Btn>
          <Btn variant="primary" icon={FilePlus2} onClick={() => actions.nouveauBilan(patient.id, 'bilan')}>Nouveau bilan</Btn>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHead title="Identité et couverture" />
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-3.5">
              <Info label="N° de sécurité sociale (fictif)" mono>{patient.nir}</Info>
              <Info label="Mutuelle">{patient.mutuelle || 'Aucune complémentaire'}</Info>
              <Info label="Prise en charge">{(EXONERATIONS[patient.exoneration] || EXONERATIONS.aucune).label}</Info>
              <Info label="Téléphone" mono>{patient.tel}</Info>
              <Info label="Courriel">{patient.email}</Info>
              <Info label="Médecin prescripteur">{presc.nom ? `Dr ${presc.nom}${presc.specialite ? `, ${presc.specialite.toLowerCase()}` : ''}${presc.ville ? ` (${presc.ville})` : ''}` : ''}</Info>
            </dl>
          </Card>
          <Card>
            <CardHead title="Antécédents et correction" />
            <dl className="grid gap-y-3 px-4 py-3.5">
              <Info label="Antécédents ophtalmologiques">{patient.antecedentsOph || 'Aucun antécédent rapporté'}</Info>
              <Info label="Antécédents généraux">{patient.antecedentsGen || 'Aucun antécédent rapporté'}</Info>
              <Info label="Correction optique">
                {libelleCorrection(patient.correction)}
                {formule && <span className="tnum mt-1 block font-mono text-[12.5px] text-ink-2">{formule}</span>}
              </Info>
            </dl>
          </Card>
          <Card>
            <CardHead icon={ShieldCheck} title="Information et consentements" right={<Btn size="sm" onClick={() => setModal('rgpd')}>Mettre à jour</Btn>} />
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-3.5">
              <div className="col-span-2"><Pill tone={etatRgpd.tone}>{etatRgpd.label}</Pill></div>
              <Info label="Note d'information remise">{rgpd.information ? `Le ${dateCourte(rgpd.information)}` : ''}</Info>
              <Info label="Transmission au médecin prescripteur">{rgpd.transmission ? TRANSMISSIONS[rgpd.transmission].label : ''}</Info>
              <Info label="Rappels par SMS ou courriel">{rgpd.rappels ? 'Consentement donné' : 'Pas de consentement'}</Info>
              <Info label="Enseignement et recherche">{rgpd.recherche ? 'Consentement donné' : 'Pas de consentement'}</Info>
              {(rgpd.representant || mineur(patient)) && <Info label="Représentant légal">{rgpd.representant}</Info>}
              <Info label="Dernière mise à jour">{rgpd.maj ? dateCourte(rgpd.maj) : ''}</Info>
            </dl>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHead title="Rééducation sur ordonnance" hint={o && o.date ? `ordonnance du ${dateCourte(o.date)}` : undefined} />
            {o && o.prescrites ? (
              <div className="flex flex-col gap-3 px-4 py-3.5">
                <SuiviOrdonnance patient={patient} />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[12.5px] leading-snug text-ink-3">
                    {acteDe(state.bareme, o.acte).libelle} · {cotation(acteDe(state.bareme, o.acte).coef)}
                    <span className="block">
                      Séances de {seance.plage}
                      {o.derniere ? ` · dernière séance le ${dateCourte(o.derniere)}` : ''}
                    </span>
                  </p>
                  <Btn size="sm" icon={Check} disabled={(o.effectuees || 0) >= o.prescrites} onClick={() => actions.validerSeance(patient.id)}>Valider une séance</Btn>
                </div>
              </div>
            ) : (
              <p className="px-4 py-4 text-[13px] text-ink-3">Aucune ordonnance de rééducation en cours. Ajoutez-la depuis « Modifier ».</p>
            )}
          </Card>
          <Card>
            <CardHead title="Historique des bilans" hint={bilans.length ? `${bilans.length}` : undefined} />
            {bilans.length ? (
              <ul className="divide-y divide-line">
                {bilans.map((b) => (
                  <li key={b.id}>
                    <button type="button" onClick={() => go('bilans', { bilanId: b.id })} className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-2">
                      <span className="tnum w-[76px] flex-none font-mono text-[12.5px] text-ink-2">{dateCourte(b.date)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium text-ink">{TYPES_BILAN[b.type].label}</span>
                        <span className="block truncate text-[12px] text-ink-3">{resumeBilan(b)}</span>
                      </span>
                      <Pill tone={STATUTS_BILAN[b.statut].tone}>{STATUTS_BILAN[b.statut].label}</Pill>
                      <ChevronRight size={15} className="flex-none text-ink-3" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-4 text-[13px] text-ink-3">Aucun bilan pour l'instant. Le premier s'ouvre avec « Nouveau bilan ».</p>
            )}
          </Card>
          {factures.length > 0 && (
            <Card>
              <CardHead title="Derniers actes facturés" />
              <ul className="divide-y divide-line">
                {factures.slice(0, 4).map((f) => (
                  <li key={f.id} className="flex items-center gap-3 px-4 py-2">
                    <span className="tnum w-[76px] flex-none font-mono text-[12.5px] text-ink-2">{dateCourte(f.date)}</span>
                    <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{cotation(f.coef)}</span>
                    <span className="tnum font-mono text-[12.5px] text-ink">{euro(f.montant)}</span>
                    <Pill tone={STATUTS_FACTURE[f.statut].tone}>{STATUTS_FACTURE[f.statut].label}</Pill>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
      {modal === 'edition' && <PatientForm patient={patient} onClose={() => setModal(null)} />}
      {modal === 'rgpd' && <RgpdForm patient={patient} onClose={() => setModal(null)} />}
    </div>
  );
}

export default function Patients({ patientId }) {
  const { state, go } = useApp();
  const [q, setQ] = useState('');
  const [creation, setCreation] = useState(false);
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const liste = state.patients.filter((p) => norm(`${p.nom} ${p.prenom} ${p.nom}`).includes(norm(q))).sort((a, b) => a.nom.localeCompare(b.nom));
  const choisi = state.patients.find((p) => p.id === patientId);

  return (
    <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
      <div className={cx('min-w-0 flex-col gap-3', choisi ? 'hidden lg:flex' : 'flex')}>
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-[20px] font-bold text-ink lg:text-[17px]">Dossiers patients</h1>
          <Btn size="sm" variant="primary" icon={UserPlus} onClick={() => setCreation(true)}>Nouveau</Btn>
        </div>
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden="true" />
          <input id="patients-recherche" className="inp !pl-8" type="search" placeholder="Rechercher un patient" aria-label="Rechercher un patient" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Card className="overflow-hidden">
          {liste.length ? (
            <ul className="divide-y divide-line">
              {liste.map((p) => {
                const st = statutDossier(state, p);
                const actif = choisi && choisi.id === p.id;
                return (
                  <li key={p.id}>
                    <button type="button" aria-current={actif ? 'true' : undefined} onClick={() => go('patients', { patientId: p.id })} className={cx('flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors', actif ? 'bg-accent-soft' : 'hover:bg-surface-2')}>
                      <Avatar patient={p} size={34} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium text-ink">{nomComplet(p)}</span>
                        <span className="block truncate text-[12px] text-ink-3">
                          {ageTexte(p.ddn)}
                          {p.ordonnance && p.ordonnance.prescrites ? ` · ${p.ordonnance.effectuees}/${p.ordonnance.prescrites} séances` : ''}
                        </span>
                      </span>
                      <span className={cx('h-2 w-2 flex-none rounded-full', { ok: 'bg-ok', warn: 'bg-warn', danger: 'bg-danger', info: 'bg-info', neutral: 'bg-line-strong' }[st.tone])} title={st.label} />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty icon={Users} title="Aucun patient trouvé">Vérifiez l'orthographe ou créez un nouveau dossier.</Empty>
          )}
        </Card>
      </div>
      <div className={cx('min-w-0', choisi ? 'block' : 'hidden lg:block')}>
        {choisi ? (
          <Fiche key={choisi.id} patient={choisi} onBack={() => go('patients')} />
        ) : (
          <Card>
            <Empty icon={FolderOpen} title="Sélectionnez un dossier">Aucun dossier n'est affiché tant que vous n'en ouvrez pas un : chaque ouverture est consignée au journal d'audit.</Empty>
          </Card>
        )}
      </div>
      {creation && <PatientForm onClose={() => setCreation(false)} onSaved={(id) => go('patients', { patientId: id })} />}
    </div>
  );
}
