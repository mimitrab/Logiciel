-- Schéma de la base SACCADES (PostgreSQL). Idempotent : exécuté à chaque démarrage.

create table if not exists utilisateurs (
  id text primary key,
  identifiant text not null unique,
  role text not null check (role in ('admin', 'praticien')),
  prenom text not null default '',
  nom text not null default '',
  titre text not null default '',
  rpps text not null default '',
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

create table if not exists reglages (
  cle text primary key,
  valeur jsonb not null
);

create table if not exists journal (
  id bigserial primary key,
  ts timestamptz not null default now(),
  utilisateur_id text,
  action text not null,
  praticien_id text,
  cible text,
  detail text,
  ip text
);
create index if not exists journal_ts on journal (ts desc);

-- Le journal d'audit ne se modifie pas et ne se supprime pas.
create or replace function journal_inalterable() returns trigger language plpgsql as '
begin
  raise exception ''Le journal d''''audit ne peut être ni modifié ni supprimé.'';
end';
drop trigger if exists journal_protection on journal;
create trigger journal_protection before update or delete on journal for each row execute function journal_inalterable();
