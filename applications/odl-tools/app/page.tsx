import Link from 'next/link'
import { getUser } from '@/lib/supabase-server'

export default async function Home() {
  const user = await getUser()

  return (
    <main className="min-h-screen bg-white">
      <nav className="border-b border-border">
        <div className="max-w-7xl mx-auto px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center text-white font-semibold shadow-md">
              O
            </div>
            <span className="text-xl font-semibold text-neutral-900">ODL Tools</span>
          </div>
          <div>
            {user ? (
              <Link
                href="/dashboard"
                className="px-6 py-2 bg-primary-500 text-white rounded-full hover:bg-primary-600 transition-colors font-medium shadow-sm hover:shadow-md"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="px-6 py-2 bg-primary-500 text-white rounded-full hover:bg-primary-600 transition-colors font-medium shadow-sm hover:shadow-md"
              >
                Se connecter
              </Link>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-8 py-24">
        <div className="text-center space-y-8">
          <h1 className="text-6xl font-semibold text-neutral-900 tracking-tight">
            Bienvenue sur ODL Tools
          </h1>
          <p className="text-2xl text-neutral-600 max-w-3xl mx-auto leading-relaxed">
            Votre portail d'outils internes pour simplifier votre travail quotidien.
            Accédez à tous vos outils en un seul endroit.
          </p>

          <div className="pt-8">
            {user ? (
              <Link
                href="/dashboard"
                className="inline-block px-8 py-4 bg-primary-500 text-white rounded-full hover:bg-primary-600 transition-all text-lg font-medium hover:scale-105 transform shadow-lg hover:shadow-xl"
              >
                Accéder au Dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-block px-8 py-4 bg-primary-500 text-white rounded-full hover:bg-primary-600 transition-all text-lg font-medium hover:scale-105 transform shadow-lg hover:shadow-xl"
              >
                Commencer
              </Link>
            )}
          </div>
        </div>

        <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center p-8 bg-background-secondary rounded-xl border border-border hover:shadow-md transition-shadow">
            <div className="text-5xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">Rapide</h3>
            <p className="text-neutral-600">
              Accédez instantanément à tous vos outils favoris
            </p>
          </div>
          <div className="text-center p-8 bg-background-secondary rounded-xl border border-border hover:shadow-md transition-shadow">
            <div className="text-5xl mb-4">🔒</div>
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">Sécurisé</h3>
            <p className="text-neutral-600">
              Authentification OAuth avec Google pour une sécurité maximale
            </p>
          </div>
          <div className="text-center p-8 bg-background-secondary rounded-xl border border-border hover:shadow-md transition-shadow">
            <div className="text-5xl mb-4">✨</div>
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">Simple</h3>
            <p className="text-neutral-600">
              Interface élégante et intuitive inspirée d'Apple
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
