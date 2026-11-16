// Conformité et sécurité : état des lieux, journal d'audit, sauvegarde chiffrée, consentements.
import React, { useRef, useState } from 'react';
import { Check, Download, FileLock2, FolderOpen, ScrollText, ServerCog, ShieldCheck, TriangleAlert, Upload } from 'lucide-react';
import { Btn, Card, CardHead, ConfirmBtn, Empty, Field, Notice, Pill, Segmented, Select, Text, cx, useApp } from '../ui.jsx';
import { ACTIONS_JOURNAL, CATEGORIES_JOURNAL, TRANSMISSIONS, nomUtilisateur, rgpdVide, statutRgpd } from '../domain.js';
import { chiffrementDisponible, chiffrer, dechiffrer } from '../crypto.js';
import { remettreFichier } from '../pdf.js';
import { vuePraticien } from '../store.js';
import { dateCourte, horodatage, nomComplet, slug, todayISO } from '../lib.js';
import { useTelechargements } from './commun.jsx';

const TON_CATEGORIE = { acces: 'neutral', securite: 'warn', dossiers: 'accent', bilans: 'accent', agenda: 'info', facturation: 'info', administration: 'plum' };

function Point({ ok, titre, children }) {
  const Icone = ok ? Check : TriangleAlert;
  return (
    <li className="flex gap-2.5">
      <span className={cx('mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full', ok ? 'bg-ok-soft text-ok' : 'bg-warn-soft text-warn')}>
        <Icone size={12} strokeWidth={2.6} aria-hidden="true" />
      </span>
      <span className="min-w-0 text-[13px] leading-relaxed text-ink-2">
        <span className="font-semibold text-ink">{titre}</span> {children}
      </span>
    </li>
  );
}

