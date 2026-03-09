/**
 * Bling API v3 — Multi-company OAuth2 client for NF-e emission
 *
 * Each company has its own Bling account (client_id + client_secret + tokens)
 * stored in the erp_bling_credentials table.
 *
 * OAuth2 flow:
 *  1. User clicks "Conectar Bling" → redirects to Bling authorization page
 *  2. Bling redirects to /api/bling/callback?code=...&state=COMPANY_ID
 *  3. Callback exchanges code for tokens and stores in DB
 *  4. Before each API call, checks token expiration and refreshes if needed
 */

import { db } from '@/lib/db'

const BLING_API = 'https://api.bling.com.br/Api/v3'
const TOKEN_URL = 'https://api.bling.com.br/Api/v3/oauth/token'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BlingCredentials {
  id: string
  company_id: string
  client_id: string
  client_secret: string
  access_token: string | null
  refresh_token: string | null
  expires_at: string | null
  connected: boolean
}

export interface BlingNfeInput {
  /** Bling contact ID (find/create by CNPJ first) */
  contatoId: number
  /** Bling natureza de operacao ID (optional — uses default if omitted) */
  naturezaId?: number
  items: Array<{
    /** Bling product ID (matched by SKU) */
    blingProdutoId?: number
    /** Product SKU for lookup */
    sku?: string | null
    description: string
    quantity: number
    unitPrice: number
    cfop?: string | null
    ncm?: string | null
    informacoesAdicionais?: string
  }>
  frete?: number
  fretePorConta?: number // 0=emitente, 1=destinatário, 9=sem frete
}

export interface BlingNfeStatus {
  id: number
  situacao: number // 1=Pendente, 2=Cancelada, 3=Aguardando recibo, 4=Rejeitada, 5=Autorizada, 6=Emitida, 7=Denegada
  numero: string | null
  chaveAcesso: string | null
  linkDanfe: string | null
  linkXml: string | null
  protocoloAutorizacao: string | null
  motivoSituacao: string | null
}

// Map Bling NF-e situacao codes to ERP invoice statuses
export function mapBlingStatus(situacao: number): 'processing' | 'authorized' | 'denied' | 'cancelled' {
  switch (situacao) {
    case 5: // Autorizada
    case 6: // Emitida
      return 'authorized'
    case 2: // Cancelada
      return 'cancelled'
    case 4: // Rejeitada
    case 7: // Denegada
      return 'denied'
    default: // 1=Pendente, 3=Aguardando recibo
      return 'processing'
  }
}

// ---------------------------------------------------------------------------
// Credential helpers
// ---------------------------------------------------------------------------

async function getCredentials(companyId: string): Promise<BlingCredentials> {
  const { data, error } = await db()
    .from('erp_bling_credentials')
    .select('*')
    .eq('company_id', companyId)
    .single()

  if (error || !data) {
    throw new Error('Bling nao configurado para esta empresa. Acesse Configuracoes > Integracoes para conectar.')
  }

  return data as BlingCredentials
}

function basicAuth(clientId: string, clientSecret: string): string {
  return Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
}

async function saveTokens(
  credentialId: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number
): Promise<void> {
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

  const { error } = await db()
    .from('erp_bling_credentials')
    .update({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      connected: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', credentialId)

  if (error) {
    console.error('Erro ao salvar tokens Bling:', error)
    throw new Error('Falha ao salvar tokens do Bling.')
  }
}

// ---------------------------------------------------------------------------
// Token management
// ---------------------------------------------------------------------------

async function refreshTokens(creds: BlingCredentials): Promise<string> {
  if (!creds.refresh_token) {
    throw new Error('Bling: refresh_token ausente. Reconecte o Bling em Configuracoes.')
  }

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basicAuth(creds.client_id, creds.client_secret)}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: creds.refresh_token,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('Bling refresh error:', res.status, text)
    // Mark as disconnected
    await db()
      .from('erp_bling_credentials')
      .update({ connected: false, updated_at: new Date().toISOString() })
      .eq('id', creds.id)
    throw new Error(`Bling: erro ao renovar token (${res.status}). Reconecte o Bling.`)
  }

  const data = await res.json()
  await saveTokens(creds.id, data.access_token, data.refresh_token, data.expires_in)
  return data.access_token
}

