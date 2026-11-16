// Écran de connexion. L'authentification est simulée dans le navigateur : en production, elle passerait
// par Pro Santé Connect (e-CPS ou carte CPS).
import React, { useEffect, useState } from 'react';
import { Lock, LogIn, ShieldCheck, UserRound } from 'lucide-react';
import { Btn, Field, Logo, Text, cx } from '../ui.jsx';
import { nomUtilisateur } from '../domain.js';
import { MOT_DE_PASSE_DEMO } from '../seed.js';

const ESSAIS_MAX = 5;
const BLOCAGE_S = 60;

export default function Login({ utilisateurs, cabinet, onLogin }) {
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
    <div className="h-full overflow-y-auto bg-bg">
      <div className="gutter mx-auto flex min-h-full w-full max-w-[920px] flex-col justify-center gap-6 py-8 md:flex-row md:items-center md:gap-10">
        <div className="md:w-[44%]">
          <div className="flex items-center gap-3 text-accent">
            <Logo size={44} />
            <div className="leading-tight">
              <h1 className="font-display text-[30px] font-bold tracking-[0.06em] text-ink">SACCADES</h1>
              <p className="text-[13px] text-ink-2">Gestion de cabinet d'orthoptie</p>
            </div>
          </div>
          <p className="mt-5 text-[14px] leading-relaxed text-ink-2">
            Agenda, dossiers patients, bilans orthoptiques et comptes-rendus, facturation NGAP. Chaque praticien accède à ses seuls dossiers ; le super-administrateur supervise le cabinet.
          </p>
          <p className="mt-4 flex items-start gap-2 rounded-lg border border-line bg-surface px-3.5 py-3 text-[12.5px] leading-relaxed text-ink-2">
            <ShieldCheck size={16} className="mt-0.5 flex-none text-accent" aria-hidden="true" />
            <span>
              Maquette de démonstration : données fictives, stockées dans ce navigateur, authentification simulée. Avec de vrais patients, il faudra un hébergement certifié HDS et une authentification Pro Santé Connect.
            </span>
          </p>
        </div>

        <div className="card flex-1 p-5 sm:p-6">
          <h2 className="text-[17px] font-semibold text-ink">Connexion</h2>
          <p className="mt-0.5 text-[12.5px] text-ink-3">{cabinet.nom}</p>
          <form
            className="mt-4 grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              tenter(identifiant, motDePasse);
            }}
          >
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
                    <button type="button" disabled={reste > 0} onClick={() => tenter(u.identifiant, MOT_DE_PASSE_DEMO)} className={cx('flex w-full items-center gap-3 rounded-md border border-line px-3 py-2 text-left transition-colors hover:border-line-strong hover:bg-surface-2 disabled:opacity-50')}>
                      <span className={cx('inline-flex h-8 w-8 flex-none items-center justify-center rounded-full', u.role === 'admin' ? 'bg-warn-soft text-warn' : 'bg-accent-soft text-accent-strong')}>
                        {u.role === 'admin' ? <ShieldCheck size={16} aria-hidden="true" /> : <UserRound size={16} aria-hidden="true" />}
                      </span>
                      <span className="min-w-0 flex-1 leading-tight">
                        <span className="block truncate text-[13.5px] font-medium text-ink">{nomUtilisateur(u)}</span>
                        <span className="block truncate text-[12px] text-ink-3">{u.role === 'admin' ? 'Super-administrateur : supervision, comptes, conformité' : `${u.titre} : son agenda, ses patients, ses bilans`}</span>
                      </span>
                      <span className="font-mono text-[11.5px] text-ink-3">{u.identifiant}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
