-- ============================================================
-- Winepopper ERP — Migration 001: Schema
-- Executar no Supabase SQL Editor
-- ============================================================

-- ── Enums ────────────────────────────────────────────────────
CREATE TYPE erp_contact_type AS ENUM ('customer', 'supplier', 'both');
CREATE TYPE erp_person_type AS ENUM ('PF', 'PJ');
CREATE TYPE erp_order_status AS ENUM (
  'draft', 'pending', 'approved', 'in_production',
  'ready', 'shipped', 'delivered', 'cancelled', 'returned'
);
CREATE TYPE erp_financial_type AS ENUM ('receivable', 'payable');
CREATE TYPE erp_financial_status AS ENUM ('open', 'partial', 'paid', 'overdue', 'cancelled');
CREATE TYPE erp_payment_method AS ENUM ('pix', 'boleto', 'credit_card', 'transfer', 'cash', 'check', 'other');
CREATE TYPE erp_invoice_status AS ENUM ('draft', 'processing', 'authorized', 'cancelled', 'denied');
CREATE TYPE erp_invoice_direction AS ENUM ('outgoing', 'incoming');
CREATE TYPE erp_production_status AS ENUM ('draft', 'pending', 'in_progress', 'completed', 'cancelled');
CREATE TYPE erp_commission_status AS ENUM ('pending', 'approved', 'paid', 'cancelled');

-- ── User Profiles ────────────────────────────────────────────
CREATE TABLE erp_user_profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    text NOT NULL,
  role            text NOT NULL DEFAULT 'viewer'
                  CHECK (role IN ('admin', 'manager', 'vendedor', 'financeiro', 'producao', 'viewer')),
  phone           text,
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ── Salespeople ──────────────────────────────────────────────
CREATE TABLE erp_salespeople (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name            text NOT NULL,
  email           text,
  phone           text,
  commission_rate numeric(5,2) NOT NULL DEFAULT 0,
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ── Contacts ─────────────────────────────────────────────────
CREATE TABLE erp_contacts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type            erp_contact_type NOT NULL DEFAULT 'customer',
  person_type     erp_person_type NOT NULL DEFAULT 'PJ',
  name            text NOT NULL,
  trade_name      text,
  document        text NOT NULL,
  state_reg       text,
  municipal_reg   text,
  email           text,
  phone           text,
  mobile          text,
  website         text,
  cep             text,
  street          text,
  number          text,
  complement      text,
  neighborhood    text,
  city            text,
  state           text,
  ibge_code       text,
  notes           text,
  active          boolean NOT NULL DEFAULT true,
  salesperson_id  uuid REFERENCES erp_salespeople(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(document)
);

CREATE INDEX erp_contacts_document_idx ON erp_contacts(document);
CREATE INDEX erp_contacts_name_idx ON erp_contacts USING gin(to_tsvector('portuguese', name));
CREATE INDEX erp_contacts_type_idx ON erp_contacts(type);

-- ── Products ─────────────────────────────────────────────────
CREATE TABLE erp_products (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku             text UNIQUE NOT NULL,
  name            text NOT NULL,
  description     text,
  cost_price      numeric(10,2) NOT NULL DEFAULT 0,
  sell_price      numeric(10,2) NOT NULL DEFAULT 0,
  weight_grams    integer NOT NULL DEFAULT 0,
  height_cm       numeric(6,2) NOT NULL DEFAULT 0,
  width_cm        numeric(6,2) NOT NULL DEFAULT 0,
  length_cm       numeric(6,2) NOT NULL DEFAULT 0,
  category        text,
  brand           text,
  material        text,
  ncm             text,
  cest            text,
  origin          integer NOT NULL DEFAULT 0,
  cfop_venda      text DEFAULT '5102',
  images          text[] NOT NULL DEFAULT '{}',
  active          boolean NOT NULL DEFAULT true,
  manage_stock    boolean NOT NULL DEFAULT true,
  is_kit          boolean NOT NULL DEFAULT false,
  store_product_id uuid,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX erp_products_sku_idx ON erp_products(sku);
CREATE INDEX erp_products_name_idx ON erp_products USING gin(to_tsvector('portuguese', name));

-- ── Product Variations ───────────────────────────────────────
CREATE TABLE erp_product_variations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      uuid NOT NULL REFERENCES erp_products(id) ON DELETE CASCADE,
  name            text NOT NULL,
  sku             text UNIQUE,
  additional_cost numeric(10,2) NOT NULL DEFAULT 0,
  additional_price numeric(10,2) NOT NULL DEFAULT 0,
  active          boolean NOT NULL DEFAULT true
);

-- ── Product Suppliers ────────────────────────────────────────
CREATE TABLE erp_product_suppliers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      uuid NOT NULL REFERENCES erp_products(id) ON DELETE CASCADE,
  supplier_id     uuid NOT NULL REFERENCES erp_contacts(id) ON DELETE CASCADE,
  supplier_sku    text,
  cost_price      numeric(10,2),
  lead_time_days  integer DEFAULT 0,
  is_primary      boolean NOT NULL DEFAULT false,
  UNIQUE(product_id, supplier_id)
);

