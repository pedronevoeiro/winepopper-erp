-- ============================================================
-- Winepopper ERP — Migration 007: Seed Empresas
-- ============================================================

INSERT INTO erp_companies (name, trade_name, document, state_reg, email, phone, cep, street, number, neighborhood, city, state, active)
VALUES
  ('Easy Wine Utensilios Domesticos LTDA', 'Winepopper', '34227106000144', '126.402.199.110', 'contato@winepopper.com.br', '(19) 3255-0001', '13500-171', 'Rua 4', '1850', 'Zona Central', 'Rio Claro', 'SP', true)
ON CONFLICT (document) DO NOTHING;
