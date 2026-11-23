// Espace du super-administrateur : supervision chiffrée du cabinet, comptes, réglages.
import React, { useState } from 'react';
import { Check, KeyRound, Pencil, RotateCcw, ShieldAlert, UserPlus, UserRound } from 'lucide-react';
import { Area, Btn, Card, CardHead, Chip, ConfirmBtn, Field, Modal, Notice, Num, Pill, Segmented, Select, Text, cx, useApp } from '../ui.jsx';
import { ACTIONS_JOURNAL, BAREME_DEFAUT, FAMILLES_ACTES, MOTIFS_ACCES, NORMES_DEFAUT, ZONES, cotation, nomUtilisateur, valeurAMY } from '../domain.js';
import { statsDe } from '../stats.js';
import { SERVEUR } from '../mode.js';
import { dureeTexte, euro, horodatage, num } from '../lib.js';

/* ---------- Accès exceptionnel aux dossiers d'un praticien ---------- */
function AccesForm({ praticien, onClose }) {
  const { actions } = useApp();
  const [motif, setMotif] = useState('');
  const [precision, setPrecision] = useState('');
  const [engagement, setEngagement] = useState(false);
  const pret = motif && precision.trim().length >= 10 && engagement;
  return (
    <Modal
      title="Accès exceptionnel aux dossiers"
      subtitle={`Praticien concerné : ${nomUtilisateur(praticien)}`}
      onClose={onClose}
      footer={
        <>
          <Btn onClick={onClose}>Annuler</Btn>
          <Btn variant="primary" icon={ShieldAlert} disabled={!pret} onClick={() => { onClose(); actions.ouvrirAcces(praticien.id, motif, precision); }}>Ouvrir l'accès et le consigner</Btn>
        </>
      }
    >
      <Notice tone="warn" icon={ShieldAlert} className="mb-4">
        Les dossiers médicaux relèvent du secret professionnel du praticien. Cet accès doit rester exceptionnel : il est limité à la durée de l'intervention, signalé par un bandeau, et son début comme sa fin sont inscrits au journal d'audit, que le praticien peut consulter.
      </Notice>
      <div className="grid gap-3">
        <Field label="Motif de l'accès" htmlFor="ax-motif">
          <Select id="ax-motif" value={motif} onChange={setMotif} placeholder="Choisir un motif" options={MOTIFS_ACCES} />
        </Field>
        <Field label="Précision (10 caractères minimum)" htmlFor="ax-precision" hint="Elle sera lisible dans le journal : pas de donnée médicale.">
          <Area id="ax-precision" value={precision} onChange={setPrecision} placeholder="Ex. : doublon du dossier Renard signalé par le praticien ce matin." />
        </Field>
        <Chip id="ax-engagement" checked={engagement} onChange={setEngagement}>Je limite cet accès à ce qui est nécessaire à l'intervention</Chip>
      </div>
    </Modal>
  );
}

