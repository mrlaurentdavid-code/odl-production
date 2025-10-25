'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminUserTable from '@/components/AdminUserTable'
import InviteUserModal from '@/components/InviteUserModal'
import { BackToDashboard } from '@/components/ui/BackToDashboard'

interface Profile {
  id: string
  email: string
  is_super_admin: boolean
  employee_type: string | null
  is_active: boolean
  created_at: string
}

export default function AdminPageClient({ users, pendingProfilesCount }: { users: Profile[], pendingProfilesCount: number }) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const router = useRouter()

  return (
    <>
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-3xl font-semibold text-gray-900">
                Console Admin
              </h1>
              <BackToDashboard variant="button" />
            </div>
            <p className="text-gray-600">
              Gérez les utilisateurs et leurs permissions
            </p>
          </div>

        {/* Pending Profile Notifications */}
        {pendingProfilesCount > 0 && (
          <div className="mb-8 bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-4">
                <div className="text-3xl">⏳</div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-amber-900 text-lg">
                      Profils en attente de validation
                    </h3>
                    <span className="px-3 py-1 bg-amber-500 text-white rounded-full text-sm font-bold">
                      {pendingProfilesCount}
                    </span>
                  </div>
                  <p className="text-sm text-amber-700">
                    {pendingProfilesCount} {pendingProfilesCount > 1 ? 'nouveaux utilisateurs ont' : 'nouvel utilisateur a'} complété leur onboarding et {pendingProfilesCount > 1 ? 'attendent' : 'attend'} votre validation.
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push('/admin/profile-validation')}
                className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium whitespace-nowrap"
              >
                Valider les profils
              </button>
            </div>
          </div>
        )}

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Utilisateurs
                </h2>
                <p className="text-gray-600 text-sm mt-1">
                  {users?.length || 0} utilisateur{users && users.length > 1 ? 's' : ''} enregistré{users && users.length > 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Inviter un utilisateur
              </button>
            </div>

            <AdminUserTable users={users || []} />
          </div>

          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
            <div className="flex gap-3">
              <div className="text-2xl">ℹ️</div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  À propos des invitations
                </h3>
                <p className="text-sm text-gray-600">
                  Seuls les administrateurs peuvent inviter de nouveaux utilisateurs.
                  Les utilisateurs invités recevront un lien pour créer leur mot de passe
                  et accéder à la plateforme.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <InviteUserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}
