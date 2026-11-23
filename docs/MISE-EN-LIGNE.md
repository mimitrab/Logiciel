# Mettre SACCADES en ligne

SACCADES fonctionne comme une plateforme : chaque orthoptiste inscrit son cabinet, profite d'une
période gratuite, puis s'abonne. Vous, propriétaire, validez les inscriptions et suivez les
abonnements et parrainages, sans jamais accéder aux dossiers des patients.

1. **Démonstration publique** (patients fictifs) : gratuite, en ligne en deux minutes.
2. **Plateforme en production** (vrais patients) : hébergeur certifié HDS, documents juridiques,
   paiement. Toutes les démarches doivent être faites **avant** le premier vrai patient.

---

## 1. Démonstration publique sur GitHub Pages

La démonstration est publiée sur la branche `gh-pages` du dépôt. Elle ne contient que des patients
fictifs ; ce que les visiteurs saisissent reste dans leur navigateur. Le compte « Propriétaire de
SACCADES » de la démonstration montre votre future console.

**Activer la publication (une seule fois) :**

1. Ouvrez https://github.com/mimitrab/Logiciel/settings/pages
2. Rubrique *Build and deployment* → *Source* : **Deploy from a branch**.
3. *Branch* : **gh-pages**, dossier **/ (root)**, puis **Save**.
4. Après une à deux minutes, le site répond à l'adresse **https://mimitrab.github.io/Logiciel/**

---

## 2. Plateforme en production

### Hébergeur

Héberger des données de santé pour le compte de professionnels exige un hébergeur certifié HDS
(Code de la santé publique, article L. 1111-8). Proposition : **Scalingo**, plateforme française
certifiée ISO 27001 et HDS sur ses régions de Paris : `osc-fr1` (accessible directement) et
`osc-secnum-fr1` (infrastructure SecNumCloud, accès sur demande pour les entreprises). Alternatives :
Clever Cloud, OVHcloud. Vérifiez la certification en cours sur la liste de l'Agence du numérique en
santé.

Le contrat se souscrit **au nom de votre société** : personne ne peut le faire à votre place.

### Déploiement

1. Créer le compte Scalingo au nom de votre société.
2. Créer l'application dans la région `osc-fr1`. Indiquez qu'elle héberge des **données de santé** et
   acceptez les conditions HDS de Scalingo. Si l'option n'apparaît pas, demandez-la au support avant
   tout import de patient.
3. Ajouter l'extension **PostgreSQL** (onglet *Addons*), avec une offre qui comprend des sauvegardes
   automatiques.
4. Relier le dépôt GitHub `mimitrab/Logiciel` (onglet *Deploy*).
5. Variables (onglet *Environment*), voir `.env.exemple` :
   - `NODE_ENV` = `production` ;
   - `PROPRIETAIRE_IDENTIFIANT` = `proprietaire` ;
   - `PROPRIETAIRE_MOT_DE_PASSE` = un mot de passe provisoire d'au moins 12 caractères ;
   - `URL_PUBLIQUE` = l'adresse du site.
6. Déployer. Au premier démarrage, le serveur crée les tables et **votre compte de propriétaire**.
7. Première connexion : mot de passe provisoire, activation de la double authentification (QR code à
   scanner avec FreeOTP, Google Authenticator ou Microsoft Authenticator), puis mot de passe définitif.
   Supprimez ensuite `PROPRIETAIRE_MOT_DE_PASSE`.
8. Rattacher votre nom de domaine (onglet *Domains*), par exemple `app.saccades.fr`.

### Ouvrir les inscriptions

Dans votre console, menu **Offre et inscriptions** :

- prix par praticien et par mois (HT), durée de la période gratuite, mois offerts au parrain et au filleul ;
- éditeur et hébergeur, pour les mentions légales ;
- **conditions générales** : les inscriptions ne peuvent pas s'ouvrir tant qu'elles sont vides ;
- case « Inscriptions ouvertes au public ».

**Chaque inscription arrive en attente.** Vérifiez le numéro RPPS sur https://annuaire.sante.fr, puis
cliquez sur *Valider* : la période gratuite commence à ce moment-là.

### Paiement

**Sans paiement en ligne (pour démarrer).** Quand un cabinet vous règle par virement, cliquez sur
*Paiement reçu* et indiquez la date de fin de la période payée.

**Avec Stripe (paiement par carte ou prélèvement SEPA) :**

1. Ouvrez un compte Stripe au nom de votre société.
2. Créez un produit « SACCADES » avec un **prix mensuel récurrent par unité** égal au prix HT de votre
   offre. Réglez la TVA avec votre comptable, par exemple avec Stripe Tax.
3. Copiez l'identifiant du prix (`price_…`) dans `STRIPE_PRICE_ID` et la clé secrète dans
   `STRIPE_SECRET_KEY`.
