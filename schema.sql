-- CAMPING TECHNIQUE PRO
-- Exécuter dans Supabase SQL Editor.
-- Si tu as déjà une ancienne version de la base, ce script ajoute les éléments
-- nécessaires sans supprimer les données existantes.

create extension if not exists pgcrypto;

create table if not exists public.profiles(
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null,
 created_at timestamptz not null default now()
);

create table if not exists public.mobile_homes(
 id text primary key,
 zone text not null,
 active boolean not null default true,
 notes text,
 created_at timestamptz not null default now()
);

insert into public.mobile_homes(id,zone)
select lpad(i::text,3,'0'), (array['Bora Bora','Tahiti','Moorea','Hiva Oa','Rangiroa'])[((i-1)%5)+1]
from generate_series(1,193) i
on conflict(id) do nothing;

create table if not exists public.stock_items(
 id uuid primary key default gen_random_uuid(),
 name text not null,
 category text not null default 'Autre',
 quantity integer not null default 0 check(quantity>=0),
 min_quantity integer not null default 0 check(min_quantity>=0),
 unit text not null default 'unité',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

insert into public.stock_items(name,category,quantity,min_quantity,unit)
select * from (values
('Pièces détachées','Pièces',126,30,'article'),
('Planchas','Équipement',84,20,'unité'),
('Lits bébé','Équipement',31,10,'unité'),
('Frigos neufs','Frigos',8,3,'unité'),
('Frigos à louer','Frigos',23,5,'unité')
) v(name,category,quantity,min_quantity,unit)
where not exists(select 1 from public.stock_items s where s.name=v.name);

create table if not exists public.repairs(
 id uuid primary key default gen_random_uuid(),
 mobile_home_id text not null references public.mobile_homes(id),
 title text not null,
 description text,
 priority text not null default 'Normale',
 status text not null default 'À faire',
 assignee text,
 created_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 validated_name text,
 validated_by uuid references auth.users(id),
 validated_at timestamptz
);

create table if not exists public.repair_parts(
 id uuid primary key default gen_random_uuid(),
 repair_id uuid not null references public.repairs(id) on delete cascade,
 stock_item_id uuid not null references public.stock_items(id),
 quantity integer not null check(quantity>0),
 created_at timestamptz not null default now()
);

create table if not exists public.repair_validations(
 id uuid primary key default gen_random_uuid(),
 repair_id uuid not null references public.repairs(id) on delete cascade,
 validated_name text not null,
 validated_by uuid references auth.users(id),
 validated_at timestamptz not null default now(),
 notes text
);

create table if not exists public.works(
 id uuid primary key default gen_random_uuid(),
 title text not null,
 zone text,
 description text,
 status text not null default 'Planifié',
 assignee text,
 due_date date,
 created_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.winter_checks(
 id uuid primary key default gen_random_uuid(),
 mobile_home_id text not null references public.mobile_homes(id),
 step_index integer not null,
 label text not null,
 completed boolean not null default false,
 completed_by uuid references auth.users(id),
 completed_at timestamptz,
 updated_at timestamptz not null default now(),
 unique(mobile_home_id,step_index)
);

create table if not exists public.stock_movements(
 id uuid primary key default gen_random_uuid(),
 stock_item_id uuid not null references public.stock_items(id),
 delta integer not null,
 quantity_after integer not null,
 reason text,
 user_id uuid references auth.users(id),
 created_at timestamptz not null default now()
);

create table if not exists public.activity_log(
 id uuid primary key default gen_random_uuid(),
 action text not null,
 details text,
 user_id uuid references auth.users(id),
 created_at timestamptz not null default now()
);

-- Colonnes utiles si une ancienne version existe déjà.
alter table public.repairs add column if not exists validated_name text;
alter table public.repairs add column if not exists validated_by uuid references auth.users(id);
alter table public.repairs add column if not exists validated_at timestamptz;
alter table public.repairs add column if not exists updated_at timestamptz not null default now();
alter table public.works add column if not exists updated_at timestamptz not null default now();
alter table public.stock_items add column if not exists updated_at timestamptz not null default now();

-- RLS
alter table public.profiles enable row level security;
alter table public.mobile_homes enable row level security;
alter table public.stock_items enable row level security;
alter table public.repairs enable row level security;
alter table public.repair_parts enable row level security;
alter table public.repair_validations enable row level security;
alter table public.works enable row level security;
alter table public.winter_checks enable row level security;
alter table public.stock_movements enable row level security;
alter table public.activity_log enable row level security;

drop policy if exists "profiles read" on public.profiles;
drop policy if exists "profiles insert own" on public.profiles;
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles read" on public.profiles for select to authenticated using(true);
create policy "profiles insert own" on public.profiles for insert to authenticated with check(auth.uid()=id);
create policy "profiles update own" on public.profiles for update to authenticated using(auth.uid()=id) with check(auth.uid()=id);

drop policy if exists "mobile homes authenticated" on public.mobile_homes;
create policy "mobile homes authenticated" on public.mobile_homes for all to authenticated using(true) with check(true);
drop policy if exists "stock authenticated" on public.stock_items;
create policy "stock authenticated" on public.stock_items for all to authenticated using(true) with check(true);
drop policy if exists "repairs authenticated" on public.repairs;
create policy "repairs authenticated" on public.repairs for all to authenticated using(true) with check(true);
drop policy if exists "repair parts authenticated" on public.repair_parts;
create policy "repair parts authenticated" on public.repair_parts for all to authenticated using(true) with check(true);
drop policy if exists "repair validations authenticated" on public.repair_validations;
create policy "repair validations authenticated" on public.repair_validations for all to authenticated using(true) with check(true);
drop policy if exists "works authenticated" on public.works;
create policy "works authenticated" on public.works for all to authenticated using(true) with check(true);
drop policy if exists "winter authenticated" on public.winter_checks;
create policy "winter authenticated" on public.winter_checks for all to authenticated using(true) with check(true);
drop policy if exists "stock movements authenticated" on public.stock_movements;
create policy "stock movements authenticated" on public.stock_movements for all to authenticated using(true) with check(true);
drop policy if exists "history authenticated" on public.activity_log;
create policy "history authenticated" on public.activity_log for all to authenticated using(true) with check(true);

-- Vue pratique pour l'historique : nom de l'utilisateur.
create or replace view public.activity_log_view as
select a.*, coalesce(p.full_name,'Utilisateur') as user_name
from public.activity_log a
left join public.profiles p on p.id=a.user_id;

-- Pour l'application, on lit activity_log_view à la place de la table brute.
grant select on public.activity_log_view to authenticated;

-- Créer les profils des comptes existants :
-- À exécuter après avoir créé les 2 utilisateurs, en remplaçant les UUID et noms.
-- insert into public.profiles(id,full_name) values
-- ('UUID_COMPTE_1','Gérard'),
-- ('UUID_COMPTE_2','Prénom Nom');
