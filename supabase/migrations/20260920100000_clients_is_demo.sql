-- Marquage des clients de demonstration (item T-026)
--
-- POURQUOI
-- MiKL conserve 3 clients fictifs (Atelier Reynaud, Maison Vasseur,
-- Le Comptoir de Camille) pour pouvoir montrer une application remplie —
-- notamment pendant l'accreditation CII. Ils sont declares fictifs dans
-- `docs/vitrine-screenshots.md`, qui rappelle qu'ils sont « indiscernables de
-- vrais clients dans l'application ». C'est precisement ce qu'il faut corriger :
-- un tiers a qui on montre l'ecran ne doit JAMAIS pouvoir les prendre pour de
-- vrais clients.
--
-- CHOIX : un drapeau porte par la donnee, pas une liste d'identifiants en dur
-- dans le code. Une liste en dur obligerait a modifier le code a chaque nouveau
-- jeu de demonstration, et serait fausse des qu'une base differente est
-- utilisee (preview, kit de sortie, autre environnement).
--
-- La valeur par defaut est FALSE : un client cree normalement est un vrai
-- client. On ne marque que ce qui est explicitement fictif.

alter table clients
  add column if not exists is_demo boolean not null default false;

comment on column clients.is_demo is
  'Client de demonstration : donnees fictives, jamais un vrai client. Affiche un badge « Demo » dans le Hub (T-026).';

-- Index partiel : les clients de demonstration sont une poignee face a
-- l''ensemble des clients. Un index plein serait du gaspillage.
create index if not exists idx_clients_is_demo
  on clients (is_demo)
  where is_demo = true;

-- Marquage des 3 clients de demonstration existants.
-- Cible par email plutot que par UUID : deux d'entre eux portent un UUID
-- fabrique (`a1000000-…`, `b2000000-…`) mais le troisieme non, et l'email est
-- le seul identifiant stable et lisible des trois.
update clients
set is_demo = true
where email in (
  'thomas.reynaud@atelier-reynaud.fr',
  'lea.vasseur@maison-vasseur.fr',
  'camille.fournier@comptoir-camille.fr'
);
