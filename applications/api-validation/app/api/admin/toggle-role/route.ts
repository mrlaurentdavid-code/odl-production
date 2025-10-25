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

  const { userId, newIsSuperAdmin, newEmployeeType } = await request.json()

  if (!userId || typeof newIsSuperAdmin !== 'boolean') {
    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
  }

  const updateData: any = { is_super_admin: newIsSuperAdmin }

  if (newEmployeeType) {
    updateData.employee_type = newEmployeeType
  }

  // Mettre à jour le rôle de l'utilisateur cible
  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: `Utilisateur ${newIsSuperAdmin ? 'promu en super admin' : 'rétrogradé en utilisateur normal'}`
  })
}
