import { AppCard } from '@/components/ui/AppCard'
import { Calculator, Receipt, TrendingUp, Users, Shield, Code2, Image as ImageIcon, Languages, Gamepad2, Truck, Globe, Settings } from 'lucide-react'
import { getUserProfile } from '@/lib/supabase-server'
import Link from 'next/link'

export default async function Dashboard() {
  const userProfile = await getUserProfile()
  const isSuperAdmin = userProfile?.profile?.is_super_admin || false
  const apps = [
    {
      id: 'tar',
      title: 'TAR Calculator',
      description: 'Calcul automatique des taxes de recyclage suisses',
      icon: <Calculator className="w-12 h-12" />,
      url: 'https://tar.odl-tools.ch',
      available: true,
      gradient: 'bg-gradient-to-br from-blue-500 to-blue-700',
      stats: [
        { label: 'Calculs ce mois', value: '234' },
        { label: 'Économisé', value: '~2h' },
      ],
    },
    {
      id: 'transport',
      title: 'Calculateur Transport',
      description: 'Calcul des coûts de transport uniquement (Ohmex)',
      icon: <Truck className="w-12 h-12" />,
      url: '/transport-calculator',
      available: true,
      gradient: 'bg-gradient-to-br from-cyan-500 to-blue-700',
      stats: [
        { label: 'Transporteurs', value: '2' },
        { label: 'Formats', value: '6' },
      ],
      badge: {
        label: 'Nouveau',
        variant: 'success' as const,
      },
    },
    {
      id: 'customs',
      title: 'Calculateur Douane',
      description: 'Calcul des frais de douane uniquement (PESA)',
      icon: <Globe className="w-12 h-12" />,
      url: '/customs-calculator',
      available: true,
      gradient: 'bg-gradient-to-br from-purple-500 to-indigo-600',
      stats: [
        { label: 'Frais admin', value: 'CHF 80' },
        { label: 'Positions', value: '1' },
      ],
      badge: {
        label: 'Nouveau',
        variant: 'success' as const,
      },
    },
    {
      id: 'ndf',
      title: 'Notes de Frais',
      description: 'Gestion et validation des remboursements',
      icon: <Receipt className="w-12 h-12" />,
      url: 'https://ndf.odl-tools.ch',
      available: true,
      gradient: 'bg-gradient-to-br from-emerald-500 to-teal-700',
      stats: [
        { label: 'En attente', value: 3 },
        { label: 'Ce mois', value: '12.5k CHF' },
      ],
      badge: {
        label: '3 à valider',
        variant: 'warning' as const,
      },
    },
    {
      id: 'api-docs',
      title: 'API Documentation',
      description: 'Documentation des APIs pour intégrations Weweb, Supabase, N8N',
      icon: <Code2 className="w-12 h-12" />,
      url: '/api-docs',
      available: true,
      gradient: 'bg-gradient-to-br from-indigo-500 to-violet-700',
      stats: [
        { label: 'APIs disponibles', value: '2' },
        { label: 'Endpoints', value: '5' },
      ],
    },
    {
      id: 'image-converter-test',
      title: 'Image Converter Test',
      description: 'Testez la conversion d\'images en WebP avec transformations',
      icon: <ImageIcon className="w-12 h-12" />,
      url: '/image-converter-test',
      available: true,
      gradient: 'bg-gradient-to-br from-purple-500 to-pink-600',
      stats: [
        { label: 'Formats supportés', value: '4' },
        { label: 'Gain moyen', value: '~60%' },
      ],
      badge: {
        label: 'Test Live',
        variant: 'primary' as const,
      },
    },
    {
      id: 'translation-test',
      title: 'Traduction Test',
      description: 'Interface de test pour la traduction multilingue',
      icon: <Languages className="w-12 h-12" />,
      url: '/translation-test',
      available: true,
      gradient: 'bg-gradient-to-br from-orange-500 to-red-600',
      stats: [
        { label: 'Langues', value: '12' },
        { label: 'Status', value: 'Beta' },
      ],
      badge: {
        label: 'Bientôt',
        variant: 'warning' as const,
      },
    },
    {
      id: 'tetris',
      title: 'Tetris',
      description: 'Jeu de blocs classique pour se détendre',
      icon: <Gamepad2 className="w-12 h-12" />,
      url: '/tetris',
      available: true,
      gradient: 'bg-gradient-to-br from-pink-500 to-purple-600',
      stats: [
        { label: 'Mode', value: 'Fun' },
        { label: 'Record', value: '0' },
      ],
      badge: {
        label: 'Nouveau',
        variant: 'success' as const,
      },
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header avec stats globales */}
      <div>
        <h1 className="text-4xl font-bold text-neutral-900 mb-2">
          Tableau de bord
        </h1>
        <p className="text-lg text-neutral-600">
          Bienvenue sur ODL Tools — Tous vos outils internes en un seul endroit
        </p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-border p-4">
          <div className="text-sm text-neutral-600">Applications & Outils</div>
          <div className="text-3xl font-bold text-neutral-900 mt-1">8</div>
          <div className="text-xs text-success-600 mt-1">TAR, Transport, Douane, NDF, APIs, Tests, Fun</div>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <div className="text-sm text-neutral-600">Tâches en attente</div>
          <div className="text-3xl font-bold text-neutral-900 mt-1">3</div>
          <div className="text-xs text-warning-600 mt-1">Notes de frais</div>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <div className="text-sm text-neutral-600">Activité cette semaine</div>
          <div className="text-3xl font-bold text-neutral-900 mt-1">89</div>
          <div className="text-xs text-primary-600 mt-1">+12% vs semaine dernière</div>
        </div>
      </div>

      {/* Applications Grid - Cards compactes */}
      <div>
        <h2 className="text-2xl font-semibold text-neutral-900 mb-4">
          Applications
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {apps.map((app) => (
            <AppCard key={app.id} {...app} />
          ))}
        </div>
      </div>

      {/* Administration - Super Admin Only */}
      {isSuperAdmin && (
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-6 h-6 text-purple-600" />
            <h3 className="text-lg font-semibold text-neutral-900">
              Administration
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Link href="/admin" className="flex items-center gap-3 p-3 bg-white rounded-lg hover:shadow-md transition-shadow text-left">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="font-medium text-neutral-900">Console Admin</div>
                <div className="text-xs text-neutral-600">Gestion utilisateurs</div>
              </div>
            </Link>
            <Link href="/admin/profile-validation" className="flex items-center gap-3 p-3 bg-white rounded-lg hover:shadow-md transition-shadow text-left">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Shield className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <div className="font-medium text-neutral-900">Validation profils</div>
                <div className="text-xs text-neutral-600">Approuver/refuser</div>
              </div>
            </Link>
            <Link href="/admin/access-management" className="flex items-center gap-3 p-3 bg-white rounded-lg hover:shadow-md transition-shadow text-left">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Shield className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <div className="font-medium text-neutral-900">Gestion accès</div>
                <div className="text-xs text-neutral-600">Permissions & rôles</div>
              </div>
            </Link>
            <Link href="/admin/odl-rules" className="flex items-center gap-3 p-3 bg-white rounded-lg hover:shadow-md transition-shadow text-left">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Settings className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="font-medium text-neutral-900">Règles ODL</div>
                <div className="text-xs text-neutral-600">Configuration validation</div>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-gradient-to-br from-primary-50 to-secondary-50 rounded-xl border border-primary-200 p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-3">
          Actions rapides
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link href="/transport-calculator" className="flex items-center gap-3 p-3 bg-white rounded-lg hover:shadow-md transition-shadow text-left">
            <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center">
              <Truck className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <div className="font-medium text-neutral-900">Calculer Transport</div>
              <div className="text-xs text-neutral-600">Coûts d'envoi</div>
            </div>
          </Link>
          <Link href="/customs-calculator" className="flex items-center gap-3 p-3 bg-white rounded-lg hover:shadow-md transition-shadow text-left">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Globe className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="font-medium text-neutral-900">Calculer Douane</div>
              <div className="text-xs text-neutral-600">Frais d'import</div>
            </div>
          </Link>
          <button className="flex items-center gap-3 p-3 bg-white rounded-lg hover:shadow-md transition-shadow text-left">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <div className="font-medium text-neutral-900">Nouvelle note de frais</div>
              <div className="text-xs text-neutral-600">Ajouter un justificatif</div>
            </div>
          </button>
          <button className="flex items-center gap-3 p-3 bg-white rounded-lg hover:shadow-md transition-shadow text-left">
            <div className="w-10 h-10 rounded-lg bg-success-100 flex items-center justify-center">
              <Calculator className="w-5 h-5 text-success-600" />
            </div>
            <div>
              <div className="font-medium text-neutral-900">Calculer TAR</div>
              <div className="text-xs text-neutral-600">Produit électronique</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
