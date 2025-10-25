import { createServerSupabaseClient, getUserProfile } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AdminPageClient from './AdminPageClient'

export default async function AdminPage() {
  const userProfile = await getUserProfile()

  if (!userProfile || !userProfile.profile?.is_super_admin) {
    redirect('/dashboard')
  }

  const supabase = await createServerSupabaseClient()

  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  // Get count of pending profiles
  const { data: pendingCount } = await supabase
    .rpc('count_pending_profiles')

  return <AdminPageClient users={users || []} pendingProfilesCount={pendingCount || 0} />
}
