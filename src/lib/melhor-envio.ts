// Melhor Envio API v2 Client
// Docs: https://docs.melhorenvio.com.br

const BASE_URL = 'https://melhorenvio.com.br/api/v2/me'
const TOKEN = process.env.MELHORENVIO_TOKEN
const CEP_ORIGEM = process.env.MELHORENVIO_CEP_ORIGEM || '13501060'

function headers() {
  if (!TOKEN || TOKEN === 'PREENCHER') {
    throw new Error('MELHORENVIO_TOKEN not configured')
  }
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${TOKEN}`,
    'User-Agent': 'Winepopper ERP (comercial@winepopper.com.br)',
  }
}

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...headers(), ...options?.headers },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Melhor Envio API error ${res.status}: ${body}`)
  }
  return res.json()
}

// ── Types ────────────────────────────────────────────────────

export interface ShippingQuote {
  id: number
  name: string
  price: string
  discount: string
  currency: string
  delivery_time: number
  delivery_range: { min: number; max: number }
  company: { id: number; name: string; picture: string }
  error?: string
}

export interface CartItem {
  id: string
  protocol: string
  service_id: number
  agency_id: number | null
  status: string
}

export interface ShipmentLabel {
  id: string
  status: string
  tracking?: string
  melhorenvio_tracking?: string
}

export interface TrackingEvent {
  status: string
  date: string
  locale: string
  message: string
}

export interface TrackingInfo {
  id: string
  protocol: string
  status: string
  tracking: string
  melhorenvio_tracking: string
  created_at: string
  paid_at: string | null
  generated_at: string | null
  posted_at: string | null
  delivered_at: string | null
  canceled_at: string | null
  expired_at: string | null
}

// ── Product dimensions (Winepopper saca-rolhas) ─────────────

const PRODUCT_DIMENSIONS = {
  classico:  { weight: 0.35, width: 8, height: 22, length: 12 },
  'lite-plus': { weight: 0.28, width: 7, height: 20, length: 10 },
  lite:      { weight: 0.22, width: 6, height: 18, length: 9 },
  default:   { weight: 0.30, width: 8, height: 22, length: 12 },
} as const

export function getProductDimensions(productId?: string) {
  return PRODUCT_DIMENSIONS[productId as keyof typeof PRODUCT_DIMENSIONS] || PRODUCT_DIMENSIONS.default
}

// ── 1. Calculate shipping quotes ─────────────────────────────

export interface CalcParams {
  to_cep: string
  quantity: number
  product_id?: string
}

export async function calculateShipping(params: CalcParams): Promise<ShippingQuote[]> {
  const dim = getProductDimensions(params.product_id)
  const totalWeight = dim.weight * params.quantity

  // Box packing: estimate box dimensions for quantity
  const itemsPerLayer = Math.min(params.quantity, 6)
  const layers = Math.ceil(params.quantity / itemsPerLayer)
  const boxWidth = Math.min(dim.width * Math.min(itemsPerLayer, 3), 60)
  const boxLength = Math.min(dim.length * Math.ceil(itemsPerLayer / 3), 60)
  const boxHeight = Math.min(dim.height * layers + 4, 60) // +4 for padding

  const body = {
    from: { postal_code: CEP_ORIGEM },
    to: { postal_code: params.to_cep.replace(/\D/g, '') },
    products: [
      {
        id: params.product_id || 'saca-rolhas',
        width: boxWidth,
        height: boxHeight,
        length: boxLength,
        weight: totalWeight,
        insurance_value: params.quantity * 100,
        quantity: 1,
      },
    ],
  }

  const data = await api<ShippingQuote[]>('/shipment/calculate', {
    method: 'POST',
    body: JSON.stringify(body),
  })

  // Filter out options with errors
  return data.filter((q) => !q.error && parseFloat(q.price) > 0)
}

// ── 2. Add shipment to cart (create order) ───────────────────

export interface AddToCartParams {
  service_id: number
  from: {
    name: string
    phone: string
    email: string
    document: string
    company_document?: string
    state_register?: string
    address: string
    complement?: string
    number: string
    district: string
    city: string
    state_abbr: string
    postal_code: string
  }
  to: {
    name: string
    phone: string
    email?: string
    document: string
    company_document?: string
    address: string
    complement?: string
    number: string
    district: string
    city: string
    state_abbr: string
    postal_code: string
  }
  products: Array<{
    name: string
    quantity: number
    unitary_value: number
  }>
  volumes: Array<{
    height: number
    width: number
    length: number
    weight: number
  }>
  options?: {
    insurance_value?: number
    receipt?: boolean
    own_hand?: boolean
    invoice?: { key: string }
  }
}

export async function addToCart(params: AddToCartParams): Promise<CartItem> {
  return api<CartItem>('/cart', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

// ── 3. Checkout (purchase labels) ────────────────────────────

export async function checkout(orderIds: string[]): Promise<{ purchase: { id: string; status: string }; orders: Array<{ id: string; status: string }> }> {
  return api('/shipment/checkout', {
    method: 'POST',
    body: JSON.stringify({ orders: orderIds }),
  })
}

// ── 4. Generate labels ───────────────────────────────────────

export async function generateLabels(orderIds: string[]): Promise<Record<string, ShipmentLabel>> {
  return api('/shipment/generate', {
    method: 'POST',
    body: JSON.stringify({ orders: orderIds }),
  })
}

// ── 5. Print labels (get PDF URL) ────────────────────────────

export async function printLabels(orderIds: string[]): Promise<{ url: string }> {
  return api('/shipment/print', {
    method: 'POST',
    body: JSON.stringify({ mode: 'public', orders: orderIds }),
  })
}

// ── 6. Track shipments ──────────────────────────────────────

export async function trackShipments(orderIds: string[]): Promise<Record<string, TrackingInfo>> {
  return api('/shipment/tracking', {
    method: 'POST',
    body: JSON.stringify({ orders: orderIds }),
  })
}

// ── 7. Cancel shipment ──────────────────────────────────────

export async function cancelShipment(orderId: string, reasonId: number = 2, description = ''): Promise<{ id: string; status: string }> {
  return api('/shipment/cancel', {
    method: 'POST',
    body: JSON.stringify({
      order: { id: orderId, reason_id: reasonId, description },
    }),
  })
}

// ── Helper: Check if token is configured ────────────────────

export function isConfigured(): boolean {
  return !!TOKEN && TOKEN !== 'PREENCHER'
}
