-- Habilitar UUID
create extension if not exists "uuid-ossp";

-- Tabla de usuarios (vendedores y gerentes)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  role text not null default 'vendedor' check (role in ('vendedor', 'gerente')),
  created_at timestamp with time zone default now()
);

-- Trigger para crear perfil automáticamente al registrar usuario
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Tabla de ventas de autos
create table public.sales (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  customer_name text not null,
  rut text not null,
  model text not null,
  chassis text not null,
  odv text not null,
  purchase_type text not null check (purchase_type in ('R', 'F', 'FL')),
  sale_month date not null,
  created_at timestamp with time zone default now()
);

-- Tabla de créditos
create table public.credits (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  customer_name text not null,
  rut text not null,
  dealer_cost numeric(12,0) not null,
  credit_type text not null check (credit_type in ('CI', 'CC')),
  sale_month date not null,
  created_at timestamp with time zone default now()
);

-- RLS (Row Level Security): cada vendedor solo ve sus datos
alter table public.profiles enable row level security;
alter table public.sales enable row level security;
alter table public.credits enable row level security;

-- Políticas para profiles
create policy "Usuario ve su propio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Usuario actualiza su propio perfil"
  on public.profiles for update
  using (auth.uid() = id);

-- Políticas para sales
create policy "Vendedor ve sus ventas"
  on public.sales for select
  using (auth.uid() = user_id);

create policy "Vendedor inserta sus ventas"
  on public.sales for insert
  with check (auth.uid() = user_id);

create policy "Vendedor elimina sus ventas"
  on public.sales for delete
  using (auth.uid() = user_id);

-- Tabla de metas por métrica y mes
create table public.targets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  month date not null,
  metric text not null,
  value numeric not null,
  created_at timestamp with time zone default now(),
  unique (user_id, month, metric)
);

alter table public.targets enable row level security;

create policy "Vendedor ve sus metas"
  on public.targets for select using (auth.uid() = user_id);
create policy "Vendedor inserta sus metas"
  on public.targets for insert with check (auth.uid() = user_id);
create policy "Vendedor actualiza sus metas"
  on public.targets for update using (auth.uid() = user_id);
create policy "Vendedor elimina sus metas"
  on public.targets for delete using (auth.uid() = user_id);

-- Políticas para credits
create policy "Vendedor ve sus créditos"
  on public.credits for select
  using (auth.uid() = user_id);

create policy "Vendedor inserta sus créditos"
  on public.credits for insert
  with check (auth.uid() = user_id);

create policy "Vendedor elimina sus créditos"
  on public.credits for delete
  using (auth.uid() = user_id);
