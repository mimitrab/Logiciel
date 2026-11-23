// Inscription d'un orthoptiste et de son cabinet (version en ligne).
import React, { useState } from 'react';
import { Check, UserPlus } from 'lucide-react';
import { Btn, Chip, Field, Text } from '../ui.jsx';
import { api } from '../api.js';

export default function Inscription({ infos, codeInitial = '', onRetour }) {
  const [f, setF] = useState({ prenom: '', nom: '', rpps: '', cabinet: '', ville: '', email: '', identifiant: '', motDePasse: '', confirmation: '', codeParrainage: codeInitial, atteste: false, accepte: false });
  const [voirCgu, setVoirCgu] = useState(false);
  const [erreur, setErreur] = useState('');
  const [occupe, setOccupe] = useState(false);
  const [fini, setFini] = useState(false);
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const o = (infos && infos.offre) || {};

  if (fini)
    return (
      <div className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-[17px] font-semibold text-ink"><Check size={18} className="text-ok" aria-hidden="true" /> Demande enregistrée</h2>
        <p className="text-[13.5px] leading-relaxed text-ink-2">
          Nous vérifions votre numéro RPPS. Dès l'ouverture de votre compte, connectez-vous avec l'identifiant <span className="font-mono text-ink">{f.identifiant}</span> : vous activerez alors la double authentification, et vos {o.essaiMois || 3} mois gratuits commenceront.
        </p>
        <Btn variant="primary" onClick={onRetour}>Retour à la connexion</Btn>
      </div>
    );

  const envoyer = async (e) => {
    e.preventDefault();
    setErreur('');
    if (f.motDePasse !== f.confirmation) return setErreur('La confirmation ne correspond pas au mot de passe.');
    setOccupe(true);
    try {
      await api.post('/inscription', { ...f, confirmation: undefined });
      setFini(true);
    } catch (err) {
      setErreur(err.message);
    }
    return setOccupe(false);
  };

  return (
    <form className="flex flex-col gap-3" onSubmit={envoyer}>
      <div>
        <h2 className="text-[17px] font-semibold text-ink">Créer le compte de votre cabinet</h2>
        <p className="mt-0.5 text-[12.5px] text-ink-3">
          {o.essaiMois || 3} mois gratuits, puis {o.prixMensuelHT} € HT par mois et par praticien. Sans engagement.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Prénom" htmlFor="ins-prenom"><Text id="ins-prenom" autoComplete="given-name" value={f.prenom} onChange={set('prenom')} /></Field>
        <Field label="Nom" htmlFor="ins-nom"><Text id="ins-nom" autoComplete="family-name" value={f.nom} onChange={set('nom')} /></Field>
        <Field label="Numéro RPPS" htmlFor="ins-rpps" hint="11 chiffres, vérifié avant l'ouverture du compte."><Text id="ins-rpps" className="num" inputMode="numeric" maxLength={14} value={f.rpps} onChange={(v) => set('rpps')(v.replace(/[^\d ]/g, ''))} /></Field>
        <Field label="E-mail professionnel" htmlFor="ins-email"><Text id="ins-email" type="email" autoComplete="email" value={f.email} onChange={set('email')} /></Field>
        <Field label="Nom du cabinet" htmlFor="ins-cabinet"><Text id="ins-cabinet" value={f.cabinet} onChange={set('cabinet')} /></Field>
        <Field label="Ville" htmlFor="ins-ville"><Text id="ins-ville" value={f.ville} onChange={set('ville')} /></Field>
        <Field label="Identifiant de connexion" htmlFor="ins-identifiant" hint="Lettres minuscules, chiffres, point ou tiret."><Text id="ins-identifiant" autoComplete="username" autoCapitalize="none" spellCheck="false" value={f.identifiant} onChange={(v) => set('identifiant')(v.toLowerCase())} placeholder="prenom.nom" /></Field>
        <Field label="Code de parrainage (facultatif)" htmlFor="ins-code"><Text id="ins-code" className="num" value={f.codeParrainage} onChange={(v) => set('codeParrainage')(v.toUpperCase())} placeholder="SAC-XXXXXX" /></Field>
        <Field label="Mot de passe (12 caractères min.)" htmlFor="ins-mdp"><Text id="ins-mdp" type="password" autoComplete="new-password" value={f.motDePasse} onChange={set('motDePasse')} /></Field>
        <Field label="Confirmation" htmlFor="ins-confirmation"><Text id="ins-confirmation" type="password" autoComplete="new-password" value={f.confirmation} onChange={set('confirmation')} /></Field>
      </div>
      <Chip id="ins-atteste" checked={f.atteste} onChange={set('atteste')}>J'atteste être orthoptiste, inscrit au RPPS</Chip>
      <div>
        <Chip id="ins-accepte" checked={f.accepte} onChange={set('accepte')}>J'accepte les conditions générales et le contrat de traitement des données</Chip>
        <button type="button" className="ml-1 mt-1 block rounded text-[12.5px] font-medium text-accent hover:underline" onClick={() => setVoirCgu(!voirCgu)}>{voirCgu ? 'Masquer les conditions' : 'Lire les conditions'}</button>
        {voirCgu && <div className="mt-2 max-h-56 overflow-y-auto whitespace-pre-wrap rounded-md border border-line bg-surface-2 px-3 py-2 text-[12.5px] leading-relaxed text-ink-2">{infos.cgu}</div>}
      </div>
      {erreur && <p className="text-[12.5px] text-danger" role="alert">{erreur}</p>}
      <Btn type="submit" variant="primary" size="lg" icon={UserPlus} disabled={occupe || !f.atteste || !f.accepte}>Envoyer ma demande</Btn>
      <button type="button" className="rounded text-[12.5px] font-medium text-ink-3 hover:text-ink" onClick={onRetour}>J'ai déjà un compte</button>
    </form>
  );
}
