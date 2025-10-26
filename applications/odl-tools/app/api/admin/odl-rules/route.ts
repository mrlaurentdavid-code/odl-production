import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ============================================================================
// Supabase Client (Service Role for admin operations)
// ============================================================================

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// ============================================================================
// Types
// ============================================================================

interface OdlRule {
  id?: string
  scope: 'global' | 'category' | 'subcategory'
  category_name?: string | null
  subcategory_name?: string | null
  rule_name: string
  description?: string
  deal_min_eco_vs_msrp_percent: number
  deal_min_eco_vs_street_price_percent: number
  target_gross_margin_percent: number
  minimum_gross_margin_percent: number
  deal_good_margin_percent: number
  deal_good_eco_vs_msrp_percent: number
  deal_good_eco_vs_street_percent: number
  deal_top_eco_vs_msrp_percent: number
  deal_top_eco_vs_street_percent: number
  currency_safety_coefficient: number
  payment_processing_fee_percent: number
  payment_processing_fee_fixed_chf: number
  max_price_modifications_per_item: number
  price_modification_time_window_minutes: number
  priority?: number
  is_active: boolean
  valid_from?: string
  valid_until?: string | null
  notes?: string
}

// ============================================================================
// GET - Récupérer toutes les règles
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { data: rules, error } = await supabaseAdmin
      .from('odl_rules')
      .select('*')
      .order('scope', { ascending: true })
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching rules:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch rules', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      rules: rules || []
    })
  } catch (error: any) {
    console.error('Error in GET /api/admin/odl-rules:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error?.message },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST - Créer une nouvelle règle
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const body: OdlRule = await request.json()

    // Validation
    if (!body.scope || !body.rule_name) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: scope, rule_name' },
        { status: 400 }
      )
    }

    // Validate scope-specific requirements
    if (body.scope === 'category' && !body.category_name) {
      return NextResponse.json(
        { success: false, error: 'category_name is required for scope=category' },
        { status: 400 }
      )
    }

    if (body.scope === 'subcategory' && (!body.category_name || !body.subcategory_name)) {
      return NextResponse.json(
        { success: false, error: 'category_name and subcategory_name are required for scope=subcategory' },
        { status: 400 }
      )
    }

    // Prevent creating duplicate global rule
    if (body.scope === 'global') {
      const { data: existingGlobal } = await supabaseAdmin
        .from('odl_rules')
        .select('id')
        .eq('scope', 'global')
        .eq('is_active', true)
        .single()

      if (existingGlobal) {
        return NextResponse.json(
          { success: false, error: 'A global rule already exists. Edit it instead.' },
          { status: 400 }
        )
      }
    }

    // Insert new rule
    const { data, error } = await supabaseAdmin
      .from('odl_rules')
      .insert([body])
      .select()
      .single()

    if (error) {
      console.error('Error creating rule:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create rule', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      rule: data
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST /api/admin/odl-rules:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error?.message },
      { status: 500 }
    )
  }
}

// ============================================================================
// PATCH - Modifier une règle existante
// ============================================================================

export async function PATCH(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing rule id' },
        { status: 400 }
      )
    }

    // Validate scope changes
    if (updates.scope) {
      if (updates.scope === 'category' && !updates.category_name) {
        return NextResponse.json(
          { success: false, error: 'category_name is required for scope=category' },
          { status: 400 }
        )
      }

      if (updates.scope === 'subcategory' && (!updates.category_name || !updates.subcategory_name)) {
        return NextResponse.json(
          { success: false, error: 'category_name and subcategory_name are required for scope=subcategory' },
          { status: 400 }
        )
      }
    }

    // Update rule
    const { data, error } = await supabaseAdmin
      .from('odl_rules')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating rule:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update rule', details: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Rule not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      rule: data
    })
  } catch (error: any) {
    console.error('Error in PATCH /api/admin/odl-rules:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error?.message },
      { status: 500 }
    )
  }
}

// ============================================================================
// DELETE - Supprimer une règle (sauf globale)
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing rule id' },
        { status: 400 }
      )
    }

    // Check if it's a global rule
    const { data: rule } = await supabaseAdmin
      .from('odl_rules')
      .select('scope')
      .eq('id', id)
      .single()

    if (rule?.scope === 'global') {
      return NextResponse.json(
        { success: false, error: 'Cannot delete global rule. Deactivate it instead.' },
        { status: 400 }
      )
    }

    // Delete rule
    const { error } = await supabaseAdmin
      .from('odl_rules')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting rule:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete rule', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Rule deleted successfully'
    })
  } catch (error: any) {
    console.error('Error in DELETE /api/admin/odl-rules:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error?.message },
      { status: 500 }
    )
  }
}
