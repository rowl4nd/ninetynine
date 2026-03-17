-- ============================================================
-- NINETY NINE SALON — BOOKING SYSTEM DATABASE SCHEMA
-- Run this in your Supabase SQL Editor (supabase.com → project → SQL Editor)
-- ============================================================

-- 1. PRACTITIONERS TABLE
-- Each self-employed practitioner who works from the salon
create table public.practitioners (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text not null unique,
  role text not null default 'Nail Technician',
  specialty text not null default '',
  color text not null default '#C9A96E',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2. SERVICES TABLE
-- All treatments offered at the salon
create table public.services (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  category text not null check (category in ('nails', 'beauty')),
  duration integer not null, -- in minutes
  price decimal(6,2) not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 3. PRACTITIONER_SERVICES TABLE
-- Which practitioners offer which services (many-to-many)
create table public.practitioner_services (
  id uuid default gen_random_uuid() primary key,
  practitioner_id uuid not null references public.practitioners(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  -- Allow practitioner to override the default price
  custom_price decimal(6,2),
  unique(practitioner_id, service_id)
);

-- 4. AVAILABILITY TABLE
-- Weekly recurring schedule for each practitioner
-- day_of_week: 0 = Monday, 1 = Tuesday, ..., 5 = Saturday, 6 = Sunday
create table public.availability (
  id uuid default gen_random_uuid() primary key,
  practitioner_id uuid not null references public.practitioners(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null default '09:00',
  end_time time not null default '17:30',
  is_available boolean not null default true,
  unique(practitioner_id, day_of_week)
);

-- 5. BLOCKED_DATES TABLE
-- Holidays, sick days, or other dates a practitioner is unavailable
create table public.blocked_dates (
  id uuid default gen_random_uuid() primary key,
  practitioner_id uuid not null references public.practitioners(id) on delete cascade,
  blocked_date date not null,
  reason text default '',
  unique(practitioner_id, blocked_date)
);

-- 6. BOOKINGS TABLE
-- Every client booking
create table public.bookings (
  id uuid default gen_random_uuid() primary key,
  practitioner_id uuid not null references public.practitioners(id),
  service_id uuid not null references public.services(id),
  client_name text not null,
  client_phone text not null,
  client_email text default '',
  booking_date date not null,
  booking_time time not null,
  duration integer not null, -- in minutes, copied from service at time of booking
  price decimal(6,2) not null, -- copied from service at time of booking
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled', 'completed', 'no_show')),
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- INDEXES for fast queries
-- ============================================================

create index idx_bookings_practitioner_date on public.bookings(practitioner_id, booking_date);
create index idx_bookings_date on public.bookings(booking_date);
create index idx_bookings_status on public.bookings(status);
create index idx_availability_practitioner on public.availability(practitioner_id);
create index idx_blocked_dates_practitioner on public.blocked_dates(practitioner_id, blocked_date);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
alter table public.practitioners enable row level security;
alter table public.services enable row level security;
alter table public.practitioner_services enable row level security;
alter table public.availability enable row level security;
alter table public.blocked_dates enable row level security;
alter table public.bookings enable row level security;

-- PRACTITIONERS: anyone can read active practitioners, only the practitioner can update their own
create policy "Anyone can view active practitioners"
  on public.practitioners for select
  using (is_active = true);

create policy "Practitioners can update own record"
  on public.practitioners for update
  using (auth.uid() = user_id);

-- SERVICES: anyone can read active services
create policy "Anyone can view active services"
  on public.services for select
  using (is_active = true);

-- PRACTITIONER_SERVICES: anyone can read, practitioners manage their own
create policy "Anyone can view practitioner services"
  on public.practitioner_services for select
  using (true);

create policy "Practitioners can manage own services"
  on public.practitioner_services for all
  using (
    practitioner_id in (
      select id from public.practitioners where user_id = auth.uid()
    )
  );

-- AVAILABILITY: anyone can read, practitioners manage their own
create policy "Anyone can view availability"
  on public.availability for select
  using (true);

create policy "Practitioners can manage own availability"
  on public.availability for all
  using (
    practitioner_id in (
      select id from public.practitioners where user_id = auth.uid()
    )
  );

-- BLOCKED_DATES: anyone can read, practitioners manage their own
create policy "Anyone can view blocked dates"
  on public.blocked_dates for select
  using (true);

create policy "Practitioners can manage own blocked dates"
  on public.blocked_dates for all
  using (
    practitioner_id in (
      select id from public.practitioners where user_id = auth.uid()
    )
  );

-- BOOKINGS: anyone can create, practitioners can view/manage their own
create policy "Anyone can create a booking"
  on public.bookings for insert
  with check (true);

create policy "Practitioners can view own bookings"
  on public.bookings for select
  using (
    practitioner_id in (
      select id from public.practitioners where user_id = auth.uid()
    )
  );

create policy "Practitioners can update own bookings"
  on public.bookings for update
  using (
    practitioner_id in (
      select id from public.practitioners where user_id = auth.uid()
    )
  );

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Function to get available time slots for a practitioner on a given date
create or replace function public.get_available_slots(
  p_practitioner_id uuid,
  p_date date,
  p_duration integer default 30
)
returns table(slot_time time) as $$
declare
  v_day_of_week integer;
  v_start_time time;
  v_end_time time;
  v_is_available boolean;
  v_is_blocked boolean;
  v_current_slot time;
begin
  -- Get day of week (0=Monday in our schema)
  v_day_of_week := extract(isodow from p_date) - 1;

  -- Check if practitioner is available on this day of week
  select a.start_time, a.end_time, a.is_available
  into v_start_time, v_end_time, v_is_available
  from public.availability a
  where a.practitioner_id = p_practitioner_id
    and a.day_of_week = v_day_of_week;

  -- If no availability record or not available, return empty
  if not found or not v_is_available then
    return;
  end if;

  -- Check if date is blocked
  select exists(
    select 1 from public.blocked_dates bd
    where bd.practitioner_id = p_practitioner_id
      and bd.blocked_date = p_date
  ) into v_is_blocked;

  if v_is_blocked then
    return;
  end if;

  -- Generate 30-minute slots and check for conflicts
  v_current_slot := v_start_time;
  while v_current_slot + (p_duration || ' minutes')::interval <= v_end_time loop
    -- Check if this slot conflicts with an existing booking
    if not exists (
      select 1 from public.bookings b
      where b.practitioner_id = p_practitioner_id
        and b.booking_date = p_date
        and b.status in ('confirmed')
        and (
          -- New slot overlaps with existing booking
          (v_current_slot >= b.booking_time and v_current_slot < b.booking_time + (b.duration || ' minutes')::interval)
          or
          (v_current_slot + (p_duration || ' minutes')::interval > b.booking_time and v_current_slot < b.booking_time)
        )
    ) then
      slot_time := v_current_slot;
      return next;
    end if;
    v_current_slot := v_current_slot + interval '30 minutes';
  end loop;
end;
$$ language plpgsql security definer;

-- Function to update the updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_booking_updated
  before update on public.bookings
  for each row execute function public.handle_updated_at();

-- ============================================================
-- SEED DATA — The ninety nine team
-- ============================================================

-- Insert practitioners (user_id will be linked after they sign up)
insert into public.practitioners (name, email, role, specialty, color) values
  ('Lisa', 'lisa@ninetynine.co.uk', 'Beauty Therapist', 'Facials & Skin', '#C9A96E'),
  ('Inke', 'inke@ninetynine.co.uk', 'Nail & Brow Technician', 'Brows & Nails', '#B8A08A'),
  ('Holly', 'holly@ninetynine.co.uk', 'Nail Technician', 'Gel Toes', '#C4A882'),
  ('Kristen', 'kristen@ninetynine.co.uk', 'Nail Technician', 'Nail Art', '#A89080'),
  ('Melissa', 'melissa@ninetynine.co.uk', 'Nail Technician', 'Nail Art', '#BCA68E');

-- Insert services
insert into public.services (name, category, duration, price) values
  ('Gel Manicure', 'nails', 45, 30.00),
  ('Gel Toes', 'nails', 45, 30.00),
  ('Gel Manicure & Toes', 'nails', 75, 50.00),
  ('BIAB Overlay', 'nails', 60, 38.00),
  ('Acrylic Full Set', 'nails', 75, 40.00),
  ('Acrylic Infill', 'nails', 60, 30.00),
  ('Nail Art (add-on)', 'nails', 15, 10.00),
  ('Gel Removal', 'nails', 20, 10.00),
  ('Luxury Manicure', 'nails', 60, 45.00),
  ('Lash Lift & Tint', 'beauty', 60, 40.00),
  ('Brow Lamination', 'beauty', 45, 35.00),
  ('Brow Wax & Tint', 'beauty', 20, 15.00),
  ('Express Facial', 'beauty', 30, 30.00),
  ('Luxury Facial', 'beauty', 60, 55.00),
  ('Classic Lash Extensions', 'beauty', 90, 55.00),
  ('Waxing (from)', 'beauty', 15, 8.00),
  ('Lash or Brow Tint', 'beauty', 15, 10.00);

-- Set default availability (Mon-Fri 9-5:30, Sat 9-5, Sun off) for all practitioners
do $$
declare
  prac record;
begin
  for prac in select id from public.practitioners loop
    -- Monday to Friday
    for d in 0..4 loop
      insert into public.availability (practitioner_id, day_of_week, start_time, end_time, is_available)
      values (prac.id, d, '09:00', '17:30', true);
    end loop;
    -- Saturday
    insert into public.availability (practitioner_id, day_of_week, start_time, end_time, is_available)
    values (prac.id, 5, '09:00', '17:00', true);
    -- Sunday
    insert into public.availability (practitioner_id, day_of_week, start_time, end_time, is_available)
    values (prac.id, 6, '09:00', '17:00', false);
  end loop;
end $$;

-- Link all practitioners to all services initially
-- (You can remove individual links later from the dashboard)
insert into public.practitioner_services (practitioner_id, service_id)
select p.id, s.id
from public.practitioners p
cross join public.services s;
