-- Deletes the 4 tables and the sign-up trigger. This erases all data.

drop trigger  if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop table    if exists public.maintenance_reports;
drop table    if exists public.transactions;
drop table    if exists public.equipment;
drop table    if exists public.profiles;
