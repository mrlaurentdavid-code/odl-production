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
  category_id?: string  // NEW: Category ID from WeWeb
  subcategory_id?: string  // NEW: Subcategory ID from WeWeb
  quantity?: number
  pesa_fee_ht?: number
  warranty_cost_ht?: number
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
    const requiredFields = [
      'offer_id',
      'msrp',
      'street_price',
      'promo_price',
      'purchase_price_ht'
    ]

    const missingFields = requiredFields.filter(field => !(field in body) || (body as any)[field] === undefined)

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
    if (
      typeof body.msrp !== 'number' || body.msrp <= 0 ||
      typeof body.street_price !== 'number' || body.street_price <= 0 ||
      typeof body.promo_price !== 'number' || body.promo_price <= 0 ||
      typeof body.purchase_price_ht !== 'number' || body.purchase_price_ht <= 0
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

    // ============================================================================
    // STEP 3: BUILD ITEM DATA JSONB
    // ============================================================================

    const itemData = {
      offer_id: body.offer_id,
      item_id: body.item_id || null,  // Can be null
      msrp: body.msrp,
      street_price: body.street_price,
      promo_price: body.promo_price,
      purchase_price_ht: body.purchase_price_ht,
      purchase_currency: body.purchase_currency || 'CHF',
      ean: body.ean || null,
      product_name: body.product_name || null,
      package_weight_kg: body.package_weight_kg || null,
      category_id: body.category_id || null,  // NEW
      subcategory_id: body.subcategory_id || null,
      quantity: body.quantity || 1,
      pesa_fee_ht: body.pesa_fee_ht || 0,
      warranty_cost_ht: body.warranty_cost_ht || 0
    }

    // ============================================================================
    // STEP 4: CALL VALIDATION FUNCTION
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
    // STEP 5: RETURN RESULT
    // ============================================================================

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

    return NextResponse.json(
      data,
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
