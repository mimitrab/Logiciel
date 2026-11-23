// Page d'accueil publique : présentation du logiciel, sécurité, tarif, questions fréquentes.
import React, { useState } from 'react';
import { Activity, ArrowRight, CalendarDays, Check, ClipboardList, FileText, Fingerprint, Gift, Lock, Mail, Receipt, ScrollText, ServerCog, ShieldCheck, Users } from 'lucide-react';
import { Btn, Logo, cx } from '../ui.jsx';
import { SERVEUR } from '../mode.js';
import Mentions from './Mentions.jsx';

const FONCTIONS = [
  [CalendarDays, 'Agenda jour et semaine', 'Durée attribuée selon le motif : 40 min pour un bilan, 20 à 25 min pour une rééducation, 1 h 10 pour la basse vision.'],
  [Users, 'Dossiers patients', 'Antécédents, correction optique, ordonnance et séances restantes, information et consentements du patient.'],
  [ClipboardList, 'Bilan clinique complet', 'Cover-test avec et sans correction, Worth, Lang I et II, amplitudes de fusion selon Hugonnier, champ visuel, vision des couleurs.'],
  [FileText, 'Compte-rendu rédigé pour vous', "Le courrier au prescripteur s'écrit pendant la saisie. Il reste entièrement modifiable, et s'exporte en PDF."],
  [Mail, 'Envoi sécurisé', 'Au prescripteur par MSSanté, au patient dans Mon espace santé : chaque envoi est noté dans le dossier.'],
  [Receipt, 'Facturation NGAP', "Acte proposé d'après le bilan, lettre-clé AMY, parts Sécurité sociale, mutuelle et patient."],
];
const SECURITE = [
  [ServerCog, 'Hébergement certifié HDS', 'Données hébergées en France chez un hébergeur certifié pour les données de santé.'],
  [Fingerprint, 'Double authentification', 'Mot de passe et code à usage unique à chaque connexion.'],
  [Lock, 'Dossiers cloisonnés', "Chaque praticien ne voit que ses patients, chaque cabinet est isolé des autres. C'est le serveur qui l'impose."],
  [ScrollText, "Journal d'audit", 'Chaque connexion, consultation, envoi ou export est consigné, sans modification possible.'],
  [ShieldCheck, 'Aucun traceur, aucune IA', "Pas de mesure d'audience, pas de service tiers. Les comptes-rendus suivent des règles fixes."],
];

function Question({ q, children }) {
  return (
    <details className="group border-b border-line py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-ink">
        {q}
        <span className="flex-none text-[20px] leading-none text-accent transition-transform group-open:rotate-45" aria-hidden="true">+</span>
      </summary>
      <p className="mt-2 max-w-[68ch] text-[14px] leading-relaxed text-ink-2">{children}</p>
    </details>
  );
}

