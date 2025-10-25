import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Configuration Supabase
// Utilise local par défaut en dev, prod en production
const isLocalDev = process.env.NODE_ENV === 'development' && !process.env.USE_PROD_SUPABASE
const supabaseUrl = isLocalDev
  ? 'http://127.0.0.1:54331'
  : process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = isLocalDev
  ? 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
  : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * API Endpoint: /api/calculate-logistics
 * Calcule les coûts logistiques (transport + douane) basé sur les dimensions,
 * poids, transporteur et statut d'import.
 *
 * POST /api/calculate-logistics
 * Body: {
 *   length_cm: number,
 *   width_cm: number,
 *   height_cm: number,
 *   weight_kg: number,
 *   carrier?: string,
 *   mode?: string,
 *   is_imported?: boolean,
 *   nb_customs_positions?: number,
 *   merchandise_value?: number,
 *   provider_id?: string
 * }
 */

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validation des champs obligatoires
    const {
      length_cm,
      width_cm,
      height_cm,
      weight_kg,
      carrier = null,
      mode = null,
      is_imported = false,
      quantity = 1,
      merchandise_value = 0,
      provider_id = 'ohmex'
    } = body

    // Validation des dimensions et poids
    if (!length_cm || !width_cm || !height_cm || !weight_kg) {
      return NextResponse.json(
        {
          success: false,
          error: 'Les champs length_cm, width_cm, height_cm et weight_kg sont obligatoires'
        },
        { status: 400 }
      )
    }

    // Validation des valeurs numériques
    if (
      typeof length_cm !== 'number' || length_cm <= 0 ||
      typeof width_cm !== 'number' || width_cm <= 0 ||
      typeof height_cm !== 'number' || height_cm <= 0 ||
      typeof weight_kg !== 'number' || weight_kg <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Les dimensions et le poids doivent être des nombres positifs'
        },
        { status: 400 }
      )
    }

    // Si import, valider que merchandise_value est fourni
    if (is_imported && merchandise_value <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Pour les imports, merchandise_value doit être supérieur à 0'
        },
        { status: 400 }
      )
    }

    // Appeler la fonction Supabase calculate_logistics_cost
    const { data, error } = await supabase.rpc('calculate_logistics_cost', {
      p_length_cm: length_cm,
      p_width_cm: width_cm,
      p_height_cm: height_cm,
      p_weight_kg: weight_kg,
      p_carrier: carrier,
      p_mode: mode,
      p_is_imported: is_imported,
      p_quantity: quantity,
      p_merchandise_value: merchandise_value,
      p_provider_id: provider_id
    })

    if (error) {
      console.error('Erreur Supabase RPC:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Erreur lors du calcul des coûts logistiques',
          details: error.message
        },
        { status: 500 }
      )
    }

    // La fonction SQL retourne déjà un JSON structuré
    return NextResponse.json(data, { status: 200 })

  } catch (error: any) {
    console.error('Erreur API calculate-logistics:', error)
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

// GET endpoint pour vérifier le statut de l'API
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/calculate-logistics',
    version: '1.0.0',
    description: 'Calcul des coûts logistiques (transport + douane)',
    methods: ['POST'],
    requiredFields: ['length_cm', 'width_cm', 'height_cm', 'weight_kg'],
    optionalFields: [
      'carrier (La Poste, Planzer)',
      'mode (Sans signature, Avec suivi, Avec signature)',
      'is_imported (boolean, défaut: false)',
      'quantity (int, défaut: 1 - divise les frais de douane)',
      'merchandise_value (number, requis si is_imported = true)',
      'provider_id (string, défaut: ohmex)'
    ]
  })
}
