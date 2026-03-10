-- ============================================================
-- Winepopper ERP — Migration 011: Produtos Espelho + Flag Estoque Ficticio
-- Permite mapear produtos de uma empresa (estoque ficticio)
-- para os produtos reais de outra empresa
-- ============================================================

-- ── 1. Flag na empresa indicando estoque ficticio ──
ALTER TABLE erp_companies
  ADD COLUMN IF NOT EXISTS is_mirror_stock boolean NOT NULL DEFAULT false;

-- Marcar Hamecon como empresa com estoque ficticio
UPDATE erp_companies SET is_mirror_stock = true WHERE document = '61708573000169';

-- ── 2. Tabela de mapeamento de produtos espelho ──
CREATE TABLE IF NOT EXISTS erp_product_mirrors (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_company_id   uuid NOT NULL REFERENCES erp_companies(id) ON DELETE CASCADE,
  source_product_id   uuid NOT NULL REFERENCES erp_products(id) ON DELETE CASCADE,
  source_variation_id uuid REFERENCES erp_product_variations(id) ON DELETE SET NULL,
  target_company_id   uuid NOT NULL REFERENCES erp_companies(id) ON DELETE CASCADE,
  target_product_id   uuid NOT NULL REFERENCES erp_products(id) ON DELETE CASCADE,
  target_variation_id uuid REFERENCES erp_product_variations(id) ON DELETE SET NULL,
  quantity_ratio      numeric(10,3) NOT NULL DEFAULT 1,
  active              boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Um produto fonte so pode ter um espelho por empresa
CREATE UNIQUE INDEX IF NOT EXISTS erp_product_mirrors_source_unique
  ON erp_product_mirrors(source_company_id, source_product_id, source_variation_id)
  WHERE active = true;

CREATE INDEX IF NOT EXISTS erp_product_mirrors_source_idx
  ON erp_product_mirrors(source_company_id, source_product_id);

CREATE INDEX IF NOT EXISTS erp_product_mirrors_target_idx
  ON erp_product_mirrors(target_company_id, target_product_id);

ALTER TABLE erp_product_mirrors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "erp_product_mirrors_all" ON erp_product_mirrors FOR ALL
  USING (EXISTS (SELECT 1 FROM erp_user_profiles WHERE id = auth.uid() AND active = true));