export function Supervision() {
  const { global, acces, go } = useApp();
  const [cible, setCible] = useState(null);
  const praticiens = global.utilisateurs.filter((u) => u.role === 'praticien');
  const lignes = praticiens.map((u) => {
    const st = statsDe(global, u.id);
    return { u, patients: st.patients, rdv: st.rdvJour, minutes: st.minutesJour, aRediger: st.aRediger, aEnvoyer: st.aEnvoyer, aFacturer: st.aFacturer, mois: st.mois };
  });
  const total = (k) => lignes.reduce((n, l) => n + l[k], 0);
  const U = Object.fromEntries(global.utilisateurs.map((u) => [u.id, u]));
  const tuiles = [
    ['Praticiens actifs', praticiens.filter((u) => u.actif).length, `${praticiens.length} compte${praticiens.length > 1 ? 's' : ''} praticien`],
    ['Dossiers patients', total('patients'), 'tous praticiens confondus'],
    ["Rendez-vous aujourd'hui", total('rdv'), `${dureeTexte(total('minutes'))} de consultation`],
    ['Facturé ce mois-ci', euro(total('mois')), `${euro(total('aFacturer'))} restent à facturer`],
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="eyebrow">Super-administrateur</p>
        <h1 className="mt-1 text-[25px] font-bold leading-tight text-ink">Supervision du cabinet</h1>
        <p className="mt-1 max-w-3xl text-[13.5px] text-ink-2">Activité de chaque praticien, en chiffres. Aucun nom de patient n'apparaît ici : pour intervenir sur un dossier, ouvrez un accès exceptionnel motivé.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tuiles.map(([label, valeur, detail]) => (
          <div key={label} className="card flex min-w-0 flex-col gap-1 px-4 py-3.5">
            <span className="eyebrow">{label}</span>
            <span className="tnum font-display text-[26px] font-bold leading-none text-ink">{valeur}</span>
            <span className="text-[12.5px] text-ink-3">{detail}</span>
          </div>
        ))}
      </div>

      <Card className="overflow-hidden">
        <CardHead title="Activité par praticien" hint="données agrégées" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-[13px]">
            <thead>
              <tr className="border-b border-line text-[11.5px] font-semibold uppercase tracking-wider text-ink-3">
                <th className="px-4 py-2.5 font-semibold">Praticien</th>
                <th className="px-2 py-2.5 text-right font-semibold">Dossiers</th>
                <th className="px-2 py-2.5 font-semibold">Aujourd'hui</th>
                <th className="px-2 py-2.5 font-semibold">Bilans en attente</th>
                <th className="px-2 py-2.5 text-right font-semibold">À facturer</th>
                <th className="px-2 py-2.5 text-right font-semibold">Facturé ce mois</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {lignes.map((l) => (
                <tr key={l.u.id} className="align-middle">
                  <td className="px-4 py-3">
                    <span className="block font-medium text-ink">{nomUtilisateur(l.u)}</span>
                    <span className="block text-[12px] text-ink-3">
                      {l.u.actif ? (l.u.derniereConnexion ? `Dernière connexion le ${horodatage(l.u.derniereConnexion)}` : 'Jamais connecté') : 'Compte désactivé'}
                    </span>
                  </td>
                  <td className="tnum px-2 py-3 text-right font-mono text-ink">{l.patients}</td>
                  <td className="tnum whitespace-nowrap px-2 py-3 text-ink-2">{l.rdv} RDV · {dureeTexte(l.minutes)}</td>
                  <td className="whitespace-nowrap px-2 py-3 text-ink-2">{l.aRediger} à rédiger · {l.aEnvoyer} à envoyer</td>
                  <td className="tnum whitespace-nowrap px-2 py-3 text-right font-mono text-ink-2">{euro(l.aFacturer)}</td>
                  <td className="tnum whitespace-nowrap px-2 py-3 text-right font-mono text-ink">{euro(l.mois)}</td>
                  <td className="px-4 py-3 text-right">
                    {acces && acces.praticienId === l.u.id ? <Pill tone="warn">Accès en cours</Pill> : <Btn size="sm" icon={ShieldAlert} disabled={!!acces} onClick={() => setCible(l.u)}>Accès exceptionnel</Btn>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHead title="Derniers événements" right={<Btn size="sm" variant="ghost" onClick={() => go('conformite')}>Journal complet</Btn>} />
        <ul className="divide-y divide-line">
          {global.journal.slice(0, 7).map((e) => (
            <li key={e.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-4 py-2 text-[13px]">
              <span className="tnum w-[128px] flex-none font-mono text-[12px] text-ink-3">{horodatage(e.ts)}</span>
              <span className="font-medium text-ink">{(ACTIONS_JOURNAL[e.action] || [e.action])[0]}</span>
              <span className="text-ink-2">{U[e.userId] ? nomUtilisateur(U[e.userId]) : 'Non identifié'}{e.cible ? ` · ${e.cible}` : ''}</span>
            </li>
          ))}
        </ul>
      </Card>
      {cible && <AccesForm praticien={cible} onClose={() => setCible(null)} />}
    </div>
  );
}

/* ---------- Comptes ---------- */
const LONGUEUR = SERVEUR ? 12 : 10;
function CompteForm({ compte, onClose }) {
  const { global, actions } = useApp();
  const [u, setU] = useState(compte || { id: '', role: 'praticien', identifiant: '', prenom: '', nom: '', titre: 'Orthoptiste', rpps: '' });
  const [mdp, setMdp] = useState('');
  const [essai, setEssai] = useState(false);
  const set = (k) => (v) => setU((x) => ({ ...x, [k]: v }));
  const identifiant = u.identifiant.trim().toLowerCase();
  const doublon = global.utilisateurs.some((x) => x.id !== u.id && (x.identifiant || '').toLowerCase() === identifiant);
  const erreurs = [
    !u.nom.trim() && 'Le nom est obligatoire.',
    !/^[a-z0-9._-]{3,}$/.test(identifiant) && "L'identifiant compte au moins 3 caractères : lettres, chiffres, point ou tiret.",
    doublon && 'Cet identifiant est déjà utilisé.',
    !compte && mdp.length < LONGUEUR && `Le mot de passe provisoire compte au moins ${LONGUEUR} caractères.`,
    compte && mdp && mdp.length < LONGUEUR && `Le nouveau mot de passe compte au moins ${LONGUEUR} caractères.`,
  ].filter(Boolean);
  const enregistrer = async () => {
    setEssai(true);
    if (erreurs.length) return;
    if (await actions.enregistrerUtilisateur({ ...u, identifiant, nom: u.nom.trim(), prenom: u.prenom.trim() }, mdp || undefined)) onClose();
  };
  return (
    <Modal
      title={compte ? `Modifier le compte de ${nomUtilisateur(compte)}` : 'Nouveau compte'}
      onClose={onClose}
      footer={
        <>
          {essai && erreurs.length > 0 && <span className="mr-auto max-w-xs text-[12.5px] leading-snug text-danger">{erreurs[0]}</span>}
          <Btn onClick={onClose}>Annuler</Btn>
          <Btn variant="primary" icon={Check} onClick={enregistrer}>{compte ? 'Enregistrer' : 'Créer le compte'}</Btn>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Prénom" htmlFor="cf-prenom"><Text id="cf-prenom" value={u.prenom} onChange={set('prenom')} /></Field>
        <Field label="Nom" htmlFor="cf-nom"><Text id="cf-nom" value={u.nom} onChange={set('nom')} /></Field>
        <Field label="Identifiant de connexion" htmlFor="cf-identifiant"><Text id="cf-identifiant" className="num" autoCapitalize="none" spellCheck="false" value={u.identifiant} onChange={set('identifiant')} placeholder="prenom.nom" /></Field>
        <Field label="Rôle" htmlFor="cf-role">
          <Select id="cf-role" value={u.role} onChange={set('role')} placeholder={null} disabled={!!compte} options={[['praticien', 'Praticien : ses propres dossiers'], ['admin', 'Super-administrateur']]} />
        </Field>
        <Field label="Titre" htmlFor="cf-titre"><Text id="cf-titre" value={u.titre} onChange={set('titre')} /></Field>
        <Field label="N° RPPS" htmlFor="cf-rpps"><Text id="cf-rpps" value={u.rpps} onChange={set('rpps')} /></Field>
        <Field label={compte ? 'Réinitialiser le mot de passe (facultatif)' : 'Mot de passe provisoire'} htmlFor="cf-mdp" className="sm:col-span-2" hint={SERVEUR ? 'À transmettre par un canal sûr. Il devra être changé à la première connexion, avec activation de la double authentification.' : 'À transmettre à la personne par un canal sûr. Elle le changera depuis « Mon compte ».'}>
          <Text id="cf-mdp" type="password" autoComplete="new-password" value={mdp} onChange={setMdp} />
        </Field>
      </div>
    </Modal>
  );
}

export function Utilisateurs() {
  const { global, user, actions } = useApp();
  const [form, setForm] = useState(null);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Super-administrateur</p>
          <h1 className="mt-1 text-[25px] font-bold leading-tight text-ink">Utilisateurs</h1>
          <p className="mt-1 max-w-3xl text-[13.5px] text-ink-2">Chaque praticien a son compte, son agenda, ses patients, ses bilans et sa facturation. Un compte désactivé ne peut plus se connecter ; ses dossiers sont conservés.</p>
        </div>
        <Btn variant="primary" icon={UserPlus} onClick={() => setForm({})}>Nouveau compte</Btn>
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left text-[13px]">
            <thead>
              <tr className="border-b border-line text-[11.5px] font-semibold uppercase tracking-wider text-ink-3">
                <th className="px-4 py-2.5 font-semibold">Utilisateur</th>
                <th className="px-2 py-2.5 font-semibold">Identifiant</th>
                <th className="px-2 py-2.5 font-semibold">Rôle</th>
                <th className="px-2 py-2.5 text-right font-semibold">Dossiers</th>
                <th className="px-2 py-2.5 font-semibold">Dernière connexion</th>
                {SERVEUR && <th className="px-2 py-2.5 font-semibold">Double authentification</th>}
                <th className="px-2 py-2.5 font-semibold">État</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {global.utilisateurs.map((u) => (
                <tr key={u.id} className="align-middle">
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-2.5">
                      <span className={cx('inline-flex h-8 w-8 flex-none items-center justify-center rounded-full', u.role === 'admin' ? 'bg-warn-soft text-warn' : 'bg-accent-soft text-accent-strong')}>
                        {u.role === 'admin' ? <KeyRound size={15} aria-hidden="true" /> : <UserRound size={15} aria-hidden="true" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-medium text-ink">{nomUtilisateur(u)}{u.id === user.id ? ' (vous)' : ''}</span>
                        <span className="block text-[12px] text-ink-3">{u.titre}</span>
                      </span>
                    </span>
                  </td>
                  <td className="px-2 py-2.5 font-mono text-[12.5px] text-ink-2">{u.identifiant}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-ink-2">{u.role === 'admin' ? 'Super-administrateur' : 'Praticien'}</td>
                  <td className="tnum px-2 py-2.5 text-right font-mono text-ink-2">{u.role === 'admin' ? '—' : statsDe(global, u.id).patients}</td>
                  <td className="tnum whitespace-nowrap px-2 py-2.5 font-mono text-[12.5px] text-ink-2">{u.derniereConnexion ? horodatage(u.derniereConnexion) : 'Jamais'}</td>
                  {SERVEUR && <td className="px-2 py-2.5"><Pill tone={u.mfa ? 'ok' : 'warn'}>{u.mfa ? 'Activée' : 'À activer'}</Pill></td>}
                  <td className="px-2 py-2.5"><Pill tone={u.actif ? 'ok' : 'neutral'}>{u.actif ? 'Actif' : 'Désactivé'}</Pill></td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right">
                    <Btn size="sm" variant="ghost" icon={Pencil} onClick={() => setForm({ compte: u })}>Modifier</Btn>
                    {SERVEUR && u.mfa && u.id !== user.id && <ConfirmBtn label="Réinit. 2FA" confirmLabel="Réinitialiser la 2FA" onConfirm={() => actions.reinitialiserMfa(u.id)} />}
                    {u.id !== user.id && (u.actif ? <ConfirmBtn label="Désactiver" confirmLabel="Confirmer" onConfirm={() => actions.basculerActif(u.id)} /> : <Btn size="sm" variant="ghost" onClick={() => actions.basculerActif(u.id)}>Réactiver</Btn>)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {form && <CompteForm compte={form.compte} onClose={() => setForm(null)} />}
    </div>
  );
}

/* ---------- Réglages du cabinet ---------- */
export function Reglages() {
  const { global, actions } = useApp();
  const [c, setC] = useState(global.cabinet);
  const [n, setN] = useState(() => JSON.parse(JSON.stringify(global.normes)));
  const [b, setB] = useState(() => global.bareme.map((a) => ({ ...a })));
  const set = (k) => (v) => setC((x) => ({ ...x, [k]: v }));
  const setNorme = (dist, sens, i) => (v) => setN((x) => {
    const y = JSON.parse(JSON.stringify(x));
    y.fusion[dist][sens][i] = v;
    return y;
  });
  const setLibelle = (code) => (v) => setB((l) => l.map((a) => (a.code === code ? { ...a, libelle: v, aPreciser: false } : a)));
  const setFamille = (code) => (v) => setB((l) => l.map((a) => (a.code === code ? { ...a, famille: v } : a)));
  const enregistrer = () => {
    const propre = { ppc: num(n.ppc) || NORMES_DEFAUT.ppc, fusion: {} };
    ['vl', 'vp'].forEach((dist) => {
      propre.fusion[dist] = {};
      ['d', 'c'].forEach((sens) => {
        propre.fusion[dist][sens] = [0, 1].map((i) => num(n.fusion[dist][sens][i]) ?? NORMES_DEFAUT.fusion[dist][sens][i]);
      });
    });
    actions.enregistrerReglages({ cabinet: { ...c, inactivite: Math.max(1, parseInt(c.inactivite, 10) || 15) }, normes: propre, bareme: b });
  };
  const valeur = valeurAMY(c);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Super-administrateur</p>
          <h1 className="mt-1 text-[25px] font-bold leading-tight text-ink">Réglages du cabinet</h1>
          <p className="mt-1 max-w-3xl text-[13.5px] text-ink-2">Coordonnées reprises dans les comptes-rendus, tarification, sécurité des sessions, normes cliniques et barème NGAP.</p>
        </div>
        <Btn variant="primary" icon={Check} onClick={enregistrer}>Enregistrer les réglages</Btn>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-2">
        <Card>
          <CardHead title="Coordonnées du cabinet" hint="en-tête des comptes-rendus" />
          <div className="grid gap-3 px-4 py-4 sm:grid-cols-2">
            <p className="text-[12px] text-ink-3 sm:col-span-2">Les mentions légales, visibles depuis la page de connexion, sont en bas de ce bloc.</p>
            <Field label="Nom du cabinet" htmlFor="rg-nom" className="sm:col-span-2"><Text id="rg-nom" value={c.nom} onChange={set('nom')} /></Field>
            <Field label="Adresse" htmlFor="rg-adresse" className="sm:col-span-2"><Text id="rg-adresse" value={c.adresse} onChange={set('adresse')} /></Field>
            <Field label="Code postal" htmlFor="rg-cp"><Text id="rg-cp" value={c.cp} onChange={set('cp')} /></Field>
            <Field label="Ville" htmlFor="rg-ville"><Text id="rg-ville" value={c.ville} onChange={set('ville')} /></Field>
            <Field label="Téléphone" htmlFor="rg-tel"><Text id="rg-tel" value={c.tel} onChange={set('tel')} /></Field>
            <Field label="Courriel" htmlFor="rg-email"><Text id="rg-email" value={c.email} onChange={set('email')} /></Field>
            <Field label="Éditeur du site (mentions légales)" htmlFor="rg-editeur" className="sm:col-span-2" hint="Nom ou raison sociale, adresse, numéro SIRET le cas échéant.">
              <Area id="rg-editeur" value={c.editeur || ''} onChange={set('editeur')} />
            </Field>
            <Field label="Hébergeur" htmlFor="rg-hebergeur" className="sm:col-span-2" hint="Raison sociale, adresse et téléphone de l'hébergeur certifié HDS.">
              <Area id="rg-hebergeur" value={c.hebergeur || ''} onChange={set('hebergeur')} />
            </Field>
            <Field label="Contact pour les données personnelles" htmlFor="rg-contact" className="sm:col-span-2"><Text id="rg-contact" value={c.contact || ''} onChange={set('contact')} placeholder="Adresse de contact ou délégué à la protection des données" /></Field>
          </div>
        </Card>

        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHead title="Tarification" hint="valeur de la lettre-clé AMY" />
            <div className="flex flex-col gap-2 px-4 py-4">
              <Segmented id="rg-zone" label="Zone tarifaire" allowEmpty={false} value={c.zone || 'metropole'} onChange={set('zone')} options={Object.entries(ZONES).map(([k, z]) => [k, `${z.label} : ${euro(z.valeur)}`])} />
              <p className="text-[12.5px] text-ink-3">AMY appliquée aux nouvelles factures : <span className="tnum font-mono font-medium text-ink">{euro(valeur)}</span>. Les factures déjà enregistrées gardent leur montant.</p>
            </div>
          </Card>
          <Card>
            <CardHead title="Sécurité des sessions" />
            <div className="px-4 py-4">
              <Field label="Déconnexion automatique après" htmlFor="rg-inactivite" className="max-w-[240px]">
                <Select id="rg-inactivite" value={String(c.inactivite || 15)} onChange={set('inactivite')} placeholder={null} options={[5, 10, 15, 30, 60].map((m) => [String(m), `${m} minutes d'inactivité`])} />
              </Field>
            </div>
          </Card>
          <Card>
            <CardHead title="Normes cliniques" hint="amplitudes de fusion selon Hugonnier, PPC" />
            <div className="flex flex-col gap-3 px-4 py-4">
              <div className="grid grid-cols-[minmax(0,1fr)_76px_14px_76px] items-center gap-x-2 gap-y-2 sm:max-w-md">
                {[['vl', 'd', 'D : divergence de loin'], ['vl', 'c', 'C : convergence de loin'], ['vp', 'd', "D' : divergence de près"], ['vp', 'c', "C' : convergence de près"]].map(([dist, sens, label]) => (
                  <React.Fragment key={dist + sens}>
                    <span className="text-[13px] text-ink-2">{label}</span>
                    <Num id={`rg-norme-${dist}-${sens}-min`} aria-label={`${label}, borne basse`} value={n.fusion[dist][sens][0]} min={0} onChange={setNorme(dist, sens, 0)} />
                    <span className="text-center text-[12px] text-ink-3">à</span>
                    <Num id={`rg-norme-${dist}-${sens}-max`} aria-label={`${label}, borne haute`} value={n.fusion[dist][sens][1]} min={0} onChange={setNorme(dist, sens, 1)} />
                  </React.Fragment>
                ))}
                <span className="text-[13px] text-ink-2">PPC normal jusqu'à</span>
                <Num id="rg-norme-ppc" aria-label="PPC normal jusqu'à" unit="cm" value={n.ppc} min={1} onChange={(v) => setN((x) => ({ ...x, ppc: v }))} />
                <span />
                <span />
              </div>
              <p className="text-[12px] leading-snug text-ink-3">
                Ces bornes pilotent les appréciations de la saisie, la règle de décision thérapeutique et la phrase du compte-rendu. Les valeurs publiées pour les normes d'Hugonnier varient légèrement selon les ouvrages : ajustez-les à votre référence.
              </p>
              <div><Btn size="sm" variant="ghost" icon={RotateCcw} onClick={() => setN(JSON.parse(JSON.stringify(NORMES_DEFAUT)))}>Revenir aux valeurs par défaut</Btn></div>
            </div>
          </Card>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHead title="Barème NGAP" hint={`tarifs à ${euro(valeur)} l'AMY`} right={<Btn size="sm" variant="ghost" icon={RotateCcw} onClick={() => setB(BAREME_DEFAUT.map((a) => ({ ...a })))}>Barème par défaut</Btn>} />
        <p className="border-b border-line bg-surface-2 px-4 py-2 text-[12px] leading-snug text-ink-3">Les coefficients sont ceux communiqués par le cabinet. Complétez les libellés marqués « à préciser » : ils apparaîtront dans la facturation.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
            <thead>
              <tr className="border-b border-line text-[11.5px] font-semibold uppercase tracking-wider text-ink-3">
                <th className="px-4 py-2.5 font-semibold">Cotation</th>
                <th className="px-2 py-2.5 text-right font-semibold">Tarif</th>
                <th className="px-2 py-2.5 font-semibold">Libellé</th>
                <th className="px-4 py-2.5 font-semibold">Famille</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {b.map((a) => (
                <tr key={a.code} className="align-middle">
                  <td className="tnum whitespace-nowrap px-4 py-1.5 font-mono text-[12.5px] font-medium text-ink">{cotation(a.coef)}</td>
                  <td className="tnum whitespace-nowrap px-2 py-1.5 text-right font-mono text-[12.5px] text-ink-2">{euro(a.coef * valeur)}</td>
                  <td className="px-2 py-1.5">
                    <Text id={`rg-acte-${a.code}`} aria-label={`Libellé de ${cotation(a.coef)}`} className={cx(a.aPreciser && '!border-warn')} value={a.libelle} onChange={setLibelle(a.code)} />
                  </td>
                  <td className="px-4 py-1.5"><Select id={`rg-famille-${a.code}`} aria-label={`Famille de ${cotation(a.coef)}`} className="!w-[190px]" value={a.famille} onChange={setFamille(a.code)} placeholder={null} options={FAMILLES_ACTES} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {!SERVEUR && <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
          <div className="min-w-0">
            <p className="text-[13.5px] font-medium text-ink">Données de démonstration</p>
            <p className="text-[12.5px] text-ink-3">Efface toutes les saisies, recharge les comptes et les patients fictifs d'origine, puis ferme la session.</p>
          </div>
          <ConfirmBtn label="Réinitialiser" confirmLabel="Tout effacer et recharger" icon={RotateCcw} size="md" onConfirm={() => actions.reinitialiser()} />
        </div>
      </Card>}
    </div>
  );
}