/* ---------- Synthèse ---------- */
function Synthese() {
  const { global } = useApp();
  const praticiens = global.utilisateurs.filter((u) => u.role === 'praticien');
  const complets = global.patients.filter((p) => statutRgpd(p).complet).length;
  return (
    <div className="flex flex-col gap-4">
      <Notice tone="warn" icon={ServerCog} title="Hébergement HDS requis avant toute mise en production">
        Cette version fonctionne entièrement dans votre navigateur : les données y sont stockées en clair, sur cet appareil, sans serveur. Elle convient pour une démonstration avec des patients fictifs. Dès qu'il s'agit de vrais patients, la loi impose de confier les données de santé à un hébergeur certifié HDS (Code de la santé publique, article L. 1111-8), avec une authentification forte des professionnels.
      </Notice>

      <div className="grid items-start gap-4 xl:grid-cols-2">
        <Card>
          <CardHead icon={ShieldCheck} title="Mis en œuvre dans cette maquette" />
          <ul className="flex flex-col gap-3 px-4 py-4">
            <Point ok titre="Comptes nominatifs et rôles.">{praticiens.length} praticien{praticiens.length > 1 ? 's' : ''} et un super-administrateur, chacun avec son identifiant.</Point>
            <Point ok titre="Cloisonnement par praticien.">Chaque dossier, rendez-vous, bilan et facture est rattaché à son praticien, et l'interface ne charge que les siens.</Point>
            <Point ok titre="Accès exceptionnel du super-administrateur.">Il ne parcourt pas les dossiers médicaux : il doit déclarer un motif, un bandeau reste affiché, et le début comme la fin de l'accès sont consignés et visibles par le praticien.</Point>
            <Point ok titre="Journal d'audit.">{global.journal.length} événements consignés : connexions, échecs, consultations de dossiers, exports, modifications.</Point>
            <Point ok titre="Protection de la session.">Déconnexion automatique après {global.cabinet.inactivite} minutes d'inactivité, suspension après cinq échecs de connexion.</Point>
            <Point ok titre="Sauvegarde chiffrée.">Export AES-256-GCM protégé par une phrase secrète, illisible sans elle.</Point>
            <Point ok titre="Information et consentements des patients.">{complets} dossier{complets > 1 ? 's' : ''} sur {global.patients.length} à jour, avec la date de remise de la note d'information.</Point>
          </ul>
          <div className="border-t border-line px-4 py-3">
            <p className="eyebrow mb-2">Répartition des données par praticien</p>
            <ul className="grid gap-1.5">
              {praticiens.map((u) => {
                const v = vuePraticien(global, u.id);
                return (
                  <li key={u.id} className="flex flex-wrap items-baseline justify-between gap-x-3 text-[13px]">
                    <span className="font-medium text-ink">{nomUtilisateur(u)}</span>
                    <span className="tnum font-mono text-[12.5px] text-ink-2">{v.patients.length} dossiers · {v.bilans.length} bilans · {v.rdvs.length} rendez-vous · {v.factures.length} factures</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </Card>

        <Card>
          <CardHead icon={TriangleAlert} title="À mettre en place avant tout usage avec de vrais patients" />
          <ul className="flex flex-col gap-3 px-4 py-4">
            <Point titre="Hébergement certifié HDS.">La base de données et ses sauvegardes doivent être chez un hébergeur certifié. La liste des hébergeurs certifiés est publiée par l'Agence du numérique en santé.</Point>
            <Point titre="Authentification forte.">Pro Santé Connect, avec l'e-CPS ou la carte CPS, à la place des mots de passe de cette maquette.</Point>
            <Point titre="Contrôle d'accès côté serveur.">Dans un navigateur, le cloisonnement organise l'affichage mais ne protège pas les données : il doit être appliqué par le serveur.</Point>
            <Point titre="Chiffrement.">En transit (TLS) et au repos. Ici, le stockage du navigateur n'est pas chiffré ; seule la sauvegarde exportée l'est.</Point>
            <Point titre="Journal inaltérable.">Horodaté et conservé côté serveur, hors de portée des utilisateurs.</Point>
            <Point titre="Documentation RGPD.">Registre des traitements (art. 30), analyse d'impact (art. 35), contrats de sous-traitance avec l'éditeur et l'hébergeur (art. 28).</Point>
            <Point titre="Violations de données.">Procédure de notification à la CNIL dans les 72 heures (art. 33).</Point>
            <Point titre="Conservation des dossiers.">Durées et archivage à fixer. Le référentiel de la CNIL pour les cabinets médicaux et paramédicaux sert de repère, à confirmer avec votre délégué à la protection des données.</Point>
            <Point titre="Droits des patients.">Information à la première consultation, puis réponse aux demandes d'accès, de rectification et d'opposition.</Point>
          </ul>
          <p className="border-t border-line px-4 py-3 text-[12px] leading-snug text-ink-3">Ces repères ne remplacent pas l'avis d'un délégué à la protection des données ou d'un conseil juridique.</p>
        </Card>
      </div>
    </div>
  );
}

/* ---------- Journal d'audit ---------- */
function Journal() {
  const { global, user, estAdmin } = useApp();
  const [categorie, setCategorie] = useState('');
  const [auteur, setAuteur] = useState('');
  const [limite, setLimite] = useState(80);
  const U = Object.fromEntries(global.utilisateurs.map((u) => [u.id, u]));
  const visibles = global.journal.filter((e) => estAdmin || e.userId === user.id || e.praticienId === user.id);
  const lignes = visibles.filter((e) => (!categorie || (ACTIONS_JOURNAL[e.action] || [])[1] === categorie) && (!auteur || e.userId === auteur));
  return (
    <Card className="overflow-hidden">
      <CardHead
        icon={ScrollText}
        title="Journal d'audit"
        hint={`${lignes.length} événement${lignes.length > 1 ? 's' : ''}`}
        right={
          <div className="flex flex-wrap gap-2">
            <Select id="journal-categorie" aria-label="Filtrer par catégorie" className="!w-[170px]" value={categorie} onChange={setCategorie} placeholder="Toutes les catégories" options={CATEGORIES_JOURNAL} />
            {estAdmin && <Select id="journal-auteur" aria-label="Filtrer par utilisateur" className="!w-[190px]" value={auteur} onChange={setAuteur} placeholder="Tous les utilisateurs" options={global.utilisateurs.map((u) => [u.id, nomUtilisateur(u)])} />}
          </div>
        }
      />
      <p className="border-b border-line bg-surface-2 px-4 py-2 text-[12px] leading-snug text-ink-3">
        {estAdmin ? "Vous voyez l'ensemble des événements du cabinet." : 'Vous voyez vos propres actions et tout accès à vos dossiers, y compris ceux du super-administrateur.'} Le journal ne peut être ni modifié ni vidé depuis l'application.
      </p>
      {lignes.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-[13px]">
            <thead>
              <tr className="border-b border-line text-[11.5px] font-semibold uppercase tracking-wider text-ink-3">
                <th className="px-4 py-2.5 font-semibold">Date et heure</th>
                <th className="px-2 py-2.5 font-semibold">Utilisateur</th>
                <th className="px-2 py-2.5 font-semibold">Événement</th>
                <th className="px-4 py-2.5 font-semibold">Objet et détail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {lignes.slice(0, limite).map((e) => {
                const [libelle, cat] = ACTIONS_JOURNAL[e.action] || [e.action, 'acces'];
                const u = U[e.userId];
                return (
                  <tr key={e.id} className="align-top">
                    <td className="tnum whitespace-nowrap px-4 py-2 font-mono text-[12.5px] text-ink-2">{horodatage(e.ts)}</td>
                    <td className="whitespace-nowrap px-2 py-2 text-ink">
                      {u ? nomUtilisateur(u) : <span className="text-ink-3">Non identifié</span>}
                      {u && u.role === 'admin' && <span className="ml-1.5 text-[11px] text-ink-3">(admin)</span>}
                    </td>
                    <td className="px-2 py-2"><Pill tone={TON_CATEGORIE[cat]}>{libelle}</Pill></td>
                    <td className="px-4 py-2 text-ink-2">
                      {e.cible && <span className="font-medium text-ink">{e.cible}</span>}
                      {e.cible && e.detail ? ' · ' : ''}
                      {e.detail}
                      {e.demo && <span className="ml-1.5 text-[11px] text-ink-3">(exemple)</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty icon={ScrollText} title="Aucun événement pour ce filtre" />
      )}
      {lignes.length > limite && (
        <div className="border-t border-line px-4 py-2.5 text-center">
          <Btn size="sm" variant="ghost" onClick={() => setLimite(limite + 200)}>Afficher les événements plus anciens</Btn>
        </div>
      )}
    </Card>
  );
}

/* ---------- Sauvegarde chiffrée ---------- */
function Sauvegarde() {
  const { global, user, estAdmin, actions, toast } = useApp();
  const dl = useTelechargements();
  const [phrase, setPhrase] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [occupe, setOccupe] = useState(false);
  const [fichier, setFichier] = useState(null);
  const [phraseRestauration, setPhraseRestauration] = useState('');
  const [erreur, setErreur] = useState('');
  const champ = useRef(null);
  const dispo = chiffrementDisponible();
  const valide = phrase.length >= 12 && phrase === confirmation;

  const exporter = async () => {
    setOccupe(true);
    try {
      const etat = estAdmin ? global : { ...vuePraticien(global, user.id), utilisateurs: [], journal: global.journal.filter((e) => e.userId === user.id || e.praticienId === user.id) };
      const paquet = await chiffrer({ etat }, phrase, { portee: estAdmin ? 'cabinet' : 'praticien', auteur: nomUtilisateur(user), cree: new Date().toISOString() });
      const nom = `saccades-sauvegarde-${estAdmin ? 'cabinet' : slug(nomUtilisateur(user)).toLowerCase()}_${todayISO()}.json`;
      const r = await remettreFichier(nom, JSON.stringify(paquet), 'application/json', dl);
      if (r === 'ok') {
        actions.tracer('sauvegarde.export', estAdmin ? 'Ensemble du cabinet' : `Dossiers de ${nomUtilisateur(user)}`, `${etat.patients.length} dossiers, chiffrement AES-256-GCM`);
        toast(`Sauvegarde chiffrée remise : ${nom}`);
        setPhrase('');
        setConfirmation('');
      } else toast(r === 'refuse' ? 'Export annulé.' : "Le téléchargement n'est pas disponible dans cet affichage.", r === 'refuse' ? undefined : 'danger');
    } catch (e) {
      toast("Le chiffrement a échoué : la sauvegarde n'a pas été créée.", 'danger');
    }
    setOccupe(false);
  };

  const lire = (e) => {
    const f = e.target.files && e.target.files[0];
    setErreur('');
    if (!f) return setFichier(null);
    const lecteur = new FileReader();
    lecteur.onload = () => {
      try {
        const contenu = JSON.parse(String(lecteur.result));
        if (contenu.format !== 'saccades-sauvegarde') throw new Error('format');
        setFichier({ nom: f.name, contenu });
      } catch (err) {
        setFichier(null);
        setErreur("Ce fichier n'est pas une sauvegarde SACCADES.");
      }
    };
    lecteur.readAsText(f);
    return undefined;
  };
  const restaurer = async () => {
    setErreur('');
    try {
      const { etat } = await dechiffrer(fichier.contenu, phraseRestauration);
      if (fichier.contenu.portee !== 'cabinet' || !etat || etat.version !== 2 || !Array.isArray(etat.utilisateurs)) return setErreur('Seule une sauvegarde complète du cabinet peut être restaurée.');
      actions.restaurer(etat);
      setFichier(null);
      setPhraseRestauration('');
      if (champ.current) champ.current.value = '';
      return undefined;
    } catch (e) {
      return setErreur('Phrase secrète incorrecte, ou fichier altéré.');
    }
  };

  return (
    <div className="grid items-start gap-4 xl:grid-cols-2">
      <Card>
        <CardHead icon={FileLock2} title={estAdmin ? 'Sauvegarde complète du cabinet' : 'Sauvegarde de mes dossiers'} />
        <div className="flex flex-col gap-3 px-4 py-4">
          <p className="text-[13px] leading-relaxed text-ink-2">
            {estAdmin ? 'Tous les comptes, dossiers, bilans, factures et le journal.' : 'Vos dossiers, rendez-vous, bilans et factures, et les lignes du journal qui vous concernent.'} Le fichier est chiffré en AES-256-GCM avec une clé dérivée de votre phrase secrète (PBKDF2, 310 000 itérations). Sans cette phrase, il est illisible : conservez-la à part du fichier.
          </p>
          {!dispo && <Notice tone="danger" icon={TriangleAlert}>Ce navigateur ne propose pas le chiffrement nécessaire dans ce contexte : l'export est désactivé plutôt que de produire un fichier en clair.</Notice>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Phrase secrète (12 caractères minimum)" htmlFor="sv-phrase"><Text id="sv-phrase" type="password" autoComplete="new-password" value={phrase} onChange={setPhrase} /></Field>
            <Field label="Confirmation" htmlFor="sv-confirmation" hint={confirmation && phrase !== confirmation ? 'Les deux saisies diffèrent.' : undefined}><Text id="sv-confirmation" type="password" autoComplete="new-password" value={confirmation} onChange={setConfirmation} /></Field>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Btn variant="primary" icon={Download} disabled={!dispo || !valide || occupe || (dl === undefined)} onClick={exporter}>{occupe ? 'Chiffrement…' : 'Créer la sauvegarde chiffrée'}</Btn>
            <span className="text-[12px] text-ink-3">L'export est consigné au journal d'audit.</span>
          </div>
        </div>
      </Card>

      <Card>
        <CardHead icon={Upload} title="Restaurer une sauvegarde" />
        {estAdmin ? (
          <div className="flex flex-col gap-3 px-4 py-4">
            <p className="text-[13px] leading-relaxed text-ink-2">La restauration remplace toutes les données du cabinet par celles du fichier. Elle est réservée au super-administrateur et consignée au journal.</p>
            <Field label="Fichier de sauvegarde (.json)" htmlFor="sv-fichier">
              <input ref={champ} id="sv-fichier" type="file" accept=".json,application/json" className="inp !py-1" onChange={lire} />
            </Field>
            {fichier && (
              <p className="rounded-md bg-surface-2 px-3 py-2 text-[12.5px] text-ink-2">
                <span className="font-medium text-ink">{fichier.nom}</span> · créée le {fichier.contenu.cree ? dateCourte(String(fichier.contenu.cree).slice(0, 10)) : 'date inconnue'} par {fichier.contenu.auteur || 'auteur inconnu'} · portée : {fichier.contenu.portee === 'cabinet' ? 'cabinet complet' : 'un praticien'}
              </p>
            )}
            <Field label="Phrase secrète de la sauvegarde" htmlFor="sv-phrase-restauration"><Text id="sv-phrase-restauration" type="password" autoComplete="off" value={phraseRestauration} onChange={setPhraseRestauration} /></Field>
            {erreur && <p className="text-[12.5px] text-danger" role="alert">{erreur}</p>}
            <div>
              {fichier && phraseRestauration ? (
                <ConfirmBtn label="Restaurer cette sauvegarde" confirmLabel="Remplacer toutes les données" icon={Upload} size="md" onConfirm={restaurer} />
              ) : (
                <Btn icon={Upload} disabled>Restaurer cette sauvegarde</Btn>
              )}
            </div>
          </div>
        ) : (
          <p className="px-4 py-4 text-[13px] leading-relaxed text-ink-2">La restauration remplace l'ensemble des données du cabinet : elle est réservée au super-administrateur. Votre sauvegarde personnelle sert de copie de sécurité et de réponse à une demande de portabilité.</p>
        )}
      </Card>
    </div>
  );
}

/* ---------- Consentements ---------- */
function Consentements() {
  const { state, global, portee, go } = useApp();
  if (!portee) {
    const praticiens = global.utilisateurs.filter((u) => u.role === 'praticien');
    return (
      <Card>
        <CardHead icon={ShieldCheck} title="Information et consentements des patients" hint="chiffres par praticien" />
        <ul className="divide-y divide-line">
          {praticiens.map((u) => {
            const ps = global.patients.filter((p) => p.praticienId === u.id);
            const ok = ps.filter((p) => statutRgpd(p).complet).length;
            return (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <span className="text-[13.5px] font-medium text-ink">{nomUtilisateur(u)}</span>
                <span className="flex items-center gap-3">
                  <span className="tnum font-mono text-[12.5px] text-ink-2">{ok}/{ps.length} dossiers à jour</span>
                  <Pill tone={ok === ps.length ? 'ok' : 'warn'}>{ok === ps.length ? 'Complet' : `${ps.length - ok} à compléter`}</Pill>
                </span>
              </li>
            );
          })}
        </ul>
        <p className="border-t border-line px-4 py-3 text-[12px] leading-snug text-ink-3">Le détail nominatif appartient à chaque praticien. Vous n'y accédez que par un accès exceptionnel motivé, depuis la supervision.</p>
      </Card>
    );
  }
  const patients = [...state.patients].sort((a, b) => a.nom.localeCompare(b.nom));
  return (
    <Card className="overflow-hidden">
      <CardHead icon={ShieldCheck} title="Information et consentements des patients" hint={`${patients.filter((p) => statutRgpd(p).complet).length}/${patients.length} dossiers à jour`} />
      <p className="border-b border-line bg-surface-2 px-4 py-2 text-[12px] leading-snug text-ink-3">
        La tenue du dossier de soins ne repose pas sur le consentement, mais le patient doit en être informé. Le consentement concerne les usages facultatifs. La mise à jour se fait dans chaque dossier.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-left text-[13px]">
          <thead>
            <tr className="border-b border-line text-[11.5px] font-semibold uppercase tracking-wider text-ink-3">
              <th className="px-4 py-2.5 font-semibold">Patient</th>
              <th className="px-2 py-2.5 font-semibold">Note d'information</th>
              <th className="px-2 py-2.5 font-semibold">Transmission au prescripteur</th>
              <th className="px-2 py-2.5 font-semibold">Rappels</th>
              <th className="px-2 py-2.5 font-semibold">Recherche</th>
              <th className="px-2 py-2.5 font-semibold">État</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {patients.map((p) => {
              const r = { ...rgpdVide(), ...(p.rgpd || {}) };
              const st = statutRgpd(p);
              return (
                <tr key={p.id} className="align-middle">
                  <td className="whitespace-nowrap px-4 py-2 font-medium text-ink">{nomComplet(p)}</td>
                  <td className="tnum whitespace-nowrap px-2 py-2 font-mono text-[12.5px] text-ink-2">{r.information ? dateCourte(r.information) : '—'}</td>
                  <td className="px-2 py-2 text-ink-2">{TRANSMISSIONS[r.transmission || ''].label}</td>
                  <td className="px-2 py-2 text-ink-2">{r.rappels ? 'Oui' : 'Non'}</td>
                  <td className="px-2 py-2 text-ink-2">{r.recherche ? 'Oui' : 'Non'}</td>
                  <td className="px-2 py-2"><Pill tone={st.tone}>{st.label}</Pill></td>
                  <td className="px-4 py-2 text-right"><Btn size="sm" variant="ghost" icon={FolderOpen} onClick={() => go('patients', { patientId: p.id })}>Dossier</Btn></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default function Conformite() {
  const [onglet, setOnglet] = useState('synthese');
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="eyebrow">RGPD et données de santé</p>
        <h1 className="mt-1 text-[25px] font-bold leading-tight text-ink">Conformité et sécurité</h1>
        <p className="mt-1 max-w-3xl text-[13.5px] text-ink-2">Ce que la maquette met déjà en œuvre, et ce qu'il faudra ajouter pour être en règle avec de vrais patients.</p>
      </div>
      <Segmented id="conformite-onglet" label="Rubrique" allowEmpty={false} value={onglet} onChange={setOnglet} options={[['synthese', 'Synthèse et hébergement HDS'], ['journal', "Journal d'audit"], ['sauvegarde', 'Sauvegarde chiffrée'], ['consentements', 'Consentements']]} />
      {onglet === 'synthese' && <Synthese />}
      {onglet === 'journal' && <Journal />}
      {onglet === 'sauvegarde' && <Sauvegarde />}
      {onglet === 'consentements' && <Consentements />}
    </div>
  );
}
