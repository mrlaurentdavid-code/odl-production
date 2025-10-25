import { getUser, getUserProfile } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AuthButton from '@/components/AuthButton'
import { LayoutDashboard, Shield } from 'lucide-react'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUser()

  if (!user) {
    redirect('/login')
  }

  const userProfile = await getUserProfile()
  const isSuperAdmin = userProfile?.profile?.is_super_admin || false

  return (
    <div className="min-h-screen bg-background-secondary">
      {/* Navigation moderne avec Design System */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            {/* Logo & Nav */}
            <div className="flex items-center gap-8">
              {/* Logo */}
              <a href="/dashboard" className="flex items-center gap-3 group">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md shadow-primary-500/30 group-hover:shadow-lg group-hover:shadow-primary-500/40 transition-all">
                  O
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-neutral-900 to-neutral-700 bg-clip-text text-transparent">
                  ODL Tools
                </span>
              </a>

              {/* Nav Links */}
              <div className="hidden md:flex items-center gap-1">
                <a
                  href="/dashboard"
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-900 bg-neutral-100 rounded-lg transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </a>
                {isSuperAdmin && (
                  <a
                    href="/admin"
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
                  >
                    <Shield className="w-4 h-4" />
                    Admin
                  </a>
                )}
              </div>
            </div>

            {/* User Info */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-background-tertiary rounded-full border border-border">
                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-600 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-sm">
                  {user.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className="text-sm font-medium text-neutral-700 max-w-[150px] truncate">
                  {user.email}
                </span>
              </div>
              <AuthButton />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-white mt-16">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-neutral-600">
            <div>© 2025 ODL Group Sàrl — Tous droits réservés</div>
            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-neutral-900 transition-colors">
                Documentation
              </a>
              <a href="#" className="hover:text-neutral-900 transition-colors">
                Support
              </a>
              <a href="#" className="hover:text-neutral-900 transition-colors">
                Changelog
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
