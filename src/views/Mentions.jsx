// Mentions légales et confidentialité (obligatoires pour un site accessible au public).
import React from 'react';
import { Modal } from '../ui.jsx';
import { MODE } from '../mode.js';

const GITHUB = 'GitHub Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis (service GitHub Pages)';

function Bloc({ titre, children }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="text-[13.5px] font-semibold text-ink">{titre}</h3>
      <div className="flex flex-col gap-1.5 text-[13px] leading-relaxed text-ink-2">{children}</div>
    </section>
  );
}

export default function Mentions({ cabinet = {}, onClose }) {
  const serveur = MODE === 'serveur';
  const aCompleter = <span className="text-warn">à compléter dans les réglages du cabinet</span>;
  return (
    <Modal title="Mentions légales et confidentialité" onClose={onClose}>
      <div className="flex flex-col gap-5">
        <Bloc titre="Éditeur">
          <p>{cabinet.editeur || aCompleter}</p>
          {cabinet.contact && <p>Contact : {cabinet.contact}</p>}
        </Bloc>
        <Bloc titre="Hébergement">
          <p>{serveur ? cabinet.hebergeur || aCompleter : MODE === 'demo' ? GITHUB : 'Anthropic, page publiée sur claude.ai.'}</p>
          {serveur && <p>Les données de santé sont hébergées chez un hébergeur certifié pour l'hébergement de données de santé (HDS), conformément à l'article L. 1111-8 du Code de la santé publique.</p>}
        </Bloc>
        {serveur ? (
          <Bloc titre="Données personnelles">
            <p>
              Le logiciel est réservé aux professionnels du cabinet, chacun disposant d'un compte personnel protégé par une double authentification. Chaque praticien n'accède qu'aux dossiers de ses patients ; tous les accès sont consignés dans un journal.
            </p>
            <p>
              Les données des patients sont traitées pour la prise en charge et le suivi des soins, sous la responsabilité du praticien. Les patients exercent leurs droits d'accès, de rectification, de limitation et d'opposition auprès de leur praticien.
            </p>
            <p>Un seul cookie est utilisé : il maintient la session ouverte. Il est indispensable au service et ne sert à aucune mesure d'audience.</p>
          </Bloc>
        ) : (
          <Bloc titre="Démonstration et confidentialité">
            <p>
              Ce site est une démonstration : tous les patients sont fictifs. Ce que vous saisissez reste dans votre navigateur et n'est envoyé à aucun serveur. N'y saisissez aucune donnée réelle.
            </p>
            <p>
              Aucun cookie, aucune mesure d'audience, aucun appel à un service tiers : les polices et les bibliothèques sont intégrées au site. {MODE === 'demo' ? "L'hébergeur peut conserver l'adresse IP des visiteurs dans ses journaux techniques, pour la sécurité de son service." : ''}
            </p>
          </Bloc>
        )}
      </div>
    </Modal>
  );
}
