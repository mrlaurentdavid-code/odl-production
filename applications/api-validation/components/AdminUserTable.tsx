'use client'

import { useState } from 'react'

interface Profile {
  id: string
  email: string
  is_super_admin: boolean
  employee_type: string | null
  is_active: boolean
  created_at: string
}

interface RoleModalData {
  userId: string
  email: string
  currentIsSuperAdmin: boolean
  currentEmployeeType: string | null
}

export default function AdminUserTable({ users }: { users: Profile[] }) {
  const [loading, setLoading] = useState(false)
  const [modalData, setModalData] = useState<RoleModalData | null>(null)
  const [newIsSuperAdmin, setNewIsSuperAdmin] = useState(false)
  const [newEmployeeType, setNewEmployeeType] = useState<string>('employee')

  const openModal = (user: Profile) => {
    setModalData({
      userId: user.id,
      email: user.email,
      currentIsSuperAdmin: user.is_super_admin,
      currentEmployeeType: user.employee_type,
    })
    setNewIsSuperAdmin(user.is_super_admin)
    setNewEmployeeType(user.employee_type || 'employee')
  }

  const closeModal = () => {
    setModalData(null)
  }

  const handleRoleUpdate = async () => {
    if (!modalData) return

    setLoading(true)

    try {
      const response = await fetch('/api/admin/toggle-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: modalData.userId,
          newIsSuperAdmin,
          newEmployeeType
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de la modification')
      }

      alert(`Le rôle de ${modalData.email} a été modifié avec succès!`)
      window.location.reload()
    } catch (err: any) {
      alert(`Erreur: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (userId: string, userEmail: string, currentIsActive: boolean) => {
    const action = currentIsActive ? 'bloquer' : 'débloquer'
    const confirmation = confirm(
      `Voulez-vous ${action} l'utilisateur ${userEmail}? ${currentIsActive ? 'Il ne pourra plus accéder à la plateforme.' : 'Il pourra à nouveau accéder à la plateforme.'}`
    )

    if (!confirmation) return

    setLoading(true)

    try {
      const response = await fetch('/api/admin/toggle-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newIsActive: !currentIsActive }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de la modification')
      }

      alert(`L'utilisateur ${userEmail} a été ${!currentIsActive ? 'débloqué' : 'bloqué'} avec succès!`)
      window.location.reload()
    } catch (err: any) {
      alert(`Erreur: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (!users || users.length === 0) {
    return (
      <div className="p-12 text-center">
        <div className="text-5xl mb-4">👥</div>
        <p className="text-apple-gray text-lg">Aucun utilisateur pour le moment</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-apple-gray-light">
          <tr>
            <th className="px-8 py-4 text-left text-sm font-semibold text-apple-gray-dark">
              Email
            </th>
            <th className="px-8 py-4 text-left text-sm font-semibold text-apple-gray-dark">
              Rôle
            </th>
            <th className="px-8 py-4 text-left text-sm font-semibold text-apple-gray-dark">
              Date de création
            </th>
            <th className="px-8 py-4 text-left text-sm font-semibold text-apple-gray-dark">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-8 py-4">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                    user.is_active ? 'bg-blue-600' : 'bg-gray-400'
                  }`}>
                    {user.email?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-900">{user.email}</span>
                    {!user.is_active && (
                      <span className="text-xs text-red-600 font-medium">Bloqué</span>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-8 py-4">
                <div className="flex flex-col gap-1">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium inline-block w-fit ${
                      user.is_super_admin
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {user.is_super_admin ? 'Super Admin' : 'Utilisateur'}
                  </span>
                  {user.employee_type && (
                    <span className="text-xs text-gray-500">
                      {user.employee_type === 'employee' ? 'Employé' :
                       user.employee_type === 'manager' ? 'Manager' :
                       user.employee_type === 'executive' ? 'Directeur' :
                       user.employee_type === 'contractor' ? 'Contractuel' : user.employee_type}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-8 py-4 text-gray-600">
                {formatDate(user.created_at)}
              </td>
              <td className="px-8 py-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => openModal(user)}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Modifier le rôle
                  </button>
                  <button
                    onClick={() => handleToggleActive(user.id, user.email, user.is_active)}
                    disabled={loading}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
                      user.is_active
                        ? 'text-red-600 hover:text-red-700 hover:bg-red-50'
                        : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                    }`}
                  >
                    {user.is_active ? 'Bloquer' : 'Débloquer'}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal de modification de rôle */}
      {modalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Modifier le rôle
            </h2>

            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Utilisateur</p>
              <p className="text-gray-900 font-medium">{modalData.email}</p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rôle administratif
                </label>
                <select
                  value={newIsSuperAdmin ? 'true' : 'false'}
                  onChange={(e) => setNewIsSuperAdmin(e.target.value === 'true')}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="false">Utilisateur normal</option>
                  <option value="true">Super Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type d'employé
                </label>
                <select
                  value={newEmployeeType}
                  onChange={(e) => setNewEmployeeType(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="employee">Employé</option>
                  <option value="manager">Manager</option>
                  <option value="executive">Directeur</option>
                  <option value="contractor">Contractuel</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeModal}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleRoleUpdate}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
              >
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
