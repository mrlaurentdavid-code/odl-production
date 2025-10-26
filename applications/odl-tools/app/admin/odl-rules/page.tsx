'use client'

import { useState, useEffect } from 'react'
import { BackToDashboard } from '@/components/ui/BackToDashboard'
import { Settings, Plus, Edit, Trash2, Check, X, TestTube, Globe, Layers, Tag } from 'lucide-react'

interface OdlRule {
  id: string
  scope: 'global' | 'category' | 'subcategory'
  category_name: string | null
  subcategory_name: string | null
  rule_name: string
  description: string | null
  deal_min_eco_vs_msrp_percent: number
  deal_min_eco_vs_street_price_percent: number
  target_gross_margin_percent: number
  minimum_gross_margin_percent: number
  deal_good_margin_percent: number
  deal_good_eco_vs_msrp_percent: number
  deal_good_eco_vs_street_percent: number
  deal_top_eco_vs_msrp_percent: number
  deal_top_eco_vs_street_percent: number
  currency_safety_coefficient: number
  payment_processing_fee_percent: number
  payment_processing_fee_fixed_chf: number
  max_price_modifications_per_item: number
  price_modification_time_window_minutes: number
  priority: number
  is_active: boolean
  valid_from: string
  valid_until: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

interface Category {
  category_id: string
  name: string
  fr_display_name: string
  is_active: boolean
}

interface Subcategory {
  subcategory_id: string
  category_id: string
  name: string
  fr_display_name: string
  is_active: boolean
}

type FormMode = 'create' | 'edit' | null

export default function OdlRulesPage() {
  const [rules, setRules] = useState<OdlRule[]>([])
  const [loading, setLoading] = useState(true)
  const [formMode, setFormMode] = useState<FormMode>(null)
  const [selectedRule, setSelectedRule] = useState<OdlRule | null>(null)
  const [testMode, setTestMode] = useState(false)

  // Fetch rules
  useEffect(() => {
    fetchRules()
  }, [])

  const fetchRules = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/odl-rules')
      const data = await res.json()
      if (data.success) {
        setRules(data.rules)
      }
    } catch (error) {
      console.error('Error fetching rules:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRule = () => {
    setSelectedRule(null)
    setFormMode('create')
  }

  const handleEditRule = (rule: OdlRule) => {
    setSelectedRule(rule)
    setFormMode('edit')
  }

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette règle ?')) return

    try {
      const res = await fetch(`/api/admin/odl-rules?id=${id}`, {
        method: 'DELETE'
      })
      const data = await res.json()

      if (data.success) {
        await fetchRules()
        alert('Règle supprimée avec succès')
      } else {
        alert(data.error || 'Erreur lors de la suppression')
      }
    } catch (error) {
      console.error('Error deleting rule:', error)
      alert('Erreur lors de la suppression')
    }
  }

