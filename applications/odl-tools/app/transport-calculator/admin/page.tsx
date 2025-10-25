'use client'

import { useState, useEffect } from 'react'
import { BackToDashboard } from '@/components/ui/BackToDashboard'
import { Settings, Truck, Plus, Edit2, Trash2, Save, X, ArrowLeft, ChevronDown, ChevronRight, Building2 } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

// Supabase client - Force local for now
const supabaseUrl = 'http://127.0.0.1:54331'
const supabaseKey = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
const supabase = createClient(supabaseUrl, supabaseKey)

interface LogisticsRate {
  rate_id: string
  provider_id: string
  format_label: string
  carrier: string
  mode: string
  length_cm: number
  width_cm: number
  height_cm: number
  weight_max_kg: number | null
  price_transport: number
  price_reception: number
  price_prep: number
  is_default: boolean
  is_active: boolean
}

interface LogisticsProvider {
  provider_id: string
  provider_name: string
  is_active: boolean
}

export default function TransportAdminPage() {
  const [rates, setRates] = useState<LogisticsRate[]>([])
  const [providers, setProviders] = useState<LogisticsProvider[]>([])
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set())
  const [editingRate, setEditingRate] = useState<LogisticsRate | null>(null)
  const [editingProvider, setEditingProvider] = useState<LogisticsProvider | null>(null)
  const [isAddingRate, setIsAddingRate] = useState<string | null>(null)
  const [isAddingProvider, setIsAddingProvider] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    await Promise.all([loadRates(), loadProviders()])
    setLoading(false)
  }

  const loadRates = async () => {
    const { data, error } = await supabase
      .from('logistics_rates')
      .select('*')
      .order('carrier', { ascending: true })
      .order('format_label', { ascending: true })

    if (!error && data) {
      setRates(data)
    }
  }

  const loadProviders = async () => {
    const { data, error } = await supabase
      .from('logistics_providers')
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

  const handleSaveRate = async (rate: LogisticsRate) => {
    if (rate.rate_id && rate.rate_id !== 'new') {
      const { error } = await supabase
        .from('logistics_rates')
        .update({
          provider_id: rate.provider_id,
          format_label: rate.format_label,
          carrier: rate.carrier,
          mode: rate.mode,
          length_cm: rate.length_cm,
          width_cm: rate.width_cm,
          height_cm: rate.height_cm,
          weight_max_kg: rate.weight_max_kg,
          price_transport: rate.price_transport,
          price_reception: rate.price_reception,
          price_prep: rate.price_prep,
          is_default: rate.is_default,
          is_active: rate.is_active,
        })
        .eq('rate_id', rate.rate_id)

      if (!error) {
        showMessage('Tarif mis à jour avec succès')
        setEditingRate(null)
        loadRates()
      }
    } else {
      const { error } = await supabase
        .from('logistics_rates')
        .insert({
          provider_id: rate.provider_id,
          format_label: rate.format_label,
          carrier: rate.carrier,
          mode: rate.mode,
          length_cm: rate.length_cm,
          width_cm: rate.width_cm,
          height_cm: rate.height_cm,
          weight_max_kg: rate.weight_max_kg,
          price_transport: rate.price_transport,
          price_reception: rate.price_reception,
          price_prep: rate.price_prep,
          is_default: rate.is_default,
          is_active: rate.is_active,
        })

      if (!error) {
        showMessage('Nouveau tarif créé avec succès')
        setIsAddingRate(null)
        loadRates()
      }
    }
  }

  const handleDeleteRate = async (rateId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce tarif ?')) {
      const { error } = await supabase
        .from('logistics_rates')
        .delete()
        .eq('rate_id', rateId)

      if (!error) {
        showMessage('Tarif supprimé avec succès')
        loadRates()
      }
    }
  }

  const handleSaveProvider = async (provider: LogisticsProvider) => {
    if (provider.provider_id && providers.some(p => p.provider_id === provider.provider_id)) {
      const { error } = await supabase
        .from('logistics_providers')
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
        .from('logistics_providers')
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
    if (confirm('Êtes-vous sûr de vouloir supprimer ce prestataire ? Cela supprimera aussi tous ses tarifs.')) {
      const { error } = await supabase
        .from('logistics_providers')
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

  const getRatesByProvider = (providerId: string) => {
    return rates.filter(r => r.provider_id === providerId)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <BackToDashboard />
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-700 flex items-center justify-center">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-neutral-900">
                  Administration Transport
                </h1>
                <p className="text-neutral-600">Gestion des prestataires et tarifs de transport</p>
              </div>
            </div>
            <Link
              href="/transport-calculator"
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors text-sm font-medium"
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

        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-cyan-600" />
              <h2 className="text-xl font-semibold text-neutral-900">Prestataires et Tarifs</h2>
              <span className="px-2 py-1 bg-cyan-100 text-cyan-700 text-xs font-medium rounded">
                {providers.length} prestataire{providers.length > 1 ? 's' : ''}
              </span>
            </div>
            <button
              onClick={() => setIsAddingProvider(true)}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
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
                <div className="border-2 border-cyan-300 rounded-lg p-4 bg-cyan-50">
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

              {/* List providers with their rates */}
              {providers.map((provider) => {
                const providerRates = getRatesByProvider(provider.provider_id)
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
                            <Building2 className="w-5 h-5 text-cyan-600" />
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
                                {providerRates.length} tarif{providerRates.length > 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setIsAddingRate(provider.provider_id)}
                              className="flex items-center gap-2 px-3 py-1.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors text-sm"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Ajouter un tarif
                            </button>
                            <button
                              onClick={() => setEditingProvider(provider)}
                              className="p-2 text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
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

                    {/* Provider rates (collapsible) */}
                    {isExpanded && (
                      <div className="p-4 space-y-3">
                        {isAddingRate === provider.provider_id && (
                          <RateForm
                            rate={{
                              rate_id: 'new',
                              provider_id: provider.provider_id,
                              format_label: '',
                              carrier: 'La Poste',
                              mode: 'Sans signature',
                              length_cm: 0,
                              width_cm: 0,
                              height_cm: 0,
                              weight_max_kg: null,
                              price_transport: 0,
                              price_reception: 0.5,
                              price_prep: 2.5,
                              is_default: false,
                              is_active: true,
                            }}
                            onSave={handleSaveRate}
                            onCancel={() => setIsAddingRate(null)}
                            providers={providers}
                          />
                        )}

                        {providerRates.length === 0 && !isAddingRate ? (
                          <div className="text-center py-8 text-neutral-500 text-sm">
                            Aucun tarif pour ce prestataire
                          </div>
                        ) : (
                          providerRates.map((rate) =>
                            editingRate?.rate_id === rate.rate_id ? (
                              <RateForm
                                key={rate.rate_id}
                                rate={editingRate}
                                onSave={handleSaveRate}
                                onCancel={() => setEditingRate(null)}
                                providers={providers}
                              />
                            ) : (
                              <RateCard
                                key={rate.rate_id}
                                rate={rate}
                                onEdit={() => setEditingRate(rate)}
                                onDelete={() => handleDeleteRate(rate.rate_id)}
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
      </div>
    </div>
  )
}

interface ProviderFormProps {
  provider: LogisticsProvider
  onSave: (provider: LogisticsProvider) => void
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
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
            placeholder="Ex: ohmex, dhl, fedex"
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
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
            placeholder="Ex: Ohmex, DHL, FedEx"
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
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
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

interface RateCardProps {
  rate: LogisticsRate
  onEdit: () => void
  onDelete: () => void
}

function RateCard({ rate, onEdit, onDelete }: RateCardProps) {
  return (
    <div className="p-3 border border-neutral-200 rounded-lg hover:border-cyan-300 transition-colors bg-white">
      <div className="flex items-start justify-between">
        <div className="flex-1 grid grid-cols-4 gap-4">
          <div>
            <div className="text-sm font-medium text-neutral-900">{rate.format_label}</div>
            <div className="text-xs text-neutral-600">
              {rate.carrier} - {rate.mode}
            </div>
            {!rate.is_active && (
              <span className="inline-block mt-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">
                Inactif
              </span>
            )}
          </div>
          <div>
            <div className="text-xs text-neutral-500">Dimensions max (cm)</div>
            <div className="text-sm font-medium text-neutral-900">
              {rate.length_cm} × {rate.width_cm} × {rate.height_cm}
            </div>
            {rate.weight_max_kg && (
              <div className="text-xs text-neutral-600">Max: {rate.weight_max_kg} kg</div>
            )}
          </div>
          <div>
            <div className="text-xs text-neutral-500">Prix (CHF)</div>
            <div className="text-sm text-neutral-900">
              Transport: {rate.price_transport.toFixed(2)}
            </div>
            <div className="text-xs text-neutral-600">
              Réception: {rate.price_reception.toFixed(2)} | Prép: {rate.price_prep.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-xs text-neutral-500">Total base</div>
            <div className="text-lg font-semibold text-cyan-600">
              CHF {(rate.price_transport + rate.price_reception + rate.price_prep).toFixed(2)}
            </div>
          </div>
        </div>
        <div className="flex gap-2 ml-4">
          <button
            onClick={onEdit}
            className="p-2 text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

interface RateFormProps {
  rate: LogisticsRate
  onSave: (rate: LogisticsRate) => void
  onCancel: () => void
  providers: LogisticsProvider[]
}

function RateForm({ rate, onSave, onCancel, providers }: RateFormProps) {
  const [formData, setFormData] = useState(rate)

  return (
    <div className="p-4 border-2 border-cyan-300 rounded-lg bg-cyan-50">
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Prestataire
          </label>
          <select
            value={formData.provider_id}
            onChange={(e) => setFormData({ ...formData, provider_id: e.target.value })}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
          >
            {providers.map(provider => (
              <option key={provider.provider_id} value={provider.provider_id}>
                {provider.provider_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Libellé du format
          </label>
          <input
            type="text"
            value={formData.format_label}
            onChange={(e) => setFormData({ ...formData, format_label: e.target.value })}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
            placeholder="Ex: Petit national"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Transporteur</label>
            <select
              value={formData.carrier}
              onChange={(e) => setFormData({ ...formData, carrier: e.target.value })}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
            >
              <option value="La Poste">La Poste</option>
              <option value="Planzer">Planzer</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Mode</label>
            <select
              value={formData.mode}
              onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
            >
              <option value="Sans signature">Sans signature</option>
              <option value="Avec suivi">Avec suivi</option>
              <option value="Avec signature">Avec signature</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Longueur (cm)</label>
          <input
            type="number"
            step="0.1"
            value={formData.length_cm}
            onChange={(e) => setFormData({ ...formData, length_cm: parseFloat(e.target.value) })}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Largeur (cm)</label>
          <input
            type="number"
            step="0.1"
            value={formData.width_cm}
            onChange={(e) => setFormData({ ...formData, width_cm: parseFloat(e.target.value) })}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Hauteur (cm)</label>
          <input
            type="number"
            step="0.1"
            value={formData.height_cm}
            onChange={(e) => setFormData({ ...formData, height_cm: parseFloat(e.target.value) })}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Poids max (kg)</label>
          <input
            type="number"
            step="0.1"
            value={formData.weight_max_kg || ''}
            onChange={(e) =>
              setFormData({ ...formData, weight_max_kg: e.target.value ? parseFloat(e.target.value) : null })
            }
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
            placeholder="Optionnel"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Prix transport (CHF)
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.price_transport}
            onChange={(e) =>
              setFormData({ ...formData, price_transport: parseFloat(e.target.value) })
            }
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Prix réception (CHF)
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.price_reception}
            onChange={(e) =>
              setFormData({ ...formData, price_reception: parseFloat(e.target.value) })
            }
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Prix préparation (CHF)
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.price_prep}
            onChange={(e) =>
              setFormData({ ...formData, price_prep: parseFloat(e.target.value) })
            }
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded border-neutral-300"
            />
            <span className="text-sm text-neutral-700">Actif</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_default}
              onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
              className="rounded border-neutral-300"
            />
            <span className="text-sm text-neutral-700">Par défaut</span>
          </label>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onSave(formData)}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
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
