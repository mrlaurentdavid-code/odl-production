import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  // Vérifier que l'utilisateur actuel est super admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_super_admin) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { userId, newIsActive } = await request.json()

  if (!userId || typeof newIsActive !== 'boolean') {
    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
  }

  // Empêcher un admin de se bloquer lui-même
  if (userId === user.id && !newIsActive) {
    return NextResponse.json({ error: 'Vous ne pouvez pas vous bloquer vous-même' }, { status: 400 })
  }

  // Mettre à jour le statut is_active de l'utilisateur
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: newIsActive })
    .eq('id', userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: `Utilisateur ${newIsActive ? 'débloqué' : 'bloqué'} avec succès`
  })
}
