'use client'

import { useState, useEffect } from 'react'
import { BackToDashboard } from '@/components/ui/BackToDashboard'
import { Settings, Package, DollarSign, Plus, Edit2, Trash2, Save, X, Shield } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54331'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
const supabase = createClient(supabaseUrl, supabaseKey)

type Tab = 'rates' | 'customs'

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

interface CustomsFee {
  fee_id: string
  provider_id: string
  fee_type: string
  value: number
  description: string
  is_active: boolean
}

export default function LogisticsAdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('rates')
  const [rates, setRates] = useState<LogisticsRate[]>([])
  const [customsFees, setCustomsFees] = useState<CustomsFee[]>([])
  const [editingRate, setEditingRate] = useState<LogisticsRate | null>(null)
  const [editingFee, setEditingFee] = useState<CustomsFee | null>(null)
  const [isAddingRate, setIsAddingRate] = useState(false)
  const [isAddingFee, setIsAddingFee] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  // Load data
  useEffect(() => {
    loadRates()
    loadCustomsFees()
  }, [])

  const loadRates = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('logistics_rates')
      .select('*')
      .order('carrier', { ascending: true })
      .order('format_label', { ascending: true })

    if (!error && data) {
      setRates(data)
    }
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

  const handleSaveRate = async (rate: LogisticsRate) => {
    if (rate.rate_id && rate.rate_id !== 'new') {
      // Update existing
      const { error } = await supabase
        .from('logistics_rates')
        .update({
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
        showSaveMessage('Tarif mis à jour avec succès')
        loadRates()
        setEditingRate(null)
      }
    } else {
      // Insert new
      const { error } = await supabase
        .from('logistics_rates')
        .insert({
          provider_id: 'ohmex',
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
        showSaveMessage('Nouveau tarif ajouté avec succès')
        loadRates()
        setIsAddingRate(false)
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
        showSaveMessage('Tarif supprimé')
        loadRates()
      }
    }
  }

  const handleSaveFee = async (fee: CustomsFee) => {
    if (fee.fee_id && fee.fee_id !== 'new') {
      // Update existing
      const { error } = await supabase
        .from('customs_fees')
        .update({
          value: fee.value,
          description: fee.description,
          is_active: fee.is_active,
        })
        .eq('fee_id', fee.fee_id)

      if (!error) {
        showSaveMessage('Frais de douane mis à jour')
        loadCustomsFees()
        setEditingFee(null)
      }
    }
  }

  const showSaveMessage = (message: string) => {
    setSaveMessage(message)
    setTimeout(() => setSaveMessage(null), 3000)
  }

  const startAddingRate = () => {
    setEditingRate({
      rate_id: 'new',
      provider_id: 'ohmex',
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
    })
    setIsAddingRate(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <BackToDashboard />
          <div className="flex items-center gap-3 mt-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-neutral-900">
                Administration Logistique
              </h1>
              <p className="text-neutral-600">
                Gestion des tarifs de transport et frais de douane
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
              <Shield className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-900">Admin uniquement</span>
            </div>
          </div>
        </div>

        {/* Save Message */}
        {saveMessage && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
            ✓ {saveMessage}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="flex border-b border-neutral-200">
            <button
              onClick={() => setActiveTab('rates')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'rates'
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700'
                  : 'text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              <Package className="w-5 h-5" />
              Tarifs de Transport ({rates.length})
            </button>
            <button
              onClick={() => setActiveTab('customs')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'customs'
                  ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-700'
                  : 'text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              <DollarSign className="w-5 h-5" />
              Frais de Douane ({customsFees.length})
            </button>
          </div>

          <div className="p-6">
            {/* Rates Tab */}
            {activeTab === 'rates' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-neutral-900">
                    Tarifs de Transport
                  </h2>
                  <button
                    onClick={startAddingRate}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter un tarif
                  </button>
                </div>

                {/* Add/Edit Form */}
                {(isAddingRate || editingRate) && (
                  <RateForm
                    rate={editingRate!}
                    onSave={handleSaveRate}
                    onCancel={() => {
                      setIsAddingRate(false)
                      setEditingRate(null)
                    }}
                  />
                )}

                {/* Rates List */}
                <div className="space-y-3">
                  {rates.map((rate) => (
                    <RateCard
                      key={rate.rate_id}
                      rate={rate}
                      onEdit={() => setEditingRate(rate)}
                      onDelete={() => handleDeleteRate(rate.rate_id)}
                      isEditing={editingRate?.rate_id === rate.rate_id}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Customs Tab */}
            {activeTab === 'customs' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-neutral-900">
                    Frais de Douane (PESA)
                  </h2>
                </div>

                <div className="space-y-3">
                  {customsFees.map((fee) => (
                    <CustomsFeeCard
                      key={fee.fee_id}
                      fee={fee}
                      onEdit={() => setEditingFee(fee)}
                      onSave={handleSaveFee}
                      isEditing={editingFee?.fee_id === fee.fee_id}
                      onCancel={() => setEditingFee(null)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Rate Form Component
function RateForm({
  rate,
  onSave,
  onCancel,
}: {
  rate: LogisticsRate
  onSave: (rate: LogisticsRate) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState(rate)

  return (
    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 space-y-4">
      <h3 className="font-semibold text-blue-900">
        {rate.rate_id === 'new' ? 'Nouveau tarif' : 'Modifier le tarif'}
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Label du format
          </label>
          <input
            type="text"
            value={formData.format_label}
            onChange={(e) => setFormData({ ...formData, format_label: e.target.value })}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
            placeholder="Ex: B5 - 2 cm - Sans signature"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Transporteur
          </label>
          <select
            value={formData.carrier}
            onChange={(e) => setFormData({ ...formData, carrier: e.target.value })}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
          >
            <option value="La Poste">La Poste</option>
            <option value="Planzer">Planzer</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Mode de livraison
          </label>
          <select
            value={formData.mode}
            onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
          >
            <option value="Sans signature">Sans signature</option>
            <option value="Avec suivi">Avec suivi</option>
            <option value="Avec signature">Avec signature</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Poids max (kg) - laisser vide si illimité
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.weight_max_kg || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                weight_max_kg: e.target.value ? parseFloat(e.target.value) : null,
              })
            }
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Longueur (cm)
          </label>
          <input
            type="number"
            step="0.1"
            value={formData.length_cm}
            onChange={(e) =>
              setFormData({ ...formData, length_cm: parseFloat(e.target.value) })
            }
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Largeur (cm)
          </label>
          <input
            type="number"
            step="0.1"
            value={formData.width_cm}
            onChange={(e) =>
              setFormData({ ...formData, width_cm: parseFloat(e.target.value) })
            }
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Hauteur (cm)
          </label>
          <input
            type="number"
            step="0.1"
            value={formData.height_cm}
            onChange={(e) =>
              setFormData({ ...formData, height_cm: parseFloat(e.target.value) })
            }
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
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
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
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
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
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
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.is_default}
            onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
            className="rounded"
          />
          <span className="text-sm text-neutral-700">Format par défaut</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="rounded"
          />
          <span className="text-sm text-neutral-700">Actif</span>
        </label>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => onSave(formData)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Save className="w-4 h-4" />
          Enregistrer
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-300"
        >
          <X className="w-4 h-4" />
          Annuler
        </button>
      </div>
    </div>
  )
}

// Rate Card Component
function RateCard({
  rate,
  onEdit,
  onDelete,
  isEditing,
}: {
  rate: LogisticsRate
  onEdit: () => void
  onDelete: () => void
  isEditing: boolean
}) {
  if (isEditing) return null

  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-neutral-900">{rate.format_label}</h3>
            {rate.is_default && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                Défaut
              </span>
            )}
            {!rate.is_active && (
              <span className="px-2 py-0.5 bg-neutral-100 text-neutral-600 text-xs rounded-full">
                Inactif
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-neutral-600">
            <div>
              <strong>Transporteur:</strong> {rate.carrier}
            </div>
            <div>
              <strong>Mode:</strong> {rate.mode}
            </div>
            <div>
              <strong>Dimensions:</strong> {rate.length_cm}×{rate.width_cm}×{rate.height_cm} cm
            </div>
            <div>
              <strong>Poids max:</strong> {rate.weight_max_kg ? `${rate.weight_max_kg} kg` : 'Illimité'}
            </div>
            <div>
              <strong>Transport:</strong> CHF {rate.price_transport.toFixed(2)}
            </div>
            <div>
              <strong>Réception + Prep:</strong> CHF {(rate.price_reception + rate.price_prep).toFixed(2)}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
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

// Customs Fee Card Component
function CustomsFeeCard({
  fee,
  onEdit,
  onSave,
  isEditing,
  onCancel,
}: {
  fee: CustomsFee
  onEdit: () => void
  onSave: (fee: CustomsFee) => void
  isEditing: boolean
  onCancel: () => void
}) {
  const [formData, setFormData] = useState(fee)

  if (isEditing) {
    return (
      <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
        <h3 className="font-semibold text-purple-900 mb-3">{fee.fee_type}</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Valeur {fee.fee_type.includes('taux') ? '(%)' : '(CHF)'}
            </label>
            <input
              type="number"
              step={fee.fee_type.includes('taux') ? '0.001' : '0.01'}
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Description
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
            />
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => onSave(formData)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Save className="w-4 h-4" />
            Enregistrer
          </button>
          <button
            onClick={onCancel}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-300"
          >
            <X className="w-4 h-4" />
            Annuler
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-neutral-900 mb-1">{fee.fee_type}</h3>
          <p className="text-sm text-neutral-600 mb-2">{fee.description}</p>
          <div className="text-lg font-bold text-purple-700">
            {fee.fee_type.includes('taux')
              ? `${(fee.value * 100).toFixed(2)}%`
              : `CHF ${fee.value.toFixed(2)}`
            }
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
