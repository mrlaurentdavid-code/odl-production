'use client'

import { useState, useEffect } from 'react'
import { BackToDashboard } from '@/components/ui/BackToDashboard'
import { Settings, Globe, Edit2, Save, X, ArrowLeft, ChevronDown, ChevronRight, Building2, Plus, Trash2 } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

// Supabase client - Force local for now
const supabaseUrl = 'http://127.0.0.1:54331'
const supabaseKey = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
const supabase = createClient(supabaseUrl, supabaseKey)

interface CustomsFee {
  fee_id: string
  provider_id: string
  fee_type: string
  value: number
  description: string
  is_active: boolean
}

interface CustomsProvider {
  provider_id: string
  provider_name: string
  is_active: boolean
}

export default function CustomsAdminPage() {
  const [customsFees, setCustomsFees] = useState<CustomsFee[]>([])
  const [providers, setProviders] = useState<CustomsProvider[]>([])
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set())
  const [editingFee, setEditingFee] = useState<CustomsFee | null>(null)
  const [editingProvider, setEditingProvider] = useState<CustomsProvider | null>(null)
  const [isAddingProvider, setIsAddingProvider] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    await Promise.all([loadCustomsFees(), loadProviders()])
    setLoading(false)
  }

  const loadCustomsFees = async () => {
    const { data, error } = await supabase
      .from('customs_fees')
      .select('*')
      .order('fee_type', { ascending: true })

    if (!error && data) {
      setCustomsFees(data)
    }
  }

  const loadProviders = async () => {
    const { data, error } = await supabase
      .from('customs_providers')
      .select('*')
      .order('provider_name', { ascending: true })

    if (!error && data) {
      setProviders(data)
      // Expand all providers by default
      setExpandedProviders(new Set(data.map(p => p.provider_id)))
    }
  }

  const toggleProvider = (providerId: string) => {
    const newExpanded = new Set(expandedProviders)
    if (newExpanded.has(providerId)) {
      newExpanded.delete(providerId)
    } else {
      newExpanded.add(providerId)
    }
    setExpandedProviders(newExpanded)
  }

  const handleSaveFee = async (fee: CustomsFee) => {
    const { error } = await supabase
      .from('customs_fees')
      .update({
        value: fee.value,
        description: fee.description,
        is_active: fee.is_active,
      })
      .eq('fee_id', fee.fee_id)

    if (!error) {
      showMessage('Frais de douane mis à jour avec succès')
      setEditingFee(null)
      loadCustomsFees()
    }
  }

  const handleSaveProvider = async (provider: CustomsProvider) => {
    if (provider.provider_id && providers.some(p => p.provider_id === provider.provider_id)) {
      const { error } = await supabase
        .from('customs_providers')
        .update({
          provider_name: provider.provider_name,
          is_active: provider.is_active,
        })
        .eq('provider_id', provider.provider_id)

      if (!error) {
        showMessage('Prestataire mis à jour avec succès')
        setEditingProvider(null)
        loadProviders()
      }
    } else {
      const { error } = await supabase
        .from('customs_providers')
        .insert({
          provider_id: provider.provider_id,
          provider_name: provider.provider_name,
          is_active: provider.is_active,
        })

      if (!error) {
        showMessage('Nouveau prestataire créé avec succès')
        setIsAddingProvider(false)
        loadProviders()
      }
    }
  }

  const handleDeleteProvider = async (providerId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce prestataire ? Cela supprimera aussi tous ses frais.')) {
      const { error } = await supabase
        .from('customs_providers')
        .delete()
        .eq('provider_id', providerId)

      if (!error) {
        showMessage('Prestataire supprimé avec succès')
        loadData()
      }
    }
  }

  const showMessage = (message: string) => {
    setSaveMessage(message)
    setTimeout(() => setSaveMessage(null), 3000)
  }

  const getFeesByProvider = (providerId: string) => {
    return customsFees.filter(f => f.provider_id === providerId)
  }

  const getFeeTypeLabel = (feeType: string) => {
    const labels: Record<string, string> = {
      admin_base: 'Frais administratifs de base',
      gestion_droits_taux: 'Gestion droits de douane (taux %)',
      gestion_droits_min: 'Gestion droits de douane (minimum)',
      gestion_tva_taux: "Gestion TVA d'import (taux %)",
      gestion_tva_min: "Gestion TVA d'import (minimum)",
    }
    return labels[feeType] || feeType
  }

  const formatValue = (feeType: string, value: number) => {
    if (feeType.includes('taux')) {
      return `${(value * 100).toFixed(2)}%`
    }
    return `CHF ${value.toFixed(2)}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <BackToDashboard />
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-neutral-900">
                  Administration Douane
                </h1>
                <p className="text-neutral-600">Gestion des prestataires et frais de douane</p>
              </div>
            </div>
            <Link
              href="/customs-calculator"
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour au calculateur
            </Link>
          </div>
        </div>

        {saveMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-900">
            {saveMessage}
          </div>
        )}

        <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <h3 className="font-semibold text-purple-900 mb-2">ℹ️ Configuration douanière</h3>
          <ul className="text-sm text-purple-800 space-y-1">
            <li>• Toujours 1 position douanière par calcul</li>
            <li>• Les frais de douane sont divisés par la quantité de produits</li>
            <li>• Les minimums s'appliquent après calcul du pourcentage</li>
          </ul>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-600" />
              <h2 className="text-xl font-semibold text-neutral-900">Prestataires et Frais</h2>
              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                {providers.length} prestataire{providers.length > 1 ? 's' : ''}
              </span>
            </div>
            <button
              onClick={() => setIsAddingProvider(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nouveau prestataire
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-neutral-600">Chargement...</div>
          ) : (
            <div className="space-y-4">
              {/* Add new provider form */}
              {isAddingProvider && (
                <div className="border-2 border-purple-300 rounded-lg p-4 bg-purple-50">
                  <ProviderForm
                    provider={{
                      provider_id: '',
                      provider_name: '',
                      is_active: true,
                    }}
                    onSave={handleSaveProvider}
                    onCancel={() => setIsAddingProvider(false)}
                  />
                </div>
              )}

              {/* List providers with their fees */}
              {providers.map((provider) => {
                const providerFees = getFeesByProvider(provider.provider_id)
                const isExpanded = expandedProviders.has(provider.provider_id)
                const isEditing = editingProvider?.provider_id === provider.provider_id

                return (
                  <div key={provider.provider_id} className="border border-neutral-200 rounded-lg overflow-hidden">
                    {/* Provider header */}
                    <div className="bg-neutral-50 p-4">
                      {isEditing ? (
                        <ProviderForm
                          provider={editingProvider}
                          onSave={handleSaveProvider}
                          onCancel={() => setEditingProvider(null)}
                        />
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => toggleProvider(provider.provider_id)}
                              className="p-1 hover:bg-neutral-200 rounded transition-colors"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-5 h-5 text-neutral-600" />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-neutral-600" />
                              )}
                            </button>
                            <Building2 className="w-5 h-5 text-purple-600" />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-semibold text-neutral-900">
                                  {provider.provider_name}
                                </span>
                                {!provider.is_active && (
                                  <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">
                                    Inactif
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-neutral-600">
                                {providerFees.length} frais configuré{providerFees.length > 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setEditingProvider(provider)}
                              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProvider(provider.provider_id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Provider fees (collapsible) */}
                    {isExpanded && (
                      <div className="p-4 space-y-3">
                        {providerFees.length === 0 ? (
                          <div className="text-center py-8 text-neutral-500 text-sm">
                            Aucun frais pour ce prestataire
                          </div>
                        ) : (
                          providerFees.map((fee) =>
                            editingFee?.fee_id === fee.fee_id ? (
                              <FeeForm
                                key={fee.fee_id}
                                fee={editingFee}
                                onSave={handleSaveFee}
                                onCancel={() => setEditingFee(null)}
                                getFeeTypeLabel={getFeeTypeLabel}
                              />
                            ) : (
                              <FeeCard
                                key={fee.fee_id}
                                fee={fee}
                                onEdit={() => setEditingFee(fee)}
                                getFeeTypeLabel={getFeeTypeLabel}
                                formatValue={formatValue}
                              />
                            )
                          )
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="mt-6 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6">
          <h3 className="font-semibold text-amber-900 mb-3">💡 Comment ça marche ?</h3>
          <div className="space-y-2 text-sm text-amber-800">
            <p>
              <strong>1. Frais administratifs de base:</strong> Coût fixe (ex: CHF 80 pour PESA)
            </p>
            <p>
              <strong>2. Gestion droits de douane:</strong> Pourcentage de la valeur marchandise (ex: 3.5%) avec un minimum
            </p>
            <p>
              <strong>3. Gestion TVA d'import:</strong> Pourcentage de la valeur marchandise (ex: 2.5%) avec un minimum
            </p>
            <p className="pt-2 border-t border-amber-200">
              <strong>Exemple:</strong> Pour 10 produits d'une valeur totale de CHF 1000, les frais de douane
              totaux sont divisés par 10 pour obtenir le coût par produit.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

interface ProviderFormProps {
  provider: CustomsProvider
  onSave: (provider: CustomsProvider) => void
  onCancel: () => void
}

function ProviderForm({ provider, onSave, onCancel }: ProviderFormProps) {
  const [formData, setFormData] = useState(provider)
  const isNew = !provider.provider_id

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            ID du prestataire
          </label>
          <input
            type="text"
            value={formData.provider_id}
            onChange={(e) => setFormData({ ...formData, provider_id: e.target.value })}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            placeholder="Ex: pesa, dhl, fedex"
            disabled={!isNew}
          />
          <p className="text-xs text-neutral-500 mt-1">
            {isNew ? 'Identifiant unique (minuscules, sans espaces)' : 'L\'ID ne peut pas être modifié'}
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Nom du prestataire
          </label>
          <input
            type="text"
            value={formData.provider_name}
            onChange={(e) => setFormData({ ...formData, provider_name: e.target.value })}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            placeholder="Ex: PESA, DHL, FedEx"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="rounded border-neutral-300"
          />
          <span className="text-sm text-neutral-700">Actif</span>
        </label>

        <div className="flex gap-2">
          <button
            onClick={() => onSave(formData)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            disabled={!formData.provider_id || !formData.provider_name}
          >
            <Save className="w-4 h-4" />
            Enregistrer
          </button>
          <button
            onClick={onCancel}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-300 transition-colors"
          >
            <X className="w-4 h-4" />
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}

interface FeeCardProps {
  fee: CustomsFee
  onEdit: () => void
  getFeeTypeLabel: (feeType: string) => string
  formatValue: (feeType: string, value: number) => string
}

function FeeCard({ fee, onEdit, getFeeTypeLabel, formatValue }: FeeCardProps) {
  return (
    <div className="p-3 border border-neutral-200 rounded-lg hover:border-purple-300 transition-colors bg-white">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="text-sm font-medium text-neutral-900">
              {getFeeTypeLabel(fee.fee_type)}
            </div>
            {!fee.is_active && (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">
                Inactif
              </span>
            )}
          </div>
          <div className="text-xs text-neutral-600 mb-2">{fee.description}</div>
          <div className="text-lg font-semibold text-purple-600">
            {formatValue(fee.fee_type, fee.value)}
          </div>
        </div>
        <button
          onClick={onEdit}
          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

interface FeeFormProps {
  fee: CustomsFee
  onSave: (fee: CustomsFee) => void
  onCancel: () => void
  getFeeTypeLabel: (feeType: string) => string
}

function FeeForm({ fee, onSave, onCancel, getFeeTypeLabel }: FeeFormProps) {
  const [formData, setFormData] = useState(fee)

  const isPercentage = fee.fee_type.includes('taux')
  const displayValue = isPercentage ? formData.value * 100 : formData.value

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = parseFloat(e.target.value)
    const actualValue = isPercentage ? inputValue / 100 : inputValue
    setFormData({ ...formData, value: actualValue })
  }

  return (
    <div className="p-4 border-2 border-purple-300 rounded-lg bg-purple-50">
      <div className="mb-4">
        <div className="text-sm font-medium text-neutral-900 mb-2">
          {getFeeTypeLabel(fee.fee_type)}
        </div>
        <div className="text-xs text-neutral-600 mb-3">{fee.description}</div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Valeur {isPercentage ? '(%)' : '(CHF)'}
            </label>
            <input
              type="number"
              step={isPercentage ? '0.01' : '0.01'}
              value={displayValue}
              onChange={handleValueChange}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded border-neutral-300"
              />
              <span className="text-sm text-neutral-700">Actif</span>
            </label>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onSave(formData)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Save className="w-4 h-4" />
          Enregistrer
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-300 transition-colors"
        >
          <X className="w-4 h-4" />
          Annuler
        </button>
      </div>
    </div>
  )
}
