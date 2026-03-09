-- Migration 008: Bling OAuth2 credentials per company
-- Each company has its own Bling account with separate client_id/secret + tokens

CREATE TABLE IF NOT EXISTS erp_bling_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES erp_companies(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  client_secret TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  connected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id)
);

-- Index for quick lookup by company
CREATE INDEX IF NOT EXISTS idx_bling_credentials_company ON erp_bling_credentials(company_id);
