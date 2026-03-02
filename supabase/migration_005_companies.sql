-- ============================================================
-- Winepopper ERP — Migration 005: Multi-empresa
-- Múltiplas empresas compartilham o mesmo estoque
-- ============================================================

-- ── Tabela de Empresas ───────────────────────────────────────
CREATE TABLE erp_companies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  trade_name      text,
  document        text UNIQUE NOT NULL,
  state_reg       text,
  municipal_reg   text,
  email           text,
  phone           text,
  cep             text,
  street          text,
  number          text,
  complement      text,
  neighborhood    text,
  city            text,
  state           text,
  ibge_code       text,
  logo_url        text,
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE erp_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "erp_companies_all" ON erp_companies FOR ALL
  USING (EXISTS (SELECT 1 FROM erp_user_profiles WHERE id = auth.uid() AND active = true));

CREATE TRIGGER erp_companies_updated BEFORE UPDATE ON erp_companies
  FOR EACH ROW EXECUTE FUNCTION erp_update_timestamp();

-- ── Adicionar company_id às tabelas que precisam ─────────────
-- Pedidos são por empresa
ALTER TABLE erp_sales_orders ADD COLUMN company_id uuid REFERENCES erp_companies(id) ON DELETE RESTRICT;
CREATE INDEX erp_sales_orders_company_idx ON erp_sales_orders(company_id);

-- Financeiro é por empresa
ALTER TABLE erp_financial_entries ADD COLUMN company_id uuid REFERENCES erp_companies(id) ON DELETE RESTRICT;
CREATE INDEX erp_financial_entries_company_idx ON erp_financial_entries(company_id);

-- NF-e é por empresa
ALTER TABLE erp_invoices ADD COLUMN company_id uuid REFERENCES erp_companies(id) ON DELETE RESTRICT;

-- Comissões são por empresa (via pedido, mas ter direto facilita queries)
ALTER TABLE erp_commissions ADD COLUMN company_id uuid REFERENCES erp_companies(id) ON DELETE RESTRICT;

-- Contatos podem ser compartilhados entre empresas (sem company_id)
-- Produtos e Estoque são compartilhados (sem company_id)
-- Vendedores são compartilhados (sem company_id)

-- ── Relação usuário-empresa ──────────────────────────────────
ALTER TABLE erp_user_profiles ADD COLUMN default_company_id uuid REFERENCES erp_companies(id) ON DELETE SET NULL;
