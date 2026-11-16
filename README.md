# Binocle — cabinet d'orthoptie

Prototype interactif d'une application de gestion de cabinet d'orthoptie : agenda du jour, dossiers
patients, saisie clinique avec génération automatique du compte-rendu de bilan, facturation NGAP simplifiée.

Toutes les données sont fictives et restent dans le `localStorage` du navigateur.

## Utiliser

Ouvrir `index.html` dans un navigateur (connexion nécessaire pour React, jsPDF et les polices, chargés depuis un CDN).

## Modifier

```sh
npm install
npm run build   # régénère index.html et dist/binocle-orthoptie.html (fragment publié comme artefact)
```

| Fichier | Rôle |
| --- | --- |
| `src/domain.js` | Référentiels de saisie, repères cliniques, barème NGAP, statuts |
| `src/letter.js` | Générateur du courrier au médecin prescripteur |
| `src/seed.js` | Données de démonstration |
| `src/store.js` | État, persistance locale, opérations métier |
| `src/pdf.js` | Export PDF du compte-rendu |
| `src/views/` | Les quatre écrans : tableau de bord, patients, bilans, facturation |
| `src/styles.css` | Jetons de couleur et de typographie (thèmes clair et sombre) |

Le barème NGAP (`ACTES` dans `src/domain.js`) et les repères cliniques (`REPERES`) sont indicatifs :
à vérifier avec la nomenclature en vigueur avant tout usage réel.
