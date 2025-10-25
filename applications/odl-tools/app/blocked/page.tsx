import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export default async function BlockedPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const handleLogout = async () => {
    'use server'
    const supabase = await createServerSupabaseClient()
    await supabase.auth.signOut()
    const cookieStore = await cookies()
    cookieStore.getAll().forEach(cookie => {
      cookieStore.delete(cookie.name)
    })
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Accès bloqué
          </h1>
          <p className="text-gray-600 mb-6">
            Votre compte a été désactivé par un administrateur. Vous ne pouvez plus accéder à la plateforme ODL Tools.
          </p>

          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 mb-6">
            <p className="text-sm text-amber-800">
              💡 Si vous pensez qu'il s'agit d'une erreur, veuillez contacter l'administrateur système.
            </p>
          </div>

          <form action={handleLogout}>
            <button
              type="submit"
              className="w-full px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
            >
              Se déconnecter
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