4. Créez un point de terminaison webhook vers `https://<votre domaine>/api/stripe/webhook`. Abonnez-le
   aux événements `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted` et `invoice.paid`. Copiez son secret
   de signature dans `STRIPE_WEBHOOK_SECRET`.
5. Faites un essai complet en **mode test** de Stripe (clés `sk_test_…`) avant de passer aux clés
   réelles.

Un cabinet en période gratuite qui s'abonne n'est prélevé qu'à la fin de sa période gratuite. Le
nombre de praticiens facturés suit les comptes actifs du cabinet.

### Parrainage

Chaque cabinet a un code (`SAC-XXXXXX`) et un lien d'inscription. Quand un cabinet parrainé effectue
son **premier paiement**, le parrain et le filleul reçoivent chacun les mois offerts prévus dans
l'offre :

- **sans Stripe**, ces mois prolongent la date d'accès ;
- **avec Stripe**, ils décalent aussi le prochain prélèvement.

La récompense n'est jamais attribuée à la simple inscription.

### Fin de la période gratuite

Un cabinet qui ne s'abonne pas passe en **lecture seule** : ses dossiers restent consultables et
exportables, mais la saisie est bloquée jusqu'à l'abonnement. Les données d'un patient ne sont jamais
rendues inaccessibles à son praticien.

### Ce que fait déjà le serveur

- **Cloisonnement** : chaque cabinet est isolé des autres, et chaque praticien n'accède qu'à ses
  dossiers. C'est le serveur qui l'impose.
- **Console du propriétaire** : elle ne reçoit que des informations administratives (cabinets,
  fondateurs, abonnements), jamais de donnée de patient.
- **Comptes** : nominatifs, avec double authentification obligatoire et mots de passe d'au moins
  12 caractères stockés sous forme d'empreinte scrypt.
- **Protection des connexions** : blocage de 15 minutes après 5 échecs et limitation des tentatives
  par adresse IP. Les inscriptions sont limitées à 10 par heure et par adresse.
- **Sessions** : cookie inaccessible aux scripts et transmis en HTTPS seulement, avec expiration
  après inactivité.
- **Journal d'audit** : protégé contre la modification et la suppression au niveau de la base.
- **Paiement en ligne** : les notifications de Stripe sont vérifiées par leur signature.
- **Sécurité du site** : HTTPS imposé, politique de sécurité du contenu stricte, aucun script ni
  aucune police chargés depuis un site tiers.

---

## 3. Vos obligations en tant qu'éditeur de la plateforme

Vos clients vous confient les données de santé de leurs patients. Chaque praticien reste responsable
du traitement ; **votre société devient son sous-traitant** au sens du RGPD. Ce statut entraîne les
obligations suivantes.

| # | Démarche | Auprès de |
| --- | --- | --- |
| 1 | Créer une société (forme juridique, compte bancaire, TVA) | Expert-comptable |
| 2 | Contrat HDS avec l'hébergeur, sauvegardes incluses et testées | Hébergeur |
| 3 | **Vérifier si votre société doit être certifiée HDS elle-même** : l'administration et l'exploitation de l'application font partie du périmètre de la certification. Sinon, confiez-les à un prestataire certifié qui les couvre | Organisme certificateur, ou conseil spécialisé |
| 4 | Conditions générales d'utilisation et de vente, et **contrat de traitement des données (RGPD, art. 28)** avec chaque cabinet | Avocat |
| 5 | Registre des traitements (art. 30), analyse d'impact (art. 35), procédure de violation de données (72 h) | Vous, avec un délégué à la protection des données |
| 6 | Mentions légales complètes (éditeur, hébergeur, contact) | Console → Offre et inscriptions |
| 7 | **Faire valider le parrainage** au regard de l'encadrement des avantages offerts aux professionnels de santé (Code de la santé publique, art. L. 1453-3 et suivants). Les mois offerts sur l'abonnement sont la forme la plus prudente | Avocat en droit de la santé |
| 8 | **Statut de dispositif médical** : les suggestions de conclusion et la règle de décision thérapeutique peuvent faire relever SACCADES de cette réglementation | Consultant réglementaire / ANSM |

### Pour aller plus loin

- **Pro Santé Connect** (connexion par e-CPS ou carte CPS) : raccordement auprès de l'Agence du
  numérique en santé.
- **Identité nationale de santé (INS)** : intégration du téléservice INSi.
- **Envoi direct MSSanté et Mon espace santé** : référencement du logiciel auprès de l'Agence du
  numérique en santé.
- **Télétransmission SESAM-Vitale** : elle exige un logiciel agréé. SACCADES suit les actes mais ne
  télétransmet pas.

Ces repères ne remplacent pas l'avis d'un avocat, d'un délégué à la protection des données ou d'un
consultant réglementaire.
