-- Auto-creates a `profiles` row whenever someone signs up via Supabase
-- Auth. Expects the client to pass `role` and `full_name` in the signup
-- call's options.data (see src/app/(auth)/register/page.tsx):
--
--   supabase.auth.signUp({
--     email, password,
--     options: { data: { role: 'LANDLORD' | 'TENANT', full_name: '...' } }
--   })
--
-- Run this (and the other files in this folder, in filename order) via
-- `supabase db push`, or paste into the Supabase SQL editor.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'role', 'TENANT'),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.email
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
