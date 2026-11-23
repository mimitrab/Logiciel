// Console du propriétaire de SACCADES : inscriptions, abonnements, parrainages, offre.
// Aucun dossier de patient n'est accessible ici.
import React, { useState } from 'react';
import { Building2, Check, CreditCard, ExternalLink, Gift, Save, ScrollText, ShieldAlert, UserCheck } from 'lucide-react';
import { Area, Btn, Card, CardHead, Chip, ConfirmBtn, Empty, Field, Modal, Notice, Num, Pill, Segmented, Text, cx, useApp } from '../ui.jsx';
import { ACTIONS_JOURNAL } from '../domain.js';
import { ajouterMois, etatAbonnement } from '../offre.js';
import { dateCourte, euro, horodatage, todayISO } from '../lib.js';

const ACTIONS_PLATEFORME = Object.keys(ACTIONS_JOURNAL).filter((a) => /^(cabinet|abonnement|parrainage|offre)\./.test(a));
const jour = (ts) => (ts ? dateCourte(new Date(ts).toISOString().slice(0, 10)) : '—');

function Tuile({ label, valeur, detail }) {
  return (
    <div className="card flex min-w-0 flex-col gap-1 px-4 py-3.5">
      <span className="eyebrow">{label}</span>
      <span className="tnum font-display text-[26px] font-bold leading-none text-ink">{valeur}</span>
      <span className="text-[12.5px] text-ink-3">{detail}</span>
    </div>
  );
}

function Paiement({ cabinet, onClose }) {
  const { actions } = useApp();
  const T = todayISO();
  const base = cabinet.accesJusqu && cabinet.accesJusqu > T ? cabinet.accesJusqu : T;
  const [jusqu, setJusqu] = useState(ajouterMois(base, 1));
  return (
    <Modal
      size="sm"
      title="Enregistrer un paiement"
      subtitle={`${cabinet.nom} (${cabinet.ville})`}
      onClose={onClose}
      footer={
        <>
          <Btn onClick={onClose}>Annuler</Btn>
          <Btn variant="primary" icon={Check} disabled={!jusqu || jusqu < T} onClick={() => { actions.plateforme('payer', cabinet.id, { jusqu }); onClose(); }}>Enregistrer</Btn>
        </>
      }
    >
      <p className="mb-3 text-[13px] leading-relaxed text-ink-2">Pour un règlement par virement ou chèque. Le premier paiement d'un cabinet parrainé déclenche les mois offerts au parrain et au filleul.</p>
      <div className="mb-3 flex flex-wrap gap-2">
        {[1, 3, 6, 12].map((m) => (
          <Btn key={m} size="sm" onClick={() => setJusqu(ajouterMois(base, m))}>{m} mois</Btn>
        ))}
      </div>
      <Field label="Abonnement réglé jusqu'au" htmlFor="pf-paye-jusqu">
        <Text id="pf-paye-jusqu" type="date" min={T} value={jusqu} onChange={setJusqu} />
      </Field>
    </Modal>
  );
}

