import type { ErpUserRole } from '@/types/database'

type Module =
  | 'dashboard'
  | 'pedidos'
  | 'contatos'
  | 'produtos'
  | 'financeiro'
  | 'fiscal'
  | 'envios'
  | 'producao'
  | 'entradas'
  | 'comissoes'
  | 'vendedores'
  | 'configuracoes'

const MODULE_ACCESS: Record<Module, ErpUserRole[]> = {
  dashboard: ['admin', 'manager', 'vendedor', 'financeiro', 'producao', 'viewer'],
  pedidos: ['admin', 'manager', 'vendedor'],
  contatos: ['admin', 'manager', 'vendedor'],
  produtos: ['admin', 'manager', 'producao', 'viewer'],
  financeiro: ['admin', 'manager', 'financeiro'],
  fiscal: ['admin', 'manager', 'financeiro'],
  envios: ['admin', 'manager', 'vendedor'],
  producao: ['admin', 'manager', 'producao'],
  entradas: ['admin', 'manager', 'producao'],
  comissoes: ['admin', 'manager', 'financeiro', 'vendedor'],
  vendedores: ['admin', 'manager'],
  configuracoes: ['admin'],
}

export function canAccess(role: ErpUserRole, module: Module): boolean {
  return MODULE_ACCESS[module]?.includes(role) ?? false
}

export function getAccessibleModules(role: ErpUserRole): Module[] {
  return (Object.keys(MODULE_ACCESS) as Module[]).filter(m => MODULE_ACCESS[m].includes(role))
}
