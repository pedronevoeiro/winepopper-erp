// =============================================================================
// LOCAL DATA STORE — Mock data simulando o banco Supabase
// Usado enquanto o Supabase não está conectado.
// Quando migrar, substituir imports deste arquivo por queries reais.
// =============================================================================

import type {
  ErpCompany,
  ErpContact,
  ErpSalesperson,
  ErpProduct,
  ErpProductVariation,
  ErpWarehouse,
  ErpStock,
  ErpSalesOrder,
  ErpSalesOrderItem,
  ErpFinancialEntry,
  ErpCommission,
  ErpProductionOrder,
  ErpProductionStatus,
  ErpProductionComponent,
  ErpBomComponent,
  ErpProductionWorker,
  ErpUserProfile,
  ErpPaymentAccount,
  ErpPaymentAccountMethod,
  ErpPurchaseEntry,
  ErpPurchaseEntryItem,
  ErpStockMovement,
} from '@/types/database'

// ---------------------------------------------------------------------------
// Helper: datas relativas ao "hoje" (2026-03-01)
// ---------------------------------------------------------------------------
const NOW = '2026-03-01T10:00:00Z'

function daysAgo(days: number): string {
  const d = new Date('2026-03-01T10:00:00Z')
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

function daysFromNow(days: number): string {
  const d = new Date('2026-03-01T10:00:00Z')
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

// ---------------------------------------------------------------------------
// COMPANIES
// ---------------------------------------------------------------------------
export const companies: ErpCompany[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Easy Wine Utensilios Domesticos LTDA',
    trade_name: 'Winepopper',
    document: '34227106000144',
    state_reg: '126.402.199.110',
    municipal_reg: null,
    email: 'contato@winepopper.com.br',
    phone: '(19) 3255-0001',
    cep: '13500-171',
    street: 'Rua 4',
    number: '1850',
    complement: null,
    neighborhood: 'Zona Central',
    city: 'Rio Claro',
    state: 'SP',
    ibge_code: '3543907',
    logo_url: null,
    active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Hamecon Comercio e Utensilios Domesticos LTDA',
    trade_name: 'Hamecon',
    document: '61708573000169',
    state_reg: '587.554.781.118',
    municipal_reg: null,
    email: 'contato@hamecon.com.br',
    phone: '(19) 3255-0002',
    cep: '13501-060',
    street: 'Rua 5',
    number: 'Cj 361',
    complement: null,
    neighborhood: 'Cidade Jardim',
    city: 'Rio Claro',
    state: 'SP',
    ibge_code: '3543907',
    logo_url: null,
    active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
]

// ---------------------------------------------------------------------------
// CONTACTS (8 customers + 2 suppliers)
// ---------------------------------------------------------------------------
export const contacts: ErpContact[] = [
  // --- Customers ---
  {
    id: '00000000-0000-0000-0001-000000000001',
    type: 'customer',
    person_type: 'PJ',
    name: 'Tech Solutions Ltda',
    trade_name: 'Tech Solutions',
    document: '11222333000144',
    state_reg: null,
    municipal_reg: null,
    email: 'compras@techsolutions.com.br',
    phone: '(11) 3000-1001',
    mobile: '(11) 99000-1001',
    website: 'https://techsolutions.com.br',
    cep: '04543-011',
    street: 'Av. Engenheiro Luís Carlos Berrini',
    number: '1500',
    complement: '8o andar',
    neighborhood: 'Cidade Monções',
    city: 'São Paulo',
    state: 'SP',
    ibge_code: '3550308',
    notes: 'Cliente desde 2024. Preferência por porta-vinhos personalizados.',
    active: true,
    salesperson_id: '00000000-0000-0000-0003-000000000001',
    created_at: '2025-03-15T00:00:00Z',
    updated_at: '2025-12-01T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0001-000000000002',
    type: 'customer',
    person_type: 'PJ',
    name: 'Grupo ABC S.A.',
    trade_name: 'Grupo ABC',
    document: '22333444000155',
    state_reg: null,
    municipal_reg: null,
    email: 'eventos@grupoabc.com.br',
    phone: '(21) 3000-2002',
    mobile: '(21) 99000-2002',
    website: 'https://grupoabc.com.br',
    cep: '20040-020',
    street: 'Av. Rio Branco',
    number: '128',
    complement: '15o andar',
    neighborhood: 'Centro',
    city: 'Rio de Janeiro',
    state: 'RJ',
    ibge_code: '3304557',
    notes: 'Grandes pedidos para eventos corporativos.',
    active: true,
    salesperson_id: '00000000-0000-0000-0003-000000000002',
    created_at: '2025-04-10T00:00:00Z',
    updated_at: '2025-11-20T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0001-000000000003',
    type: 'customer',
    person_type: 'PJ',
    name: 'Construtora Horizonte Ltda',
    trade_name: 'Construtora Horizonte',
    document: '33444555000166',
    state_reg: null,
    municipal_reg: null,
    email: 'rh@horizonteconstrutora.com.br',
    phone: '(31) 3000-3003',
    mobile: '(31) 99000-3003',
    website: 'https://horizonteconstrutora.com.br',
    cep: '30130-000',
    street: 'Rua da Bahia',
    number: '1000',
    complement: null,
    neighborhood: 'Centro',
    city: 'Belo Horizonte',
    state: 'MG',
    ibge_code: '3106200',
    notes: 'Brindes para CIPA e SIPAT anuais.',
    active: true,
    salesperson_id: '00000000-0000-0000-0003-000000000001',
    created_at: '2025-05-20T00:00:00Z',
    updated_at: '2025-10-15T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0001-000000000004',
    type: 'customer',
    person_type: 'PJ',
    name: 'Pharma Vida Ltda',
    trade_name: 'Pharma Vida',
    document: '44555666000177',
    state_reg: null,
    municipal_reg: null,
    email: 'marketing@pharmavida.com.br',
    phone: '(41) 3000-4004',
    mobile: '(41) 99000-4004',
    website: 'https://pharmavida.com.br',
    cep: '80010-000',
    street: 'Rua XV de Novembro',
    number: '700',
    complement: 'Sala 302',
    neighborhood: 'Centro',
    city: 'Curitiba',
    state: 'PR',
    ibge_code: '4106902',
    notes: 'Kits para médicos e congressos de saúde.',
    active: true,
    salesperson_id: '00000000-0000-0000-0003-000000000003',
    created_at: '2025-06-01T00:00:00Z',
    updated_at: '2025-12-10T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0001-000000000005',
    type: 'customer',
    person_type: 'PJ',
    name: 'Banco Nacional Corp',
    trade_name: 'Banco Nacional',
    document: '55666777000188',
    state_reg: null,
    municipal_reg: null,
    email: 'suprimentos@banconacional.com.br',
    phone: '(61) 3000-5005',
    mobile: '(61) 99000-5005',
    website: 'https://banconacional.com.br',
    cep: '70040-010',
    street: 'SBS Quadra 2',
    number: 'Bloco E',
    complement: '10o andar',
    neighborhood: 'Asa Sul',
    city: 'Brasília',
    state: 'DF',
    ibge_code: '5300108',
    notes: 'Brindes premium para clientes VIP do banco.',
    active: true,
    salesperson_id: '00000000-0000-0000-0003-000000000002',
    created_at: '2025-07-15T00:00:00Z',
    updated_at: '2026-01-05T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0001-000000000006',
    type: 'customer',
    person_type: 'PJ',
    name: 'Agência Digital Mix Ltda',
    trade_name: 'Digital Mix',
    document: '66777888000199',
    state_reg: null,
    municipal_reg: null,
    email: 'contato@digitalmix.com.br',
    phone: '(48) 3000-6006',
    mobile: '(48) 99000-6006',
    website: 'https://digitalmix.com.br',
    cep: '88010-000',
    street: 'Rua Felipe Schmidt',
    number: '390',
    complement: 'Sala 201',
    neighborhood: 'Centro',
    city: 'Florianópolis',
    state: 'SC',
    ibge_code: '4205407',
    notes: 'Agência parceira — envia clientes e compra para presentear.',
    active: true,
    salesperson_id: '00000000-0000-0000-0003-000000000003',
    created_at: '2025-08-01T00:00:00Z',
    updated_at: '2025-12-20T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0001-000000000007',
    type: 'customer',
    person_type: 'PJ',
    name: 'Logística Express Ltda',
    trade_name: 'Log Express',
    document: '77888999000100',
    state_reg: null,
    municipal_reg: null,
    email: 'compras@logexpress.com.br',
    phone: '(51) 3000-7007',
    mobile: '(51) 99000-7007',
    website: 'https://logexpress.com.br',
    cep: '90010-000',
    street: 'Rua dos Andradas',
    number: '1500',
    complement: null,
    neighborhood: 'Centro Histórico',
    city: 'Porto Alegre',
    state: 'RS',
    ibge_code: '4314902',
    notes: null,
    active: true,
    salesperson_id: '00000000-0000-0000-0003-000000000001',
    created_at: '2025-09-10T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0001-000000000008',
    type: 'customer',
    person_type: 'PJ',
    name: 'Indústria Metalúrgica Norte S.A.',
    trade_name: 'Metalúrgica Norte',
    document: '88999000000111',
    state_reg: null,
    municipal_reg: null,
    email: 'diretoria@metalnorte.com.br',
    phone: '(92) 3000-8008',
    mobile: '(92) 99000-8008',
    website: 'https://metalnorte.com.br',
    cep: '69020-030',
    street: 'Av. Eduardo Ribeiro',
    number: '520',
    complement: null,
    neighborhood: 'Centro',
    city: 'Manaus',
    state: 'AM',
    ibge_code: '1302603',
    notes: 'Frete mais caro por causa da localização. Sempre faturar via Campinas.',
    active: true,
    salesperson_id: '00000000-0000-0000-0003-000000000002',
    created_at: '2025-10-01T00:00:00Z',
    updated_at: '2026-02-01T00:00:00Z',
  },
  // --- Suppliers ---
  {
    id: '00000000-0000-0000-0001-000000000009',
    type: 'supplier',
    person_type: 'PJ',
    name: 'Embalagens Premium Ltda',
    trade_name: 'Embalagens Premium',
    document: '99000111000122',
    state_reg: '456.789.012.000',
    municipal_reg: null,
    email: 'vendas@embalagenspremium.com.br',
    phone: '(19) 3200-9009',
    mobile: '(19) 99200-9009',
    website: 'https://embalagenspremium.com.br',
    cep: '13060-000',
    street: 'Rua Thomaz Alves',
    number: '200',
    complement: 'Galpão 3',
    neighborhood: 'Taquaral',
    city: 'Campinas',
    state: 'SP',
    ibge_code: '3509502',
    notes: 'Fornecedor principal de caixas e embalagens.',
    active: true,
    salesperson_id: null,
    created_at: '2025-02-01T00:00:00Z',
    updated_at: '2025-12-01T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0001-000000000010',
    type: 'supplier',
    person_type: 'PJ',
    name: 'Alumínio Brasil S.A.',
    trade_name: 'Alumínio Brasil',
    document: '00111222000133',
    state_reg: '789.012.345.000',
    municipal_reg: null,
    email: 'comercial@aluminiobrasil.com.br',
    phone: '(47) 3300-1010',
    mobile: '(47) 99300-1010',
    website: 'https://aluminiobrasil.com.br',
    cep: '89201-000',
    street: 'Rua do Príncipe',
    number: '330',
    complement: null,
    neighborhood: 'Centro',
    city: 'Joinville',
    state: 'SC',
    ibge_code: '4209102',
    notes: 'Fornecedor de chapas de alumínio para porta-vinhos.',
    active: true,
    salesperson_id: null,
    created_at: '2025-01-15T00:00:00Z',
    updated_at: '2025-11-01T00:00:00Z',
  },
]

// ---------------------------------------------------------------------------
// SALESPEOPLE
// ---------------------------------------------------------------------------
export const salespeople: ErpSalesperson[] = [
  {
    id: '00000000-0000-0000-0003-000000000001',
    user_id: null,
    name: 'Carlos Mendes',
    email: 'carlos.mendes@winepopper.com.br',
    phone: '(19) 99800-0001',
    commission_rate: 5.0,
    active: true,
    created_at: '2025-01-10T00:00:00Z',
    updated_at: '2025-01-10T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0003-000000000002',
    user_id: null,
    name: 'Ana Oliveira',
    email: 'ana.oliveira@winepopper.com.br',
    phone: '(11) 99800-0002',
    commission_rate: 6.0,
    active: true,
    created_at: '2025-02-01T00:00:00Z',
    updated_at: '2025-02-01T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0003-000000000003',
    user_id: null,
    name: 'Roberto Santos',
    email: 'roberto.santos@winepopper.com.br',
    phone: '(41) 99800-0003',
    commission_rate: 4.5,
    active: true,
    created_at: '2025-03-01T00:00:00Z',
    updated_at: '2025-03-01T00:00:00Z',
  },
]

// ---------------------------------------------------------------------------
// PRODUCTS (os 3 porta-vinhos)
// ---------------------------------------------------------------------------
export const products: ErpProduct[] = [
  {
    id: '00000000-0000-0000-0004-000000000001',
    sku: null, // SKU nas variações (Prata, Preto, Dourado)
    name: 'Porta-Vinho Clássico',
    description: 'Porta-vinho em alumínio anodizado com acabamento premium. Personalização a laser.',
    product_type: 'produto_final',
    cost_price: 28.5,
    sell_price: 89.9,
    weight_grams: 350,
    height_cm: 35,
    width_cm: 12,
    length_cm: 12,
    category: 'Porta-Vinho',
    brand: 'Winepopper',
    material: 'Alumínio Anodizado',
    ncm: '76169900',
    cest: null,
    origin: 0,
    cfop_venda: '5102',
    images: [],
    active: true,
    manage_stock: true,
    is_kit: false,
    store_product_id: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-12-01T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0004-000000000002',
    sku: 'PFWP006',
    name: 'Porta-Vinho Lite Plus',
    description: 'Versão intermediária com design moderno e acabamento fosco. Personalização a laser.',
    product_type: 'produto_final',
    cost_price: 22.0,
    sell_price: 69.9,
    weight_grams: 280,
    height_cm: 34,
    width_cm: 11,
    length_cm: 11,
    category: 'Porta-Vinho',
    brand: 'Winepopper',
    material: 'Alumínio',
    ncm: '76169900',
    cest: null,
    origin: 0,
    cfop_venda: '5102',
    images: [],
    active: true,
    manage_stock: true,
    is_kit: false,
    store_product_id: null,
    created_at: '2025-03-01T00:00:00Z',
    updated_at: '2025-12-01T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0004-000000000003',
    sku: 'PFWP004',
    name: 'Porta-Vinho Lite',
    description: 'Versão econômica ideal para grandes volumes. Personalização a laser.',
    product_type: 'produto_final',
    cost_price: 15.0,
    sell_price: 49.9,
    weight_grams: 220,
    height_cm: 33,
    width_cm: 10,
    length_cm: 10,
    category: 'Porta-Vinho',
    brand: 'Winepopper',
    material: 'Alumínio',
    ncm: '76169900',
    cest: null,
    origin: 0,
    cfop_venda: '5102',
    images: [],
    active: true,
    manage_stock: true,
    is_kit: false,
    store_product_id: null,
    created_at: '2025-06-01T00:00:00Z',
    updated_at: '2025-12-01T00:00:00Z',
  },
  // --- Insumos ---
  {
    id: '00000000-0000-0000-0004-000000000010',
    sku: 'INS-ALU-TUBO',
    name: 'Tubo de Alumínio 30mm',
    description: 'Tubo de alumínio para corpo do porta-vinho',
    product_type: 'insumo',
    cost_price: 5.50,
    sell_price: 0,
    weight_grams: 180,
    height_cm: 35,
    width_cm: 3,
    length_cm: 3,
    category: 'Matéria-Prima',
    brand: null,
    material: 'Alumínio',
    ncm: '76081000',
    cest: null,
    origin: 0,
    cfop_venda: '5102',
    images: [],
    active: true,
    manage_stock: true,
    is_kit: false,
    store_product_id: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-12-01T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0004-000000000011',
    sku: 'INS-ALU-CHAPA',
    name: 'Chapa de Alumínio 1mm',
    description: 'Chapa de alumínio para base e tampa do porta-vinho',
    product_type: 'insumo',
    cost_price: 12.00,
    sell_price: 0,
    weight_grams: 500,
    height_cm: 0.1,
    width_cm: 100,
    length_cm: 100,
    category: 'Matéria-Prima',
    brand: null,
    material: 'Alumínio',
    ncm: '76061200',
    cest: null,
    origin: 0,
    cfop_venda: '5102',
    images: [],
    active: true,
    manage_stock: true,
    is_kit: false,
    store_product_id: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-12-01T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0004-000000000012',
    sku: 'INS-ANOD-SOL',
    name: 'Solução de Anodização',
    description: 'Solução química para processo de anodização (litro)',
    product_type: 'insumo',
    cost_price: 45.00,
    sell_price: 0,
    weight_grams: 1100,
    height_cm: 20,
    width_cm: 10,
    length_cm: 10,
    category: 'Químico',
    brand: null,
    material: null,
    ncm: '38249979',
    cest: null,
    origin: 0,
    cfop_venda: '5102',
    images: [],
    active: true,
    manage_stock: true,
    is_kit: false,
    store_product_id: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-12-01T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0004-000000000013',
    sku: 'INS-EMB-CAIXA',
    name: 'Caixa de Embalagem Individual',
    description: 'Caixa de papelão personalizada para porta-vinho',
    product_type: 'insumo',
    cost_price: 3.20,
    sell_price: 0,
    weight_grams: 80,
    height_cm: 36,
    width_cm: 13,
    length_cm: 13,
    category: 'Embalagem',
    brand: null,
    material: 'Papelão',
    ncm: '48191000',
    cest: null,
    origin: 0,
    cfop_venda: '5102',
    images: [],
    active: true,
    manage_stock: true,
    is_kit: false,
    store_product_id: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-12-01T00:00:00Z',
  },
  // --- Ativos Imobilizados ---
  {
    id: '00000000-0000-0000-0004-000000000020',
    sku: 'ATI-LASER-001',
    name: 'Máquina de Gravação a Laser',
    description: 'Máquina CNC para personalização de porta-vinhos com gravação a laser',
    product_type: 'ativo_imobilizado',
    cost_price: 45000,
    sell_price: 0,
    weight_grams: 85000,
    height_cm: 120,
    width_cm: 80,
    length_cm: 100,
    category: 'Máquina',
    brand: 'OMTech',
    material: null,
    ncm: '84569090',
    cest: null,
    origin: 8,
    cfop_venda: '5102',
    images: [],
    active: true,
    manage_stock: false,
    is_kit: false,
    store_product_id: null,
    created_at: '2024-06-01T00:00:00Z',
    updated_at: '2024-06-01T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0004-000000000021',
    sku: 'ATI-ANOD-001',
    name: 'Tanque de Anodização',
    description: 'Tanque para processo de anodização de peças de alumínio',
    product_type: 'ativo_imobilizado',
    cost_price: 12000,
    sell_price: 0,
    weight_grams: 45000,
    height_cm: 80,
    width_cm: 60,
    length_cm: 120,
    category: 'Equipamento',
    brand: null,
    material: 'Aço Inox',
    ncm: '73091000',
    cest: null,
    origin: 0,
    cfop_venda: '5102',
    images: [],
    active: true,
    manage_stock: false,
    is_kit: false,
    store_product_id: null,
    created_at: '2024-08-01T00:00:00Z',
    updated_at: '2024-08-01T00:00:00Z',
  },
]

// ---------------------------------------------------------------------------
// PRODUCT VARIATIONS (Clássico tem 3 cores)
// ---------------------------------------------------------------------------
export const productVariations: ErpProductVariation[] = [
  {
    id: '00000000-0000-0000-0014-000000000001',
    product_id: '00000000-0000-0000-0004-000000000001',
    name: 'Prata',
    sku: 'PFWP001-PRA',
    additional_cost: 0,
    additional_price: 0,
    active: true,
    images: [],
  },
  {
    id: '00000000-0000-0000-0014-000000000002',
    product_id: '00000000-0000-0000-0004-000000000001',
    name: 'Preto',
    sku: 'PFWP001-PRT',
    additional_cost: 2.0,
    additional_price: 5.0,
    active: true,
    images: [],
  },
  {
    id: '00000000-0000-0000-0014-000000000003',
    product_id: '00000000-0000-0000-0004-000000000001',
    name: 'Dourado',
    sku: 'PFWP001-DRD',
    additional_cost: 5.0,
    additional_price: 15.0,
    active: true,
    images: [],
  },
]

// ---------------------------------------------------------------------------
// BOM — Bill of Materials (composição dos produtos finais)
// ---------------------------------------------------------------------------
export const bomComponents: ErpBomComponent[] = [
  // Porta-Vinho Clássico: 1 tubo + 0.15 chapa + 0.05L solução + 1 caixa
  { id: '00000000-0000-0000-0015-000000000001', parent_id: '00000000-0000-0000-0004-000000000001', component_id: '00000000-0000-0000-0004-000000000010', quantity: 1, notes: 'Tubo corpo principal' },
  { id: '00000000-0000-0000-0015-000000000002', parent_id: '00000000-0000-0000-0004-000000000001', component_id: '00000000-0000-0000-0004-000000000011', quantity: 0.15, notes: 'Base + tampa' },
  { id: '00000000-0000-0000-0015-000000000003', parent_id: '00000000-0000-0000-0004-000000000001', component_id: '00000000-0000-0000-0004-000000000012', quantity: 0.05, notes: null },
  { id: '00000000-0000-0000-0015-000000000004', parent_id: '00000000-0000-0000-0004-000000000001', component_id: '00000000-0000-0000-0004-000000000013', quantity: 1, notes: null },
  // Porta-Vinho Lite Plus: 1 tubo + 0.12 chapa + 0.04L solução + 1 caixa
  { id: '00000000-0000-0000-0015-000000000005', parent_id: '00000000-0000-0000-0004-000000000002', component_id: '00000000-0000-0000-0004-000000000010', quantity: 1, notes: null },
  { id: '00000000-0000-0000-0015-000000000006', parent_id: '00000000-0000-0000-0004-000000000002', component_id: '00000000-0000-0000-0004-000000000011', quantity: 0.12, notes: null },
  { id: '00000000-0000-0000-0015-000000000007', parent_id: '00000000-0000-0000-0004-000000000002', component_id: '00000000-0000-0000-0004-000000000012', quantity: 0.04, notes: null },
  { id: '00000000-0000-0000-0015-000000000008', parent_id: '00000000-0000-0000-0004-000000000002', component_id: '00000000-0000-0000-0004-000000000013', quantity: 1, notes: null },
  // Porta-Vinho Lite: 1 tubo + 0.10 chapa + 0.03L solução + 1 caixa
  { id: '00000000-0000-0000-0015-000000000009', parent_id: '00000000-0000-0000-0004-000000000003', component_id: '00000000-0000-0000-0004-000000000010', quantity: 1, notes: null },
  { id: '00000000-0000-0000-0015-000000000010', parent_id: '00000000-0000-0000-0004-000000000003', component_id: '00000000-0000-0000-0004-000000000011', quantity: 0.10, notes: null },
  { id: '00000000-0000-0000-0015-000000000011', parent_id: '00000000-0000-0000-0004-000000000003', component_id: '00000000-0000-0000-0004-000000000012', quantity: 0.03, notes: null },
  { id: '00000000-0000-0000-0015-000000000012', parent_id: '00000000-0000-0000-0004-000000000003', component_id: '00000000-0000-0000-0004-000000000013', quantity: 1, notes: null },
]

// ---------------------------------------------------------------------------
// PRODUCTION WORKERS
// ---------------------------------------------------------------------------
export const productionWorkers: ErpProductionWorker[] = [
  {
    id: '00000000-0000-0000-0016-000000000001',
    name: 'José da Silva',
    role: 'Operador',
    phone: '(19) 99888-0001',
    active: true,
    created_at: '2025-01-15T00:00:00Z',
    updated_at: '2025-01-15T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0016-000000000002',
    name: 'Maria Santos',
    role: 'Operador',
    phone: '(19) 99888-0002',
    active: true,
    created_at: '2025-03-01T00:00:00Z',
    updated_at: '2025-03-01T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0016-000000000003',
    name: 'Pedro Ferreira',
    role: 'Supervisor',
    phone: '(19) 99888-0003',
    active: true,
    created_at: '2025-06-01T00:00:00Z',
    updated_at: '2025-06-01T00:00:00Z',
  },
]

// ---------------------------------------------------------------------------
// WAREHOUSE & STOCK
// ---------------------------------------------------------------------------
export const warehouses: ErpWarehouse[] = [
  {
    id: '00000000-0000-0000-0005-000000000001',
    name: 'Depósito Campinas',
    code: 'CPS01',
    address: 'Rua Barão de Jaguara, 1000 - Campinas/SP',
    active: true,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0005-000000000002',
    name: 'Depósito Rio Claro',
    code: 'RCL01',
    address: 'Av. Brasil, 500 - Rio Claro/SP',
    active: true,
    created_at: '2025-02-15T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0005-000000000003',
    name: 'Depósito SP Capital',
    code: 'SPC01',
    address: 'Rua Augusta, 2000 - São Paulo/SP',
    active: false,
    created_at: '2025-03-01T00:00:00Z',
  },
]

export const stock: ErpStock[] = [
  // Clássico — variações (estoque por variação)
  {
    id: '00000000-0000-0000-0006-000000000001',
    product_id: '00000000-0000-0000-0004-000000000001',
    variation_id: '00000000-0000-0000-0014-000000000001', // Prata
    warehouse_id: '00000000-0000-0000-0005-000000000001',
    quantity: 80,
    reserved: 15,
    min_quantity: 20,
  },
  {
    id: '00000000-0000-0000-0006-000000000004',
    product_id: '00000000-0000-0000-0004-000000000001',
    variation_id: '00000000-0000-0000-0014-000000000002', // Preto
    warehouse_id: '00000000-0000-0000-0005-000000000001',
    quantity: 45,
    reserved: 10,
    min_quantity: 15,
  },
  {
    id: '00000000-0000-0000-0006-000000000005',
    product_id: '00000000-0000-0000-0004-000000000001',
    variation_id: '00000000-0000-0000-0014-000000000003', // Dourado
    warehouse_id: '00000000-0000-0000-0005-000000000001',
    quantity: 25,
    reserved: 0,
    min_quantity: 15,
  },
  {
    id: '00000000-0000-0000-0006-000000000002',
    product_id: '00000000-0000-0000-0004-000000000002', // Lite Plus
    variation_id: null,
    warehouse_id: '00000000-0000-0000-0005-000000000001',
    quantity: 200,
    reserved: 30,
    min_quantity: 50,
  },
  {
    id: '00000000-0000-0000-0006-000000000003',
    product_id: '00000000-0000-0000-0004-000000000003', // Lite
    variation_id: null,
    warehouse_id: '00000000-0000-0000-0005-000000000001',
    quantity: 350,
    reserved: 100,
    min_quantity: 80,
  },
  // Insumos
  {
    id: '00000000-0000-0000-0006-000000000010',
    product_id: '00000000-0000-0000-0004-000000000010', // Tubo Alumínio
    variation_id: null,
    warehouse_id: '00000000-0000-0000-0005-000000000001',
    quantity: 500,
    reserved: 0,
    min_quantity: 100,
  },
  {
    id: '00000000-0000-0000-0006-000000000011',
    product_id: '00000000-0000-0000-0004-000000000011', // Chapa Alumínio
    variation_id: null,
    warehouse_id: '00000000-0000-0000-0005-000000000001',
    quantity: 80,
    reserved: 0,
    min_quantity: 20,
  },
  {
    id: '00000000-0000-0000-0006-000000000012',
    product_id: '00000000-0000-0000-0004-000000000012', // Solução Anodização
    variation_id: null,
    warehouse_id: '00000000-0000-0000-0005-000000000001',
    quantity: 25,
    reserved: 0,
    min_quantity: 5,
  },
  {
    id: '00000000-0000-0000-0006-000000000013',
    product_id: '00000000-0000-0000-0004-000000000013', // Caixa Embalagem
    variation_id: null,
    warehouse_id: '00000000-0000-0000-0005-000000000001',
    quantity: 400,
    reserved: 0,
    min_quantity: 100,
  },
]

// ---------------------------------------------------------------------------
// SALES ORDERS (10 pedidos variados nos últimos 3 meses)
// ---------------------------------------------------------------------------
export const salesOrders: ErpSalesOrder[] = [
  {
    // #1 — Delivered (Tech Solutions, Carlos, Clássico)
    id: '00000000-0000-0000-0007-000000000001',
    order_number: 1001,
    contact_id: '00000000-0000-0000-0001-000000000001', // Tech Solutions
    salesperson_id: '00000000-0000-0000-0003-000000000001', // Carlos
    status: 'delivered',
    order_date: daysAgo(75), // ~Dec 16, 2025
    expected_date: daysAgo(60),
    subtotal: 4495.0, // 50 x 89.90
    discount_value: 0,
    shipping_cost: 120.0,
    other_costs: 0,
    total: 4615.0,
    payment_method: 'boleto',
    payment_account_id: '00000000-0000-0000-000C-000000000001', // Pagar.me
    payment_condition: '30/60',
    installments: 2,
    shipping_address: null,
    shipping_method: 'Transportadora',
    shipping_tracking: 'BR123456789',
    carrier_name: 'Jadlog',
    company_id: '00000000-0000-0000-0000-000000000001', // Brindes Campinas
    store_order_id: null,
    pagarme_id: null,
    melhorenvio_id: null,
    sales_channel: 'b2b',
    store_name: null,
    notes: 'Presente de final de ano para funcionários.',
    attachments: [],
    internal_notes: null,
    created_by: null,
    created_at: daysAgo(75),
    updated_at: daysAgo(55),
  },
  {
    // #2 — Delivered (Grupo ABC, Ana, Lite Plus)
    id: '00000000-0000-0000-0007-000000000002',
    order_number: 1002,
    contact_id: '00000000-0000-0000-0001-000000000002', // Grupo ABC
    salesperson_id: '00000000-0000-0000-0003-000000000002', // Ana
    status: 'delivered',
    order_date: daysAgo(70),
    expected_date: daysAgo(55),
    subtotal: 6990.0, // 100 x 69.90
    discount_value: 349.5, // 5% desconto volume
    shipping_cost: 250.0,
    other_costs: 0,
    total: 6890.5,
    payment_method: 'transfer',
    payment_account_id: '00000000-0000-0000-000C-000000000002', // Banco Inter
    payment_condition: 'À vista',
    installments: 1,
    shipping_address: null,
    shipping_method: 'Transportadora',
    shipping_tracking: 'BR987654321',
    carrier_name: 'Total Express',
    company_id: '00000000-0000-0000-0000-000000000001',
    store_order_id: null,
    pagarme_id: null,
    melhorenvio_id: null,
    sales_channel: 'b2b',
    store_name: null,
    notes: 'Evento corporativo de fim de ano.',
    attachments: [],
    internal_notes: 'Cliente VIP — prioridade no atendimento.',
    created_by: null,
    created_at: daysAgo(70),
    updated_at: daysAgo(50),
  },
  {
    // #3 — Shipped (Construtora Horizonte, Carlos, Lite)
    id: '00000000-0000-0000-0007-000000000003',
    order_number: 1003,
    contact_id: '00000000-0000-0000-0001-000000000003', // Construtora Horizonte
    salesperson_id: '00000000-0000-0000-0003-000000000001', // Carlos
    status: 'shipped',
    order_date: daysAgo(45),
    expected_date: daysAgo(20),
    subtotal: 3493.0, // 70 x 49.90
    discount_value: 0,
    shipping_cost: 95.0,
    other_costs: 0,
    total: 3588.0,
    payment_method: 'pix',
    payment_account_id: '00000000-0000-0000-000C-000000000001', // Pagar.me
    payment_condition: 'À vista',
    installments: 1,
    shipping_address: null,
    shipping_method: 'Correios PAC',
    shipping_tracking: 'SS123456789BR',
    carrier_name: 'Correios',
    company_id: '00000000-0000-0000-0000-000000000001',
    store_order_id: null,
    pagarme_id: null,
    melhorenvio_id: null,
    sales_channel: 'b2b',
    store_name: null,
    notes: 'Brindes para SIPAT 2026.',
    attachments: [],
    internal_notes: null,
    created_by: null,
    created_at: daysAgo(45),
    updated_at: daysAgo(10),
  },
  {
    // #4 — Approved (Pharma Vida, Roberto, Clássico + Lite Plus)
    id: '00000000-0000-0000-0007-000000000004',
    order_number: 1004,
    contact_id: '00000000-0000-0000-0001-000000000004', // Pharma Vida
    salesperson_id: '00000000-0000-0000-0003-000000000003', // Roberto
    status: 'approved',
    order_date: daysAgo(30),
    expected_date: daysFromNow(15),
    subtotal: 3493.0, // 20 x 89.90 + 25 x 69.90 = 1798 + 1747.50 = 3545.50
    discount_value: 52.5,
    shipping_cost: 150.0,
    other_costs: 0,
    total: 3643.0,
    payment_method: 'credit_card',
    payment_account_id: '00000000-0000-0000-000C-000000000001', // Pagar.me
    payment_condition: '3x sem juros',
    installments: 3,
    shipping_address: null,
    shipping_method: 'Transportadora',
    shipping_tracking: null,
    carrier_name: null,
    company_id: '00000000-0000-0000-0000-000000000002', // Presentes SP
    store_order_id: null,
    pagarme_id: null,
    melhorenvio_id: null,
    sales_channel: 'b2b',
    store_name: null,
    notes: 'Kit para congresso de cardiologia.',
    attachments: [],
    internal_notes: 'Aguardando arte final do cliente.',
    created_by: null,
    created_at: daysAgo(30),
    updated_at: daysAgo(5),
  },
  {
    // #5 — Approved (Banco Nacional, Ana, Clássico)
    id: '00000000-0000-0000-0007-000000000005',
    order_number: 1005,
    contact_id: '00000000-0000-0000-0001-000000000005', // Banco Nacional
    salesperson_id: '00000000-0000-0000-0003-000000000002', // Ana
    status: 'approved',
    order_date: daysAgo(20),
    expected_date: daysFromNow(20),
    subtotal: 8990.0, // 100 x 89.90
    discount_value: 899.0, // 10% desconto
    shipping_cost: 180.0,
    other_costs: 0,
    total: 8271.0,
    payment_method: 'boleto',
    payment_account_id: '00000000-0000-0000-000C-000000000002', // Banco Inter
    payment_condition: '30/60/90',
    installments: 3,
    shipping_address: null,
    shipping_method: 'Transportadora',
    shipping_tracking: null,
    carrier_name: null,
    company_id: '00000000-0000-0000-0000-000000000002',
    store_order_id: null,
    pagarme_id: null,
    melhorenvio_id: null,
    sales_channel: 'b2b',
    store_name: null,
    notes: 'Presente para clientes investidores VIP.',
    attachments: [],
    internal_notes: 'Gravação com logo dourado.',
    created_by: null,
    created_at: daysAgo(20),
    updated_at: daysAgo(3),
  },
  {
    // #6 — Pending (Digital Mix, Roberto, Lite)
    id: '00000000-0000-0000-0007-000000000006',
    order_number: 1006,
    contact_id: '00000000-0000-0000-0001-000000000006', // Digital Mix
    salesperson_id: '00000000-0000-0000-0003-000000000003', // Roberto
    status: 'pending',
    order_date: daysAgo(10),
    expected_date: daysFromNow(25),
    subtotal: 499.0, // 10 x 49.90
    discount_value: 0,
    shipping_cost: 45.0,
    other_costs: 0,
    total: 544.0,
    payment_method: 'pix',
    payment_account_id: '00000000-0000-0000-000C-000000000002', // Banco Inter
    payment_condition: 'À vista',
    installments: 1,
    shipping_address: null,
    shipping_method: 'Correios SEDEX',
    shipping_tracking: null,
    carrier_name: null,
    company_id: '00000000-0000-0000-0000-000000000001',
    store_order_id: null,
    pagarme_id: null,
    melhorenvio_id: null,
    sales_channel: 'b2c',
    store_name: 'Shopee',
    notes: 'Presente para equipe interna.',
    attachments: [],
    internal_notes: null,
    created_by: null,
    created_at: daysAgo(10),
    updated_at: daysAgo(10),
  },
  {
    // #7 — Draft (Logística Express, Carlos, Lite Plus)
    id: '00000000-0000-0000-0007-000000000007',
    order_number: 1007,
    contact_id: '00000000-0000-0000-0001-000000000007', // Logística Express
    salesperson_id: '00000000-0000-0000-0003-000000000001', // Carlos
    status: 'draft',
    order_date: daysAgo(5),
    expected_date: null,
    subtotal: 1747.5, // 25 x 69.90
    discount_value: 0,
    shipping_cost: 0,
    other_costs: 0,
    total: 1747.5,
    payment_method: null,
    payment_account_id: null,
    payment_condition: null,
    installments: 1,
    shipping_address: null,
    shipping_method: null,
    shipping_tracking: null,
    carrier_name: null,
    company_id: '00000000-0000-0000-0000-000000000001',
    store_order_id: null,
    pagarme_id: null,
    melhorenvio_id: null,
    sales_channel: 'b2b',
    store_name: null,
    notes: 'Orçamento inicial — aguardando confirmação do cliente.',
    attachments: [],
    internal_notes: null,
    created_by: null,
    created_at: daysAgo(5),
    updated_at: daysAgo(5),
  },
  {
    // #8 — Cancelled (Metalúrgica Norte, Ana, Clássico)
    id: '00000000-0000-0000-0007-000000000008',
    order_number: 1008,
    contact_id: '00000000-0000-0000-0001-000000000008', // Metalúrgica Norte
    salesperson_id: '00000000-0000-0000-0003-000000000002', // Ana
    status: 'cancelled',
    order_date: daysAgo(60),
    expected_date: daysAgo(40),
    subtotal: 2247.5, // 25 x 89.90
    discount_value: 0,
    shipping_cost: 350.0, // Frete Manaus
    other_costs: 0,
    total: 2597.5,
    payment_method: 'boleto',
    payment_account_id: '00000000-0000-0000-000C-000000000003', // Bradesco
    payment_condition: '30 dias',
    installments: 1,
    shipping_address: null,
    shipping_method: 'Transportadora',
    shipping_tracking: null,
    carrier_name: null,
    company_id: '00000000-0000-0000-0000-000000000001',
    store_order_id: null,
    pagarme_id: null,
    melhorenvio_id: null,
    sales_channel: 'b2b',
    store_name: null,
    notes: null,
    attachments: [],
    internal_notes: 'Cancelado pelo cliente — cortou orçamento.',
    created_by: null,
    created_at: daysAgo(60),
    updated_at: daysAgo(50),
  },
  {
    // #9 — Pending (Tech Solutions, Carlos, Lite + Clássico — segundo pedido)
    id: '00000000-0000-0000-0007-000000000009',
    order_number: 1009,
    contact_id: '00000000-0000-0000-0001-000000000001', // Tech Solutions
    salesperson_id: '00000000-0000-0000-0003-000000000001', // Carlos
    status: 'pending',
    order_date: daysAgo(7),
    expected_date: daysFromNow(30),
    subtotal: 3489.5, // 30 x 49.90 + 15 x 89.90 = 1497 + 1348.50 = 2845.50
    discount_value: 0,
    shipping_cost: 110.0,
    other_costs: 0,
    total: 3599.5,
    payment_method: 'pix',
    payment_account_id: '00000000-0000-0000-000C-000000000001', // Pagar.me
    payment_condition: 'À vista',
    installments: 1,
    shipping_address: null,
    shipping_method: 'Transportadora',
    shipping_tracking: null,
    carrier_name: null,
    company_id: '00000000-0000-0000-0000-000000000002',
    store_order_id: null,
    pagarme_id: null,
    melhorenvio_id: null,
    sales_channel: 'b2c',
    store_name: 'Mercado Livre',
    notes: 'Brindes para onboarding de novos funcionários.',
    attachments: [],
    internal_notes: null,
    created_by: null,
    created_at: daysAgo(7),
    updated_at: daysAgo(7),
  },
  {
    // #10 — Shipped (Grupo ABC, Ana, Lite — segundo pedido)
    id: '00000000-0000-0000-0007-000000000010',
    order_number: 1010,
    contact_id: '00000000-0000-0000-0001-000000000002', // Grupo ABC
    salesperson_id: '00000000-0000-0000-0003-000000000002', // Ana
    status: 'shipped',
    order_date: daysAgo(35),
    expected_date: daysAgo(15),
    subtotal: 2495.0, // 50 x 49.90
    discount_value: 124.75, // 5% desconto
    shipping_cost: 180.0,
    other_costs: 0,
    total: 2550.25,
    payment_method: 'transfer',
    payment_account_id: '00000000-0000-0000-000C-000000000002', // Banco Inter
    payment_condition: 'À vista',
    installments: 1,
    shipping_address: null,
    shipping_method: 'Transportadora',
    shipping_tracking: 'BR555444333',
    carrier_name: 'Total Express',
    company_id: '00000000-0000-0000-0000-000000000001',
    store_order_id: null,
    pagarme_id: null,
    melhorenvio_id: null,
    sales_channel: 'b2b',
    store_name: null,
    notes: 'Brindes para evento de integração Q1 2026.',
    attachments: [],
    internal_notes: null,
    created_by: null,
    created_at: daysAgo(35),
    updated_at: daysAgo(8),
  },
]

// ---------------------------------------------------------------------------
// SALES ORDER ITEMS
// ---------------------------------------------------------------------------
export const salesOrderItems: ErpSalesOrderItem[] = [
  // Order 1001: 50x Clássico
  {
    id: '00000000-0000-0000-0008-000000000001',
    order_id: '00000000-0000-0000-0007-000000000001',
    product_id: '00000000-0000-0000-0004-000000000001',
    variation_id: null,
    description: 'Porta-Vinho Clássico',
    sku: 'PFWP001',
    quantity: 50,
    unit_price: 89.9,
    discount_pct: 0,
    total: 4495.0,
    ncm: '76169900',
    cfop: '5102',
  },
  // Order 1002: 100x Lite Plus
  {
    id: '00000000-0000-0000-0008-000000000002',
    order_id: '00000000-0000-0000-0007-000000000002',
    product_id: '00000000-0000-0000-0004-000000000002',
    variation_id: null,
    description: 'Porta-Vinho Lite Plus',
    sku: 'PFWP006',
    quantity: 100,
    unit_price: 69.9,
    discount_pct: 5,
    total: 6640.5,
    ncm: '76169900',
    cfop: '5102',
  },
  // Order 1003: 70x Lite
  {
    id: '00000000-0000-0000-0008-000000000003',
    order_id: '00000000-0000-0000-0007-000000000003',
    product_id: '00000000-0000-0000-0004-000000000003',
    variation_id: null,
    description: 'Porta-Vinho Lite',
    sku: 'PFWP004',
    quantity: 70,
    unit_price: 49.9,
    discount_pct: 0,
    total: 3493.0,
    ncm: '76169900',
    cfop: '5102',
  },
  // Order 1004: 20x Clássico + 25x Lite Plus
  {
    id: '00000000-0000-0000-0008-000000000004',
    order_id: '00000000-0000-0000-0007-000000000004',
    product_id: '00000000-0000-0000-0004-000000000001',
    variation_id: null,
    description: 'Porta-Vinho Clássico',
    sku: 'PFWP001',
    quantity: 20,
    unit_price: 89.9,
    discount_pct: 0,
    total: 1798.0,
    ncm: '76169900',
    cfop: '5102',
  },
  {
    id: '00000000-0000-0000-0008-000000000005',
    order_id: '00000000-0000-0000-0007-000000000004',
    product_id: '00000000-0000-0000-0004-000000000002',
    variation_id: null,
    description: 'Porta-Vinho Lite Plus',
    sku: 'PFWP006',
    quantity: 25,
    unit_price: 69.9,
    discount_pct: 0,
    total: 1747.5,
    ncm: '76169900',
    cfop: '5102',
  },
  // Order 1005: 100x Clássico
  {
    id: '00000000-0000-0000-0008-000000000006',
    order_id: '00000000-0000-0000-0007-000000000005',
    product_id: '00000000-0000-0000-0004-000000000001',
    variation_id: null,
    description: 'Porta-Vinho Clássico',
    sku: 'PFWP001',
    quantity: 100,
    unit_price: 89.9,
    discount_pct: 10,
    total: 8091.0,
    ncm: '76169900',
    cfop: '5102',
  },
  // Order 1006: 10x Lite
  {
    id: '00000000-0000-0000-0008-000000000007',
    order_id: '00000000-0000-0000-0007-000000000006',
    product_id: '00000000-0000-0000-0004-000000000003',
    variation_id: null,
    description: 'Porta-Vinho Lite',
    sku: 'PFWP004',
    quantity: 10,
    unit_price: 49.9,
    discount_pct: 0,
    total: 499.0,
    ncm: '76169900',
    cfop: '5102',
  },
  // Order 1007: 25x Lite Plus
  {
    id: '00000000-0000-0000-0008-000000000008',
    order_id: '00000000-0000-0000-0007-000000000007',
    product_id: '00000000-0000-0000-0004-000000000002',
    variation_id: null,
    description: 'Porta-Vinho Lite Plus',
    sku: 'PFWP006',
    quantity: 25,
    unit_price: 69.9,
    discount_pct: 0,
    total: 1747.5,
    ncm: '76169900',
    cfop: '5102',
  },
  // Order 1008: 25x Clássico (cancelled)
  {
    id: '00000000-0000-0000-0008-000000000009',
    order_id: '00000000-0000-0000-0007-000000000008',
    product_id: '00000000-0000-0000-0004-000000000001',
    variation_id: null,
    description: 'Porta-Vinho Clássico',
    sku: 'PFWP001',
    quantity: 25,
    unit_price: 89.9,
    discount_pct: 0,
    total: 2247.5,
    ncm: '76169900',
    cfop: '5102',
  },
  // Order 1009: 30x Lite + 15x Clássico
  {
    id: '00000000-0000-0000-0008-000000000010',
    order_id: '00000000-0000-0000-0007-000000000009',
    product_id: '00000000-0000-0000-0004-000000000003',
    variation_id: null,
    description: 'Porta-Vinho Lite',
    sku: 'PFWP004',
    quantity: 30,
    unit_price: 49.9,
    discount_pct: 0,
    total: 1497.0,
    ncm: '76169900',
    cfop: '5102',
  },
  {
    id: '00000000-0000-0000-0008-000000000011',
    order_id: '00000000-0000-0000-0007-000000000009',
    product_id: '00000000-0000-0000-0004-000000000001',
    variation_id: null,
    description: 'Porta-Vinho Clássico',
    sku: 'PFWP001',
    quantity: 15,
    unit_price: 89.9,
    discount_pct: 0,
    total: 1348.5,
    ncm: '76169900',
    cfop: '5102',
  },
  // Order 1010: 50x Lite
  {
    id: '00000000-0000-0000-0008-000000000012',
    order_id: '00000000-0000-0000-0007-000000000010',
    product_id: '00000000-0000-0000-0004-000000000003',
    variation_id: null,
    description: 'Porta-Vinho Lite',
    sku: 'PFWP004',
    quantity: 50,
    unit_price: 49.9,
    discount_pct: 5,
    total: 2370.25,
    ncm: '76169900',
    cfop: '5102',
  },
]

// ---------------------------------------------------------------------------
// FINANCIAL ENTRIES
// Receivables para pedidos approved+ (exceto cancelled/draft/pending)
// Payables para fornecedores
// ---------------------------------------------------------------------------
export const financialEntries: ErpFinancialEntry[] = [
  // --- Receivables (from orders) ---
  // Order 1001 (delivered) — paid
  {
    id: '00000000-0000-0000-0009-000000000001',
    type: 'receivable',
    status: 'paid',
    contact_id: '00000000-0000-0000-0001-000000000001', // Tech Solutions
    description: 'Pedido #1001 — Tech Solutions Ltda',
    amount: 4615.0,
    paid_amount: 4615.0,
    due_date: daysAgo(45),
    payment_date: daysAgo(47),
    payment_method: 'boleto',
    account_id: '00000000-0000-0000-000C-000000000003', // Bradesco
    reference_type: 'sales_order',
    reference_id: '00000000-0000-0000-0007-000000000001',
    category: 'Vendas',
    notes: null,
    created_by: null,
    created_at: daysAgo(75),
    updated_at: daysAgo(47),
  },
  // Order 1002 (delivered) — paid
  {
    id: '00000000-0000-0000-0009-000000000002',
    type: 'receivable',
    status: 'paid',
    contact_id: '00000000-0000-0000-0001-000000000002', // Grupo ABC
    description: 'Pedido #1002 — Grupo ABC S.A.',
    amount: 6890.5,
    paid_amount: 6890.5,
    due_date: daysAgo(55),
    payment_date: daysAgo(58),
    payment_method: 'transfer',
    account_id: '00000000-0000-0000-000C-000000000002', // Inter
    reference_type: 'sales_order',
    reference_id: '00000000-0000-0000-0007-000000000002',
    category: 'Vendas',
    notes: null,
    created_by: null,
    created_at: daysAgo(70),
    updated_at: daysAgo(58),
  },
  // Order 1003 (shipped) — open
  {
    id: '00000000-0000-0000-0009-000000000003',
    type: 'receivable',
    status: 'open',
    contact_id: '00000000-0000-0000-0001-000000000003', // Construtora Horizonte
    description: 'Pedido #1003 — Construtora Horizonte',
    amount: 3588.0,
    paid_amount: 3588.0,
    due_date: daysAgo(30),
    payment_date: daysAgo(32),
    payment_method: 'pix',
    account_id: '00000000-0000-0000-000C-000000000002', // Inter
    reference_type: 'sales_order',
    reference_id: '00000000-0000-0000-0007-000000000003',
    category: 'Vendas',
    notes: 'Pago via PIX antes do envio.',
    created_by: null,
    created_at: daysAgo(45),
    updated_at: daysAgo(32),
  },
  // Order 1004 (approved) — open, parcelas
  {
    id: '00000000-0000-0000-0009-000000000004',
    type: 'receivable',
    status: 'open',
    contact_id: '00000000-0000-0000-0001-000000000004', // Pharma Vida
    description: 'Pedido #1004 — Pharma Vida Ltda (1/3)',
    amount: 1214.33,
    paid_amount: 0,
    due_date: daysFromNow(15),
    payment_date: null,
    payment_method: 'credit_card',
    account_id: '00000000-0000-0000-000C-000000000001', // Pagar.me
    reference_type: 'sales_order',
    reference_id: '00000000-0000-0000-0007-000000000004',
    category: 'Vendas',
    notes: null,
    created_by: null,
    created_at: daysAgo(30),
    updated_at: daysAgo(30),
  },
  {
    id: '00000000-0000-0000-0009-000000000005',
    type: 'receivable',
    status: 'open',
    contact_id: '00000000-0000-0000-0001-000000000004',
    description: 'Pedido #1004 — Pharma Vida Ltda (2/3)',
    amount: 1214.33,
    paid_amount: 0,
    due_date: daysFromNow(45),
    payment_date: null,
    payment_method: 'credit_card',
    account_id: '00000000-0000-0000-000C-000000000001', // Pagar.me
    reference_type: 'sales_order',
    reference_id: '00000000-0000-0000-0007-000000000004',
    category: 'Vendas',
    notes: null,
    created_by: null,
    created_at: daysAgo(30),
    updated_at: daysAgo(30),
  },
  {
    id: '00000000-0000-0000-0009-000000000006',
    type: 'receivable',
    status: 'open',
    contact_id: '00000000-0000-0000-0001-000000000004',
    description: 'Pedido #1004 — Pharma Vida Ltda (3/3)',
    amount: 1214.34,
    paid_amount: 0,
    due_date: daysFromNow(75),
    payment_date: null,
    payment_method: 'credit_card',
    account_id: '00000000-0000-0000-000C-000000000001', // Pagar.me
    reference_type: 'sales_order',
    reference_id: '00000000-0000-0000-0007-000000000004',
    category: 'Vendas',
    notes: null,
    created_by: null,
    created_at: daysAgo(30),
    updated_at: daysAgo(30),
  },
  // Order 1005 (approved) — open, parcelas
  {
    id: '00000000-0000-0000-0009-000000000007',
    type: 'receivable',
    status: 'open',
    contact_id: '00000000-0000-0000-0001-000000000005', // Banco Nacional
    description: 'Pedido #1005 — Banco Nacional Corp (1/3)',
    amount: 2757.0,
    paid_amount: 0,
    due_date: daysFromNow(10),
    payment_date: null,
    payment_method: 'boleto',
    account_id: '00000000-0000-0000-000C-000000000003', // Bradesco
    reference_type: 'sales_order',
    reference_id: '00000000-0000-0000-0007-000000000005',
    category: 'Vendas',
    notes: null,
    created_by: null,
    created_at: daysAgo(20),
    updated_at: daysAgo(20),
  },
  {
    id: '00000000-0000-0000-0009-000000000008',
    type: 'receivable',
    status: 'open',
    contact_id: '00000000-0000-0000-0001-000000000005',
    description: 'Pedido #1005 — Banco Nacional Corp (2/3)',
    amount: 2757.0,
    paid_amount: 0,
    due_date: daysFromNow(40),
    payment_date: null,
    payment_method: 'boleto',
    account_id: '00000000-0000-0000-000C-000000000003', // Bradesco
    reference_type: 'sales_order',
    reference_id: '00000000-0000-0000-0007-000000000005',
    category: 'Vendas',
    notes: null,
    created_by: null,
    created_at: daysAgo(20),
    updated_at: daysAgo(20),
  },
  {
    id: '00000000-0000-0000-0009-000000000009',
    type: 'receivable',
    status: 'open',
    contact_id: '00000000-0000-0000-0001-000000000005',
    description: 'Pedido #1005 — Banco Nacional Corp (3/3)',
    amount: 2757.0,
    paid_amount: 0,
    due_date: daysFromNow(70),
    payment_date: null,
    payment_method: 'boleto',
    account_id: '00000000-0000-0000-000C-000000000003', // Bradesco
    reference_type: 'sales_order',
    reference_id: '00000000-0000-0000-0007-000000000005',
    category: 'Vendas',
    notes: null,
    created_by: null,
    created_at: daysAgo(20),
    updated_at: daysAgo(20),
  },
  // Order 1010 (shipped) — paid
  {
    id: '00000000-0000-0000-0009-000000000010',
    type: 'receivable',
    status: 'paid',
    contact_id: '00000000-0000-0000-0001-000000000002', // Grupo ABC
    description: 'Pedido #1010 — Grupo ABC S.A.',
    amount: 2550.25,
    paid_amount: 2550.25,
    due_date: daysAgo(20),
    payment_date: daysAgo(22),
    payment_method: 'transfer',
    account_id: '00000000-0000-0000-000C-000000000002', // Inter
    reference_type: 'sales_order',
    reference_id: '00000000-0000-0000-0007-000000000010',
    category: 'Vendas',
    notes: null,
    created_by: null,
    created_at: daysAgo(35),
    updated_at: daysAgo(22),
  },

  // --- Payables (suppliers) ---
  {
    id: '00000000-0000-0000-0009-000000000011',
    type: 'payable',
    status: 'paid',
    contact_id: '00000000-0000-0000-0001-000000000009', // Embalagens Premium
    description: 'NF 4521 — Embalagens Premium — Caixas personalizadas',
    amount: 3200.0,
    paid_amount: 3200.0,
    due_date: daysAgo(40),
    payment_date: daysAgo(42),
    payment_method: 'boleto',
    account_id: '00000000-0000-0000-000C-000000000003', // Bradesco
    reference_type: 'purchase',
    reference_id: null,
    category: 'Insumos',
    notes: 'Lote de 500 caixas de papelão premium.',
    created_by: null,
    created_at: daysAgo(55),
    updated_at: daysAgo(42),
  },
  {
    id: '00000000-0000-0000-0009-000000000012',
    type: 'payable',
    status: 'open',
    contact_id: '00000000-0000-0000-0001-000000000010', // Alumínio Brasil
    description: 'NF 8910 — Alumínio Brasil — Chapas alumínio 0.8mm',
    amount: 8500.0,
    paid_amount: 0,
    due_date: daysFromNow(5),
    payment_date: null,
    payment_method: 'boleto',
    account_id: '00000000-0000-0000-000C-000000000003', // Bradesco
    reference_type: 'purchase',
    reference_id: null,
    category: 'Insumos',
    notes: 'Lote de 200 chapas de alumínio.',
    created_by: null,
    created_at: daysAgo(25),
    updated_at: daysAgo(25),
  },
  {
    id: '00000000-0000-0000-0009-000000000013',
    type: 'payable',
    status: 'overdue',
    contact_id: '00000000-0000-0000-0001-000000000009', // Embalagens Premium
    description: 'NF 4650 — Embalagens Premium — Sacos de veludo',
    amount: 1450.0,
    paid_amount: 0,
    due_date: daysAgo(5),
    payment_date: null,
    payment_method: 'boleto',
    account_id: '00000000-0000-0000-000C-000000000003', // Bradesco
    reference_type: 'purchase',
    reference_id: null,
    category: 'Insumos',
    notes: 'Lote de 300 sacos de veludo bordô.',
    created_by: null,
    created_at: daysAgo(35),
    updated_at: daysAgo(5),
  },
]

// ---------------------------------------------------------------------------
// COMMISSIONS (para pedidos approved+, exceto cancelled)
// ---------------------------------------------------------------------------
export const commissions: ErpCommission[] = [
  // Order 1001 — Carlos 5% of 4615
  {
    id: '00000000-0000-0000-000A-000000000001',
    salesperson_id: '00000000-0000-0000-0003-000000000001',
    sales_order_id: '00000000-0000-0000-0007-000000000001',
    order_total: 4615.0,
    commission_rate: 5.0,
    commission_value: 230.75,
    status: 'paid',
    financial_entry_id: null,
    paid_at: daysAgo(40),
    created_at: daysAgo(55),
    updated_at: daysAgo(40),
  },
  // Order 1002 — Ana 6% of 6890.50
  {
    id: '00000000-0000-0000-000A-000000000002',
    salesperson_id: '00000000-0000-0000-0003-000000000002',
    sales_order_id: '00000000-0000-0000-0007-000000000002',
    order_total: 6890.5,
    commission_rate: 6.0,
    commission_value: 413.43,
    status: 'paid',
    financial_entry_id: null,
    paid_at: daysAgo(38),
    created_at: daysAgo(50),
    updated_at: daysAgo(38),
  },
  // Order 1003 — Carlos 5% of 3588
  {
    id: '00000000-0000-0000-000A-000000000003',
    salesperson_id: '00000000-0000-0000-0003-000000000001',
    sales_order_id: '00000000-0000-0000-0007-000000000003',
    order_total: 3588.0,
    commission_rate: 5.0,
    commission_value: 179.4,
    status: 'approved',
    financial_entry_id: null,
    paid_at: null,
    created_at: daysAgo(30),
    updated_at: daysAgo(10),
  },
  // Order 1004 — Roberto 4.5% of 3643
  {
    id: '00000000-0000-0000-000A-000000000004',
    salesperson_id: '00000000-0000-0000-0003-000000000003',
    sales_order_id: '00000000-0000-0000-0007-000000000004',
    order_total: 3643.0,
    commission_rate: 4.5,
    commission_value: 163.94,
    status: 'pending',
    financial_entry_id: null,
    paid_at: null,
    created_at: daysAgo(25),
    updated_at: daysAgo(5),
  },
  // Order 1005 — Ana 6% of 8271
  {
    id: '00000000-0000-0000-000A-000000000005',
    salesperson_id: '00000000-0000-0000-0003-000000000002',
    sales_order_id: '00000000-0000-0000-0007-000000000005',
    order_total: 8271.0,
    commission_rate: 6.0,
    commission_value: 496.26,
    status: 'pending',
    financial_entry_id: null,
    paid_at: null,
    created_at: daysAgo(18),
    updated_at: daysAgo(3),
  },
  // Order 1010 — Ana 6% of 2550.25
  {
    id: '00000000-0000-0000-000A-000000000006',
    salesperson_id: '00000000-0000-0000-0003-000000000002',
    sales_order_id: '00000000-0000-0000-0007-000000000010',
    order_total: 2550.25,
    commission_rate: 6.0,
    commission_value: 153.02,
    status: 'approved',
    financial_entry_id: null,
    paid_at: null,
    created_at: daysAgo(20),
    updated_at: daysAgo(8),
  },
]

// ---------------------------------------------------------------------------
// HELPER: Join orders with relations
// ---------------------------------------------------------------------------
export interface SalesOrderWithRelations extends ErpSalesOrder {
  contact: ErpContact | null
  salesperson: ErpSalesperson | null
  company: ErpCompany | null
  items: ErpSalesOrderItem[]
}

export function getOrdersWithRelations(): SalesOrderWithRelations[] {
  return salesOrders.map((order) => ({
    ...order,
    contact: contacts.find((c) => c.id === order.contact_id) ?? null,
    salesperson: salespeople.find((s) => s.id === order.salesperson_id) ?? null,
    company: companies.find((co) => co.id === order.company_id) ?? null,
    items: salesOrderItems.filter((item) => item.order_id === order.id),
  }))
}

// ---------------------------------------------------------------------------
// HELPER: Producible quantity (quantos produtos finais pode produzir com insumos atuais)
// ---------------------------------------------------------------------------
export function getProducibleQuantity(productId: string): number {
  const bom = bomComponents.filter(b => b.parent_id === productId)
  if (bom.length === 0) return 0

  return Math.min(
    ...bom.map(component => {
      const productStock = stock.filter(s => s.product_id === component.component_id)
      const totalAvailable = productStock.reduce((sum, s) => sum + s.quantity - s.reserved, 0)
      return Math.floor(totalAvailable / component.quantity)
    })
  )
}

// ---------------------------------------------------------------------------
// HELPER: Products with stock info
// ---------------------------------------------------------------------------
export interface ProductWithStock extends ErpProduct {
  stock_quantity: number
  stock_reserved: number
  stock_available: number
  min_quantity: number
  variations: ErpProductVariation[]
  producible_quantity: number
}

export function getProductsWithStock(): ProductWithStock[] {
  return products.map((product) => {
    const productStocks = stock.filter((st) => st.product_id === product.id)
    const totalQty = productStocks.reduce((sum, s) => sum + s.quantity, 0)
    const totalReserved = productStocks.reduce((sum, s) => sum + s.reserved, 0)
    const minQty = productStocks.reduce((sum, s) => sum + s.min_quantity, 0)
    const variations = productVariations.filter(v => v.product_id === product.id)
    return {
      ...product,
      stock_quantity: totalQty,
      stock_reserved: totalReserved,
      stock_available: totalQty - totalReserved,
      min_quantity: minQty,
      variations,
      producible_quantity: product.product_type === 'produto_final' ? getProducibleQuantity(product.id) : 0,
    }
  })
}

// ---------------------------------------------------------------------------
// USERS
// ---------------------------------------------------------------------------
export const users: ErpUserProfile[] = [
  {
    id: '00000000-0000-0000-0000-100000000001',
    email: 'admin@winepopper.com.br',
    display_name: 'Joao Admin',
    role: 'admin',
    phone: null,
    active: true,
    default_company_id: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-100000000002',
    email: 'carlos@winepopper.com.br',
    display_name: 'Carlos Mendes',
    role: 'vendedor',
    phone: null,
    active: true,
    default_company_id: null,
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-100000000003',
    email: 'ana@winepopper.com.br',
    display_name: 'Ana Oliveira',
    role: 'vendedor',
    phone: null,
    active: true,
    default_company_id: null,
    created_at: '2026-02-01T00:00:00Z',
    updated_at: '2026-02-01T00:00:00Z',
  },
]

// ---------------------------------------------------------------------------
// PRODUCTION ORDERS
// ---------------------------------------------------------------------------
export const productionOrders: ErpProductionOrder[] = [
  {
    id: '00000000-0000-0000-000B-000000000001',
    order_number: 1,
    product_id: '00000000-0000-0000-0004-000000000001', // Porta-Vinho Clássico
    variation_id: null,
    quantity: 50,
    quantity_produced: 48,
    quantity_lost: 2,
    warehouse_id: '00000000-0000-0000-0005-000000000001',
    sales_order_id: null,
    assigned_workers: ['00000000-0000-0000-0016-000000000001', '00000000-0000-0000-0016-000000000003'],
    status: 'completed' as ErpProductionStatus,
    planned_date: daysAgo(18),
    notes: 'Produção para estoque',
    started_at: daysAgo(15),
    completed_at: daysAgo(10),
    created_by: null,
    created_at: daysAgo(20),
    updated_at: daysAgo(10),
  },
  {
    id: '00000000-0000-0000-000B-000000000002',
    order_number: 2,
    product_id: '00000000-0000-0000-0004-000000000002', // Porta-Vinho Lite Plus
    variation_id: null,
    quantity: 100,
    quantity_produced: 0,
    quantity_lost: 0,
    warehouse_id: '00000000-0000-0000-0005-000000000001',
    sales_order_id: '00000000-0000-0000-0007-000000000005',
    assigned_workers: ['00000000-0000-0000-0016-000000000001', '00000000-0000-0000-0016-000000000002'],
    status: 'in_progress' as ErpProductionStatus,
    planned_date: daysAgo(5),
    notes: 'Pedido #1005 — Banco Nacional Corp',
    started_at: daysAgo(3),
    completed_at: null,
    created_by: null,
    created_at: daysAgo(5),
    updated_at: daysAgo(3),
  },
  {
    id: '00000000-0000-0000-000B-000000000003',
    order_number: 3,
    product_id: '00000000-0000-0000-0004-000000000003', // Porta-Vinho Lite
    variation_id: null,
    quantity: 200,
    quantity_produced: 0,
    quantity_lost: 0,
    warehouse_id: '00000000-0000-0000-0005-000000000001',
    sales_order_id: null,
    assigned_workers: ['00000000-0000-0000-0016-000000000002', '00000000-0000-0000-0016-000000000003'],
    status: 'pending' as ErpProductionStatus,
    planned_date: daysFromNow(5),
    notes: 'Reposição de estoque',
    started_at: null,
    completed_at: null,
    created_by: null,
    created_at: daysAgo(1),
    updated_at: daysAgo(1),
  },
]

// ---------------------------------------------------------------------------
// PRODUCTION COMPONENTS (insumos consumidos em cada ordem)
// ---------------------------------------------------------------------------
export const productionComponents: ErpProductionComponent[] = [
  // Ordem #1 (Clássico, completed, qty 50): 50 tubos + 7.5 chapas + 2.5L sol + 50 caixas
  { id: '00000000-0000-0000-0017-000000000001', production_id: '00000000-0000-0000-000B-000000000001', component_id: '00000000-0000-0000-0004-000000000010', required_qty: 50, consumed_qty: 50 },
  { id: '00000000-0000-0000-0017-000000000002', production_id: '00000000-0000-0000-000B-000000000001', component_id: '00000000-0000-0000-0004-000000000011', required_qty: 7.5, consumed_qty: 7.5 },
  { id: '00000000-0000-0000-0017-000000000003', production_id: '00000000-0000-0000-000B-000000000001', component_id: '00000000-0000-0000-0004-000000000012', required_qty: 2.5, consumed_qty: 2.5 },
  { id: '00000000-0000-0000-0017-000000000004', production_id: '00000000-0000-0000-000B-000000000001', component_id: '00000000-0000-0000-0004-000000000013', required_qty: 50, consumed_qty: 50 },
  // Ordem #2 (Lite Plus, in_progress, qty 100): 100 tubos + 12 chapas + 4L sol + 100 caixas
  { id: '00000000-0000-0000-0017-000000000005', production_id: '00000000-0000-0000-000B-000000000002', component_id: '00000000-0000-0000-0004-000000000010', required_qty: 100, consumed_qty: 0 },
  { id: '00000000-0000-0000-0017-000000000006', production_id: '00000000-0000-0000-000B-000000000002', component_id: '00000000-0000-0000-0004-000000000011', required_qty: 12, consumed_qty: 0 },
  { id: '00000000-0000-0000-0017-000000000007', production_id: '00000000-0000-0000-000B-000000000002', component_id: '00000000-0000-0000-0004-000000000012', required_qty: 4, consumed_qty: 0 },
  { id: '00000000-0000-0000-0017-000000000008', production_id: '00000000-0000-0000-000B-000000000002', component_id: '00000000-0000-0000-0004-000000000013', required_qty: 100, consumed_qty: 0 },
  // Ordem #3 (Lite, pending, qty 200): 200 tubos + 20 chapas + 6L sol + 200 caixas
  { id: '00000000-0000-0000-0017-000000000009', production_id: '00000000-0000-0000-000B-000000000003', component_id: '00000000-0000-0000-0004-000000000010', required_qty: 200, consumed_qty: 0 },
  { id: '00000000-0000-0000-0017-000000000010', production_id: '00000000-0000-0000-000B-000000000003', component_id: '00000000-0000-0000-0004-000000000011', required_qty: 20, consumed_qty: 0 },
  { id: '00000000-0000-0000-0017-000000000011', production_id: '00000000-0000-0000-000B-000000000003', component_id: '00000000-0000-0000-0004-000000000012', required_qty: 6, consumed_qty: 0 },
  { id: '00000000-0000-0000-0017-000000000012', production_id: '00000000-0000-0000-000B-000000000003', component_id: '00000000-0000-0000-0004-000000000013', required_qty: 200, consumed_qty: 0 },
]

// ---------------------------------------------------------------------------
// PURCHASE ENTRIES (entradas de compra)
// ---------------------------------------------------------------------------
export const purchaseEntries: ErpPurchaseEntry[] = [
  {
    id: '00000000-0000-0000-0018-000000000001',
    supplier_id: '00000000-0000-0000-0001-000000000010', // Alumínio Brasil
    invoice_number: '8910',
    invoice_series: '1',
    invoice_key: '35260261708573000169550010000089101234567890',
    total_products: 8500.0,
    total_shipping: 350.0,
    total_other: 0,
    total: 8850.0,
    entry_date: daysAgo(25),
    issue_date: daysAgo(27),
    status: 'received',
    warehouse_id: '00000000-0000-0000-0005-000000000001',
    notes: 'Lote mensal de alumínio',
    created_by: null,
    created_at: daysAgo(25),
    updated_at: daysAgo(25),
  },
  {
    id: '00000000-0000-0000-0018-000000000002',
    supplier_id: '00000000-0000-0000-0001-000000000009', // Embalagens Premium
    invoice_number: '4650',
    invoice_series: '1',
    invoice_key: '35260299000111000122550010000046501234567890',
    total_products: 1450.0,
    total_shipping: 0,
    total_other: 0,
    total: 1450.0,
    entry_date: daysAgo(35),
    issue_date: daysAgo(37),
    status: 'received',
    warehouse_id: '00000000-0000-0000-0005-000000000001',
    notes: null,
    created_by: null,
    created_at: daysAgo(35),
    updated_at: daysAgo(35),
  },
]

export const purchaseEntryItems: ErpPurchaseEntryItem[] = [
  // Entry 1: Chapas de alumínio
  { id: '00000000-0000-0000-0019-000000000001', entry_id: '00000000-0000-0000-0018-000000000001', product_id: '00000000-0000-0000-0004-000000000011', variation_id: null, quantity: 200, unit_cost: 12.0, total: 2400.0 },
  { id: '00000000-0000-0000-0019-000000000002', entry_id: '00000000-0000-0000-0018-000000000001', product_id: '00000000-0000-0000-0004-000000000010', variation_id: null, quantity: 600, unit_cost: 5.5, total: 3300.0 },
  { id: '00000000-0000-0000-0019-000000000003', entry_id: '00000000-0000-0000-0018-000000000001', product_id: '00000000-0000-0000-0004-000000000012', variation_id: null, quantity: 30, unit_cost: 45.0, total: 1350.0 },
  // Entry 2: Caixas
  { id: '00000000-0000-0000-0019-000000000004', entry_id: '00000000-0000-0000-0018-000000000002', product_id: '00000000-0000-0000-0004-000000000013', variation_id: null, quantity: 500, unit_cost: 2.90, total: 1450.0 },
]

// ---------------------------------------------------------------------------
// STOCK MOVEMENTS (histórico)
// ---------------------------------------------------------------------------
export const stockMovements: ErpStockMovement[] = []

// ---------------------------------------------------------------------------
// AUDIT LOG
// ---------------------------------------------------------------------------
export const auditLog: { id: string; user_id: string | null; action: string; entity_type: string; entity_id: string; changes: Record<string, unknown> | null; created_at: string }[] = [
  { id: '00000000-0000-0000-001A-000000000001', user_id: '00000000-0000-0000-0000-100000000001', action: 'create', entity_type: 'sales_order', entity_id: '00000000-0000-0000-0007-000000000009', changes: null, created_at: daysAgo(7) },
  { id: '00000000-0000-0000-001A-000000000002', user_id: '00000000-0000-0000-0000-100000000001', action: 'update', entity_type: 'production_order', entity_id: '00000000-0000-0000-000B-000000000002', changes: { status: { from: 'pending', to: 'in_progress' } }, created_at: daysAgo(3) },
  { id: '00000000-0000-0000-001A-000000000003', user_id: '00000000-0000-0000-0000-100000000002', action: 'create', entity_type: 'contact', entity_id: '00000000-0000-0000-0001-000000000008', changes: null, created_at: daysAgo(60) },
]

// ---------------------------------------------------------------------------
// PAYMENT ACCOUNTS & METHODS
// ---------------------------------------------------------------------------
export const paymentAccounts: ErpPaymentAccount[] = [
  {
    id: '00000000-0000-0000-000C-000000000001',
    name: 'Pagar.me',
    provider: 'pagarme',
    active: true,
    notes: 'Gateway principal - integrado com site B2B',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-000C-000000000002',
    name: 'Banco Inter',
    provider: 'inter',
    active: true,
    notes: 'Conta PJ principal',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-000C-000000000003',
    name: 'Bradesco',
    provider: 'bradesco',
    active: true,
    notes: 'Conta PJ secundária',
    created_at: '2025-03-01T00:00:00Z',
    updated_at: '2025-03-01T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-000C-000000000004',
    name: 'Rede',
    provider: 'rede',
    active: true,
    notes: 'Maquininha física e online',
    created_at: '2025-06-01T00:00:00Z',
    updated_at: '2025-06-01T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-000C-000000000005',
    name: 'PagSeguro',
    provider: 'pagseguro',
    active: false,
    notes: 'Desativado — migrado para Pagar.me',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-09-01T00:00:00Z',
  },
]

export const paymentAccountMethods: ErpPaymentAccountMethod[] = [
  // Pagar.me: pix, boleto, credit_card (3 tiers matching Bling: 1x, 2-6x, 7-12x)
  { id: '00000000-0000-0000-000D-000000000001', account_id: '00000000-0000-0000-000C-000000000001', payment_method: 'pix', tax_percentage: 0.99, tax_fixed: 0, installment_min: 1, installment_max: 1, active: true },
  { id: '00000000-0000-0000-000D-000000000002', account_id: '00000000-0000-0000-000C-000000000001', payment_method: 'boleto', tax_percentage: 0, tax_fixed: 3.49, installment_min: 1, installment_max: 1, active: true },
  { id: '00000000-0000-0000-000D-000000000003', account_id: '00000000-0000-0000-000C-000000000001', payment_method: 'credit_card', tax_percentage: 2.99, tax_fixed: 0, installment_min: 1, installment_max: 1, active: true },
  { id: '00000000-0000-0000-000D-000000000013', account_id: '00000000-0000-0000-000C-000000000001', payment_method: 'credit_card', tax_percentage: 4.99, tax_fixed: 0, installment_min: 2, installment_max: 6, active: true },
  { id: '00000000-0000-0000-000D-000000000014', account_id: '00000000-0000-0000-000C-000000000001', payment_method: 'credit_card', tax_percentage: 5.99, tax_fixed: 0, installment_min: 7, installment_max: 12, active: true },
  // Inter: pix, boleto, transfer
  { id: '00000000-0000-0000-000D-000000000004', account_id: '00000000-0000-0000-000C-000000000002', payment_method: 'pix', tax_percentage: 0, tax_fixed: 0, installment_min: 1, installment_max: 1, active: true },
  { id: '00000000-0000-0000-000D-000000000005', account_id: '00000000-0000-0000-000C-000000000002', payment_method: 'boleto', tax_percentage: 0, tax_fixed: 1.90, installment_min: 1, installment_max: 1, active: true },
  { id: '00000000-0000-0000-000D-000000000006', account_id: '00000000-0000-0000-000C-000000000002', payment_method: 'transfer', tax_percentage: 0, tax_fixed: 0, installment_min: 1, installment_max: 1, active: true },
  // Bradesco: boleto, transfer
  { id: '00000000-0000-0000-000D-000000000007', account_id: '00000000-0000-0000-000C-000000000003', payment_method: 'boleto', tax_percentage: 0, tax_fixed: 2.50, installment_min: 1, installment_max: 1, active: true },
  { id: '00000000-0000-0000-000D-000000000008', account_id: '00000000-0000-0000-000C-000000000003', payment_method: 'transfer', tax_percentage: 0, tax_fixed: 0, installment_min: 1, installment_max: 1, active: true },
  // Rede: credit_card (3 tiers)
  { id: '00000000-0000-0000-000D-000000000009', account_id: '00000000-0000-0000-000C-000000000004', payment_method: 'credit_card', tax_percentage: 2.49, tax_fixed: 0, installment_min: 1, installment_max: 1, active: true },
  { id: '00000000-0000-0000-000D-000000000015', account_id: '00000000-0000-0000-000C-000000000004', payment_method: 'credit_card', tax_percentage: 3.49, tax_fixed: 0, installment_min: 2, installment_max: 6, active: true },
  { id: '00000000-0000-0000-000D-000000000016', account_id: '00000000-0000-0000-000C-000000000004', payment_method: 'credit_card', tax_percentage: 4.49, tax_fixed: 0, installment_min: 7, installment_max: 12, active: true },
  // PagSeguro (inactive): pix, boleto, credit_card
  { id: '00000000-0000-0000-000D-000000000010', account_id: '00000000-0000-0000-000C-000000000005', payment_method: 'pix', tax_percentage: 0.99, tax_fixed: 0, installment_min: 1, installment_max: 1, active: true },
  { id: '00000000-0000-0000-000D-000000000011', account_id: '00000000-0000-0000-000C-000000000005', payment_method: 'boleto', tax_percentage: 0, tax_fixed: 2.99, installment_min: 1, installment_max: 1, active: true },
  { id: '00000000-0000-0000-000D-000000000012', account_id: '00000000-0000-0000-000C-000000000005', payment_method: 'credit_card', tax_percentage: 4.49, tax_fixed: 0, installment_min: 1, installment_max: 12, active: true },
]
