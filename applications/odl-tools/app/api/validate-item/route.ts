import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

// ============================================================================
// Configuration Supabase
// ============================================================================

// Lazy initialization of Supabase client to avoid build-time errors
let supabaseClient: SupabaseClient | null = null

function getSupabaseClient() {
  if (!supabaseClient) {
    const isLocalDev = process.env.NODE_ENV === 'development' && !process.env.USE_PROD_SUPABASE
    const supabaseUrl = isLocalDev
      ? 'http://127.0.0.1:54331'
      : process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = isLocalDev
      ? 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    supabaseClient = createClient(supabaseUrl, supabaseKey)
  }
  return supabaseClient
}

// ============================================================================
// Types
// ============================================================================

interface ValidateItemRequest {
  // Required fields
  offer_id: string
  item_id: string | null  // Can be null, will be auto-generated
  msrp: number
  street_price: number
  promo_price: number
  purchase_price_ht: number

  // Optional fields
  purchase_currency?: string
  ean?: string
  product_name?: string
  package_weight_kg?: number
  category_id?: string
  subcategory_id?: string
  category_name?: string  // WeWeb may send IDs in name fields
  subcategory_name?: string  // WeWeb may send IDs in name fields
  quantity?: number
  pesa_fee_ht?: number
  warranty_cost_ht?: number

  // NEW: Dimensions
  length_cm?: number
  width_cm?: number
  height_cm?: number

  // NEW: Shipping and customs
  shipping_origin?: string

  // NEW: Electronic/TAR
  contain_electronic?: boolean  // If true, call TAR API
  has_battery?: boolean         // For TAR calculation
  battery_type?: string          // For TAR calculation
  tar_ht?: number                // TAR calculated by TAR API

  // NEW: Identifiers
  variant_id?: string
  user_id?: string

  // WEWEB COMPATIBILITY: Alternative field names
  name?: string                  // Alternative to product_name
  supplier_cost?: number         // Alternative to purchase_price_ht
  weight_kg?: number             // Alternative to package_weight_kg
  contains_battery?: boolean     // Alternative to has_battery (WeWeb uses plural)
  contain_battery?: boolean      // Alternative to has_battery (WeWeb typo)
  tar_fee?: number               // Alternative to tar_ht
  reserved_stock?: number        // Alternative to quantity
}

interface ApiKeyVerificationResult {
  supplier_id: string | null
  is_valid: boolean
  error_message: string | null
  company_name: string | null
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Verify API Key and return supplier_id
 */
async function verifyApiKey(apiKey: string): Promise<ApiKeyVerificationResult> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('verify_supplier_api_key', {
    p_api_key: apiKey
  })

  if (error) {
    console.error('Error verifying API key:', error)
    return {
      supplier_id: null,
      is_valid: false,
      error_message: 'API key verification failed',
      company_name: null
    }
  }

  // RPC returns an array with one element
  if (!data || !Array.isArray(data) || data.length === 0) {
    return {
      supplier_id: null,
      is_valid: false,
      error_message: 'Invalid API key',
      company_name: null
    }
  }

  return data[0] as ApiKeyVerificationResult
}

/**
 * Add CORS headers for WeWeb
 */
function corsHeaders(origin?: string) {
  const allowedOrigins = [
    'https://app.weweb.io',
    'https://*.weweb.io',
    'http://localhost:3000',
    'http://localhost:8080'
  ]

  const isAllowed = origin && (
    allowedOrigins.includes(origin) ||
    origin.endsWith('.weweb.io')
  )

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    'Access-Control-Max-Age': '86400', // 24 hours
  }
}

// ============================================================================
// API Endpoint: POST /api/validate-item
// ============================================================================

/**
 * Validates a supplier offer item and calculates detailed COGS.
 *
 * Authentication: API Key in X-API-Key header
 *
 * Request Body:
 * - offer_id (UUID): Offer identifier from WeWeb
 * - item_id (UUID): Item identifier from WeWeb
 * - msrp (number): Manufacturer Suggested Retail Price (TTC CHF)
 * - street_price (number): Street/market price (TTC CHF)
 * - promo_price (number): O!Deal promotional price (TTC CHF)
 * - purchase_price_ht (number): Supplier purchase price (HT)
 * - purchase_currency (string, optional): EUR|USD|GBP|CHF (default: CHF)
 * - ean (string, optional): Product EAN for catalog lookup
 * - product_name (string, optional): Product name
 * - package_weight_kg (number, optional): Package weight in kg
 * - subcategory_id (UUID, optional): For fallback customs rates
 * - quantity (int, optional): Quantity (default: 1)
 * - pesa_fee_ht (number, optional): PESA recycling fee
 * - warranty_cost_ht (number, optional): Warranty cost
 *
 * Response:
 * {
 *   success: true,
 *   deal_status: 'top' | 'good' | 'almost' | 'bad',
 *   is_valid: boolean,
 *   costs: { ... },
 *   margins: { ... },
 *   savings: { ... }
 * }
 */
