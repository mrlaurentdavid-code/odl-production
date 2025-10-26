import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

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

/**
 * API Endpoint: /api/calculate-transport
 * Calcule uniquement les coûts de transport (sans douane)
 *
 * POST /api/calculate-transport
 * Body: {
 *   length_cm: number,
 *   width_cm: number,
 *   height_cm: number,
 *   weight_kg: number,
 *   carrier?: string,
 *   mode?: string,
 *   provider_id?: string
 * }
 */

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const {
      length_cm,
      width_cm,
      height_cm,
      weight_kg,
      quantity = 1,
      carrier = null,
      mode = null,
      provider_id = 'ohmex',
      pallet_format_id = 'euro'
    } = body

    // Validation
    if (!length_cm || !width_cm || !height_cm || !weight_kg) {
      return NextResponse.json(
        {
          success: false,
          error: 'Les champs length_cm, width_cm, height_cm et weight_kg sont obligatoires'
        },
        { status: 400 }
      )
    }

    if (
      typeof length_cm !== 'number' || length_cm <= 0 ||
      typeof width_cm !== 'number' || width_cm <= 0 ||
      typeof height_cm !== 'number' || height_cm <= 0 ||
      typeof weight_kg !== 'number' || weight_kg <= 0 ||
      typeof quantity !== 'number' || quantity < 1
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Les dimensions et le poids doivent être des nombres positifs, quantité >= 1'
        },
        { status: 400 }
      )
    }

    // Call Supabase function with pallet calculations and optimization
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.rpc('calculate_transport_cost_with_optimization', {
      p_length_cm: length_cm,
      p_width_cm: width_cm,
      p_height_cm: height_cm,
      p_weight_kg: weight_kg,
      p_carrier: carrier,
      p_mode: mode,
      p_provider_id: provider_id,
      p_quantity: quantity,
      p_pallet_format_id: pallet_format_id
    })

    if (error) {
      console.error('Erreur Supabase RPC:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Erreur lors du calcul des coûts de transport',
          details: error.message
        },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 200 })

  } catch (error: any) {
    console.error('Erreur API calculate-transport:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur serveur lors du calcul',
        details: error?.message || 'Erreur inconnue'
      },
      { status: 500 }
    )
  }
}

// GET endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/calculate-transport',
    version: '2.0.0',
    description: 'Calcul des coûts de transport avec calcul automatique de palettes',
    methods: ['POST'],
    requiredFields: ['length_cm', 'width_cm', 'height_cm', 'weight_kg'],
    optionalFields: [
      'quantity (number, défaut: 1)',
      'carrier (string, défaut: auto - sélection automatique)',
      'mode (string, défaut: auto - sélection automatique)',
      'provider_id (string, défaut: ohmex)',
      'pallet_format_id (string, défaut: euro)'
    ]
  })
}
