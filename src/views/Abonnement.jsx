// Abonnement et parrainage du cabinet (gestion du cabinet).
import React from 'react';
import { CalendarClock, Copy, CreditCard, Gift, Users } from 'lucide-react';
import { Btn, Card, CardHead, Empty, Notice, Pill, useApp } from '../ui.jsx';
import { dateCourte, euro } from '../lib.js';
import { copierTexte } from './commun.jsx';

const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

export default function Abonnement() {
  const { state, actions, toast } = useApp();
  const a = state.abonnement;
  if (!a) return <Card><Empty icon={Gift} title="Abonnement indisponible" /></Card>;
  const total = a.prixMensuelHT * a.praticiens;
  const lien = `${window.location.origin}${window.location.pathname}?parrain=${a.codeParrainage}`;
  const copier = async (t) => toast((await copierTexte(t)) ? 'Copié dans le presse-papiers' : 'Copie refusée : sélectionnez le texte à la main.');
  const recompenses = a.filleuls.filter((f) => f.statut === 'recompense').length;

  let situation;
  if (a.code === 'essai')
    situation = (
      <p>
        Votre période gratuite se termine le <span className="font-semibold text-ink">{dateCourte(a.jusqu)}</span>, dans {pluriel(a.joursRestants, 'jour')}. Ensuite : {euro(a.prixMensuelHT)} HT par mois et par praticien, soit{' '}
        <span className="font-semibold text-ink">{euro(total)} HT par mois</span> pour {pluriel(a.praticiens, 'praticien')}.
      </p>
    );
  else if (a.code === 'abonne')
    situation = (
      <p>
        Votre abonnement est actif{a.jusqu ? <> ; la période en cours, mois offerts compris, court jusqu'au <span className="font-semibold text-ink">{dateCourte(a.jusqu)}</span></> : null}. Montant : {euro(total)} HT par mois pour {pluriel(a.praticiens, 'praticien')}.
      </p>
    );
  else
    situation = <p>Votre période gratuite est terminée. Vos dossiers restent consultables et exportables ; la saisie reprend dès l'abonnement.</p>;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="eyebrow">Cabinet</p>
        <h1 className="mt-1 text-[25px] font-bold leading-tight text-ink">Abonnement et parrainage</h1>
        <p className="mt-1 max-w-3xl text-[13.5px] text-ink-2">
          {a.essaiMois} mois gratuits à l'inscription, puis un abonnement mensuel par praticien, sans engagement. Chaque confrère que vous parrainez vous fait gagner des mois offerts.
        </p>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHead icon={CalendarClock} title="Votre abonnement" right={<Pill tone={a.ton}>{a.libelle}</Pill>} />
          <div className="flex flex-col gap-3 px-4 py-4 text-[13.5px] leading-relaxed text-ink-2">
            {situation}
            {a.paiementEnLigne && a.cabinet && a.cabinet.stripe && (
              <div>
                <Btn icon={CreditCard} onClick={() => actions.portailAbonnement()}>Gérer mon abonnement</Btn>
                <p className="mt-1.5 text-[12px] text-ink-3">Carte bancaire, factures, résiliation : sur le portail sécurisé de Stripe.</p>
              </div>
            )}
            {a.code !== 'abonne' && !(a.cabinet && a.cabinet.stripe) &&
              (a.paiementEnLigne ? (
                <div>
                  <Btn variant="primary" icon={CreditCard} onClick={() => actions.payerEnLigne()}>
                    S'abonner par carte ou prélèvement
                  </Btn>
                  <p className="mt-1.5 text-[12px] text-ink-3">
                    {a.code === 'essai' ? `Aucun prélèvement avant le ${dateCourte(a.jusqu)} : les mois gratuits restants sont conservés.` : 'Paiement sécurisé par Stripe. Résiliable à tout moment.'}
                  </p>
                </div>
              ) : (
                <Notice tone="neutral" icon={CreditCard}>
                  Le paiement en ligne n'est pas encore activé. Pour vous abonner, contactez SACCADES{a.contact ? ` : ${a.contact}` : ''}.
                </Notice>
              ))}
          </div>
        </Card>

        <Card>
          <CardHead icon={Gift} title="Parrainer un confrère" />
          <div className="flex flex-col gap-3 px-4 py-4 text-[13.5px] leading-relaxed text-ink-2">
            <p>
              Quand un orthoptiste s'inscrit avec votre code et devient abonné, vous gagnez <span className="font-semibold text-ink">{pluriel(a.moisParrain, 'mois offert')}</span>, et lui aussi ({pluriel(a.moisFilleul, 'mois offert')}). Sans limite de nombre.
            </p>
            <div>
              <span className="lbl">Votre code</span>
              <div className="flex flex-wrap items-center gap-2">
                <code className="rounded-md bg-accent-soft px-3 py-1.5 font-mono text-[18px] font-medium tracking-[0.08em] text-accent-strong">{a.codeParrainage}</code>
                <Btn icon={Copy} onClick={() => copier(a.codeParrainage)}>Copier le code</Btn>
              </div>
            </div>
            <div>
              <span className="lbl">Lien d'inscription à transmettre</span>
              <div className="flex gap-2">
                <code className="min-w-0 flex-1 truncate rounded-md bg-surface-2 px-2.5 py-2 font-mono text-[12.5px] text-ink">{lien}</code>
                <Btn icon={Copy} onClick={() => copier(lien)}>Copier</Btn>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHead icon={Users} title="Vos filleuls" hint={a.filleuls.length ? `${a.filleuls.length} inscrit${a.filleuls.length > 1 ? 's' : ''}, ${recompenses} abonné${recompenses > 1 ? 's' : ''}` : undefined} />
        {a.filleuls.length ? (
          <ul className="divide-y divide-line">
            {a.filleuls.map((f, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2.5 text-[13.5px]">
                <span className="min-w-0">
                  <span className="font-medium text-ink">{f.nom}</span>
                  <span className="text-ink-3"> · {f.ville} · inscrit le {dateCourte(new Date(f.cree).toISOString().slice(0, 10))}</span>
                </span>
                <Pill tone={f.statut === 'recompense' ? 'ok' : 'neutral'}>{f.statut === 'recompense' ? `Abonné : ${pluriel(a.moisParrain, 'mois offert')} pour vous` : 'En période gratuite'}</Pill>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-4 text-[13px] text-ink-3">Aucun filleul pour l'instant. Transmettez votre lien à un confrère : il profitera aussi de mois offerts.</p>
        )}
      </Card>
      <p className="text-[12px] leading-snug text-ink-3">
        Les mois offerts prolongent votre accès ; pour un abonnement en ligne, ils décalent la date du prochain prélèvement. La récompense est attribuée au premier paiement du filleul.
      </p>
    </div>
  );
}
