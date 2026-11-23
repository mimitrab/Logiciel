// Connexion. En démonstration, l'authentification est simulée dans le navigateur.
// En production (mode serveur) : mot de passe, double authentification par application (TOTP),
// changement du mot de passe provisoire. Objectif à terme : Pro Santé Connect (e-CPS, carte CPS).
import React, { useEffect, useState } from 'react';
import { ArrowLeft, Building2, Gift, KeyRound, Lock, LogIn, ShieldCheck, Smartphone, UserPlus, UserRound } from 'lucide-react';
import { Btn, Field, Logo, Text, cx } from '../ui.jsx';
import { nomUtilisateur } from '../domain.js';
import { MOT_DE_PASSE_DEMO } from '../seed.js';
import { SERVEUR } from '../mode.js';
import { api } from '../api.js';
import Mentions from './Mentions.jsx';
import Inscription from './Inscription.jsx';

const ESSAIS_MAX = 5;
const BLOCAGE_S = 60;

function Cadre({ infos = {}, onAccueil, children }) {
  const o = infos.offre;
  const [mentions, setMentions] = useState(false);
  return (
    <div className="flex h-full flex-col overflow-y-auto bg-bg">
      {infos.annonce && (
        <p className={cx('gutter border-b py-2 text-center text-[13px] text-ink', infos.annonce.ton === 'warn' ? 'border-warn bg-warn-soft' : 'border-info bg-info-soft')} role="status">
          {infos.annonce.texte}
        </p>
      )}
      <div className="gutter mx-auto flex w-full flex-1 max-w-[920px] flex-col justify-center gap-6 py-8 md:flex-row md:items-center md:gap-10">
        <div className="md:w-[44%]">
          {onAccueil && (
            <button type="button" onClick={onAccueil} className="mb-5 inline-flex items-center gap-1.5 rounded text-[13px] font-medium text-ink-2 hover:text-ink">
              <ArrowLeft size={15} aria-hidden="true" /> Retour à l'accueil
            </button>
          )}
          <div className="flex items-center gap-3 text-accent">
            <Logo size={44} />
            <div className="leading-tight">
              <h1 className="font-display text-[30px] font-bold tracking-[0.06em] text-ink">SACCADES</h1>
              <p className="text-[13px] text-ink-2">Logiciel de cabinet d'orthoptie</p>
            </div>
          </div>
          <p className="mt-5 text-[14px] leading-relaxed text-ink-2">
            Agenda, dossiers patients, bilans orthoptiques et comptes-rendus, facturation NGAP. Chaque praticien accède à ses seuls dossiers, et chaque cabinet est isolé des autres.
          </p>
          <p className="mt-4 flex items-start gap-2 rounded-lg border border-line bg-surface px-3.5 py-3 text-[12.5px] leading-relaxed text-ink-2">
            <ShieldCheck size={16} className="mt-0.5 flex-none text-accent" aria-hidden="true" />
            <span>
              {SERVEUR
                ? "Accès réservé aux professionnels du cabinet. Connexion protégée par une double authentification ; chaque accès est consigné."
                : "Démonstration : patients fictifs, données conservées dans votre navigateur, connexion simulée. N'y saisissez aucune donnée réelle."}
            </span>
          </p>
          {o && (
            <p className="mt-3 flex items-start gap-2 rounded-lg border border-accent bg-accent-soft px-3.5 py-3 text-[12.5px] leading-relaxed text-ink">
              <Gift size={16} className="mt-0.5 flex-none text-accent" aria-hidden="true" />
              <span>
                <span className="font-semibold">{o.essaiMois} mois gratuits</span>, puis {o.prixMensuelHT} € HT par mois et par praticien, sans engagement. Parrainage : {o.moisParrain} mois offert{o.moisParrain > 1 ? 's' : ''} pour vous et {o.moisFilleul} pour votre confrère, dès qu'il s'abonne.
              </span>
            </p>
          )}
          <button type="button" onClick={() => setMentions(true)} className="mt-3 rounded text-[12.5px] font-medium text-accent hover:underline">Mentions légales et confidentialité</button>
        </div>
        <div className="card flex-1 p-5 sm:p-6">{children}</div>
      </div>
      {mentions && <Mentions cabinet={infos} onClose={() => setMentions(false)} />}
    </div>
  );
}

