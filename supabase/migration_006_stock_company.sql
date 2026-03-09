-- ============================================================
-- Winepopper ERP — Migration 006: Estoque por Empresa
-- Separa controle de estoque entre Easy Wine e Hamecon
-- ============================================================

-- ── 1. Adicionar company_id nas tabelas de estoque e compras ──

ALTER TABLE erp_purchase_entries
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES erp_companies(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS erp_purchase_entries_company_idx ON erp_purchase_entries(company_id);

ALTER TABLE erp_stock
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES erp_companies(id) ON DELETE RESTRICT;

ALTER TABLE erp_stock_movements
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES erp_companies(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS erp_stock_movements_company_idx ON erp_stock_movements(company_id);

-- ── 2. Recriar unique constraint do stock incluindo company_id ──
-- Nota: se a constraint original nao existir, o DROP vai falhar silenciosamente
ALTER TABLE erp_stock DROP CONSTRAINT IF EXISTS erp_stock_product_id_variation_id_warehouse_id_key;
ALTER TABLE erp_stock ADD CONSTRAINT erp_stock_product_company_unique
  UNIQUE(product_id, variation_id, warehouse_id, company_id);

-- ── 3. Migrar dados existentes para a empresa padrao ──
-- INSTRUCAO: Substitua '<EASY_WINE_UUID>' pelo UUID real da Easy Wine em erp_companies
-- Voce pode encontrar com: SELECT id, name FROM erp_companies WHERE document LIKE '%34227106%';

-- UPDATE erp_stock SET company_id = '<EASY_WINE_UUID>' WHERE company_id IS NULL;
-- UPDATE erp_stock_movements SET company_id = '<EASY_WINE_UUID>' WHERE company_id IS NULL;
-- UPDATE erp_purchase_entries SET company_id = '<EASY_WINE_UUID>' WHERE company_id IS NULL;

-- Apos migrar os dados, descomentar e executar:
-- ALTER TABLE erp_stock ALTER COLUMN company_id SET NOT NULL;
-- ALTER TABLE erp_stock_movements ALTER COLUMN company_id SET NOT NULL;
-- ALTER TABLE erp_purchase_entries ALTER COLUMN company_id SET NOT NULL;

-- ── 4. Tabela de baixa de estoque (para saidas com rastreio) ──

CREATE TABLE IF NOT EXISTS erp_stock_writeoffs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id  uuid NOT NULL REFERENCES erp_sales_orders(id) ON DELETE CASCADE,
  order_item_id   uuid REFERENCES erp_sales_order_items(id) ON DELETE CASCADE,
  product_id      uuid NOT NULL REFERENCES erp_products(id) ON DELETE RESTRICT,
  variation_id    uuid REFERENCES erp_product_variations(id) ON DELETE SET NULL,
  company_id      uuid NOT NULL REFERENCES erp_companies(id) ON DELETE RESTRICT,
  warehouse_id    uuid NOT NULL REFERENCES erp_warehouses(id) ON DELETE RESTRICT,
  quantity        numeric(10,3) NOT NULL CHECK (quantity > 0),
  is_mirror       boolean NOT NULL DEFAULT false,
  notes           text,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS erp_stock_writeoffs_order_idx ON erp_stock_writeoffs(sales_order_id);
CREATE INDEX IF NOT EXISTS erp_stock_writeoffs_product_idx ON erp_stock_writeoffs(product_id);

ALTER TABLE erp_stock_writeoffs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "erp_stock_writeoffs_all" ON erp_stock_writeoffs FOR ALL
  USING (EXISTS (SELECT 1 FROM erp_user_profiles WHERE id = auth.uid() AND active = true));

-- ── 5. Adicionar unit nas tabelas de BOM e producao (pendente da sessao anterior) ──

ALTER TABLE erp_bom_components ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'un';
ALTER TABLE erp_production_components ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'un';