export default function Accueil({ infos = {}, onConnexion, onEssai }) {
  const [mentions, setMentions] = useState(false);
  const o = infos.offre || { essaiMois: 3, prixMensuelHT: 39, moisParrain: 1, moisFilleul: 1 };
  const essai = SERVEUR ? 'Essayer gratuitement' : 'Voir la démonstration';
  return (
    <div className="h-full overflow-y-auto bg-bg">
      <header className="sticky top-0 z-10 border-b border-line bg-surface">
        <div className="gutter mx-auto flex max-w-[1120px] items-center justify-between gap-4 py-3">
          <a href="#haut" className="flex items-center gap-2.5 rounded text-accent">
            <Logo size={28} />
            <span className="font-display text-[18px] font-bold tracking-[0.06em] text-ink">SACCADES</span>
          </a>
          <nav className="hidden items-center gap-6 text-[13.5px] font-medium text-ink-2 md:flex" aria-label="Sections">
            <a className="hover:text-ink" href="#fonctions">Fonctionnalités</a>
            <a className="hover:text-ink" href="#securite">Sécurité</a>
            <a className="hover:text-ink" href="#tarif">Tarif</a>
            <a className="hover:text-ink" href="#questions">Questions</a>
          </nav>
          <div className="flex gap-2">
            <Btn size="sm" variant="ghost" onClick={onConnexion}>Se connecter</Btn>
            <Btn size="sm" variant="primary" onClick={onEssai}>{SERVEUR ? 'Essai gratuit' : 'Démonstration'}</Btn>
          </div>
        </div>
      </header>

      <main id="haut">
        {infos.annonce && (
          <p className={cx('gutter border-b py-2 text-center text-[13px] text-ink', infos.annonce.ton === 'warn' ? 'border-warn bg-warn-soft' : 'border-info bg-info-soft')}>{infos.annonce.texte}</p>
        )}
        <section className="gutter mx-auto grid max-w-[1120px] items-center gap-10 py-12 md:grid-cols-[1.1fr_0.9fr] md:py-16">
          <div>
            <p className="eyebrow">Logiciel de cabinet d'orthoptie</p>
            <h1 className="mt-3 text-[34px] font-bold leading-[1.12] text-ink sm:text-[42px]">Le bilan se saisit, le compte-rendu s'écrit.</h1>
            <p className="mt-4 max-w-[56ch] text-[16px] leading-relaxed text-ink-2">
              Agenda, dossiers patients, bilans orthoptiques, comptes-rendus au prescripteur et facturation NGAP, réunis dans un logiciel pensé pour la consultation.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Btn size="lg" variant="primary" icon={ArrowRight} onClick={onEssai}>{essai}</Btn>
              <Btn size="lg" onClick={onConnexion}>Se connecter</Btn>
            </div>
            <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-3">
              <span className="inline-flex items-center gap-1.5"><Check size={14} className="text-ok" aria-hidden="true" />{o.essaiMois} mois gratuits</span>
              <span className="inline-flex items-center gap-1.5"><Check size={14} className="text-ok" aria-hidden="true" />Sans engagement</span>
              <span className="inline-flex items-center gap-1.5"><Check size={14} className="text-ok" aria-hidden="true" />Sans carte bancaire à l'inscription</span>
            </p>
            {!SERVEUR && <p className="mt-3 text-[12.5px] text-warn">Démonstration : tous les patients sont fictifs.</p>}
          </div>

          <figure className="paper relative mx-auto w-full max-w-[440px] px-6 py-6 text-[12.5px] leading-[1.55]" aria-label="Extrait d'un compte-rendu rédigé par SACCADES">
            <p className="text-[1.15em] font-bold text-paper-accent">Cabinet d'orthoptie</p>
            <p className="text-[0.88em] text-paper-ink-2">Compte-rendu de bilan orthoptique</p>
            <div className="paper-rule my-3" />
            <p className="paper-title">EXAMEN OCULOMOTEUR ET BINOCULAIRE</p>
            <p>Le punctum proximum de convergence est rompu à 14 cm, ce qui est éloigné (norme : jusqu'à 10 cm).</p>
            <p className="paper-title mt-3">CONCLUSION</p>
            <p>Au total, le bilan met en évidence une insuffisance de convergence (PPC à 14 cm, amplitudes de convergence réduites, exophorie de près).</p>
            <p className="paper-title mt-3">PROJET THÉRAPEUTIQUE</p>
            <p>Les signes fonctionnels rapportés concordent avec les anomalies relevées à l'examen. Je propose une rééducation orthoptique de 12 séances…</p>
            <figcaption className="absolute -bottom-4 right-4 rounded-full bg-accent px-3 py-1 text-[12px] font-medium text-on-accent shadow-md">Rédigé pendant la saisie, modifiable</figcaption>
          </figure>
        </section>

        <section id="fonctions" className="border-t border-line bg-surface py-14">
          <div className="gutter mx-auto max-w-[1120px]">
            <p className="eyebrow">Fonctionnalités</p>
            <h2 className="mt-2 max-w-[30ch] text-[28px] font-bold leading-tight text-ink">Tout le cabinet, de l'agenda à la facturation</h2>
            <div className="mt-8 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {FONCTIONS.map(([Icone, titre, texte]) => (
                <div key={titre} className="min-w-0">
                  <Icone size={22} className="text-accent" aria-hidden="true" />
                  <h3 className="mt-3 text-[16px] font-semibold text-ink">{titre}</h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{texte}</p>
                </div>
              ))}
            </div>
            <p className="mt-10 flex items-start gap-3 rounded-lg border border-line bg-surface-2 px-5 py-4 text-[14px] leading-relaxed text-ink-2">
              <Activity size={20} className="mt-0.5 flex-none text-accent" aria-hidden="true" />
              <span>
                <span className="font-semibold text-ink">Une règle clinique tenue d'office :</span> aucune rééducation n'est proposée sans signes fonctionnels et cliniques concordants. Un bilan normal conclut à l'absence d'indication.
              </span>
            </p>
          </div>
        </section>

        <section id="securite" className="py-14">
          <div className="gutter mx-auto max-w-[1120px]">
            <p className="eyebrow">Sécurité et données de santé</p>
            <h2 className="mt-2 max-w-[34ch] text-[28px] font-bold leading-tight text-ink">Vos patients restent les vôtres</h2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SECURITE.map(([Icone, titre, texte]) => (
                <li key={titre} className="card flex gap-3 px-4 py-4">
                  <Icone size={20} className="mt-0.5 flex-none text-accent" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block text-[14.5px] font-semibold text-ink">{titre}</span>
                    <span className="mt-1 block text-[13.5px] leading-relaxed text-ink-2">{texte}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="tarif" className="border-t border-line bg-surface py-14">
          <div className="gutter mx-auto grid max-w-[1120px] items-center gap-10 md:grid-cols-2">
            <div>
              <p className="eyebrow">Tarif</p>
              <h2 className="mt-2 text-[28px] font-bold leading-tight text-ink">Un prix simple, par praticien</h2>
              <p className="mt-3 max-w-[48ch] text-[15px] leading-relaxed text-ink-2">
                {o.essaiMois} mois pour tout essayer, sans carte bancaire. Ensuite, un abonnement mensuel sans engagement. Si vous ne vous abonnez pas, vos dossiers restent consultables et exportables.
              </p>
            </div>
            <div className="card px-6 py-6">
              <p className="text-[14px] font-medium text-accent">{o.essaiMois} mois gratuits, puis</p>
              <p className="mt-1 flex items-baseline gap-2">
                <span className="tnum font-display text-[44px] font-bold leading-none text-ink">{o.prixMensuelHT} €</span>
                <span className="text-[14px] text-ink-2">HT par mois et par praticien</span>
              </p>
              <ul className="mt-5 flex flex-col gap-2 text-[14px] text-ink-2">
                {['Toutes les fonctionnalités', 'Mises à jour comprises', 'Résiliable à tout moment'].map((t) => (
                  <li key={t} className="flex items-center gap-2"><Check size={15} className="flex-none text-ok" aria-hidden="true" />{t}</li>
                ))}
                <li className="flex items-start gap-2"><Gift size={15} className="mt-0.5 flex-none text-accent" aria-hidden="true" />Parrainage : {o.moisParrain} mois offert{o.moisParrain > 1 ? 's' : ''} pour vous et {o.moisFilleul} pour votre confrère, dès qu'il s'abonne</li>
              </ul>
              <Btn size="lg" variant="primary" className="mt-6 w-full" icon={ArrowRight} onClick={onEssai}>{essai}</Btn>
            </div>
          </div>
        </section>

        <section id="questions" className="py-14">
          <div className="gutter mx-auto max-w-[820px]">
            <p className="eyebrow">Questions fréquentes</p>
            <h2 className="mt-2 text-[28px] font-bold leading-tight text-ink">Avant de vous lancer</h2>
            <div className="mt-6 border-t border-line">
              <Question q="Mes données et celles de mes patients sont-elles en sécurité ?">
                Elles sont hébergées en France chez un hébergeur certifié pour les données de santé, protégées par une double authentification, et cloisonnées : personne d'autre que vous ne voit vos patients, pas même l'éditeur du logiciel.
              </Question>
              <Question q="Que se passe-t-il à la fin de la période gratuite ?">
                Si vous vous abonnez, rien ne change. Sinon, votre compte passe en lecture seule : vos dossiers restent consultables et exportables, seule la saisie est suspendue jusqu'à l'abonnement.
              </Question>
              <Question q="Le compte-rendu est-il rédigé par une intelligence artificielle ?">
                Non. Il suit des règles fixes, écrites avec la terminologie orthoptique, à partir de vos mesures. Aucune donnée n'est envoyée à un service extérieur, et vous modifiez librement le texte.
              </Question>
              <Question q="Puis-je récupérer mes données si je pars ?">
                Oui : chaque praticien exporte ses dossiers à tout moment, dans une sauvegarde chiffrée par une phrase secrète qu'il choisit.
              </Question>
              <Question q="Le logiciel télétransmet-il les feuilles de soins ?">
                Pas encore : SACCADES calcule et suit vos actes NGAP, mais la télétransmission SESAM-Vitale se fait avec votre logiciel agréé habituel.
              </Question>
              <Question q="Comment fonctionne le parrainage ?">
                Vous transmettez votre lien à un confrère. Quand il devient abonné, vous recevez chacun des mois offerts, sans limite de nombre de filleuls.
              </Question>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="gutter mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-3 py-6 text-[13px] text-ink-3">
          <span className="flex items-center gap-2 text-accent"><Logo size={20} /><span className="font-display font-bold tracking-[0.06em] text-ink">SACCADES</span></span>
          <span className="flex flex-wrap gap-x-5 gap-y-1">
            <button type="button" className="rounded hover:text-ink" onClick={() => setMentions(true)}>Mentions légales et confidentialité</button>
            {infos.contact && <span>Contact : {infos.contact}</span>}
          </span>
        </div>
      </footer>
      {mentions && <Mentions cabinet={infos} onClose={() => setMentions(false)} />}
    </div>
  );
}
