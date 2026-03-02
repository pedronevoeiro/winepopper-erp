-- ============================================================
-- Winepopper ERP — Migration 003: Functions & Triggers
-- ============================================================

-- ── Auto-update updated_at ───────────────────────────────────
CREATE OR REPLACE FUNCTION erp_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER erp_user_profiles_updated BEFORE UPDATE ON erp_user_profiles
  FOR EACH ROW EXECUTE FUNCTION erp_update_timestamp();
CREATE TRIGGER erp_salespeople_updated BEFORE UPDATE ON erp_salespeople
  FOR EACH ROW EXECUTE FUNCTION erp_update_timestamp();
CREATE TRIGGER erp_contacts_updated BEFORE UPDATE ON erp_contacts
  FOR EACH ROW EXECUTE FUNCTION erp_update_timestamp();
CREATE TRIGGER erp_products_updated BEFORE UPDATE ON erp_products
  FOR EACH ROW EXECUTE FUNCTION erp_update_timestamp();
CREATE TRIGGER erp_sales_orders_updated BEFORE UPDATE ON erp_sales_orders
  FOR EACH ROW EXECUTE FUNCTION erp_update_timestamp();
CREATE TRIGGER erp_financial_entries_updated BEFORE UPDATE ON erp_financial_entries
  FOR EACH ROW EXECUTE FUNCTION erp_update_timestamp();
CREATE TRIGGER erp_invoices_updated BEFORE UPDATE ON erp_invoices
  FOR EACH ROW EXECUTE FUNCTION erp_update_timestamp();
CREATE TRIGGER erp_production_orders_updated BEFORE UPDATE ON erp_production_orders
  FOR EACH ROW EXECUTE FUNCTION erp_update_timestamp();
CREATE TRIGGER erp_purchase_entries_updated BEFORE UPDATE ON erp_purchase_entries
  FOR EACH ROW EXECUTE FUNCTION erp_update_timestamp();
CREATE TRIGGER erp_commissions_updated BEFORE UPDATE ON erp_commissions
  FOR EACH ROW EXECUTE FUNCTION erp_update_timestamp();

-- ── Função para calcular estoque disponível ──────────────────
CREATE OR REPLACE FUNCTION erp_available_stock(p_product_id uuid, p_warehouse_id uuid)
RETURNS numeric AS $$
  SELECT COALESCE(SUM(quantity - reserved), 0)
  FROM erp_stock
  WHERE product_id = p_product_id
    AND warehouse_id = p_warehouse_id
    AND variation_id IS NULL
$$ LANGUAGE sql STABLE;
