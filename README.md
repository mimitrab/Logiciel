# SACCADES — gestion de cabinet d'orthoptie

Maquette interactive d'une application de cabinet d'orthoptie : comptes praticiens cloisonnés et
super-administrateur, agenda jour / semaine, dossiers patients, saisie clinique avec compte-rendu
généré automatiquement, facturation NGAP, écran de conformité (journal d'audit, sauvegarde chiffrée,
consentements).

**Maquette de démonstration.** Tout s'exécute dans le navigateur, avec des données fictives stockées
en clair dans le `localStorage`. L'authentification y est simulée. Ne pas y saisir de données de
patients réels : il faudra pour cela un hébergement certifié HDS, une authentification Pro Santé
Connect et un contrôle d'accès appliqué côté serveur.

## Utiliser

Ouvrir `index.html` dans un navigateur (connexion nécessaire pour React, jsPDF et les polices,
chargés depuis un CDN). Comptes de démonstration, mot de passe `demo` :

| Identifiant | Rôle |
| --- | --- |
| `admin` | Super-administrateur : supervision, comptes, conformité, réglages |
| `camille.roussel` | Orthoptiste : ses patients, son agenda, ses bilans, sa facturation |
| `julien.marchetti` | Orthoptiste : champs visuels, vision des couleurs, bilans |

## Modifier

```sh
npm install
npm run build   # régénère index.html et dist/saccades.html (fragment publié comme artefact)
```

| Fichier | Rôle |
| --- | --- |
| `src/domain.js` | Motifs et durées, listes de saisie, normes, règle de décision thérapeutique, barème NGAP |
| `src/letter.js` | Générateur du courrier au médecin prescripteur |
| `src/seed.js` | Comptes, patients, agenda et bilans de démonstration |
| `src/store.js` | État, persistance locale, session, opérations métier, vue cloisonnée par praticien |
| `src/crypto.js` | Empreinte des mots de passe, sauvegarde chiffrée AES-256-GCM |
| `src/pdf.js` | Export PDF et remise des fichiers |
| `src/main.jsx` | Connexion, rôles, navigation, journal d'audit |
| `src/views/` | Connexion, tableau de bord, agenda, patients, bilans, facturation, conformité, administration |
| `src/styles.css` | Jetons de couleur et de typographie (thèmes clair et sombre) |

## Points à valider par le cabinet

- **Normes cliniques** (`NORMES_DEFAUT`) : amplitudes de fusion selon Hugonnier et seuil du PPC. Les
  valeurs publiées varient selon les ouvrages ; elles se règlent dans les réglages du cabinet.
- **Barème NGAP** (`BAREME_DEFAUT`) : coefficients fournis par le cabinet. Plusieurs libellés restent
  « à préciser » et se complètent dans les réglages.
- **Règle de décision** (`indicationReeducation`) : aucune rééducation n'est proposée sans signes
  fonctionnels et signes cliniques concordants.