export async function POST(request: Request) {
  const origin = request.headers.get('origin') || ''

  try {
    // ============================================================================
    // STEP 1: AUTHENTICATION
    // ============================================================================

    const apiKey = request.headers.get('X-API-Key') || request.headers.get('Authorization')?.replace('Bearer ', '')

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing API key. Provide it in X-API-Key or Authorization header.',
          code: 'MISSING_API_KEY'
        },
        {
          status: 401,
          headers: corsHeaders(origin)
        }
      )
    }

    // Verify API key
    const verification = await verifyApiKey(apiKey)

    if (!verification.is_valid || !verification.supplier_id) {
      return NextResponse.json(
        {
          success: false,
          error: verification.error_message || 'Invalid API key',
          code: 'INVALID_API_KEY'
        },
        {
          status: 401,
          headers: corsHeaders(origin)
        }
      )
    }

    // ============================================================================
    // STEP 2: VALIDATE REQUEST BODY
    // ============================================================================

    const body: ValidateItemRequest = await request.json()

    // Required fields (item_id can be null, will be auto-generated)
    // WEWEB COMPATIBILITY: Accept both purchase_price_ht and supplier_cost
    const requiredFields = [
      'offer_id',
      'msrp',
      'street_price',
      'promo_price'
    ]

    const missingFields = requiredFields.filter(field => !(field in body) || (body as any)[field] === undefined)

    // WEWEB COMPATIBILITY: Check for purchase_price_ht OR supplier_cost
    const hasPurchasePrice = ('purchase_price_ht' in body && body.purchase_price_ht !== undefined) ||
                             ('supplier_cost' in body && body.supplier_cost !== undefined)

    if (!hasPurchasePrice) {
      missingFields.push('purchase_price_ht (or supplier_cost)')
    }

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Missing required fields: ${missingFields.join(', ')}`,
          code: 'MISSING_FIELDS'
        },
        {
          status: 400,
          headers: corsHeaders(origin)
        }
      )
    }

    // Validate numeric fields
    // WEWEB COMPATIBILITY: Check purchase_price_ht OR supplier_cost
    const purchasePrice = body.purchase_price_ht || body.supplier_cost || 0
    if (
      typeof body.msrp !== 'number' || body.msrp <= 0 ||
      typeof body.street_price !== 'number' || body.street_price <= 0 ||
      typeof body.promo_price !== 'number' || body.promo_price <= 0 ||
      typeof purchasePrice !== 'number' || purchasePrice <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Price fields must be positive numbers',
          code: 'INVALID_PRICES'
        },
        {
          status: 400,
          headers: corsHeaders(origin)
        }
      )
    }

    // Validate battery fields if has_battery = true
    // WEWEB COMPATIBILITY: Check has_battery OR contains_battery OR contain_battery
    const hasBattery = body.has_battery === true || body.contains_battery === true || body.contain_battery === true
    if (hasBattery) {
      if (!body.battery_type || body.battery_type.trim() === '') {
        return NextResponse.json(
          {
            success: false,
            error: 'battery_type is required when has_battery/contains_battery = true',
            code: 'MISSING_BATTERY_TYPE'
          },
          {
            status: 400,
            headers: corsHeaders(origin)
          }
        )
      }

      // WEWEB COMPATIBILITY: Check package_weight_kg OR weight_kg
      const packageWeight = body.package_weight_kg || body.weight_kg
      if (!packageWeight || typeof packageWeight !== 'number' || packageWeight <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'package_weight_kg (or weight_kg) is required and must be > 0 when has_battery = true',
            code: 'MISSING_WEIGHT'
          },
          {
            status: 400,
            headers: corsHeaders(origin)
          }
        )
      }
    }

    // ============================================================================
    // STEP 3: BUILD ITEM DATA JSONB
    // ============================================================================

    // Helper: Determine if product is electronic based on subcategory
    const electronicSubcategories = ['s20', 's21', 's22', 's23', 's24', 's25', 's26', 's27', 's42', 's63']
    const isElectronic = body.subcategory_id && electronicSubcategories.includes(body.subcategory_id)

    const itemData = {
      offer_id: body.offer_id,
      item_id: body.item_id || null,  // Can be null
      variant_id: body.variant_id || null,
      msrp: body.msrp,
      street_price: body.street_price,
      promo_price: body.promo_price,

      // WEWEB COMPATIBILITY: Accept both field names
      purchase_price_ht: body.purchase_price_ht || body.supplier_cost,
      purchase_currency: body.purchase_currency || 'CHF',
      ean: body.ean || null,
      product_name: body.product_name || body.name || null,

      // WEWEB COMPATIBILITY: Accept both 'package_weight_kg' and 'weight_kg'
      package_weight_kg: body.package_weight_kg || body.weight_kg || null,

      // Dimensions
      length_cm: body.length_cm || null,
      width_cm: body.width_cm || null,
      height_cm: body.height_cm || null,

      // Category/Subcategory (accepts both ID and name fields)
      category_id: body.category_id || null,
      subcategory_id: body.subcategory_id || null,
      category_name: body.category_name || null,
      subcategory_name: body.subcategory_name || null,

      // Shipping and customs
      shipping_origin: body.shipping_origin || 'CH',

      // Electronic/TAR - WEWEB COMPATIBILITY
      // WeWeb uses 'contains_battery' (plural), we accept both
      // If subcategory is electronic, auto-detect contain_electronic
      contain_electronic: body.contain_electronic || isElectronic,
      has_battery: body.has_battery || body.contains_battery || body.contain_battery || false,
      battery_type: body.battery_type || null,

      // WEWEB COMPATIBILITY: Accept both 'tar_ht' and 'tar_fee'
      tar_ht: body.tar_ht || body.tar_fee || 0,  // Will be calculated by TAR API

      // Other
      quantity: body.quantity || body.reserved_stock || 1,
      warranty_cost_ht: body.warranty_cost_ht || 0
    }

    // ============================================================================
    // STEP 4: CALL TAR API (if contain_electronic = true)
    // ============================================================================

    let tarAmount = 0

    if (itemData.contain_electronic) {
      try {
        // Collect ALL available data for maximum TAR calculation accuracy
        const tarPayload = {
          // REQUIRED fields
          item_name: itemData.product_name || 'Unknown product',
          subcategory_id: itemData.subcategory_id || 'unknown',

          // OPTIONAL but important for accuracy
          has_battery: itemData.has_battery || false,
          battery_type: itemData.battery_type || null,
          weight_kg: itemData.package_weight_kg || null,
          length_cm: itemData.length_cm || null,
          width_cm: itemData.width_cm || null,
          height_cm: itemData.height_cm || null,
          ean: itemData.ean || null,
          sku: itemData.item_id || null
        }

        console.log('📞 Calling TAR API with:', tarPayload)

        const tarResponse = await fetch('https://tar.odl-tools.ch/api/calculate-tar-odeal', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(tarPayload)
        })

        if (tarResponse.ok) {
          const tarData = await tarResponse.json()
          if (tarData.success && tarData.tar && tarData.tar.tarifHT) {
            tarAmount = parseFloat(tarData.tar.tarifHT)
            console.log(`✅ TAR calculated: CHF ${tarAmount} (${tarData.tar.organisme || 'N/A'})`)
          } else {
            console.warn('⚠️ TAR API returned no tariff, using 0')
          }
        } else {
          const errorText = await tarResponse.text()
          console.warn('⚠️ TAR API request failed:', tarResponse.status, errorText)
        }
      } catch (error) {
        console.error('❌ Error calling TAR API:', error)
        // Continue without TAR (will be 0)
      }
    }

    // Add calculated TAR to itemData
    itemData.tar_ht = tarAmount

    // ============================================================================
    // STEP 5: CALL VALIDATION FUNCTION
    // ============================================================================

    const supabase = getSupabaseClient()
    const { data, error } = await supabase.rpc('validate_and_calculate_item', {
      p_supplier_id: verification.supplier_id,
      p_user_id: null, // User tracking will be added in Phase 3
      p_item_data: itemData
    })

    if (error) {
      console.error('Error calling validate_and_calculate_item:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Validation function error',
          details: error.message,
          code: 'VALIDATION_ERROR'
        },
        {
          status: 500,
          headers: corsHeaders(origin)
        }
      )
    }

    // ============================================================================
    // STEP 6: FILTER RESPONSE FOR SUPPLIER
    // ============================================================================
    // IMPORTANT: Suppliers should NOT see internal costs (PESA, TAR, logistics, margins)
    // Only return: status, item details, public pricing, and comments

    // If validation function returned success=false, return 400
    if (data && !data.success) {
      return NextResponse.json(
        data,
        {
          status: 400,
          headers: corsHeaders(origin)
        }
      )
    }

    // Build supplier-friendly response (hide internal costs and margins)
    // Filter comments to remove sensitive internal cost details
    const supplierComments: string[] = []

    if (data.validation_issues && data.validation_issues.length > 0) {
      data.validation_issues.forEach((issue: string) => {
        // Filter out comments that reveal internal costs (PESA, margins, etc.)
        if (issue.includes('PESA fees applied') || issue.includes('CHF')) {
          // Generic message about international import
          if (!supplierComments.includes('Produit soumis aux frais d\'importation internationale')) {
            supplierComments.push('Produit soumis aux frais d\'importation internationale')
          }
        } else if (issue.includes('Margin') && issue.includes('%')) {
          // Don't reveal margin issues to supplier
          // Optionally add a generic message
        } else {
          // Keep other non-sensitive comments
          supplierComments.push(issue)
        }
      })
    }

    // Add deal status explanation
    if (data.deal_status === 'top') {
      supplierComments.push('✅ Offre acceptée - Excellent rapport qualité/prix')
    } else if (data.deal_status === 'good') {
      supplierComments.push('✅ Offre acceptée - Bon rapport qualité/prix')
    } else if (data.deal_status === 'almost') {
      supplierComments.push('⚠️ Offre à revoir - Prix légèrement élevé')
    } else if (data.deal_status === 'bad') {
      supplierComments.push('❌ Offre refusée - Prix trop élevé')
    }

    const supplierResponse = {
      success: data.success,
      is_valid: data.is_valid,
      deal_status: data.deal_status,
      cost_id: data.cost_id || null,
      generated_item_id: data.generated_item_id,

      // Item details (safe to share)
      item_details: data.item_details,

      // Public pricing only (safe to share)
      pricing: {
        msrp: data.pricing?.msrp,
        street_price: data.pricing?.street_price,
        promo_price: data.pricing?.promo_price,
        purchase_price_original: data.pricing?.purchase_price_original,
        purchase_currency: data.pricing?.purchase_currency,
        currency_rate: data.pricing?.currency_rate,
        purchase_price_chf_ht: data.costs?.purchase_price_chf_ht // Only the converted purchase price
      },

      // Supplier-friendly comments (sensitive info removed)
      comments: supplierComments
    }

    // DO NOT INCLUDE (confidential internal data):
    // - costs.cogs_ht (reveals our total cost structure)
    // - costs.pesa_fee_* (reveals import fees)
    // - costs.tar_ht (reveals recycling tax)
    // - costs.logistics_total_ht (reveals logistics costs)
    // - margins.* (reveals our profit margins)

    return NextResponse.json(
      supplierResponse,
      {
        status: 200,
        headers: corsHeaders(origin)
      }
    )

  } catch (error: any) {
    console.error('Error in /api/validate-item:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error?.message || 'Unknown error',
        code: 'INTERNAL_ERROR'
      },
      {
        status: 500,
        headers: corsHeaders(origin)
      }
    )
  }
}

// ============================================================================
// OPTIONS handler for CORS preflight
// ============================================================================

export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin') || ''

  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin)
  })
}

// ============================================================================
// GET handler for API documentation
// ============================================================================

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/validate-item',
    version: '1.0.0',
    description: 'O!Deal Supplier Offer Validation API',
    authentication: 'API Key in X-API-Key or Authorization header',
    methods: ['POST', 'OPTIONS'],
    requiredFields: [
      'offer_id (UUID)',
      'item_id (UUID)',
      'msrp (number, TTC CHF)',
      'street_price (number, TTC CHF)',
      'promo_price (number, TTC CHF)',
      'purchase_price_ht (number, HT)'
    ],
    optionalFields: [
      'purchase_currency (EUR|USD|GBP|CHF, default: CHF)',
      'ean (string)',
      'product_name (string)',
      'package_weight_kg (number)',
      'subcategory_id (UUID)',
      'quantity (int, default: 1)',
      'pesa_fee_ht (number)',
      'warranty_cost_ht (number)'
    ],
    responseStatuses: {
      200: 'Validation successful',
      400: 'Invalid request or deal rejected',
      401: 'Invalid or missing API key',
      500: 'Internal server error'
    },
    exampleRequest: {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'odl_sup_xxxxxxxxxxxxxxxx'
      },
      body: {
        offer_id: '123e4567-e89b-12d3-a456-426614174000',
        item_id: '123e4567-e89b-12d3-a456-426614174001',
        msrp: 199,
        street_price: 122,
        promo_price: 119,
        purchase_price_ht: 90,
        purchase_currency: 'EUR',
        product_name: 'Samsung Galaxy Buds3 Pro',
        package_weight_kg: 0.5,
        quantity: 1
      }
    }
  })
}
