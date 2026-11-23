-- Schéma de la base SACCADES (PostgreSQL). Idempotent : exécuté à chaque démarrage.
-- Plateforme multi-cabinets : chaque cabinet est isolé ; le propriétaire de la plateforme
-- gère les inscriptions et les abonnements sans jamais accéder aux dossiers des patients.

create table if not exists cabinets (
  id text primary key,
  nom text not null,
  ville text not null default '',
  statut text not null default 'en_attente' check (statut in ('en_attente', 'actif', 'suspendu', 'refuse')),
  essai_fin date,
  acces_jusqu date,
  code_parrainage text not null unique,
  parrain_id text references cabinets (id),
  contact_email text not null default '',
  fondateur_rpps text not null default '',
  stripe_client text,
  stripe_abonnement text,
  abonnement_statut text,
  premier_paiement timestamptz,
  cree timestamptz not null default now(),
  valide_le timestamptz
);

create table if not exists utilisateurs (
  id text primary key,
  cabinet_id text references cabinets (id),
  identifiant text not null unique,
  role text not null check (role in ('plateforme', 'admin', 'praticien')),
  gestionnaire boolean not null default false,
  prenom text not null default '',
  nom text not null default '',
  titre text not null default '',
  rpps text not null default '',
  email text not null default '',
  hash text not null,
  doit_changer boolean not null default true,
  totp_secret text,
  totp_actif boolean not null default false,
  totp_dernier bigint not null default 0,
  actif boolean not null default true,
  echecs integer not null default 0,
  bloque_jusqu timestamptz,
  derniere_connexion timestamptz,
  cree timestamptz not null default now()
);
create index if not exists utilisateurs_cabinet on utilisateurs (cabinet_id);

-- Le jeton de session n'est jamais stocké : seule son empreinte SHA-256 l'est.
create table if not exists sessions (
  id text primary key,
  utilisateur_id text not null references utilisateurs (id) on delete cascade,
  cree timestamptz not null default now(),
  vu timestamptz not null default now(),
  mfa_ok boolean not null default false,
  acces_praticien text references utilisateurs (id) on delete set null,
  acces_motif text,
  acces_debut timestamptz,
  acces_fin timestamptz
);

-- Dossiers, rendez-vous, bilans et factures : un document JSON par élément, rattaché à son praticien.
create table if not exists elements (
  collection text not null check (collection in ('patients', 'rdvs', 'bilans', 'factures')),
  id text not null,
  praticien_id text not null references utilisateurs (id),
  donnees jsonb not null,
  maj timestamptz not null default now(),
  primary key (collection, id)
);
create index if not exists elements_praticien on elements (praticien_id, collection);

-- Réglages par cabinet ; ceux de la plateforme sont rangés sous l'identifiant « _plateforme ».
create table if not exists reglages (
  cabinet_id text not null,
  cle text not null,
  valeur jsonb not null,
  primary key (cabinet_id, cle)
);

create table if not exists parrainages (
  filleul_id text primary key references cabinets (id),
  parrain_id text not null references cabinets (id),
  statut text not null default 'en_attente' check (statut in ('en_attente', 'recompense')),
  recompense_le timestamptz,
  cree timestamptz not null default now()
);

create table if not exists journal (
  id bigserial primary key,
  ts timestamptz not null default now(),
  cabinet_id text,
  utilisateur_id text,
  action text not null,
  praticien_id text,
  cible text,
  detail text,
  ip text
);
create index if not exists journal_cabinet on journal (cabinet_id, id desc);

-- Le journal d'audit ne se modifie pas et ne se supprime pas.
create or replace function journal_inalterable() returns trigger language plpgsql as '
begin
  raise exception ''Le journal d''''audit ne peut être ni modifié ni supprimé.'';
end';
drop trigger if exists journal_protection on journal;
create trigger journal_protection before update or delete on journal for each row execute function journal_inalterable();
