-- calendar_integrations: tokens OAuth + config Cal.com par utilisateur
create table if not exists calendar_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('google', 'calcom')),
  connected boolean not null default false,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, provider)
);

alter table calendar_integrations enable row level security;

create policy "calendar_integrations_select_owner"
  on calendar_integrations for select using (auth.uid() = user_id);

create policy "calendar_integrations_insert_owner"
  on calendar_integrations for insert with check (auth.uid() = user_id);

create policy "calendar_integrations_update_owner"
  on calendar_integrations for update using (auth.uid() = user_id);

create policy "calendar_integrations_delete_owner"
  on calendar_integrations for delete using (auth.uid() = user_id);

create trigger trg_calendar_integrations_updated_at
  before update on calendar_integrations
  for each row execute function fn_update_updated_at();

-- calcom_bookings: RDV reçus via webhook Cal.com
create table if not exists calcom_bookings (
  id uuid primary key default gen_random_uuid(),
  calcom_booking_id text unique not null,
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  attendee_name text,
  attendee_email text,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled', 'rescheduled')),
  raw_payload jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table calcom_bookings enable row level security;

-- L'opérateur peut voir tous les RDV Cal.com
create policy "calcom_bookings_select_operator"
  on calcom_bookings for select using (is_operator());

-- Le webhook (service role) peut insérer/mettre à jour sans auth
create policy "calcom_bookings_insert_service"
  on calcom_bookings for insert with check (true);

create policy "calcom_bookings_update_service"
  on calcom_bookings for update using (true);

create trigger trg_calcom_bookings_updated_at
  before update on calcom_bookings
  for each row execute function fn_update_updated_at();
