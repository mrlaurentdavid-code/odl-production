'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

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
  isOpen: boolean
  onClose: () => void
  profiles: Profile[]
  applications: Application[]
  accesses: UserAccess[]
  onAccessUpdate: (userId: string, appId: string, newRole: string) => Promise<void>
  onAccessesChange: (accesses: UserAccess[]) => void
}

export default function ApplicationsModal({ isOpen, onClose, profiles, applications, accesses, onAccessUpdate, onAccessesChange }: Props) {
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({})
  const [selectedApp, setSelectedApp] = useState<string | null>(applications[0]?.id || null)
  const [localAccesses, setLocalAccesses] = useState(accesses)

  // Synchroniser avec les props quand elles changent
  useEffect(() => {
    setLocalAccesses(accesses)
  }, [accesses])

  if (!isOpen) return null

  // Grouper les utilisateurs par département
  const profilesByDepartment = profiles.reduce((acc, profile) => {
    const dept = profile.department || 'Sans département'
    if (!acc[dept]) acc[dept] = []
    acc[dept].push(profile)
    return acc
  }, {} as Record<string, Profile[]>)

  // Obtenir le rôle d'un utilisateur pour l'application sélectionnée
  const getUserRole = (userId: string, appId: string): string => {
    const access = localAccesses.find(a => a.user_id === userId && a.app_id === appId)
    return access?.role || 'none'
  }

  // Vérifier si tous les membres d'un département ont accès
  const getDepartmentAccessStatus = (dept: string, appId: string): 'all' | 'some' | 'none' => {
    const deptProfiles = profilesByDepartment[dept] || []
    const activeProfiles = deptProfiles.filter(p => !p.is_super_admin) // Exclure les super admins

    if (activeProfiles.length === 0) return 'none'

    const withAccess = activeProfiles.filter(p => getUserRole(p.id, appId) !== 'none')

    if (withAccess.length === 0) return 'none'
    if (withAccess.length === activeProfiles.length) return 'all'
    return 'some'
  }

  // Toggle l'accès pour tout un département
  const toggleDepartmentAccess = async (dept: string, appId: string, selectedRole?: string) => {
    const deptProfiles = profilesByDepartment[dept] || []
    const activeProfiles = deptProfiles.filter(p => !p.is_super_admin)
    const status = getDepartmentAccessStatus(dept, appId)

    // Si un rôle est fourni, l'utiliser, sinon basculer entre 'none' et 'user'
    const newRole = selectedRole || (status === 'all' ? 'none' : 'user')

    for (const profile of activeProfiles) {
      await onAccessUpdate(profile.id, appId, newRole)
    }
  }

  const toggleDepartment = (dept: string) => {
    setExpandedDepts(prev => ({ ...prev, [dept]: !prev[dept] }))
  }

  const getAppIcon = (icon: string | null) => {
    switch (icon) {
      case 'dashboard': return '📊'
      case 'receipt': return '🧾'
      case 'calculator': return '🧮'
      default: return '📱'
    }
  }

  const selectedApplication = applications.find(a => a.id === selectedApp)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full sm:max-w-6xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-3xl font-semibold text-gray-900">Gestion des Applications</h2>
            <p className="text-sm sm:text-base text-gray-600 mt-1 hidden sm:block">Gérez les accès par fonction et par utilisateur</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Sélecteur d'application (mobile) */}
        <div className="sm:hidden border-b border-gray-200 p-4">
          <label className="text-sm font-semibold text-gray-700 mb-2 block">Application</label>
          <select
            value={selectedApp || ''}
            onChange={(e) => setSelectedApp(e.target.value)}
            className="w-full p-3 rounded-lg border border-gray-300 bg-white"
          >
            {applications.map(app => (
              <option key={app.id} value={app.id}>
                {app.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - Liste des applications (desktop only) */}
          <div className="hidden sm:block w-64 border-r border-gray-200 overflow-y-auto bg-gray-50">
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Applications</h3>
              {applications.map(app => (
                <button
                  key={app.id}
                  onClick={() => setSelectedApp(app.id)}
                  className={`w-full text-left p-3 rounded-lg mb-2 transition-colors ${
                    selectedApp === app.id
                      ? 'bg-blue-100 border-blue-300 border-2'
                      : 'bg-white border border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getAppIcon(app.icon)}</span>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{app.name}</div>
                      <div className="text-xs text-gray-500 line-clamp-1">{app.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Contenu principal - Vue par département */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-6">
            {selectedApplication && (
              <div>
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <span className="text-3xl">{getAppIcon(selectedApplication.icon)}</span>
                    {selectedApplication.name}
                  </h3>
                  <p className="text-gray-600 mt-1">{selectedApplication.description}</p>
                </div>

                {/* Toggle "Tous" pour l'application */}
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">Tous les départements</div>
                      <div className="text-sm text-gray-600">Activer/désactiver l'accès pour tous</div>
                    </div>
                    <button
                      onClick={async () => {
                        const allDepts = Object.keys(profilesByDepartment).filter(dept => dept !== 'TOP MANAGEMENT')
                        const allHaveAccess = allDepts.every(dept => getDepartmentAccessStatus(dept, selectedApp!) === 'all')
                        const newRole = allHaveAccess ? 'none' : 'user'

                        for (const dept of allDepts) {
                          const deptProfiles = profilesByDepartment[dept] || []
                          const activeProfiles = deptProfiles.filter(p => !p.is_super_admin)
                          for (const profile of activeProfiles) {
                            await onAccessUpdate(profile.id, selectedApp!, newRole)
                          }
                        }
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        Object.keys(profilesByDepartment).filter(dept => dept !== 'TOP MANAGEMENT').every(dept => getDepartmentAccessStatus(dept, selectedApp!) === 'all')
                          ? 'bg-green-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          Object.keys(profilesByDepartment).filter(dept => dept !== 'TOP MANAGEMENT').every(dept => getDepartmentAccessStatus(dept, selectedApp!) === 'all')
                            ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Liste des départements */}
                <div className="space-y-3">
                  {Object.entries(profilesByDepartment)
                    .filter(([dept]) => dept !== 'TOP MANAGEMENT') // Masquer TOP MANAGEMENT
                    .map(([dept, deptProfiles]) => {
                    const isExpanded = expandedDepts[dept]
                    const accessStatus = getDepartmentAccessStatus(dept, selectedApp!)
                    const activeCount = deptProfiles.filter(p => !p.is_super_admin).length
                    const accessCount = deptProfiles.filter(p => !p.is_super_admin && getUserRole(p.id, selectedApp!) !== 'none').length

                    return (
                      <div key={dept} className="border border-gray-200 rounded-lg overflow-hidden">
                        {/* En-tête du département */}
                        <div className="bg-gray-50 p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <button
                              onClick={() => toggleDepartment(dept)}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              <svg
                                className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{dept}</div>
                              <div className="text-sm text-gray-500">
                                {accessCount} / {activeCount} {activeCount > 1 ? 'utilisateurs' : 'utilisateur'} avec accès
                              </div>
                            </div>
                          </div>

                          {/* Dropdown département */}
                          <select
                            value={accessStatus === 'all' ? 'user' : accessStatus === 'some' ? 'mixed' : 'none'}
                            onChange={(e) => {
                              const newRole = e.target.value
                              if (newRole !== 'mixed') {
                                toggleDepartmentAccess(dept, selectedApp!, newRole)
                              }
                            }}
                            className={`px-3 py-1.5 rounded-lg border text-sm font-medium ${
                              accessStatus === 'none' ? 'border-gray-300 text-gray-500' :
                              accessStatus === 'some' ? 'border-yellow-300 bg-yellow-50 text-yellow-700' :
                              'border-green-300 bg-green-50 text-green-700'
                            }`}
                          >
                            <option value="none">Aucun accès</option>
                            <option value="mixed" disabled={accessStatus !== 'some'}>Mixte</option>
                            <option value="viewer">Viewer</option>
                            <option value="user">User</option>
                            <option value="editor">Editor</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>

                        {/* Liste des utilisateurs (dépliable) */}
                        {isExpanded && (
                          <div className="divide-y divide-gray-100">
                            {deptProfiles.map(profile => {
                              const currentRole = getUserRole(profile.id, selectedApp!)
                              const hasAccess = currentRole !== 'none'

                              return (
                                <div key={profile.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <div className="font-medium text-gray-900">
                                        {profile.first_name && profile.last_name
                                          ? `${profile.first_name} ${profile.last_name}`
                                          : profile.full_name || profile.email.split('@')[0]
                                        }
                                      </div>
                                      {profile.is_super_admin && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                          👑 Super Admin
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-sm text-gray-500">{profile.email}</div>
                                    {profile.job_title && (
                                      <div className="text-xs text-gray-400 mt-0.5">{profile.job_title}</div>
                                    )}
                                  </div>

                                  {profile.is_super_admin ? (
                                    <span className="text-xs text-purple-600 font-medium">Accès complet</span>
                                  ) : (
                                    <select
                                      value={currentRole}
                                      onChange={(e) => onAccessUpdate(profile.id, selectedApp!, e.target.value)}
                                      className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                                        currentRole === 'none' ? 'border-gray-300 text-gray-500' :
                                        currentRole === 'viewer' ? 'border-blue-300 bg-blue-50 text-blue-700' :
                                        currentRole === 'user' ? 'border-green-300 bg-green-50 text-green-700' :
                                        currentRole === 'editor' ? 'border-yellow-300 bg-yellow-50 text-yellow-700' :
                                        'border-red-300 bg-red-50 text-red-700'
                                      }`}
                                    >
                                      <option value="none">Aucun accès</option>
                                      <option value="viewer">Viewer</option>
                                      <option value="user">User</option>
                                      <option value="editor">Editor</option>
                                      <option value="admin">Admin</option>
                                    </select>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