-- ── BOM (Bill of Materials) ──────────────────────────────────
CREATE TABLE erp_bom_components (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id       uuid NOT NULL REFERENCES erp_products(id) ON DELETE CASCADE,
  component_id    uuid NOT NULL REFERENCES erp_products(id) ON DELETE CASCADE,
  quantity        numeric(10,3) NOT NULL DEFAULT 1,
  UNIQUE(parent_id, component_id)
);

-- ── Warehouses ───────────────────────────────────────────────
CREATE TABLE erp_warehouses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  code            text UNIQUE NOT NULL,
  address         text,
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── Stock ────────────────────────────────────────────────────
CREATE TABLE erp_stock (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      uuid NOT NULL REFERENCES erp_products(id) ON DELETE CASCADE,
  variation_id    uuid REFERENCES erp_product_variations(id) ON DELETE CASCADE,
  warehouse_id    uuid NOT NULL REFERENCES erp_warehouses(id) ON DELETE CASCADE,
  quantity        numeric(10,3) NOT NULL DEFAULT 0,
  reserved        numeric(10,3) NOT NULL DEFAULT 0,
  min_quantity    numeric(10,3) NOT NULL DEFAULT 0,
  UNIQUE(product_id, variation_id, warehouse_id)
);

CREATE INDEX erp_stock_product_idx ON erp_stock(product_id);

-- ── Stock Movements ──────────────────────────────────────────
CREATE TABLE erp_stock_movements (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      uuid NOT NULL REFERENCES erp_products(id) ON DELETE CASCADE,
  variation_id    uuid REFERENCES erp_product_variations(id) ON DELETE CASCADE,
  warehouse_id    uuid NOT NULL REFERENCES erp_warehouses(id) ON DELETE CASCADE,
  quantity        numeric(10,3) NOT NULL,
  type            text NOT NULL CHECK (type IN ('sale', 'purchase', 'production', 'adjustment', 'transfer', 'return')),
  reference_type  text,
  reference_id    uuid,
  notes           text,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX erp_stock_movements_product_idx ON erp_stock_movements(product_id);
CREATE INDEX erp_stock_movements_created_idx ON erp_stock_movements(created_at);

-- ── Sales Orders ─────────────────────────────────────────────
CREATE TABLE erp_sales_orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number    serial,
  contact_id      uuid NOT NULL REFERENCES erp_contacts(id) ON DELETE RESTRICT,
  salesperson_id  uuid REFERENCES erp_salespeople(id) ON DELETE SET NULL,
  status          erp_order_status NOT NULL DEFAULT 'draft',
  order_date      date NOT NULL DEFAULT CURRENT_DATE,
  expected_date   date,
  subtotal        numeric(10,2) NOT NULL DEFAULT 0,
  discount_value  numeric(10,2) NOT NULL DEFAULT 0,
  shipping_cost   numeric(10,2) NOT NULL DEFAULT 0,
  other_costs     numeric(10,2) NOT NULL DEFAULT 0,
  total           numeric(10,2) NOT NULL DEFAULT 0,
  payment_method  erp_payment_method,
  payment_condition text,
  installments    integer DEFAULT 1,
  shipping_address jsonb,
  shipping_method text,
  shipping_tracking text,
  carrier_name    text,
  store_order_id  uuid,
  pagarme_id      text,
  melhorenvio_id  text,
  notes           text,
  internal_notes  text,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX erp_sales_orders_status_idx ON erp_sales_orders(status);
CREATE INDEX erp_sales_orders_contact_idx ON erp_sales_orders(contact_id);
CREATE INDEX erp_sales_orders_date_idx ON erp_sales_orders(order_date);
CREATE UNIQUE INDEX erp_sales_orders_number_idx ON erp_sales_orders(order_number);

-- ── Sales Order Items ────────────────────────────────────────
CREATE TABLE erp_sales_order_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        uuid NOT NULL REFERENCES erp_sales_orders(id) ON DELETE CASCADE,
  product_id      uuid NOT NULL REFERENCES erp_products(id) ON DELETE RESTRICT,
  variation_id    uuid REFERENCES erp_product_variations(id) ON DELETE SET NULL,
  description     text NOT NULL,
  sku             text,
  quantity        numeric(10,3) NOT NULL CHECK (quantity > 0),
  unit_price      numeric(10,2) NOT NULL,
  discount_pct    numeric(5,2) NOT NULL DEFAULT 0,
  total           numeric(10,2) NOT NULL,
  ncm             text,
  cfop            text
);