/** Get a valid access token for a company, auto-refreshing if needed */
export async function getAccessToken(companyId: string): Promise<string> {
  const creds = await getCredentials(companyId)

  if (!creds.access_token || !creds.refresh_token) {
    throw new Error('Bling nao autorizado. Conecte o Bling em Configuracoes > Integracoes.')
  }

  // Refresh if less than 5 minutes until expiration
  if (creds.expires_at) {
    const expiresAt = new Date(creds.expires_at).getTime()
    if (Date.now() > expiresAt - 5 * 60 * 1000) {
      return refreshTokens(creds)
    }
  } else {
    // No expires_at — try refreshing
    return refreshTokens(creds)
  }

  return creds.access_token
}

/** Exchange authorization code for tokens (OAuth2 callback) */
export async function exchangeCode(companyId: string, code: string): Promise<void> {
  const creds = await getCredentials(companyId)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const redirectUri = `${appUrl}/api/bling/callback`

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basicAuth(creds.client_id, creds.client_secret)}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Bling OAuth error: ${res.status} ${text}`)
  }

  const data = await res.json()
  await saveTokens(creds.id, data.access_token, data.refresh_token, data.expires_in)
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function blingGet<T = unknown>(endpoint: string, token: string): Promise<{ status: number; data: T }> {
  const res = await fetch(`${BLING_API}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json()
  return { status: res.status, data }
}