  const handleToggleActive = async (rule: OdlRule) => {
    try {
      const res = await fetch('/api/admin/odl-rules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: rule.id,
          is_active: !rule.is_active
        })
      })
      const data = await res.json()

      if (data.success) {
        await fetchRules()
      } else {
        alert(data.error || 'Erreur lors de la mise à jour')
      }
    } catch (error) {
      console.error('Error toggling active:', error)
      alert('Erreur lors de la mise à jour')
    }
  }

  const getScopeIcon = (scope: string) => {
    switch (scope) {
      case 'global': return <Globe className="w-4 h-4" />
      case 'category': return <Layers className="w-4 h-4" />
      case 'subcategory': return <Tag className="w-4 h-4" />
      default: return null
    }
  }

  const getScopeColor = (scope: string) => {
    switch (scope) {
      case 'global': return 'bg-blue-100 text-blue-800'
      case 'category': return 'bg-purple-100 text-purple-800'
      case 'subcategory': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <BackToDashboard />
          <div className="flex items-center justify-between mt-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Settings className="w-8 h-8 text-blue-600" />
                Gestion des Règles ODL
              </h1>
              <p className="text-gray-600 mt-2">
                Configurez les règles métier pour la validation des offres (global, catégorie, sous-catégorie)
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setTestMode(!testMode)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
              >
                <TestTube className="w-4 h-4" />
                {testMode ? 'Fermer Test' : 'Tester en Live'}
              </button>
              <button
                onClick={handleCreateRule}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Nouvelle Règle
              </button>
            </div>
          </div>
        </div>

        {/* Test Panel */}
        {testMode && (
          <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center gap-2">
              <TestTube className="w-5 h-5" />
              Test en Live
            </h3>
            <p className="text-purple-700 text-sm">
              Fonctionnalité de test en développement. Vous pourrez tester vos règles avec des données réelles avant de les appliquer.
            </p>
          </div>
        )}

        {/* Rules Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-gray-600 mt-4">Chargement des règles...</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Scope</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Nom</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Catégorie</th>
                  <th className="text-center px-6 py-4 text-sm font-semibold text-gray-700">Marge O!Deal Min</th>
                  <th className="text-center px-6 py-4 text-sm font-semibold text-gray-700">Éco MSRP</th>
                  <th className="text-center px-6 py-4 text-sm font-semibold text-gray-700">Éco Street</th>
                  <th className="text-center px-6 py-4 text-sm font-semibold text-gray-700">Statut</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${getScopeColor(rule.scope)}`}>
                        {getScopeIcon(rule.scope)}
                        {rule.scope}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{rule.rule_name}</div>
                      {rule.description && (
                        <div className="text-xs text-gray-500 mt-1">{rule.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {rule.category_name && (
                        <div className="text-sm text-gray-700">
                          {rule.category_name}
                          {rule.subcategory_name && (
                            <div className="text-xs text-gray-500 mt-1">→ {rule.subcategory_name}</div>
                          )}
                        </div>
                      )}
                      {!rule.category_name && (
                        <span className="text-xs text-gray-400 italic">Toutes</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-medium text-gray-900">{rule.minimum_gross_margin_percent}%</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-medium text-gray-900">{rule.deal_min_eco_vs_msrp_percent}%</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-medium text-gray-900">{rule.deal_min_eco_vs_street_price_percent}%</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleToggleActive(rule)}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          rule.is_active
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {rule.is_active ? 'Actif' : 'Inactif'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEditRule(rule)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {rule.scope !== 'global' && (
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {rules.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                Aucune règle configurée
              </div>
            )}
          </div>
        )}

        {/* Form Modal */}
        {formMode && (
          <RuleFormModal
            mode={formMode}
            rule={selectedRule}
            onClose={() => {
              setFormMode(null)
              setSelectedRule(null)
            }}
            onSuccess={() => {
              setFormMode(null)
              setSelectedRule(null)
              fetchRules()
            }}
          />
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Rule Form Modal Component
// ============================================================================

interface RuleFormModalProps {
  mode: 'create' | 'edit'
  rule: OdlRule | null
  onClose: () => void
  onSuccess: () => void
}

function RuleFormModal({ mode, rule, onClose, onSuccess }: RuleFormModalProps) {
  const [formData, setFormData] = useState<Partial<OdlRule>>({
    scope: rule?.scope || 'category',
    category_name: rule?.category_name || '',
    subcategory_name: rule?.subcategory_name || '',
    rule_name: rule?.rule_name || '',
    description: rule?.description || '',
    deal_min_eco_vs_msrp_percent: rule?.deal_min_eco_vs_msrp_percent || 30,
    deal_min_eco_vs_street_price_percent: rule?.deal_min_eco_vs_street_price_percent || 15,
    target_gross_margin_percent: rule?.target_gross_margin_percent || 30,
    minimum_gross_margin_percent: rule?.minimum_gross_margin_percent || 20,
    deal_good_margin_percent: rule?.deal_good_margin_percent || 25,
    deal_good_eco_vs_msrp_percent: rule?.deal_good_eco_vs_msrp_percent || 30,
    deal_good_eco_vs_street_percent: rule?.deal_good_eco_vs_street_percent || 18,
    deal_top_eco_vs_msrp_percent: rule?.deal_top_eco_vs_msrp_percent || 40,
    deal_top_eco_vs_street_percent: rule?.deal_top_eco_vs_street_percent || 25,
    currency_safety_coefficient: rule?.currency_safety_coefficient || 1.02,
    payment_processing_fee_percent: rule?.payment_processing_fee_percent || 2.9,
    payment_processing_fee_fixed_chf: rule?.payment_processing_fee_fixed_chf || 0.30,
    max_price_modifications_per_item: rule?.max_price_modifications_per_item || 3,
    price_modification_time_window_minutes: rule?.price_modification_time_window_minutes || 15,
    priority: rule?.priority || 10,
    is_active: rule?.is_active ?? true,
    notes: rule?.notes || ''
  })

  const [saving, setSaving] = useState(false)
  const [productCategories, setProductCategories] = useState<Category[]>([])
  const [serviceCategories, setServiceCategories] = useState<Category[]>([])
  const [productSubcategories, setProductSubcategories] = useState<Subcategory[]>([])
  const [serviceSubcategories, setServiceSubcategories] = useState<Subcategory[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)

  // Load categories on mount
  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    setLoadingCategories(true)
    try {
      const [prodCat, servCat, prodSub, servSub] = await Promise.all([
        fetch('/api/admin/categories/products').then(r => r.json()),
        fetch('/api/admin/categories/services').then(r => r.json()),
        fetch('/api/admin/categories/products/subcategories').then(r => r.json()),
        fetch('/api/admin/categories/services/subcategories').then(r => r.json())
      ])

      if (prodCat.success) setProductCategories(prodCat.categories)
      if (servCat.success) setServiceCategories(servCat.categories)
      if (prodSub.success) setProductSubcategories(prodSub.subcategories)
      if (servSub.success) setServiceSubcategories(servSub.subcategories)
    } catch (error) {
      console.error('Error loading categories:', error)
    } finally {
      setLoadingCategories(false)
    }
  }

  // Get all categories (products + services)
  const allCategories = [...productCategories, ...serviceCategories]

  // Get filtered subcategories based on selected category
  const getFilteredSubcategories = () => {
    if (!formData.category_name) return []

    const selectedCategory = allCategories.find(c => c.name === formData.category_name)
    if (!selectedCategory) return []

    const allSubcategories = [...productSubcategories, ...serviceSubcategories]
    return allSubcategories.filter(sub => sub.category_id === selectedCategory.category_id)
  }

  // Reset subcategory when category changes
  const handleCategoryChange = (categoryName: string) => {
    setFormData({
      ...formData,
      category_name: categoryName,
      subcategory_name: '' // Reset subcategory
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const url = '/api/admin/odl-rules'
      const method = mode === 'create' ? 'POST' : 'PATCH'
      const body = mode === 'edit' ? { id: rule?.id, ...formData } : formData

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await res.json()

      if (data.success) {
        alert(`Règle ${mode === 'create' ? 'créée' : 'modifiée'} avec succès`)
        onSuccess()
      } else {
        alert(data.error || 'Erreur lors de la sauvegarde')
      }
    } catch (error) {
      console.error('Error saving rule:', error)
      alert('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {mode === 'create' ? 'Créer une Nouvelle Règle' : 'Modifier la Règle'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Scope Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Scope *
            </label>
            <select
              value={formData.scope}
              onChange={(e) => setFormData({ ...formData, scope: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={rule?.scope === 'global'}
            >
              <option value="global">Global (Toutes les offres)</option>
              <option value="category">Catégorie</option>
              <option value="subcategory">Sous-catégorie</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              La règle globale s'applique à tous les deals. Les règles de catégorie/sous-catégorie ont priorité.
            </p>
          </div>

          {/* Category/Subcategory Dropdowns */}
          {formData.scope !== 'global' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Catégorie * <span className="text-xs font-normal text-gray-500">(Produits ou Services)</span>
                </label>
                {loadingCategories ? (
                  <div className="text-sm text-gray-500">Chargement...</div>
                ) : (
                  <select
                    value={formData.category_name || ''}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">-- Sélectionner une catégorie --</option>
                    <optgroup label="📦 Produits">
                      {productCategories.filter(c => c.is_active).map(cat => (
                        <option key={cat.category_id} value={cat.name}>
                          {cat.fr_display_name} ({cat.name})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="🎯 Services">
                      {serviceCategories.filter(c => c.is_active).map(cat => (
                        <option key={cat.category_id} value={cat.name}>
                          {cat.fr_display_name} ({cat.name})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Utilisez le nom technique (ex: electronics_and_hightech)
                </p>
              </div>

              {formData.scope === 'subcategory' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Sous-catégorie *
                  </label>
                  {loadingCategories ? (
                    <div className="text-sm text-gray-500">Chargement...</div>
                  ) : !formData.category_name ? (
                    <div className="text-sm text-gray-400 italic py-2">
                      Sélectionnez d'abord une catégorie
                    </div>
                  ) : (
                    <select
                      value={formData.subcategory_name || ''}
                      onChange={(e) => setFormData({ ...formData, subcategory_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">-- Sélectionner une sous-catégorie --</option>
                      {getFilteredSubcategories().map(sub => (
                        <option key={sub.subcategory_id} value={sub.name}>
                          {sub.fr_display_name} ({sub.name})
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Sous-catégorie de {formData.category_name || '(catégorie)'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Rule Name & Description */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nom de la règle *
              </label>
              <input
                type="text"
                value={formData.rule_name}
                onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="ex: Règles Électronique"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description
              </label>
              <input
                type="text"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Courte description de la règle"
              />
            </div>
          </div>

          {/* Margins */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-1">Marges O!Deal (%)</h3>
            <p className="text-xs text-blue-700 mb-3">Marges brutes pour O!Deal (pas pour le fournisseur)</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-blue-800 mb-1">Marge Minimum * 🔒</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.minimum_gross_margin_percent}
                  onChange={(e) => setFormData({ ...formData, minimum_gross_margin_percent: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-blue-300 rounded-lg"
                  required
                />
                <p className="text-xs text-blue-600 mt-1">Deal refusé si marge inférieure</p>
              </div>
              <div>
                <label className="block text-sm text-blue-800 mb-1">Marge Cible * 🎯</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.target_gross_margin_percent}
                  onChange={(e) => setFormData({ ...formData, target_gross_margin_percent: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-blue-300 rounded-lg"
                  required
                />
                <p className="text-xs text-blue-600 mt-1">Objectif commercial visé</p>
              </div>
            </div>
          </div>

          {/* Savings */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 mb-1">Économies Client (%)</h3>
            <p className="text-xs text-green-700 mb-3">Rabais minimum à offrir au client final</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-green-800 mb-1">Min vs MSRP * 💰</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.deal_min_eco_vs_msrp_percent}
                  onChange={(e) => setFormData({ ...formData, deal_min_eco_vs_msrp_percent: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-green-300 rounded-lg"
                  required
                />
                <p className="text-xs text-green-600 mt-1">Rabais vs prix public conseillé</p>
              </div>
              <div>
                <label className="block text-sm text-green-800 mb-1">Min vs Street * 🏪</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.deal_min_eco_vs_street_price_percent}
                  onChange={(e) => setFormData({ ...formData, deal_min_eco_vs_street_price_percent: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-green-300 rounded-lg"
                  required
                />
                <p className="text-xs text-green-600 mt-1">Rabais vs prix marché actuel</p>
              </div>
            </div>
          </div>

          {/* Deal Status Thresholds */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-300 rounded-lg p-5">
            <h3 className="font-bold text-purple-900 mb-2 text-lg">Configuration des 4 Niveaux de Deals</h3>
            <p className="text-sm text-purple-800 mb-4">
              Définissez les seuils pour classifier automatiquement les deals en 4 catégories
            </p>

            {/* Status Badges Legend */}
            <div className="bg-white rounded-lg p-4 mb-4 border border-purple-200">
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center">
                  <div className="bg-red-500 text-white px-3 py-2 rounded-lg font-semibold text-sm mb-1">
                    ❌ BAD
                  </div>
                  <p className="text-xs text-gray-600">Deal refusé</p>
                  <p className="text-xs text-gray-500 mt-1">Marge &lt; Min</p>
                </div>
                <div className="text-center">
                  <div className="bg-orange-500 text-white px-3 py-2 rounded-lg font-semibold text-sm mb-1">
                    ⚠️ ALMOST
                  </div>
                  <p className="text-xs text-gray-600">Deal limite</p>
                  <p className="text-xs text-gray-500 mt-1">Marge OK mais éco insuffisante</p>
                </div>
                <div className="text-center">
                  <div className="bg-blue-500 text-white px-3 py-2 rounded-lg font-semibold text-sm mb-1">
                    ✅ GOOD
                  </div>
                  <p className="text-xs text-gray-600">Bon deal</p>
                  <p className="text-xs text-gray-500 mt-1">Seuils configurables ci-dessous</p>
                </div>
                <div className="text-center">
                  <div className="bg-green-500 text-white px-3 py-2 rounded-lg font-semibold text-sm mb-1">
                    ⭐ TOP
                  </div>
                  <p className="text-xs text-gray-600">Excellent deal</p>
                  <p className="text-xs text-gray-500 mt-1">Seuils configurables ci-dessous</p>
                </div>
              </div>
            </div>

            {/* GOOD Deal Thresholds */}
            <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mb-3">
              <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <span className="bg-blue-500 text-white px-2 py-1 rounded text-sm">✅ GOOD</span>
                Seuils pour "Bon Deal"
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm text-blue-800 mb-1">Marge Minimum (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.deal_good_margin_percent}
                    onChange={(e) => setFormData({ ...formData, deal_good_margin_percent: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg"
                  />
                  <p className="text-xs text-blue-600 mt-1">Ex: 25%</p>
                </div>
                <div>
                  <label className="block text-sm text-blue-800 mb-1">Éco vs MSRP (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.deal_good_eco_vs_msrp_percent}
                    onChange={(e) => setFormData({ ...formData, deal_good_eco_vs_msrp_percent: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg"
                  />
                  <p className="text-xs text-blue-600 mt-1">Ex: 30%</p>
                </div>
                <div>
                  <label className="block text-sm text-blue-800 mb-1">Éco vs Street (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.deal_good_eco_vs_street_percent}
                    onChange={(e) => setFormData({ ...formData, deal_good_eco_vs_street_percent: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg"
                  />
                  <p className="text-xs text-blue-600 mt-1">Ex: 18%</p>
                </div>
              </div>
              <p className="text-xs text-blue-700 mt-2 italic">
                Un deal est GOOD si marge ≥ seuil ET (éco MSRP ≥ seuil OU éco Street ≥ seuil)
              </p>
            </div>

            {/* TOP Deal Thresholds */}
            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                <span className="bg-green-500 text-white px-2 py-1 rounded text-sm">⭐ TOP</span>
                Seuils pour "Excellent Deal"
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm text-green-800 mb-1">Marge Minimum (%)</label>
                  <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600">
                    {formData.target_gross_margin_percent}% (Marge Cible)
                  </div>
                  <p className="text-xs text-green-600 mt-1">Utilise la Marge Cible</p>
                </div>
                <div>
                  <label className="block text-sm text-green-800 mb-1">Éco vs MSRP (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.deal_top_eco_vs_msrp_percent}
                    onChange={(e) => setFormData({ ...formData, deal_top_eco_vs_msrp_percent: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-green-300 rounded-lg"
                  />
                  <p className="text-xs text-green-600 mt-1">Ex: 40%</p>
                </div>
                <div>
                  <label className="block text-sm text-green-800 mb-1">Éco vs Street (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.deal_top_eco_vs_street_percent}
                    onChange={(e) => setFormData({ ...formData, deal_top_eco_vs_street_percent: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-green-300 rounded-lg"
                  />
                  <p className="text-xs text-green-600 mt-1">Ex: 25%</p>
                </div>
              </div>
              <p className="text-xs text-green-700 mt-2 italic">
                Un deal est TOP si marge ≥ Marge Cible ET (éco MSRP ≥ seuil OU éco Street ≥ seuil)
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 mt-4">
              <p className="text-xs text-yellow-800">
                <strong>Note:</strong> Les statuts BAD et ALMOST sont automatiquement calculés en fonction des seuils minimum (Marge Min et Éco Min définis ci-dessus).
              </p>
            </div>
          </div>

          {/* Advanced Settings */}
          <details className="border border-gray-200 rounded-lg">
            <summary className="px-4 py-3 cursor-pointer font-semibold text-gray-700 hover:bg-gray-50">
              Paramètres Avancés
            </summary>
            <div className="p-4 space-y-4 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Coefficient de sécurité devise</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.currency_safety_coefficient}
                    onChange={(e) => setFormData({ ...formData, currency_safety_coefficient: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">Pour compenser la volatilité (ex: 1.02 = +2%)</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Frais paiement (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.payment_processing_fee_percent}
                    onChange={(e) => setFormData({ ...formData, payment_processing_fee_percent: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">Commission processeur de paiement</p>
                </div>
              </div>
            </div>
          </details>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Notes internes
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Notes optionnelles sur cette règle..."
            />
          </div>

          {/* Active */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
              Règle active
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              disabled={saving}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Sauvegarde...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {mode === 'create' ? 'Créer' : 'Enregistrer'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