CREATE INDEX erp_sales_order_items_order_idx ON erp_sales_order_items(order_id);

-- ── Financial Entries ────────────────────────────────────────
CREATE TABLE erp_financial_entries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type            erp_financial_type NOT NULL,
  status          erp_financial_status NOT NULL DEFAULT 'open',
  contact_id      uuid REFERENCES erp_contacts(id) ON DELETE SET NULL,
  description     text NOT NULL,
  amount          numeric(10,2) NOT NULL,
  paid_amount     numeric(10,2) NOT NULL DEFAULT 0,
  due_date        date NOT NULL,
  payment_date    date,
  payment_method  erp_payment_method,
  reference_type  text,
  reference_id    uuid,
  category        text,
  notes           text,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX erp_financial_entries_type_idx ON erp_financial_entries(type);
CREATE INDEX erp_financial_entries_status_idx ON erp_financial_entries(status);
CREATE INDEX erp_financial_entries_due_date_idx ON erp_financial_entries(due_date);
CREATE INDEX erp_financial_entries_contact_idx ON erp_financial_entries(contact_id);

-- ── Financial Installments ───────────────────────────────────
CREATE TABLE erp_financial_installments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id        uuid NOT NULL REFERENCES erp_financial_entries(id) ON DELETE CASCADE,
  installment_num integer NOT NULL,
  amount          numeric(10,2) NOT NULL,
  due_date        date NOT NULL,
  paid_amount     numeric(10,2) NOT NULL DEFAULT 0,
  payment_date    date,
  status          erp_financial_status NOT NULL DEFAULT 'open',
  UNIQUE(entry_id, installment_num)
);

