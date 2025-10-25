'use client'

import { useState } from 'react'
import { BackToDashboard } from '@/components/ui/BackToDashboard'
import { Calculator, Package, Truck, Globe, DollarSign, Info, CheckCircle2, AlertCircle, Settings } from 'lucide-react'

interface CalculationResult {
  success: boolean
  rate?: {
    format_label: string
    carrier: string
    mode: string
    dimensions_cm: {
      length: number
      width: number
      height: number
    }
    weight_max_kg: number | null
  }
  costs?: {
    transport: {
      price_transport: number
      price_reception: number
      price_prep: number
      subtotal: number
    }
    customs: {
      admin_base: number
      positions_supp: number
      gestion_droits: number
      gestion_tva: number
      subtotal: number
      per_unit: number
      quantity: number
    }
    margin_security: number
    total_ht: number
    tva_rate: number
    tva_amount: number
    total_ttc: number
  }
  error?: string
}

export default function LogisticsCalculatorPage() {
  // Form state
  const [lengthCm, setLengthCm] = useState('25')
  const [widthCm, setWidthCm] = useState('18')
  const [heightCm, setHeightCm] = useState('2')
  const [weightKg, setWeightKg] = useState('0.3')
  const [carrier, setCarrier] = useState<string>('')
  const [mode, setMode] = useState<string>('')
  const [isImported, setIsImported] = useState(false)
  const [quantity, setQuantity] = useState('1')
  const [merchandiseValue, setMerchandiseValue] = useState('0')

  // Result state
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CalculationResult | null>(null)

  const handleCalculate = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/calculate-logistics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          length_cm: parseFloat(lengthCm),
          width_cm: parseFloat(widthCm),
          height_cm: parseFloat(heightCm),
          weight_kg: parseFloat(weightKg),
          carrier: carrier || null,
          mode: mode || null,
          is_imported: isImported,
          quantity: parseInt(quantity),
          merchandise_value: parseFloat(merchandiseValue),
        }),
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        error: 'Erreur lors de la connexion à l\'API',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <BackToDashboard />
          <div className="flex items-center gap-3 mt-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-neutral-900">
                Calculateur Logistique
              </h1>
              <p className="text-neutral-600">
                Calcul automatique des coûts de transport et douane
              </p>
            </div>
            <a
              href="/logistics-calculator/admin"
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
            >
              <Settings className="w-4 h-4" />
              Administration
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Form */}
          <div className="bg-white rounded-xl border border-neutral-200 p-6 space-y-6">
            {/* Package Dimensions */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-neutral-900">
                  Dimensions du colis
                </h2>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Longueur (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={lengthCm}
                    onChange={(e) => setLengthCm(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Largeur (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={widthCm}
                    onChange={(e) => setWidthCm(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Hauteur (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Poids (kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Transport Options */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Truck className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-semibold text-neutral-900">
                  Options de transport
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Transporteur (optionnel)
                  </label>
                  <select
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Auto (meilleur format)</option>
                    <option value="La Poste">La Poste</option>
                    <option value="Planzer">Planzer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Mode de livraison (optionnel)
                  </label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Auto (défaut)</option>
                    <option value="Sans signature">Sans signature</option>
                    <option value="Avec suivi">Avec suivi</option>
                    <option value="Avec signature">Avec signature</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Customs Options */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-semibold text-neutral-900">
                  Douane (Import)
                </h2>
              </div>

              <div className="space-y-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isImported}
                    onChange={(e) => setIsImported(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-neutral-700">
                    Produit importé (frais de douane)
                  </span>
                </label>

                {isImported && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Quantité de produits
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-xs text-neutral-500 mt-1">
                        Les frais de douane seront divisés par la quantité
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Valeur totale de la marchandise (CHF)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={merchandiseValue}
                        onChange={(e) => setMerchandiseValue(e.target.value)}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-xs text-neutral-500 mt-1">
                        Valeur totale pour tous les produits
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Calculate Button */}
            <button
              onClick={handleCalculate}
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Calcul en cours...
                </>
              ) : (
                <>
                  <Calculator className="w-5 h-5" />
                  Calculer les coûts
                </>
              )}
            </button>
          </div>

          {/* Right Panel - Results */}
          <div className="bg-white rounded-xl border border-neutral-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-semibold text-neutral-900">
                Résultats du calcul
              </h2>
            </div>

            {!result && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
                  <Info className="w-8 h-8 text-neutral-400" />
                </div>
                <p className="text-neutral-600">
                  Remplissez le formulaire et cliquez sur "Calculer"
                </p>
              </div>
            )}

            {result && !result.success && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-red-900 mb-1">Erreur</h3>
                  <p className="text-sm text-red-700">{result.error}</p>
                </div>
              </div>
            )}

            {result && result.success && result.costs && (
              <div className="space-y-6">
                {/* Success Badge */}
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-900">
                    Calcul effectué avec succès
                  </span>
                </div>

                {/* Selected Format */}
                {result.rate && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-2">Format sélectionné</h3>
                    <div className="text-sm text-blue-800 space-y-1">
                      <p><strong>{result.rate.format_label}</strong></p>
                      <p>{result.rate.carrier} - {result.rate.mode}</p>
                      <p className="text-xs text-blue-600">
                        Max: {result.rate.dimensions_cm.length}×{result.rate.dimensions_cm.width}×{result.rate.dimensions_cm.height} cm
                        {result.rate.weight_max_kg && ` • ${result.rate.weight_max_kg} kg`}
                      </p>
                    </div>
                  </div>
                )}

                {/* Cost Breakdown */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-neutral-900">Détail des coûts</h3>

                  {/* Transport */}
                  <div className="p-3 bg-neutral-50 rounded-lg space-y-2">
                    <div className="font-medium text-neutral-900">Transport</div>
                    <div className="text-sm text-neutral-700 space-y-1">
                      <div className="flex justify-between">
                        <span>Transport</span>
                        <span>CHF {result.costs.transport.price_transport.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Réception</span>
                        <span>CHF {result.costs.transport.price_reception.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Préparation</span>
                        <span>CHF {result.costs.transport.price_prep.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-semibold pt-2 border-t border-neutral-200">
                        <span>Sous-total transport</span>
                        <span>CHF {result.costs.transport.subtotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Customs */}
                  {result.costs.customs.subtotal > 0 && (
                    <div className="p-3 bg-purple-50 rounded-lg space-y-2">
                      <div className="font-medium text-purple-900">
                        Douane (total pour {result.costs.customs.quantity} unité{result.costs.customs.quantity > 1 ? 's' : ''})
                      </div>
                      <div className="text-sm text-purple-800 space-y-1">
                        <div className="flex justify-between">
                          <span>Frais admin de base</span>
                          <span>CHF {result.costs.customs.admin_base.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Gestion droits de douane</span>
                          <span>CHF {result.costs.customs.gestion_droits.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Gestion TVA</span>
                          <span>CHF {result.costs.customs.gestion_tva.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-semibold pt-2 border-t border-purple-200">
                          <span>Sous-total douane</span>
                          <span>CHF {result.costs.customs.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold pt-2 border-t border-purple-300 text-purple-900">
                          <span>Coût douane par unité</span>
                          <span>CHF {result.costs.customs.per_unit.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Margins & Total */}
                  <div className="p-3 bg-neutral-50 rounded-lg space-y-2 text-sm">
                    <div className="flex justify-between text-neutral-700">
                      <span>Marge de sécurité (10%)</span>
                      <span>CHF {result.costs.margin_security.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-neutral-900 pt-2 border-t border-neutral-200">
                      <span>Total HT</span>
                      <span>CHF {result.costs.total_ht.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-neutral-700">
                      <span>TVA (8.1%)</span>
                      <span>CHF {result.costs.tva_amount.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Final Total */}
                  <div className="p-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-lg font-semibold text-white">
                          {result.costs.customs.subtotal > 0 ? 'Total TTC par unité' : 'Total TTC'}
                        </span>
                        {result.costs.customs.quantity && result.costs.customs.quantity > 1 && (
                          <p className="text-xs text-white/80 mt-1">
                            Pour {result.costs.customs.quantity} unités: CHF {(result.costs.total_ttc * result.costs.customs.quantity).toFixed(2)}
                          </p>
                        )}
                      </div>
                      <span className="text-2xl font-bold text-white">
                        CHF {result.costs.total_ttc.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
