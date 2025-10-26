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
 * API Endpoint: /api/calculate-customs
 * Calcule uniquement les frais de douane (sans transport)
 *
 * POST /api/calculate-customs
 * Body: {
 *   quantity: number,
 *   merchandise_value: number,
 *   provider_id?: string
 * }
 */

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const {
      quantity,
      merchandise_value,
      provider_id = 'pesa'
    } = body

    // Validation
    if (!quantity || !merchandise_value) {
      return NextResponse.json(
        {
          success: false,
          error: 'Les champs quantity et merchandise_value sont obligatoires'
        },
        { status: 400 }
      )
    }

    if (
      typeof quantity !== 'number' || quantity < 1 ||
      typeof merchandise_value !== 'number' || merchandise_value <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'La quantité doit être au moins 1 et la valeur de marchandise positive'
        },
        { status: 400 }
      )
    }

    // Call Supabase function
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.rpc('calculate_customs_cost', {
      p_quantity: quantity,
      p_merchandise_value: merchandise_value,
      p_provider_id: provider_id
    })

    if (error) {
      console.error('Erreur Supabase RPC:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Erreur lors du calcul des frais de douane',
          details: error.message
        },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 200 })

  } catch (error: any) {
    console.error('Erreur API calculate-customs:', error)
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
    endpoint: '/api/calculate-customs',
    version: '1.0.0',
    description: 'Calcul des frais de douane uniquement (sans transport)',
    methods: ['POST'],
    requiredFields: ['quantity', 'merchandise_value'],
    optionalFields: [
      'provider_id (string, défaut: pesa)'
    ]
  })
}
