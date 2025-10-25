import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_super_admin) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { email, role = 'user' } = await request.json()

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('invitation_tokens')
    .insert({ email, role, created_by: user.id })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://odl-tools.ch'
  const inviteUrl = `${baseUrl}/setup-account?token=${data.token}`

  return NextResponse.json({ 
    success: true, 
    inviteUrl,
    email: data.email,
    expiresAt: data.expires_at
  })
}
