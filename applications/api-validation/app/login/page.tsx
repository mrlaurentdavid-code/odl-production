'use client'

import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { Eye, EyeOff } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Vérifier si l'utilisateur est déjà connecté au chargement
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Utilisateur déjà connecté, créer le cookie SSO
        await fetch('/api/auth/set-sso', { method: 'POST' })

        // Rediriger vers returnUrl ou dashboard
        const returnUrl = searchParams.get('returnUrl')
        if (returnUrl) {
          console.log('Utilisateur connecté, redirection vers:', returnUrl)
          window.location.href = returnUrl
        } else {
          router.push('/dashboard')
        }
      }
    }

    checkAuth()
  }, [router, searchParams])

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setLoading(true)
      setError(null)
      const supabase = createClient()

      if (isSignUp) {
        // Inscription
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        alert('Compte créé! Vous pouvez maintenant vous connecter.')
        setIsSignUp(false)
      } else {
        // Connexion
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error

        // Créer le cookie SSO pour partager l'auth avec TAR & NDF
        await fetch('/api/auth/set-sso', { method: 'POST' })

        // Rediriger vers returnUrl si présent, sinon vers dashboard
        const returnUrl = searchParams.get('returnUrl')
        if (returnUrl) {
          window.location.href = returnUrl
        } else {
          router.push('/dashboard')
          router.refresh()
        }
      }
    } catch (err: any) {
      setError(JSON.stringify(err, null, 2) || 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-6">
              O
            </div>
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">
              {isSignUp ? 'Créer un compte' : 'Connexion'}
            </h1>
            <p className="text-gray-600">
              {isSignUp ? 'Créez votre compte ODL Tools' : 'Accédez à vos outils ODL'}
            </p>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="votre@email.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {isSignUp && (
                <p className="mt-2 text-xs text-gray-600">
                  Le mot de passe doit contenir au minimum 6 caractères
                </p>
              )}
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Chargement...' : (isSignUp ? 'Créer mon compte' : 'Se connecter')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError(null)
              }}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {isSignUp ? 'Déjà un compte? Se connecter' : 'Pas de compte? Créer un compte'}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function Login() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><p>Chargement...</p></div>}>
      <LoginForm />
    </Suspense>
  )
}