/* ---------- Démonstration : connexion locale ---------- */
function ConnexionDemo({ utilisateurs, cabinet, plateforme, onLogin, onAccueil }) {
  const [identifiant, setIdentifiant] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [echecs, setEchecs] = useState(0);
  const [bloque, setBloque] = useState(0);
  const [, tic] = useState(0);
  const reste = Math.max(0, Math.ceil((bloque - Date.now()) / 1000));
  useEffect(() => {
    if (!reste) return undefined;
    const t = setInterval(() => tic((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [reste > 0]);

  const tenter = (id, mdp) => {
    if (reste) return;
    if (onLogin(id, mdp)) return;
    const n = echecs + 1;
    if (n >= ESSAIS_MAX) {
      setBloque(Date.now() + BLOCAGE_S * 1000);
      setEchecs(0);
      setErreur(`Trop de tentatives : connexion suspendue pendant ${BLOCAGE_S} secondes.`);
    } else {
      setEchecs(n);
      setErreur('Identifiant ou mot de passe incorrect.');
    }
  };
  const demos = utilisateurs.filter((u) => u.demo && u.actif);

  return (
    <Cadre infos={{ ...cabinet, offre: plateforme && plateforme.offre, annonce: plateforme && plateforme.offre && plateforme.offre.annonce ? { texte: plateforme.offre.annonce, ton: plateforme.offre.annonceTon } : null }} onAccueil={onAccueil}>
      <h2 className="text-[17px] font-semibold text-ink">Connexion</h2>
      <p className="mt-0.5 text-[12.5px] text-ink-3">{cabinet.nom}</p>
      <form className="mt-4 grid gap-3" onSubmit={(e) => { e.preventDefault(); tenter(identifiant, motDePasse); }}>
        <Field label="Identifiant" htmlFor="login-identifiant">
          <Text id="login-identifiant" autoComplete="username" autoCapitalize="none" spellCheck="false" value={identifiant} onChange={(v) => { setIdentifiant(v); setErreur(''); }} placeholder="prenom.nom" />
        </Field>
        <Field label="Mot de passe" htmlFor="login-mdp">
          <Text id="login-mdp" type="password" autoComplete="current-password" value={motDePasse} onChange={(v) => { setMotDePasse(v); setErreur(''); }} />
        </Field>
        {(erreur || reste > 0) && (
          <p className="flex items-center gap-1.5 text-[12.5px] text-danger" role="alert">
            <Lock size={13} aria-hidden="true" /> {reste > 0 ? `Connexion suspendue : réessayez dans ${reste} s.` : erreur}
          </p>
        )}
        <Btn type="submit" variant="primary" size="lg" icon={LogIn} disabled={reste > 0 || !identifiant.trim() || !motDePasse}>Se connecter</Btn>
      </form>
      {demos.length > 0 && (
        <div className="mt-5 border-t border-line pt-4">
          <p className="eyebrow">Comptes de démonstration</p>
          <p className="mt-1 text-[12px] text-ink-3">
            Mot de passe de tous ces comptes : <span className="font-mono text-ink">{MOT_DE_PASSE_DEMO}</span>. Un clic ouvre la session.
          </p>
          <ul className="mt-2.5 grid gap-2">
            {demos.map((u) => (
              <li key={u.id}>
                <button type="button" disabled={reste > 0} onClick={() => tenter(u.identifiant, MOT_DE_PASSE_DEMO)} className="flex w-full items-center gap-3 rounded-md border border-line px-3 py-2 text-left transition-colors hover:border-line-strong hover:bg-surface-2 disabled:opacity-50">
                  <span className={cx('inline-flex h-8 w-8 flex-none items-center justify-center rounded-full', u.role === 'plateforme' ? 'bg-plum-soft text-plum' : u.role === 'admin' ? 'bg-warn-soft text-warn' : 'bg-accent-soft text-accent-strong')}>
                    {u.role === 'plateforme' ? <Building2 size={16} aria-hidden="true" /> : u.role === 'admin' ? <ShieldCheck size={16} aria-hidden="true" /> : <UserRound size={16} aria-hidden="true" />}
                  </span>
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate text-[13.5px] font-medium text-ink">{nomUtilisateur(u)}</span>
                    <span className="block truncate text-[12px] text-ink-3">{u.role === 'plateforme' ? 'Vous, propriétaire : inscriptions, abonnements, parrainages' : u.role === 'admin' ? 'Administrateur du cabinet : supervision, comptes' : `${u.titre}${u.gestionnaire ? ', gestionnaire du cabinet' : ''} : ses patients, ses bilans`}</span>
                  </span>
                  <span className="font-mono text-[11.5px] text-ink-3">{u.identifiant}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Cadre>
  );
}

/* ---------- Production : connexion par le serveur ---------- */
function ConnexionServeur({ etapeInitiale, onConnecte, ecranInitial, onAccueil }) {
  const [etape, setEtape] = useState(etapeInitiale || 'identifiants');
  const [infos, setInfos] = useState({});
  // Le code de parrainage du lien est lu une fois, puis retiré de l'adresse.
  const [parrain] = useState(() => new URLSearchParams(window.location.search).get('parrain') || '');
  const [ecran, setEcran] = useState(parrain || ecranInitial === 'inscription' ? 'inscription' : 'connexion');
  useEffect(() => {
    if (parrain) window.history.replaceState(null, '', window.location.pathname);
  }, []);
  const [identifiant, setIdentifiant] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [code, setCode] = useState('');
  const [nouveau, setNouveau] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [activation, setActivation] = useState(null);
  const [erreur, setErreur] = useState('');
  const [occupe, setOccupe] = useState(false);

  useEffect(() => {
    api.get('/public').then((r) => setInfos(r.plateforme || {})).catch(() => {});
  }, []);
  useEffect(() => {
    if (etape !== 'mfa-activation' || activation) return;
    api.get('/mfa/activation').then(setActivation).catch((e) => setErreur(e.message));
  }, [etape]);

  const suivant = (r) => {
    setCode('');
    setErreur('');
    if (r.etape === 'ok') onConnecte();
    else setEtape(r.etape);
  };
  const envoyer = async (f) => {
    setOccupe(true);
    setErreur('');
    try {
      suivant(await f());
    } catch (e) {
      setErreur(e.message);
      if (e.status === 401 && etape !== 'identifiants') setEtape('identifiants');
    }
    setOccupe(false);
  };

  let contenu;
  if (etape === 'identifiants') {
    contenu = (
      <form className="mt-4 grid gap-3" onSubmit={(e) => { e.preventDefault(); envoyer(() => api.post('/connexion', { identifiant, motDePasse })); }}>
        <Field label="Identifiant" htmlFor="login-identifiant">
          <Text id="login-identifiant" autoComplete="username" autoCapitalize="none" spellCheck="false" value={identifiant} onChange={setIdentifiant} placeholder="prenom.nom" />
        </Field>
        <Field label="Mot de passe" htmlFor="login-mdp">
          <Text id="login-mdp" type="password" autoComplete="current-password" value={motDePasse} onChange={setMotDePasse} />
        </Field>
        <Btn type="submit" variant="primary" size="lg" icon={LogIn} disabled={occupe || !identifiant.trim() || !motDePasse}>Se connecter</Btn>
      </form>
    );
  } else if (etape === 'mfa') {
    contenu = (
      <form className="mt-4 grid gap-3" onSubmit={(e) => { e.preventDefault(); envoyer(() => api.post('/mfa/verifier', { code })); }}>
        <p className="flex items-start gap-2 text-[13px] leading-relaxed text-ink-2">
          <Smartphone size={16} className="mt-0.5 flex-none text-accent" aria-hidden="true" />
          Saisissez le code à 6 chiffres affiché par votre application d'authentification.
        </p>
        <Field label="Code de vérification" htmlFor="login-code">
          <Text id="login-code" inputMode="numeric" autoComplete="one-time-code" className="num !text-[18px] tracking-[0.3em]" maxLength={6} value={code} onChange={(v) => setCode(v.replace(/\D/g, ''))} />
        </Field>
        <Btn type="submit" variant="primary" size="lg" icon={ShieldCheck} disabled={occupe || code.length !== 6}>Valider</Btn>
      </form>
    );
  } else if (etape === 'mfa-activation') {
    contenu = (
      <form className="mt-4 grid gap-3" onSubmit={(e) => { e.preventDefault(); envoyer(() => api.post('/mfa/activer', { code })); }}>
        <p className="text-[13px] leading-relaxed text-ink-2">
          Première connexion : activez la double authentification. Scannez ce code avec une application d'authentification (par exemple FreeOTP, Google Authenticator ou Microsoft Authenticator), puis saisissez le code qu'elle affiche.
        </p>
        {activation ? (
          <div className="flex flex-wrap items-center gap-4">
            <img src={`data:image/svg+xml;utf8,${encodeURIComponent(activation.qr)}`} alt="QR code d'activation de la double authentification" width="168" height="168" className="rounded-md border border-line bg-paper p-2" />
            <div className="min-w-0 flex-1 text-[12px] text-ink-3">
              <p>Sans appareil photo, saisissez cette clé dans l'application :</p>
              <p id="login-secret" className="mt-1 break-all font-mono text-[13px] text-ink">{activation.secret}</p>
            </div>
          </div>
        ) : (
          <p className="text-[12.5px] text-ink-3">Préparation du code…</p>
        )}
        <Field label="Code affiché par l'application" htmlFor="login-code">
          <Text id="login-code" inputMode="numeric" autoComplete="one-time-code" className="num !text-[18px] tracking-[0.3em]" maxLength={6} value={code} onChange={(v) => setCode(v.replace(/\D/g, ''))} />
        </Field>
        <Btn type="submit" variant="primary" size="lg" icon={ShieldCheck} disabled={occupe || code.length !== 6 || !activation}>Activer et continuer</Btn>
      </form>
    );
  } else {
    const ok = nouveau.length >= 12 && nouveau === confirmation;
    contenu = (
      <form className="mt-4 grid gap-3" onSubmit={(e) => { e.preventDefault(); envoyer(() => api.post('/motdepasse', { actuel: motDePasse, nouveau })); }}>
        <p className="flex items-start gap-2 text-[13px] leading-relaxed text-ink-2">
          <KeyRound size={16} className="mt-0.5 flex-none text-accent" aria-hidden="true" />
          Votre mot de passe est provisoire. Choisissez-en un nouveau, d'au moins 12 caractères, connu de vous seul.
        </p>
        <Field label="Nouveau mot de passe" htmlFor="login-nouveau"><Text id="login-nouveau" type="password" autoComplete="new-password" value={nouveau} onChange={setNouveau} /></Field>
        <Field label="Confirmation" htmlFor="login-confirmation" hint={confirmation && nouveau !== confirmation ? 'Les deux saisies diffèrent.' : undefined}>
          <Text id="login-confirmation" type="password" autoComplete="new-password" value={confirmation} onChange={setConfirmation} />
        </Field>
        <Btn type="submit" variant="primary" size="lg" icon={KeyRound} disabled={occupe || !ok}>Enregistrer et entrer</Btn>
      </form>
    );
  }

  const titres = { identifiants: 'Connexion', mfa: 'Double authentification', 'mfa-activation': 'Activer la double authentification', changer: 'Nouveau mot de passe' };
  if (ecran === 'inscription' && etape === 'identifiants') {
    return (
      <Cadre infos={infos} onAccueil={onAccueil}>
        {infos.inscriptions ? (
          <Inscription infos={infos} codeInitial={parrain.toUpperCase()} onRetour={() => setEcran('connexion')} />
        ) : (
          <div className="flex flex-col gap-3">
            <h2 className="text-[17px] font-semibold text-ink">Inscriptions bientôt ouvertes</h2>
            <p className="text-[13.5px] text-ink-2">Les inscriptions ne sont pas encore ouvertes. Revenez dans quelques jours{infos.contact ? `, ou écrivez à ${infos.contact}` : ''}.</p>
            <Btn onClick={() => setEcran('connexion')}>Retour à la connexion</Btn>
          </div>
        )}
      </Cadre>
    );
  }
  return (
    <Cadre infos={infos} onAccueil={onAccueil}>
      <h2 className="text-[17px] font-semibold text-ink">{titres[etape]}</h2>
      {contenu}
      {erreur && (
        <p className="mt-3 flex items-center gap-1.5 text-[12.5px] text-danger" role="alert">
          <Lock size={13} aria-hidden="true" /> {erreur}
        </p>
      )}
      {etape === 'identifiants' && infos.inscriptions && (
        <div className="mt-5 border-t border-line pt-4">
          <p className="text-[13px] text-ink-2">Orthoptiste, vous n'avez pas encore de compte ?</p>
          <Btn className="mt-2" icon={UserPlus} onClick={() => setEcran('inscription')}>Créer le compte de votre cabinet</Btn>
        </div>
      )}
      {etape !== 'identifiants' && (
        <button type="button" className="mt-4 rounded text-[12.5px] font-medium text-ink-3 hover:text-ink" onClick={() => { api.post('/deconnexion').catch(() => {}); setEtape('identifiants'); setErreur(''); }}>
          Recommencer avec un autre compte
        </button>
      )}
    </Cadre>
  );
}

export default function Login(props) {
  return SERVEUR ? <ConnexionServeur etapeInitiale={props.etapeInitiale} onConnecte={props.onConnecte} ecranInitial={props.ecranInitial} onAccueil={props.onAccueil} /> : <ConnexionDemo {...props} />;
}
