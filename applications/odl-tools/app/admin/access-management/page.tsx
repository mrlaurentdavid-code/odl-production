import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AccessManagementClient from './AccessManagementClient'

export const dynamic = 'force-dynamic'

export default async function AccessManagementPage() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Vérifier si super admin (utiliser la fonction SECURITY DEFINER pour éviter la récursion RLS)
  const { data: profileData } = await supabase
    .rpc('get_profile_bypass_rls', { p_user_id: user.id })

  const profile = profileData?.[0]

  if (!profile?.is_super_admin) {
    redirect('/dashboard')
  }

  // Récupérer tous les utilisateurs avec leurs accès
  // Note: On ne peut pas utiliser .from('profiles') à cause de la récursion RLS
  // On doit créer une fonction SQL qui retourne tous les profils
  const { data: profiles, error: profilesError } = await supabase
    .rpc('get_all_profiles_admin')

  console.log('Profiles fetch:', { profiles, profilesError })

  // Récupérer toutes les applications (via fonction SECURITY DEFINER)
  const { data: applications, error: applicationsError } = await supabase
    .rpc('get_all_applications')

  console.log('Applications fetch:', { applications, applicationsError })

  // Récupérer tous les accès (via fonction SECURITY DEFINER)
  const { data: accesses, error: accessesError } = await supabase
    .rpc('get_all_accesses')

  console.log('Accesses fetch:', { accesses, accessesError })

  return (
    <AccessManagementClient
      profiles={profiles || []}
      applications={applications || []}
      accesses={accesses || []}
    />
  )
}