export function Cabinets() {
  const { global, actions } = useApp();
  const d = global.plateforme;
  const [filtre, setFiltre] = useState('tous');
  const [paiement, setPaiement] = useState(null);
  if (!d) return <Card><Empty icon={Building2} title="Console indisponible" /></Card>;
  const nomDe = (id) => (d.cabinets.find((c) => c.id === id) || {}).nom;
  const liste = d.cabinets.map((c) => ({ ...c, etat: etatAbonnement(c), filleuls: d.parrainages.filter((p) => p.parrainId === c.id) }));
  const par = (code) => liste.filter((c) => c.etat.code === code);
  const abonnes = par('abonne');
  const mensuel = abonnes.reduce((n, c) => n + Math.max(1, c.praticiens) * d.offre.prixMensuelHT, 0);
  const lignes = filtre === 'tous' ? liste : par(filtre);
  const journal = d.journal || global.journal.filter((e) => ACTIONS_PLATEFORME.includes(e.action));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="eyebrow">Propriétaire de SACCADES</p>
        <h1 className="mt-1 text-[25px] font-bold leading-tight text-ink">Cabinets inscrits</h1>
        <p className="mt-1 max-w-3xl text-[13.5px] text-ink-2">Inscriptions à vérifier, périodes gratuites, abonnements et parrainages. Les dossiers des patients ne sont jamais visibles depuis cette console.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tuile label="À valider" valeur={par('en_attente').length} detail="inscriptions en attente" />
        <Tuile label="En période gratuite" valeur={par('essai').length} detail={`${d.offre.essaiMois} mois offerts à l'inscription`} />
        <Tuile label="Abonnés" valeur={abonnes.length} detail={`${euro(mensuel)} HT par mois`} />
        <Tuile label="Parrainages" valeur={d.parrainages.length} detail={`${d.parrainages.filter((p) => p.statut === 'recompense').length} récompensés`} />
      </div>

      <Segmented
        id="pf-filtre"
        label="Filtrer les cabinets"
        allowEmpty={false}
        value={filtre}
        onChange={setFiltre}
        options={[['tous', `Tous (${liste.length})`], ['en_attente', `À valider (${par('en_attente').length})`], ['essai', `Gratuit (${par('essai').length})`], ['abonne', `Abonnés (${abonnes.length})`], ['expire', `Expirés (${par('expire').length})`], ['suspendu', `Suspendus (${par('suspendu').length})`]]}
      />

      <Card className="overflow-hidden">
        {lignes.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-[11.5px] font-semibold uppercase tracking-wider text-ink-3">
                  <th className="px-4 py-2.5 font-semibold">Cabinet</th>
                  <th className="px-2 py-2.5 font-semibold">Fondateur</th>
                  <th className="px-2 py-2.5 font-semibold">Accès</th>
                  <th className="px-2 py-2.5 text-right font-semibold">Praticiens</th>
                  <th className="px-2 py-2.5 font-semibold">Parrainage</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {lignes.map((c) => (
                  <tr key={c.id} className="align-top">
                    <td className="px-4 py-3">
                      <span className="block font-medium text-ink">{c.nom}</span>
                      <span className="block text-[12px] text-ink-3">{c.ville} · inscrit le {jour(c.cree)}</span>
                    </td>
                    <td className="px-2 py-3">
                      {c.fondateur ? (
                        <>
                          <span className="block text-ink">{c.fondateur.nom}</span>
                          <span className="block font-mono text-[12px] text-ink-2">RPPS {c.fondateur.rpps}</span>
                          <span className="block truncate text-[12px] text-ink-3">{c.fondateur.email}</span>
                        </>
                      ) : (
                        <span className="text-ink-3">—</span>
                      )}
                    </td>
                    <td className="px-2 py-3">
                      <Pill tone={c.etat.ton}>{c.etat.libelle}</Pill>
                      {c.etat.code === 'abonne' && c.accesJusqu && <span className="mt-1 block text-[12px] text-ink-3">payé jusqu'au {dateCourte(c.accesJusqu)}{c.stripe ? ', en ligne' : ''}</span>}
                    </td>
                    <td className="tnum px-2 py-3 text-right font-mono text-ink">{c.praticiens}</td>
                    <td className="px-2 py-3 text-[12.5px] text-ink-2">
                      <span className="block font-mono text-ink">{c.codeParrainage}</span>
                      {c.parrainId && <span className="block">Parrainé par {nomDe(c.parrainId)}</span>}
                      {c.filleuls.length > 0 && <span className="block">{c.filleuls.length} filleul{c.filleuls.length > 1 ? 's' : ''}</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {c.statut === 'en_attente' && (
                        <span className="flex flex-col items-end gap-1.5">
                          <a className="inline-flex items-center gap-1 text-[12px] font-medium text-accent hover:underline" href="https://annuaire.sante.fr/" target="_blank" rel="noopener noreferrer">
                            Vérifier le RPPS <ExternalLink size={12} aria-hidden="true" />
                          </a>
                          <span className="flex gap-1.5">
                            <ConfirmBtn label="Refuser" confirmLabel="Confirmer le refus" onConfirm={() => actions.plateforme('refuser', c.id)} />
                            <Btn size="sm" variant="primary" icon={UserCheck} onClick={() => actions.plateforme('valider', c.id)}>Valider</Btn>
                          </span>
                        </span>
                      )}
                      {c.statut === 'actif' && (
                        <span className="flex flex-wrap justify-end gap-1.5">
                          <Btn size="sm" icon={CreditCard} onClick={() => setPaiement(c)}>Paiement reçu</Btn>
                          <Btn size="sm" variant="ghost" icon={Gift} onClick={() => actions.plateforme('prolonger', c.id, { mois: 1 })}>+1 mois</Btn>
                          <ConfirmBtn label="Suspendre" confirmLabel="Confirmer" icon={ShieldAlert} onConfirm={() => actions.plateforme('suspendre', c.id)} />
                        </span>
                      )}
                      {c.statut === 'suspendu' && <Btn size="sm" onClick={() => actions.plateforme('reactiver', c.id)}>Réactiver</Btn>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon={Building2} title="Aucun cabinet dans cette liste" />
        )}
      </Card>

      <Card>
        <CardHead icon={ScrollText} title="Derniers événements de la plateforme" />
        {journal.length ? (
          <ul className="divide-y divide-line">
            {journal.slice(0, 10).map((e) => (
              <li key={e.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-4 py-2 text-[13px]">
                <span className="tnum w-[128px] flex-none font-mono text-[12px] text-ink-3">{horodatage(e.ts)}</span>
                <span className="font-medium text-ink">{(ACTIONS_JOURNAL[e.action] || [e.action])[0]}</span>
                <span className="text-ink-2">{[e.cible, e.detail].filter(Boolean).join(' · ')}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-4 text-[13px] text-ink-3">Aucun événement pour l'instant.</p>
        )}
      </Card>
      {paiement && <Paiement cabinet={paiement} onClose={() => setPaiement(null)} />}
    </div>
  );
}

export function Offre() {
  const { global, actions } = useApp();
  const d = global.plateforme;
  const [o, setO] = useState(() => ({ ...d.offre }));
  const set = (k) => (v) => setO((x) => ({ ...x, [k]: v }));
  const ouvrable = !!o.cgu.trim();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Propriétaire de SACCADES</p>
          <h1 className="mt-1 text-[25px] font-bold leading-tight text-ink">Offre et inscriptions</h1>
          <p className="mt-1 max-w-3xl text-[13.5px] text-ink-2">Prix, période gratuite, parrainage, conditions générales et mentions légales du site.</p>
        </div>
        <Btn variant="primary" icon={Save} onClick={() => actions.enregistrerOffre({ ...o, inscriptionsOuvertes: o.inscriptionsOuvertes && ouvrable })}>Enregistrer</Btn>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-2">
        <Card>
          <CardHead icon={CreditCard} title="Tarif et période gratuite" />
          <div className="grid gap-3 px-4 py-4 sm:grid-cols-2">
            <Field label="Prix par praticien et par mois" htmlFor="of-prix" hint="Hors taxes. Il doit correspondre au prix créé dans Stripe."><Num id="of-prix" min={0} step={1} unit="€ HT" inputClassName="!pr-14" value={o.prixMensuelHT} onChange={set('prixMensuelHT')} /></Field>
            <Field label="Période gratuite à l'inscription" htmlFor="of-essai"><Num id="of-essai" min={0} max={24} unit="mois" inputClassName="!pr-12" value={o.essaiMois} onChange={set('essaiMois')} /></Field>
            <Field label="Mois offerts au parrain" htmlFor="of-parrain"><Num id="of-parrain" min={0} max={12} unit="mois" inputClassName="!pr-12" value={o.moisParrain} onChange={set('moisParrain')} /></Field>
            <Field label="Mois offerts au filleul" htmlFor="of-filleul"><Num id="of-filleul" min={0} max={12} unit="mois" inputClassName="!pr-12" value={o.moisFilleul} onChange={set('moisFilleul')} /></Field>
            <p className="text-[12px] text-ink-3 sm:col-span-2">La récompense de parrainage est attribuée au premier paiement du filleul, jamais à la simple inscription.</p>
          </div>
          <div className="border-t border-line px-4 py-3">
            {d.paiementEnLigne ? (
              <p className="flex items-center gap-2 text-[13px] text-ok"><Check size={15} aria-hidden="true" /> Paiement en ligne Stripe configuré.</p>
            ) : (
              <p className="text-[12.5px] leading-relaxed text-ink-2">
                <span className="font-medium text-ink">Paiement en ligne non configuré.</span> En attendant, enregistrez les paiements reçus depuis la liste des cabinets. Pour l'activer : compte Stripe au nom de votre société, un prix mensuel par praticien, puis les clés chez l'hébergeur (voir le guide de mise en ligne).
              </p>
            )}
          </div>
        </Card>

        <Card>
          <CardHead icon={UserCheck} title="Inscriptions" />
          <div className="flex flex-col gap-3 px-4 py-4">
            <Chip id="of-ouvertes" checked={o.inscriptionsOuvertes && ouvrable} disabled={!ouvrable} onChange={set('inscriptionsOuvertes')}>Inscriptions ouvertes au public</Chip>
            {!ouvrable && <p className="text-[12px] text-warn">Rédigez d'abord les conditions générales ci-dessous : les inscriptions ne peuvent pas s'ouvrir sans elles.</p>}
            <p className="text-[12.5px] leading-relaxed text-ink-2">Chaque inscription arrive en attente : vous vérifiez le numéro RPPS dans l'Annuaire santé, puis vous ouvrez le compte. La période gratuite démarre à l'ouverture.</p>
            <Field label="Contact affiché aux cabinets" htmlFor="of-contact"><Text id="of-contact" value={o.contact} onChange={set('contact')} placeholder="contact@votre-domaine.fr" /></Field>
          </div>
        </Card>
      </div>

      <Card>
        <CardHead icon={ScrollText} title="Documents légaux" />
        <div className="grid gap-3 px-4 py-4 lg:grid-cols-2">
          <Field label="Éditeur du site (mentions légales)" htmlFor="of-editeur" hint="Raison sociale, forme juridique, capital, adresse, SIRET, directeur de la publication."><Area id="of-editeur" rows={3} value={o.editeur} onChange={set('editeur')} /></Field>
          <Field label="Hébergeur" htmlFor="of-hebergeur" hint="Raison sociale, adresse et téléphone de l'hébergeur certifié HDS."><Area id="of-hebergeur" rows={3} value={o.hebergeur} onChange={set('hebergeur')} /></Field>
          <Field label="Conditions générales d'utilisation et de vente" htmlFor="of-cgu" className="lg:col-span-2" hint="Affichées et acceptées à l'inscription. À faire rédiger par un juriste, avec le contrat de traitement des données (RGPD, art. 28).">
            <Area id="of-cgu" rows={8} value={o.cgu} onChange={set('cgu')} />
          </Field>
        </div>
      </Card>
      <Notice tone="warn" icon={ShieldAlert} title="Avant d'ouvrir les inscriptions">
        Vos clients confient à SACCADES les données de santé de leurs patients : votre société devient leur sous-traitant au sens du RGPD. Il vous faut des conditions générales, un contrat de traitement des données pour chaque cabinet, et une vérification de votre propre obligation de certification HDS (administration de l'application). Faites aussi valider le parrainage au regard de l'encadrement des avantages offerts aux professionnels de santé.
      </Notice>
    </div>
  );
}
