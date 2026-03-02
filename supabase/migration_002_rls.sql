-- ============================================================
-- Winepopper ERP — Migration 002: RLS Policies
-- Todas as tabelas requerem usuário autenticado com perfil ERP
-- ============================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE erp_user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_salespeople ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_product_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_product_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_bom_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_financial_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_financial_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_production_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_purchase_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_purchase_entry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_audit_log ENABLE ROW LEVEL SECURITY;

-- Política padrão: acesso para usuários ERP ativos
-- (usando service_role key no server, RLS serve como safety net)

CREATE POLICY "erp_user_profiles_all" ON erp_user_profiles FOR ALL
  USING (EXISTS (SELECT 1 FROM erp_user_profiles WHERE id = auth.uid() AND active = true));

CREATE POLICY "erp_salespeople_all" ON erp_salespeople FOR ALL
  USING (EXISTS (SELECT 1 FROM erp_user_profiles WHERE id = auth.uid() AND active = true));

CREATE POLICY "erp_contacts_all" ON erp_contacts FOR ALL
  USING (EXISTS (SELECT 1 FROM erp_user_profiles WHERE id = auth.uid() AND active = true));

CREATE POLICY "erp_products_all" ON erp_products FOR ALL
  USING (EXISTS (SELECT 1 FROM erp_user_profiles WHERE id = auth.uid() AND active = true));

CREATE POLICY "erp_product_variations_all" ON erp_product_variations FOR ALL
  USING (EXISTS (SELECT 1 FROM erp_user_profiles WHERE id = auth.uid() AND active = true));

CREATE POLICY "erp_product_suppliers_all" ON erp_product_suppliers FOR ALL
  USING (EXISTS (SELECT 1 FROM erp_user_profiles WHERE id = auth.uid() AND active = true));

CREATE POLICY "erp_bom_components_all" ON erp_bom_components FOR ALL
  USING (EXISTS (SELECT 1 FROM erp_user_profiles WHERE id = auth.uid() AND active = true));

CREATE POLICY "erp_warehouses_all" ON erp_warehouses FOR ALL
  USING (EXISTS (SELECT 1 FROM erp_user_profiles WHERE id = auth.uid() AND active = true));

CREATE POLICY "erp_stock_all" ON erp_stock FOR ALL
  USING (EXISTS (SELECT 1 FROM erp_user_profiles WHERE id = auth.uid() AND active = true));

CREATE POLICY "erp_stock_movements_all" ON erp_stock_movements FOR ALL
  USING (EXISTS (SELECT 1 FROM erp_user_profiles WHERE id = auth.uid() AND active = true));

CREATE POLICY "erp_sales_orders_all" ON erp_sales_orders FOR ALL
  USING (EXISTS (SELECT 1 FROM erp_user_profiles WHERE id = auth.uid() AND active = true));

CREATE POLICY "erp_sales_order_items_all" ON erp_sales_order_items FOR ALL
  USING (EXISTS (SELECT 1 FROM erp_user_profiles WHERE id = auth.uid() AND active = true));

CREATE POLICY "erp_financial_entries_all" ON erp_financial_entries FOR ALL
  USING (EXISTS (SELECT 1 FROM erp_user_profiles WHERE id = auth.uid() AND active = true));

CREATE POLICY "erp_financial_installments_all" ON erp_financial_installments FOR ALL
  USING (EXISTS (SELECT 1 FROM erp_user_profiles WHERE id = auth.uid() AND active = true));

CREATE POLICY "erp_invoices_all" ON erp_invoices FOR ALL
  USING (EXISTS (SELECT 1 FROM erp_user_profiles WHERE id = auth.uid() AND active = true));

CREATE POLICY "erp_production_orders_all" ON erp_production_orders FOR ALL
  USING (EXISTS (SELECT 1 FROM erp_user_profiles WHERE id = auth.uid() AND active = true));

CREATE POLICY "erp_production_components_all" ON erp_production_components FOR ALL
  USING (EXISTS (SELECT 1 FROM erp_user_profiles WHERE id = auth.uid() AND active = true));

CREATE POLICY "erp_purchase_entries_all" ON erp_purchase_entries FOR ALL
  USING (EXISTS (SELECT 1 FROM erp_user_profiles WHERE id = auth.uid() AND active = true));

CREATE POLICY "erp_purchase_entry_items_all" ON erp_purchase_entry_items FOR ALL
  USING (EXISTS (SELECT 1 FROM erp_user_profiles WHERE id = auth.uid() AND active = true));

CREATE POLICY "erp_commissions_all" ON erp_commissions FOR ALL
  USING (EXISTS (SELECT 1 FROM erp_user_profiles WHERE id = auth.uid() AND active = true));

CREATE POLICY "erp_settings_all" ON erp_settings FOR ALL
  USING (EXISTS (SELECT 1 FROM erp_user_profiles WHERE id = auth.uid() AND active = true));

CREATE POLICY "erp_audit_log_all" ON erp_audit_log FOR ALL
  USING (EXISTS (SELECT 1 FROM erp_user_profiles WHERE id = auth.uid() AND active = true));
