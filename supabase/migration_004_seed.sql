-- ============================================================
-- Winepopper ERP — Migration 004: Seed Data
-- ============================================================

-- ── Depósito padrão ──────────────────────────────────────────
INSERT INTO erp_warehouses (name, code) VALUES
  ('Estoque Principal', 'PRINCIPAL');

-- ── Produtos existentes ──────────────────────────────────────
INSERT INTO erp_products (sku, name, description, sell_price, cost_price, weight_grams, height_cm, width_cm, length_cm, material, brand, category) VALUES
  ('PFWP001', 'Clássico', 'Perfume portátil em alumínio anodizado com 2 refis e embalagem premium', 190.00, 0, 380, 25, 8, 8, 'Alumínio anodizado', 'Winepopper', 'Perfume Portátil'),
  ('PFWP006', 'Lite Plus', 'Perfume portátil em plástico ABS com 2 refis e embalagem premium', 135.00, 0, 280, 24, 7, 7, 'Plástico ABS', 'Winepopper', 'Perfume Portátil'),
  ('PFWP004', 'Lite', 'Perfume portátil em plástico ABS com 1 refil e embalagem simples', 90.00, 0, 200, 24, 6, 6, 'Plástico ABS', 'Winepopper', 'Perfume Portátil');

-- ── Estoque inicial (zerado) ─────────────────────────────────
INSERT INTO erp_stock (product_id, warehouse_id, quantity, reserved, min_quantity)
SELECT p.id, w.id, 0, 0, 10
FROM erp_products p, erp_warehouses w
WHERE w.code = 'PRINCIPAL';

-- ── Configurações padrão ─────────────────────────────────────
INSERT INTO erp_settings (key, value) VALUES
  ('company_name', '"Winepopper Brindes Corporativos"'),
  ('company_document', '""'),
  ('company_state_reg', '""'),
  ('company_address', '{"street":"","number":"","neighborhood":"","city":"Campinas","state":"SP","cep":"13501060"}'),
  ('nfe_provider', '"focus_nfe"'),
  ('nfe_environment', '"sandbox"'),
  ('default_commission_rate', '5.00'),
  ('default_cfop', '"5102"'),
  ('shipping_origin_cep', '"13501060"')
ON CONFLICT (key) DO NOTHING;
