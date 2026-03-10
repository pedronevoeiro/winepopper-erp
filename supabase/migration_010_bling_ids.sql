-- ============================================================
-- Winepopper ERP — Migration 010: Bling IDs para importacao
-- Cada registro importado do Bling recebe o ID original para
-- evitar duplicatas em re-importacoes (upsert por bling_id)
-- ============================================================

ALTER TABLE erp_contacts
  ADD COLUMN IF NOT EXISTS bling_id bigint;
CREATE UNIQUE INDEX IF NOT EXISTS erp_contacts_bling_id_idx ON erp_contacts(bling_id) WHERE bling_id IS NOT NULL;

ALTER TABLE erp_products
  ADD COLUMN IF NOT EXISTS bling_id bigint;
CREATE UNIQUE INDEX IF NOT EXISTS erp_products_bling_id_idx ON erp_products(bling_id) WHERE bling_id IS NOT NULL;

ALTER TABLE erp_sales_orders
  ADD COLUMN IF NOT EXISTS bling_id bigint;
CREATE UNIQUE INDEX IF NOT EXISTS erp_sales_orders_bling_id_idx ON erp_sales_orders(bling_id) WHERE bling_id IS NOT NULL;

ALTER TABLE erp_financial_entries
  ADD COLUMN IF NOT EXISTS bling_id bigint;
CREATE UNIQUE INDEX IF NOT EXISTS erp_financial_entries_bling_id_idx ON erp_financial_entries(bling_id) WHERE bling_id IS NOT NULL;

ALTER TABLE erp_invoices
  ADD COLUMN IF NOT EXISTS bling_id bigint;
CREATE UNIQUE INDEX IF NOT EXISTS erp_invoices_bling_id_idx ON erp_invoices(bling_id) WHERE bling_id IS NOT NULL;
