-- CISTM Laboratory Equipment Inventory: tables and sign-up trigger. Run in the Supabase SQL Editor.

-- profiles: user accounts and roles (SOP 1)
create table public.profiles (
    id          uuid primary key references auth.users (id) on delete cascade,
    full_name   text        not null,
    email       text        not null unique,
    role        text        not null default 'user'
                            check (role in ('admin', 'staff', 'user')),
    created_at  timestamptz not null default now()
);

-- equipment: equipment records, condition, and status (SOP 2, SOP 3)
create table public.equipment (
    equipment_id        bigint generated always as identity primary key,
    equipment_code      text        not null unique,
    name                text        not null,
    category            text        not null,
    quantity            integer     not null default 1 check (quantity >= 0),
    location            text        not null,
    condition_status    text        not null default 'good'
                                    check (condition_status in ('good', 'fair', 'poor')),
    availability_status text        not null default 'available'
                                    check (availability_status in ('available', 'in_use', 'under_repair', 'defective')),
    date_added          date        not null default current_date
);

-- transactions: borrow and return log (SOP 4)
create table public.transactions (
    transaction_id  bigint generated always as identity primary key,
    equipment_id    bigint      not null references public.equipment (equipment_id) on delete restrict,
    user_id         uuid        not null references public.profiles (id) on delete restrict,
    borrowed_at     timestamptz not null default now(),
    returned_at     timestamptz,
    remarks         text
);

-- maintenance_reports: reported equipment issues (SOP 3)
create table public.maintenance_reports (
    report_id          bigint generated always as identity primary key,
    equipment_id       bigint      not null references public.equipment (equipment_id) on delete cascade,
    reported_by        uuid        not null references public.profiles (id) on delete restrict,
    issue_description  text        not null,
    date_reported      timestamptz not null default now(),
    status             text        not null default 'open'
                                   check (status in ('open', 'in_progress', 'resolved'))
);

-- Indexes
create index idx_transactions_equipment on public.transactions (equipment_id);
create index idx_transactions_user      on public.transactions (user_id);
create index idx_maintenance_equipment  on public.maintenance_reports (equipment_id);

-- Creates a profile with the role "user" for every new sign-up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, full_name, email, role)
    values (
        new.id,
        coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
        new.email,
        'user'
    );
    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();
