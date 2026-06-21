-- RUTE Cash Tracer - PostgreSQL/Supabase schema draft
-- Scope: MVP data foundation for owner-only operations, receipt AI, stock, HPP, and daily cash closing.

create table if not exists profiles (
  id uuid primary key,
  auth_user_id uuid unique,
  name text not null,
  email text unique not null,
  role text not null default 'owner' check (role = 'owner'),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

create table if not exists outlets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null,
  timezone text not null default 'Asia/Makassar',
  created_at timestamptz not null default now()
);

create table if not exists ingredients (
  id uuid primary key default gen_random_uuid(),
  outlet_id uuid references outlets(id),
  name text not null,
  category text not null check (category in ('bahan_baku', 'packaging', 'operasional')),
  base_unit text not null,
  stock numeric(14,3) not null default 0,
  min_stock numeric(14,3) not null default 0,
  weighted_avg_cost numeric(14,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists ingredient_units (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references ingredients(id) on delete cascade,
  unit_name text not null,
  conversion_to_base_unit numeric(14,6) not null,
  example text,
  created_at timestamptz not null default now(),
  unique (ingredient_id, unit_name)
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  outlet_id uuid references outlets(id),
  name text not null,
  category text not null,
  selling_price numeric(14,2) not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id),
  quantity numeric(14,3) not null,
  unit text not null,
  created_at timestamptz not null default now(),
  unique (product_id, ingredient_id)
);

create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  outlet_id uuid references outlets(id),
  sale_number text unique not null,
  sold_at timestamptz not null default now(),
  payment_method text not null check (payment_method in ('cash', 'qris', 'transfer')),
  subtotal numeric(14,2) not null,
  total numeric(14,2) not null,
  estimated_hpp numeric(14,2) not null default 0,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales(id) on delete cascade,
  product_id uuid not null references products(id),
  product_name text not null,
  quantity integer not null,
  unit_price numeric(14,2) not null,
  subtotal numeric(14,2) not null,
  estimated_hpp numeric(14,2) not null default 0
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  outlet_id uuid references outlets(id),
  expense_number text unique not null,
  expense_at timestamptz not null default now(),
  category text not null,
  description text not null,
  total numeric(14,2) not null,
  status text not null check (status in ('auto_approved', 'pending', 'approved', 'rejected')),
  source_type text not null default 'manual' check (source_type in ('manual', 'receipt_ai')),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists expense_items (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references expenses(id) on delete cascade,
  ingredient_id uuid references ingredients(id),
  name text not null,
  category text not null,
  quantity numeric(14,3) not null,
  unit text,
  unit_price numeric(14,2) not null,
  total numeric(14,2) not null,
  adds_stock boolean not null default false,
  stock_quantity numeric(14,3),
  stock_unit text
);

create table if not exists receipt_uploads (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid references expenses(id),
  uploaded_by uuid references profiles(id),
  file_path text,
  original_file_name text,
  ai_status text not null default 'pending' check (ai_status in ('pending', 'processed', 'failed', 'confirmed')),
  ai_raw_json jsonb,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists stock_movements (
  id uuid primary key default gen_random_uuid(),
  outlet_id uuid references outlets(id),
  ingredient_id uuid not null references ingredients(id),
  movement_type text not null check (movement_type in ('in', 'out', 'adjustment', 'waste')),
  source_type text not null check (source_type in ('sale', 'expense', 'manual', 'opname', 'receipt')),
  source_id uuid,
  quantity numeric(14,3) not null,
  unit text not null,
  note text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists cash_closings (
  id uuid primary key default gen_random_uuid(),
  outlet_id uuid references outlets(id),
  business_date date not null,
  opening_cash numeric(14,2) not null default 0,
  expected_cash numeric(14,2) not null default 0,
  actual_cash numeric(14,2),
  difference numeric(14,2),
  qris_total numeric(14,2) not null default 0,
  transfer_total numeric(14,2) not null default 0,
  cash_expense_total numeric(14,2) not null default 0,
  status text not null default 'open' check (status in ('open', 'closed')),
  notes text,
  closed_by uuid references profiles(id),
  closed_at timestamptz,
  unique (outlet_id, business_date)
);

create table if not exists daily_notes (
  id uuid primary key default gen_random_uuid(),
  outlet_id uuid references outlets(id),
  business_date date not null,
  note text not null,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid(),
  outlet_id uuid references outlets(id),
  actor_id uuid references profiles(id),
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_sales_outlet_sold_at on sales(outlet_id, sold_at);
create index if not exists idx_expenses_outlet_expense_at on expenses(outlet_id, expense_at);
create index if not exists idx_stock_movements_ingredient_created_at on stock_movements(ingredient_id, created_at);
create index if not exists idx_receipt_uploads_expense_id on receipt_uploads(expense_id);
create index if not exists idx_activity_logs_outlet_created_at on activity_logs(outlet_id, created_at);
