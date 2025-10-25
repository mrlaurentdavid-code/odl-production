'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import ApplicationsModal from './ApplicationsModal'
import { BackToDashboard } from '@/components/ui/BackToDashboard'
import Link from 'next/link'

interface Profile {
  id: string
  email: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  birth_date: string | null
  is_super_admin: boolean
  department: string | null
  job_title: string | null
  team: string | null
  location: string | null
  employee_type: string | null
  phone: string | null
  is_active: boolean
  created_at: string
}

interface Application {
  id: string
  name: string
  description: string | null
  url: string | null
  icon: string | null
  enabled: boolean
}

interface UserAccess {
  user_id: string
  app_id: string
  role: string
  granted_at: string
}

interface Props {
  profiles: Profile[]
  applications: Application[]
  accesses: UserAccess[]
}

const roleOptions = [
  { value: 'none', label: 'Aucun accès', color: 'text-gray-400' },
  { value: 'viewer', label: 'Viewer', color: 'text-blue-600' },
  { value: 'user', label: 'User', color: 'text-green-600' },
  { value: 'editor', label: 'Editor', color: 'text-yellow-600' },
  { value: 'admin', label: 'Admin', color: 'text-red-600' },
]

export default function AccessManagementClient({ profiles, applications, accesses }: Props) {
  const [localProfiles, setLocalProfiles] = useState(profiles)
  const [localAccesses, setLocalAccesses] = useState(accesses)
  const [loading, setLoading] = useState<string | null>(null)
  const [showAppModal, setShowAppModal] = useState(false)
  const supabase = createClientComponentClient()

  // Fonction pour obtenir le rôle d'un user dans une app
  const getUserRole = (userId: string, appId: string): string => {
    const access = localAccesses.find(a => a.user_id === userId && a.app_id === appId)
    return access?.role || 'none'
  }

  // Fonction pour toggle le statut super admin
  const toggleSuperAdmin = async (userId: string, currentStatus: boolean) => {
    setLoading(`super_${userId}`)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_super_admin: !currentStatus })
        .eq('id', userId)

      if (error) throw error

      setLocalProfiles(prev =>
        prev.map(p => p.id === userId ? { ...p, is_super_admin: !currentStatus } : p)
      )

      alert(`Statut super admin ${!currentStatus ? 'accordé' : 'révoqué'} avec succès`)
    } catch (error) {
      console.error('Error updating super admin status:', error)
      alert('Erreur lors de la mise à jour du statut')
    } finally {
      setLoading(null)
    }
  }

  // Fonction pour mettre à jour l'accès d'un user à une app
  const updateAccess = async (userId: string, appId: string, newRole: string) => {
    setLoading(`${userId}_${appId}`)
    try {
      if (newRole === 'none') {
        // Révoquer l'accès
        const { error } = await supabase
          .from('user_app_access')
          .delete()
          .eq('user_id', userId)
          .eq('app_id', appId)

        if (error) {
          console.error('Delete error details:', error)
          throw error
        }

        setLocalAccesses(prev =>
          prev.filter(a => !(a.user_id === userId && a.app_id === appId))
        )
      } else {
        // Obtenir l'ID du user actuel (qui effectue l'action)
        const { data: { user } } = await supabase.auth.getUser()

        // Accorder/mettre à jour l'accès
        const { error } = await supabase
          .from('user_app_access')
          .upsert({
            user_id: userId,
            app_id: appId,
            role: newRole,
            granted_by: user?.id,
            granted_at: new Date().toISOString(),
            revoked_at: null
          }, {
            onConflict: 'user_id,app_id'
          })

        if (error) {
          console.error('Upsert error details:', error)
          throw error
        }

        setLocalAccesses(prev => {
          const existing = prev.find(a => a.user_id === userId && a.app_id === appId)
          if (existing) {
            return prev.map(a =>
              a.user_id === userId && a.app_id === appId
                ? { ...a, role: newRole, granted_at: new Date().toISOString() }
                : a
            )
          } else {
            return [...prev, {
              user_id: userId,
              app_id: appId,
              role: newRole,
              granted_at: new Date().toISOString()
            }]
          }
        })
      }
    } catch (error) {
      console.error('Error updating access:', error)
      alert('Erreur lors de la mise à jour de l\'accès')
    } finally {
      setLoading(null)
    }
  }

  // Obtenir l'icône de l'app
  const getAppIcon = (icon: string | null) => {
    switch (icon) {
      case 'dashboard': return '📊'
      case 'receipt': return '🧾'
      case 'calculator': return '🧮'
      default: return '📱'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-3xl font-semibold text-gray-900">
              Gestion des Accès
            </h1>
            <div className="flex gap-2">
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors font-medium text-sm"
              >
                Console Admin
              </Link>
              <BackToDashboard variant="button" />
            </div>
          </div>
          <p className="text-gray-600">
            Contrôlez qui a accès à quelles applications ODL
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center gap-3">
              <div className="text-3xl">👥</div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{localProfiles.length}</div>
                <div className="text-sm text-gray-600">Utilisateurs</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center gap-3">
              <div className="text-3xl">📱</div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{applications.length}</div>
                <div className="text-sm text-gray-600">Applications</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center gap-3">
              <div className="text-3xl">👑</div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {localProfiles.filter(p => p.is_super_admin).length}
                </div>
                <div className="text-sm text-gray-600">Super Admins</div>
              </div>
            </div>
          </div>
        </div>

        {/* Gérer les accès par application */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
          <div className="max-w-2xl mx-auto">
            <div className="text-6xl mb-4">🔐</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Gérer les accès par application
            </h2>
            <p className="text-gray-600 mb-6">
              Contrôlez les permissions de chaque département et utilisateur pour toutes les applications ODL
            </p>
            <button
              onClick={() => setShowAppModal(true)}
              className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-lg"
            >
              Ouvrir la gestion des accès
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Légende des Rôles</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-300">
                Viewer
              </span>
              <p className="text-sm text-gray-600 mt-1">Lecture seule</p>
            </div>
            <div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-300">
                User
              </span>
              <p className="text-sm text-gray-600 mt-1">Utilisateur standard</p>
            </div>
            <div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-300">
                Editor
              </span>
              <p className="text-sm text-gray-600 mt-1">Peut modifier les données</p>
            </div>
            <div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-300">
                Admin
              </span>
              <p className="text-sm text-gray-600 mt-1">Administrateur de l'app</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-blue-300">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              👑 Super Admin
            </span>
            <p className="text-sm text-gray-600 mt-1">
              Accès complet à toutes les applications et possibilité de gérer les accès des autres utilisateurs
            </p>
          </div>
        </div>

        {/* Modal de gestion des applications */}
        <ApplicationsModal
          isOpen={showAppModal}
          onClose={() => setShowAppModal(false)}
          profiles={localProfiles}
          applications={applications}
          accesses={localAccesses}
          onAccessUpdate={updateAccess}
          onAccessesChange={setLocalAccesses}
        />
      </div>
    </div>
  )
}