-- ── Invoices (NF-e) ──────────────────────────────────────────
CREATE TABLE erp_invoices (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direction       erp_invoice_direction NOT NULL DEFAULT 'outgoing',
  status          erp_invoice_status NOT NULL DEFAULT 'draft',
  number          integer,
  series          integer DEFAULT 1,
  access_key      text,
  protocol        text,
  sales_order_id  uuid REFERENCES erp_sales_orders(id) ON DELETE SET NULL,
  contact_id      uuid REFERENCES erp_contacts(id) ON DELETE SET NULL,
  total_products  numeric(10,2) NOT NULL DEFAULT 0,
  total_shipping  numeric(10,2) NOT NULL DEFAULT 0,
  total_discount  numeric(10,2) NOT NULL DEFAULT 0,
  total_tax       numeric(10,2) NOT NULL DEFAULT 0,
  total           numeric(10,2) NOT NULL DEFAULT 0,
  provider        text DEFAULT 'focus_nfe',
  provider_ref    text,
  xml_url         text,
  pdf_url         text,
  issue_date      timestamptz,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX erp_invoices_order_idx ON erp_invoices(sales_order_id);
CREATE INDEX erp_invoices_status_idx ON erp_invoices(status);

-- ── Production Orders ────────────────────────────────────────
CREATE TABLE erp_production_orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number    serial,
  status          erp_production_status NOT NULL DEFAULT 'draft',
  product_id      uuid NOT NULL REFERENCES erp_products(id) ON DELETE RESTRICT,
  variation_id    uuid REFERENCES erp_product_variations(id) ON DELETE SET NULL,
  quantity        numeric(10,3) NOT NULL CHECK (quantity > 0),
  warehouse_id    uuid NOT NULL REFERENCES erp_warehouses(id) ON DELETE RESTRICT,
  sales_order_id  uuid REFERENCES erp_sales_orders(id) ON DELETE SET NULL,
  planned_date    date,
  started_at      timestamptz,
  completed_at    timestamptz,
  notes           text,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ── Production Components ────────────────────────────────────
CREATE TABLE erp_production_components (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_id   uuid NOT NULL REFERENCES erp_production_orders(id) ON DELETE CASCADE,
  component_id    uuid NOT NULL REFERENCES erp_products(id) ON DELETE RESTRICT,
  required_qty    numeric(10,3) NOT NULL,
  consumed_qty    numeric(10,3) NOT NULL DEFAULT 0
);

-- ── Purchase Entries ─────────────────────────────────────────
CREATE TABLE erp_purchase_entries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id     uuid NOT NULL REFERENCES erp_contacts(id) ON DELETE RESTRICT,
  invoice_number  text,
  invoice_series  text,
  invoice_key     text,
  total_products  numeric(10,2) NOT NULL DEFAULT 0,
  total_shipping  numeric(10,2) NOT NULL DEFAULT 0,
  total_other     numeric(10,2) NOT NULL DEFAULT 0,
  total           numeric(10,2) NOT NULL DEFAULT 0,
  entry_date      date NOT NULL DEFAULT CURRENT_DATE,
  issue_date      date,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'cancelled')),
  warehouse_id    uuid NOT NULL REFERENCES erp_warehouses(id) ON DELETE RESTRICT,
  notes           text,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ── Purchase Entry Items ─────────────────────────────────────
CREATE TABLE erp_purchase_entry_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id        uuid NOT NULL REFERENCES erp_purchase_entries(id) ON DELETE CASCADE,
  product_id      uuid NOT NULL REFERENCES erp_products(id) ON DELETE RESTRICT,
  variation_id    uuid REFERENCES erp_product_variations(id) ON DELETE SET NULL,
  quantity        numeric(10,3) NOT NULL CHECK (quantity > 0),
  unit_cost       numeric(10,2) NOT NULL,
  total           numeric(10,2) NOT NULL
);

-- ── Commissions ──────────────────────────────────────────────
CREATE TABLE erp_commissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salesperson_id  uuid NOT NULL REFERENCES erp_salespeople(id) ON DELETE RESTRICT,
  sales_order_id  uuid NOT NULL REFERENCES erp_sales_orders(id) ON DELETE CASCADE,
  order_total     numeric(10,2) NOT NULL,
  commission_rate numeric(5,2) NOT NULL,
  commission_value numeric(10,2) NOT NULL,
  status          erp_commission_status NOT NULL DEFAULT 'pending',
  financial_entry_id uuid REFERENCES erp_financial_entries(id) ON DELETE SET NULL,
  paid_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX erp_commissions_salesperson_idx ON erp_commissions(salesperson_id);
CREATE INDEX erp_commissions_order_idx ON erp_commissions(sales_order_id);
CREATE INDEX erp_commissions_status_idx ON erp_commissions(status);

-- ── Settings ─────────────────────────────────────────────────
CREATE TABLE erp_settings (
  key   text PRIMARY KEY,
  value jsonb NOT NULL
);

-- ── Audit Log ────────────────────────────────────────────────
CREATE TABLE erp_audit_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id),
  action          text NOT NULL,
  entity_type     text NOT NULL,
  entity_id       uuid NOT NULL,
  changes         jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX erp_audit_log_entity_idx ON erp_audit_log(entity_type, entity_id);
CREATE INDEX erp_audit_log_created_idx ON erp_audit_log(created_at);
