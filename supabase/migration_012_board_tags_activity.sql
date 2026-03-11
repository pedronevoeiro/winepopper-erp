-- Migration 012: Board tags, activity log, and board-specific statuses
-- Adds tag system for orders, activity history, and board workflow columns

-- ===================================================================
-- 1. Order Tags (definitions)
-- ===================================================================
CREATE TABLE IF NOT EXISTS erp_order_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6b7280', -- hex color for the tag
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name)
);

-- Seed default tags matching ClickUp
INSERT INTO erp_order_tags (name, color) VALUES
  ('brinde', '#0ea5e9'),
  ('faturado', '#1e293b'),
  ('amostra', '#a855f7'),
  ('urgente', '#ef4444'),
  ('personalizado', '#f59e0b'),
  ('exportacao', '#10b981')
ON CONFLICT (name) DO NOTHING;

-- ===================================================================
-- 2. Order ↔ Tag assignments (many-to-many)
-- ===================================================================
CREATE TABLE IF NOT EXISTS erp_order_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES erp_sales_orders(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES erp_order_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(order_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_order_tag_assignments_order ON erp_order_tag_assignments(order_id);
CREATE INDEX IF NOT EXISTS idx_order_tag_assignments_tag ON erp_order_tag_assignments(tag_id);

-- ===================================================================
-- 3. Order Activity Log (history)
-- ===================================================================
CREATE TABLE IF NOT EXISTS erp_order_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES erp_sales_orders(id) ON DELETE CASCADE,
  action TEXT NOT NULL,           -- e.g. 'status_change', 'tag_added', 'tag_removed', 'note_added', 'file_uploaded', 'created', 'edited'
  details JSONB DEFAULT '{}',     -- e.g. {"from": "pedido_inicial", "to": "personalizacao"} or {"tag": "brinde"}
  created_by TEXT,                -- user display name or email
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_activities_order ON erp_order_activities(order_id);
CREATE INDEX IF NOT EXISTS idx_order_activities_created ON erp_order_activities(created_at DESC);

-- ===================================================================
-- 4. Add board_status column to sales orders
-- Separate from 'status' to not break existing flows
-- ===================================================================
ALTER TABLE erp_sales_orders
  ADD COLUMN IF NOT EXISTS board_status TEXT DEFAULT 'pedido_inicial';

-- Valid board_status values:
-- 'exportacoes', 'aguardando', 'amostras', 'pedido_inicial',
-- 'personalizacao', 'preparacao', 'pronto', 'despachado'

CREATE INDEX IF NOT EXISTS idx_sales_orders_board_status ON erp_sales_orders(board_status);

-- ===================================================================
-- 5. Add checklist support to orders (simple JSON array)
-- ===================================================================
ALTER TABLE erp_sales_orders
  ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]';
-- Each item: { "text": "...", "checked": false }
