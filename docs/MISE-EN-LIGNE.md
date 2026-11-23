# Mettre SACCADES en ligne

Ce guide couvre deux mises en ligne très différentes :

1. **La démonstration publique** (patients fictifs) : gratuite, en ligne en deux minutes.
2. **La version de production** (vrais patients) : chez un hébergeur certifié HDS, avec les démarches
   réglementaires à mener **avant** le premier vrai patient.

---

## 1. Démonstration publique sur GitHub Pages

La démonstration est publiée sur la branche `gh-pages` du dépôt. Elle ne contient que des patients
fictifs ; ce que les visiteurs saisissent reste dans leur navigateur et n'est envoyé nulle part.

**Activer la publication (une seule fois) :**

1. Ouvrez https://github.com/mimitrab/Logiciel/settings/pages
2. Rubrique *Build and deployment* → *Source* : **Deploy from a branch**.
3. *Branch* : **gh-pages**, dossier **/ (root)**, puis **Save**.
4. Après une à deux minutes, le site répond à l'adresse **https://mimitrab.github.io/Logiciel/**

**Avant de diffuser l'adresse :** complétez l'éditeur dans les mentions légales (obligatoire pour
un site public en France). Indiquez à votre développeur le nom ou la raison sociale, l'adresse et un
contact, ou modifiez `CABINET_DEMO.editeur` dans `src/seed.js`.

**Mettre à jour la démonstration :** `npm run construire`, puis publier `dist/demo/index.html`
sur la branche `gh-pages`.

---

## 2. Version de production chez un hébergeur certifié HDS

### Pourquoi un hébergeur certifié

Héberger des données de santé pour le compte d'un professionnel exige un hébergeur certifié HDS
(Code de la santé publique, article L. 1111-8). La version serveur de SACCADES est prête à être
déployée chez un tel hébergeur. Le contrat doit être **à votre nom** (ou à celui de votre société) :
personne ne peut le souscrire à votre place.

### Hébergeur proposé : Scalingo

Plateforme française, certifiée ISO 27001 et HDS sur ses régions de Paris : `osc-fr1` (accessible
directement) et `osc-secnum-fr1` (infrastructure SecNumCloud, accès sur demande, réservé aux
entreprises et organismes publics). L'application se déploie directement depuis le dépôt GitHub.

Alternatives certifiées HDS : Clever Cloud, OVHcloud. Vérifiez toujours la certification en cours
sur la liste publiée par l'Agence du numérique en santé.

### Étapes de déploiement

1. **Créer le compte** sur scalingo.com, au nom du cabinet ou de votre société.
2. **Créer l'application** dans la région `osc-fr1`. Indiquez qu'elle héberge des **données de santé** et
   acceptez les conditions HDS de Scalingo. Si l'option n'apparaît pas, demandez-la au support
   **avant** d'importer le moindre patient.
3. **Ajouter l'extension PostgreSQL** (onglet *Addons*). Choisissez une offre qui comprend des sauvegardes
   automatiques. L'extension fournit l'adresse de la base (`SCALINGO_POSTGRESQL_URL`).
4. **Relier le dépôt GitHub** `mimitrab/Logiciel` (onglet *Deploy*), branche à déployer :
   `claude/loving-mendel-j2u3fz` ou `main` une fois fusionnée.
5. **Variables d'environnement** (onglet *Environment*), voir `.env.exemple` :
   - `NODE_ENV` = `production`
   - `ADMIN_IDENTIFIANT` = `admin` (ou l'identifiant de votre choix)
   - `ADMIN_MOT_DE_PASSE` = un mot de passe provisoire d'au moins 12 caractères
6. **Déployer.** Au premier démarrage, le serveur crée les tables et le compte super-administrateur.
7. **Première connexion** à l'adresse fournie par Scalingo :
   - mot de passe provisoire ;
   - activation de la double authentification : scannez le QR code avec une application
     d'authentification (FreeOTP, Google Authenticator, Microsoft Authenticator) ;
   - choix du mot de passe définitif.
8. **Supprimez ensuite la variable `ADMIN_MOT_DE_PASSE`**, qui ne sert plus.
9. **Réglages du cabinet** : coordonnées, éditeur et hébergeur pour les mentions légales.
10. **Créez les comptes des praticiens** (menu *Utilisateurs*). Chacun active sa double
    authentification et choisit son mot de passe à la première connexion.
11. *Facultatif :* nom de domaine du cabinet (par exemple `saccades.mon-cabinet.fr`), à rattacher dans
    l'onglet *Domains* de Scalingo.

### Ce que fait déjà le serveur

- **Comptes** : comptes nominatifs, mots de passe d'au moins 12 caractères stockés sous forme
  d'empreinte scrypt, double authentification obligatoire (TOTP).
- **Protection des connexions** : blocage de 15 minutes après 5 échecs, limitation du nombre de
  tentatives par adresse IP.
- **Sessions** : cookie inaccessible aux scripts, limité au site et transmis en HTTPS seulement.
  Expiration après la durée d'inactivité choisie dans les réglages, et au plus tard après 12 heures.
- **Cloisonnement** : il est appliqué par le serveur. Un praticien ne reçoit que ses dossiers, et toute
  écriture hors de son périmètre est refusée.
- **Super-administrateur** : il ne voit que des chiffres. Pour consulter les dossiers d'un praticien, il
  ouvre un accès exceptionnel motivé, limité à une heure et consigné.
- **Journal d'audit** : tenu par le serveur et protégé contre la modification et la suppression au
  niveau de la base.
- **Sécurité du site** : HTTPS imposé, politique de sécurité du contenu stricte, aucun script ni
  aucune police chargés depuis un site tiers.

---

## 3. Démarches avant le premier vrai patient, dans l'ordre

| # | Démarche | Auprès de |
| --- | --- | --- |
| 1 | Contrat HDS signé, sauvegardes de la base incluses et testées | Hébergeur |
| 2 | Registre des traitements (RGPD, art. 30) et analyse d'impact (art. 35) | Vous, avec un délégué à la protection des données (DPO) |
| 3 | Contrat de sous-traitance avec l'hébergeur (art. 28) | Hébergeur |
| 4 | Note d'information remise aux patients ; durées de conservation des dossiers | Vous (référentiel CNIL des cabinets médicaux et paramédicaux) |
| 5 | Procédure en cas de violation de données (notification CNIL sous 72 h) | Vous |
| 6 | Mentions légales complètes (éditeur, hébergeur, contact) | Réglages du cabinet |
| 7 | Boîte de messagerie sécurisée MSSanté | Un opérateur MSSanté |
| 8 | Avis sur le statut de « dispositif médical » du logiciel (suggestions de conclusion, règle de décision) **avant toute diffusion à d'autres cabinets** | Consultant réglementaire / ANSM |

### Ensuite, pour aller plus loin

- **Pro Santé Connect** (connexion par e-CPS ou carte CPS) : raccordement à demander à l'Agence du
  numérique en santé. Il remplacera la double authentification actuelle.
- **Identité nationale de santé (INS)** : intégration du téléservice INSi, nécessaire pour échanger
  automatiquement avec Mon espace santé.
- **Envoi direct MSSanté et Mon espace santé depuis SACCADES** : référencement du logiciel auprès de
  l'Agence du numérique en santé. En attendant, l'envoi se fait depuis la messagerie MSSanté et
  SACCADES enregistre la date et les destinataires.
- **Télétransmission SESAM-Vitale** : elle exige un logiciel agréé. SACCADES suit les actes mais ne
  télétransmet pas.

Ces repères ne remplacent pas l'avis d'un délégué à la protection des données ou d'un conseil juridique.
