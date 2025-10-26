import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()

    const { data: subcategories, error } = await supabaseAdmin
      .from('odl_service_subcategories')
      .select('subcategory_id, category_id, name, fr_display_name, en_display_name, de_display_name, it_display_name, is_active, display_order')
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching service subcategories:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch subcategories', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      subcategories: subcategories || []
    })
  } catch (error: any) {
    console.error('Error in GET /api/admin/categories/services/subcategories:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error?.message },
      { status: 500 }
    )
  }
}
