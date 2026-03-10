-- ============================================================
-- Winepopper ERP — Migration 009: Tornar company_id NOT NULL
-- Garante integridade: todo estoque e compra pertence a uma empresa
-- ============================================================

-- IMPORTANTE: Antes de rodar, migre registros orfaos:
-- UPDATE erp_stock SET company_id = (SELECT id FROM erp_companies WHERE document = '34227106000144') WHERE company_id IS NULL;
-- UPDATE erp_stock_movements SET company_id = (SELECT id FROM erp_companies WHERE document = '34227106000144') WHERE company_id IS NULL;
-- UPDATE erp_purchase_entries SET company_id = (SELECT id FROM erp_companies WHERE document = '34227106000144') WHERE company_id IS NULL;

ALTER TABLE erp_stock ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE erp_stock_movements ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE erp_purchase_entries ALTER COLUMN company_id SET NOT NULL;
