# SACCADES : logiciel de cabinet d'orthoptie

Agenda jour et semaine, dossiers patients, bilans orthoptiques avec compte-rendu rédigé
automatiquement et modifiable, envoi MSSanté et Mon espace santé, facturation NGAP, comptes
praticiens cloisonnés et super-administrateur, écran de conformité (journal d'audit, sauvegarde
chiffrée, consentements).

**Mise en ligne, démarches HDS et RGPD : voir [docs/MISE-EN-LIGNE.md](docs/MISE-EN-LIGNE.md).**

## Trois versions, un seul code

| Version | Données | Fichier produit |
| --- | --- | --- |
| Démonstration publique (GitHub Pages) | patients fictifs, dans le navigateur | `dist/demo/index.html` |
| Page Claude (claude.ai) | patients fictifs, dans le navigateur | `dist/saccades.html` |
| **Production** (hébergeur certifié HDS) | base PostgreSQL sur le serveur | `server/public/` servi par `server/index.js` |

Aucune des trois ne charge de script ni de police depuis un site tiers : React, jsPDF et les polices
sont intégrés.

Plateforme multi-cabinets : inscription des orthoptistes (validée par le propriétaire), période gratuite,
abonnement (paiement manuel ou Stripe), parrainage, lecture seule à l'expiration.

Comptes de la démonstration (mot de passe `demo`) : `proprietaire` (console de la plateforme), `admin`,
`camille.roussel` (praticienne et gestionnaire du cabinet), `julien.marchetti`.

## Développement

```sh
npm install
npm run construire        # produit les trois versions
DATABASE_URL=postgres://… PROPRIETAIRE_MOT_DE_PASSE='au-moins-12-caracteres' npm start
DATABASE_URL=postgres://…/base_de_test_vide npm test   # tests automatiques de l'API
npm run reinitialiser-acces -- <identifiant>           # secours : mot de passe provisoire
```

| Dossier ou fichier | Rôle |
| --- | --- |
| `src/domain.js` | Motifs et durées, saisie clinique, normes, règle de décision thérapeutique, amblyopie, barème NGAP |
| `src/letter.js` | Rédaction du compte-rendu (règles fixes, sans intelligence artificielle) |
| `src/main.jsx` | Connexion, rôles, navigation, synchronisation avec le serveur |
| `src/views/` | Écrans : agenda, patients, bilans, facturation, conformité, administration |
| `server/api.js` | API : inscription, authentification, cloisonnement des cabinets, abonnement, parrainage, journal |
| `server/stripe.js` | Paiement en ligne (facultatif) et vérification des notifications signées |
| `src/offre.js` | Période gratuite, état de l'abonnement, mois offerts |
| `server/schema.sql` | Schéma PostgreSQL (journal protégé contre la modification) |
| `src/views/Accueil.jsx` | Page d'accueil publique (présentation, tarif, questions fréquentes) |
| `src/views/Plateforme.jsx` | Console du propriétaire : cabinets, accès, offre, annonces |
| `tests/lancer.mjs`, `.github/workflows/tests.yml` | Tests automatiques de l'API, exécutés par GitHub à chaque modification |
| `server/outils/reinitialiser-acces.js` | Commande de secours en cas de perte d'accès |
| `Procfile`, `.env.exemple` | Déploiement (Scalingo ou tout hébergeur Node.js certifié HDS) |

## Points à valider par le cabinet

- **Normes cliniques** (amplitudes de fusion selon Hugonnier, PPC) : réglables, car les valeurs publiées
  varient selon les ouvrages.
- **Barème NGAP** : plusieurs libellés restent « à préciser » dans les réglages.
- **Statut de dispositif médical** : les suggestions de conclusion et la règle de décision thérapeutique
  sont à faire évaluer avant toute diffusion à d'autres cabinets.
