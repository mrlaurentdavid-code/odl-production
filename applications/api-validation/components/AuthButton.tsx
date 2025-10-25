'use client'

import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AuthButton() {
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()

    // Supprimer le cookie SSO
    await fetch('/api/auth/clear-sso', { method: 'POST' })

    // Déconnexion Supabase
    await supabase.auth.signOut()

    router.refresh()
    router.push('/')
  }

  return (
    <button
      onClick={handleSignOut}
      className="px-5 py-2 text-sm font-medium text-apple-gray hover:text-apple-gray-dark border border-gray-200 rounded-full hover:bg-gray-50 transition-all"
    >
      Déconnexion
    </button>
  )
}