async function blingPost<T = unknown>(endpoint: string, body: unknown, token: string): Promise<{ status: number; data: T }> {
  const res = await fetch(`${BLING_API}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return { status: res.status, data }
}

// ---------------------------------------------------------------------------
// Contact lookup
// ---------------------------------------------------------------------------

/** Find a contact by document (CNPJ/CPF) in Bling, or create one */
export async function findOrCreateBlingContact(
  companyId: string,
  contact: {
    name: string
    document: string
    personType: 'PF' | 'PJ'
    email?: string | null
    phone?: string | null
    stateReg?: string | null
  }
): Promise<number> {
  const token = await getAccessToken(companyId)
  const docClean = contact.document.replace(/\D/g, '')

  // Search by document
  const search = await blingGet<{ data?: Array<{ id: number }> }>(
    `/contatos?pesquisa=${docClean}`,
    token
  )

  if (search.status === 200 && search.data?.data && search.data.data.length > 0) {
    return search.data.data[0].id
  }

  // Create contact
  const tipo = contact.personType === 'PJ' ? 'J' : 'F'
  const create = await blingPost<{ data?: { id: number } }>('/contatos', {
    nome: contact.name,
    tipo,
    numeroDocumento: docClean,
    contribuinte: contact.stateReg ? 1 : 9, // 1=Contribuinte ICMS, 9=Nao contribuinte
    ie: contact.stateReg?.replace(/\D/g, '') ?? '',
    situacao: 'A',
    email: contact.email ?? '',
    telefone: contact.phone?.replace(/\D/g, '') ?? '',
  }, token)

  if (create.data?.data?.id) {
    return create.data.data.id
  }

  throw new Error(`Bling: falha ao criar contato: ${JSON.stringify(create.data)}`)
}

/** Find a product in Bling by SKU. Returns Bling product ID or null. */
export async function findBlingProductBySku(
  companyId: string,
  sku: string
): Promise<number | null> {
  const token = await getAccessToken(companyId)

  const search = await blingGet<{ data?: Array<{ id: number }> }>(
    `/produtos?pesquisa=${encodeURIComponent(sku)}`,
    token
  )

  if (search.status === 200 && search.data?.data && search.data.data.length > 0) {
    return search.data.data[0].id
  }

  return null
}

// ---------------------------------------------------------------------------
// NF-e operations
// ---------------------------------------------------------------------------

/** Create NF-e in Bling (does NOT submit to Sefaz yet) */
export async function createBlingNfe(
  companyId: string,
  input: BlingNfeInput
): Promise<{ blingId: number }> {
  const token = await getAccessToken(companyId)

  const items = input.items.map((item) => {
    const blingItem: Record<string, unknown> = {
      descricao: item.description,
      quantidade: item.quantity,
      valor: item.unitPrice,
      tipo: 'P', // Produto
    }

    if (item.blingProdutoId) {
      blingItem.produto = { id: item.blingProdutoId }
    }

    if (item.informacoesAdicionais) {
      blingItem.informacoesAdicionais = item.informacoesAdicionais
    }

    return blingItem
  })

  const body: Record<string, unknown> = {
    tipo: 1, // 1=Saida
    contato: { id: input.contatoId },
    itens: items,
  }

  if (input.naturezaId) {
    body.naturezaOperacao = { id: input.naturezaId }
  }

  if (input.frete !== undefined || input.fretePorConta !== undefined) {
    body.transporte = {
      fretePorConta: input.fretePorConta ?? 1,
      frete: input.frete ?? 0,
    }
  }

  const result = await blingPost<{ data?: { id: number } }>('/nfe', body, token)

  if (result.status !== 200 && result.status !== 201) {
    throw new Error(`Bling NF-e creation error: ${result.status} ${JSON.stringify(result.data)}`)
  }

  const blingId = result.data?.data?.id
  if (!blingId) {
    throw new Error(`Bling NF-e: resposta sem ID: ${JSON.stringify(result.data)}`)
  }

  return { blingId }
}

/** Submit NF-e to Sefaz via Bling */
export async function submitBlingNfe(companyId: string, blingId: number): Promise<void> {
  const token = await getAccessToken(companyId)

  const result = await blingPost(`/nfe/${blingId}/enviar`, {}, token)

  if (result.status !== 200 && result.status !== 201 && result.status !== 204) {
    throw new Error(`Bling NF-e submit error: ${result.status} ${JSON.stringify(result.data)}`)
  }
}

/** Check NF-e status in Bling */
export async function checkBlingNfeStatus(
  companyId: string,
  blingId: number
): Promise<BlingNfeStatus> {
  const token = await getAccessToken(companyId)

  const result = await blingGet<{ data?: Record<string, unknown> }>(
    `/nfe/${blingId}`,
    token
  )

  if (result.status !== 200) {
    throw new Error(`Bling NF-e status error: ${result.status} ${JSON.stringify(result.data)}`)
  }

  const d = result.data?.data
  if (!d) {
    throw new Error(`Bling NF-e: resposta sem dados: ${JSON.stringify(result.data)}`)
  }

  return {
    id: d.id as number,
    situacao: d.situacao as number,
    numero: (d.numero as string) ?? null,
    chaveAcesso: (d.chaveAcesso as string) ?? null,
    linkDanfe: (d.linkDanfe as string) ?? null,
    linkXml: (d.linkXml as string) ?? null,
    protocoloAutorizacao: (d.protocoloAutorizacao as string) ?? null,
    motivoSituacao: (d.motivoSituacao as string) ?? null,
  }
}

/** Check if Bling is connected for a company */
export async function isBlingConnected(companyId: string): Promise<boolean> {
  const { data } = await db()
    .from('erp_bling_credentials')
    .select('connected')
    .eq('company_id', companyId)
    .single()

  return data?.connected === true
}

/** Get Bling credentials status for all companies */
export async function getBlingStatusAllCompanies(): Promise<
  Array<{ company_id: string; connected: boolean; has_credentials: boolean }>
> {
  const { data } = await db()
    .from('erp_bling_credentials')
    .select('company_id, connected')

  if (!data) return []

  return data.map((row) => ({
    company_id: row.company_id,
    connected: row.connected === true,
    has_credentials: true,
  }))
}
