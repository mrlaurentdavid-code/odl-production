'use client'

import { useState } from 'react'
import { BackToDashboard } from '@/components/ui/BackToDashboard'
import { PackingVisualization } from '@/components/PackingVisualization'
import { Truck, Package, Info, CheckCircle2, AlertCircle, Settings } from 'lucide-react'

interface OptimizationScenario {
  quantity: number
  container: {
    format_label: string
    carrier: string
    mode: string
    dimensions?: {
      length_cm: number
      width_cm: number
      height_cm: number
    }
  } | null
  arrangement?: {
    products_per_layer: number
    max_layers: number
    layers_needed: number
    orientation_used?: number
    product_base_length?: number
    product_base_width?: number
    product_stack_height?: number
  }
  cost_total: number
  cost_unitaire: number
  is_optimal: boolean
  savings_vs_single: number
}

interface DeliveryOption {
  carrier: string
  mode: string
  format_label: string
  base: number
  margin: number
  tva: number
  total: number
  per_unit: number
  is_selected: boolean
}

interface CalculationResult {
  success: boolean
  costs?: {
    transport: {
      base: number
      margin: number
      tva: number
      subtotal: number
      per_unit: number
      carrier: string
      mode: string
      format_label?: string
      container_dimensions?: {
        length_cm: number
        width_cm: number
        height_cm: number
      }
    }
    total_per_unit: number
    delivery_options?: DeliveryOption[]
  }
  customer_optimization?: {
    success: boolean
    scenarios: OptimizationScenario[]
    optimal_quantity: number
    min_cost_unitaire: number
  }
  pallet_info?: {
    success: boolean
    pallet_format: {
      id: string
      name: string
      dimensions: {
        length_cm: number
        width_cm: number
        height_cm: number
        max_weight_kg: number
        pallet_height_cm?: number
        available_height_cm?: number
      }
    }
    calculation: {
      products_per_layer: number
      layers_per_pallet: number
      products_per_pallet_dimension: number
      products_per_pallet_weight: number
      products_per_pallet_final: number
      pallets_needed: number
      total_products_shipped: number
      product_loss: number
      efficiency_percent: number
      orientation_used?: number
      product_base_length?: number
      product_base_width?: number
      product_stack_height?: number
    }
  }
  quantity?: number
  provider_id?: string
  error?: string
}

export default function TransportCalculatorPage() {
  // Form state
  const [lengthCm, setLengthCm] = useState('25')
  const [widthCm, setWidthCm] = useState('18')
  const [heightCm, setHeightCm] = useState('2')
  const [weightKg, setWeightKg] = useState('0.3')
  const [quantity, setQuantity] = useState('1')
  const [carrier, setCarrier] = useState<string>('')
  const [mode, setMode] = useState<string>('')

  // Result state
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CalculationResult | null>(null)

  const handleCalculate = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/calculate-transport', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          length_cm: parseFloat(lengthCm),
          width_cm: parseFloat(widthCm),
          height_cm: parseFloat(heightCm),
          weight_kg: parseFloat(weightKg),
          quantity: parseInt(quantity) || 1,
          carrier: carrier || null,
          mode: mode || null,
          provider_id: 'ohmex',
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
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-700 flex items-center justify-center">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-neutral-900">
                Calculateur Transport
              </h1>
              <p className="text-neutral-600">
                Calcul des coûts de transport uniquement (Ohmex)
              </p>
            </div>
            <a
              href="/transport-calculator/admin"
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
                <Package className="w-5 h-5 text-cyan-600" />
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
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Poids (kg)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Quantité
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Transport Options */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Truck className="w-5 h-5 text-blue-600" />
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
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  >
                    <option value="">Auto (défaut)</option>
                    <option value="Sans signature">Sans signature</option>
                    <option value="Avec suivi">Avec suivi</option>
                    <option value="Avec signature">Avec signature</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Calculate Button */}
            <button
              onClick={handleCalculate}
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-700 text-white rounded-lg font-semibold hover:from-cyan-600 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Calcul en cours...
                </>
              ) : (
                <>
                  <Truck className="w-5 h-5" />
                  Calculer les coûts
                </>
              )}
            </button>

            {/* Cost Details + Unit Cost - Single Block */}
            {result && result.success && result.costs && (
              <div className="bg-white rounded-xl border border-neutral-200 p-4 space-y-3">
                <h3 className="font-semibold text-neutral-900">Détail des coûts</h3>

                {/* Provider and Format */}
                {result.provider_id && (
                  <div className="text-sm space-y-1 pb-2 border-b border-neutral-200">
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Prestataire:</span>
                      <span className="font-medium text-neutral-900">{result.provider_id.toUpperCase()}</span>
                    </div>
                    {result.costs.transport.format_label && (
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Format:</span>
                        <span className="font-medium text-neutral-900">{result.costs.transport.format_label}</span>
                      </div>
                    )}
                    {result.costs.transport.container_dimensions && result.costs.transport.container_dimensions.length_cm && (
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Dimensions:</span>
                        <span className="text-neutral-900">
                          {result.costs.transport.container_dimensions.length_cm} × {result.costs.transport.container_dimensions.width_cm} × {result.costs.transport.container_dimensions.height_cm} cm
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Transport Details */}
                <div className="space-y-2">
                  <div className="font-medium text-neutral-900 text-sm">
                    Transport ({result.costs.transport.carrier} - {result.costs.transport.mode})
                  </div>
                  <div className="text-sm text-neutral-700 space-y-1">
                    <div className="flex justify-between">
                      <span>Base transport</span>
                      <span>CHF {result.costs.transport.base.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Marge</span>
                      <span>CHF {result.costs.transport.margin.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>TVA</span>
                      <span>CHF {result.costs.transport.tva.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold pt-2 border-t border-neutral-200">
                      <span>Sous-total transport</span>
                      <span>CHF {result.costs.transport.subtotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Delivery Options */}
                {result.costs.delivery_options && result.costs.delivery_options.length > 1 && (
                  <div className="space-y-2 pt-3 border-t border-neutral-200">
                    <div className="font-medium text-neutral-900 text-sm">
                      Options de livraison disponibles
                    </div>
                    <div className="space-y-2">
                      {result.costs.delivery_options.map((option, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded-lg border text-sm ${
                            option.is_selected
                              ? 'bg-cyan-50 border-cyan-400 border-2'
                              : 'bg-neutral-50 border-neutral-200'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <div className="font-semibold text-neutral-900 flex items-center gap-2">
                                {option.carrier} - {option.mode}
                                {option.is_selected && (
                                  <span className="text-xs bg-cyan-600 text-white px-2 py-0.5 rounded-full">
                                    Sélectionné
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-neutral-600 mt-0.5">
                                {option.format_label}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-neutral-900">
                                CHF {option.total.toFixed(2)}
                              </div>
                              <div className="text-xs text-neutral-600">
                                CHF {option.per_unit.toFixed(2)}/unité
                              </div>
                            </div>
                          </div>
                          <details className="text-xs">
                            <summary className="cursor-pointer text-neutral-600 hover:text-neutral-800">
                              Détail des coûts
                            </summary>
                            <div className="mt-2 space-y-1 pl-3 border-l-2 border-neutral-300">
                              <div className="flex justify-between">
                                <span className="text-neutral-600">Base:</span>
                                <span className="text-neutral-900">CHF {option.base.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-neutral-600">Marge (10%):</span>
                                <span className="text-neutral-900">CHF {option.margin.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-neutral-600">TVA (8.1%):</span>
                                <span className="text-neutral-900">CHF {option.tva.toFixed(2)}</span>
                              </div>
                            </div>
                          </details>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>

          {/* Right Panel - Results */}
          <div className="bg-white rounded-xl border border-neutral-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-cyan-600" />
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

                {/* Pallet Information */}
                {result.pallet_info && result.pallet_info.success && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <h3 className="font-semibold text-amber-900 mb-3">Informations Palettes</h3>
                    <div className="space-y-3 text-sm">
                      {/* Pallet Format */}
                      <div className="p-2 bg-white rounded">
                        <div className="font-medium text-amber-900 mb-1">
                          {result.pallet_info.pallet_format.name}
                        </div>
                        <div className="text-xs text-amber-700">
                          {result.pallet_info.pallet_format.dimensions.length_cm}×
                          {result.pallet_info.pallet_format.dimensions.width_cm}×
                          {result.pallet_info.pallet_format.dimensions.height_cm} cm • Max: {result.pallet_info.pallet_format.dimensions.max_weight_kg} kg
                        </div>
                      </div>

                      {/* Calculation Details */}
                      <div className="grid grid-cols-2 gap-2 text-amber-800">
                        <div className="p-2 bg-white rounded">
                          <div className="text-xs text-amber-600">Produits/couche</div>
                          <div className="font-bold text-lg">{result.pallet_info.calculation.products_per_layer}</div>
                        </div>
                        <div className="p-2 bg-white rounded">
                          <div className="text-xs text-amber-600">Couches/palette</div>
                          <div className="font-bold text-lg">{result.pallet_info.calculation.layers_per_pallet}</div>
                        </div>
                        <div className="p-2 bg-white rounded">
                          <div className="text-xs text-amber-600">Produits/palette</div>
                          <div className="font-bold text-lg">{result.pallet_info.calculation.products_per_pallet_final}</div>
                        </div>
                        <div className="p-2 bg-white rounded">
                          <div className="text-xs text-amber-600">Palettes nécessaires</div>
                          <div className="font-bold text-lg text-amber-900">{result.pallet_info.calculation.pallets_needed}</div>
                        </div>
                      </div>

                      {/* Efficiency & Loss */}
                      <div className="p-2 bg-white rounded space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-amber-700">Produits expédiés:</span>
                          <span className="font-semibold text-amber-900">{result.pallet_info.calculation.total_products_shipped}</span>
                        </div>
                        {result.pallet_info.calculation.product_loss > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-red-700">Perte potentielle:</span>
                            <span className="font-semibold text-red-900">{result.pallet_info.calculation.product_loss} produits</span>
                          </div>
                        )}
                        <div className="flex justify-between text-xs">
                          <span className="text-amber-700">Efficacité:</span>
                          <span className="font-semibold text-amber-900">{result.pallet_info.calculation.efficiency_percent}%</span>
                        </div>
                      </div>

                      {/* Packing Visualization */}
                      <PackingVisualization
                        containerLength={result.pallet_info.pallet_format.dimensions.length_cm}
                        containerWidth={result.pallet_info.pallet_format.dimensions.width_cm}
                        containerHeight={result.pallet_info.pallet_format.dimensions.height_cm}
                        productLength={parseFloat(lengthCm)}
                        productWidth={parseFloat(widthCm)}
                        productHeight={parseFloat(heightCm)}
                        productsPerLayer={result.pallet_info.calculation.products_per_layer}
                        layersPerContainer={result.pallet_info.calculation.layers_per_pallet}
                        containerType={result.pallet_info.pallet_format.name}
                        productBaseLength={result.pallet_info.calculation.product_base_length}
                        productBaseWidth={result.pallet_info.calculation.product_base_width}
                        productStackHeight={result.pallet_info.calculation.product_stack_height}
                        orientationUsed={result.pallet_info.calculation.orientation_used}
                        availableHeight={result.pallet_info.pallet_format.dimensions.available_height_cm}
                        palletHeight={result.pallet_info.pallet_format.dimensions.pallet_height_cm}
                      />
                    </div>
                  </div>
                )}

                {/* Customer Transport Optimization */}
                {result.customer_optimization && result.customer_optimization.success && result.customer_optimization.scenarios && (
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg">
                    <h3 className="font-bold text-indigo-900 mb-3 flex items-center gap-2">
                      💡 Optimisation Expédition Client
                    </h3>

                    {(() => {
                      const scenarios = result.customer_optimization.scenarios
                      const singleScenario = scenarios.find(s => s.quantity === 1)
                      const optimalScenario = scenarios.find(s => s.is_optimal)

                      if (!singleScenario || !optimalScenario) return null

                      const isOptimalOne = singleScenario.quantity === optimalScenario.quantity

                      return (
                        <div className="space-y-3">
                          {/* Comparaison Simple */}
                          <div className="grid grid-cols-2 gap-3">
                            {/* Scénario 1 produit */}
                            <div className="p-3 bg-white rounded-lg border border-blue-200">
                              <div className="text-xs text-blue-600 mb-1">Pour 1 produit</div>
                              <div className="text-2xl font-bold text-blue-900">
                                CHF {singleScenario.cost_unitaire.toFixed(2)}
                              </div>
                              <div className="text-xs text-blue-700 mt-1">
                                {singleScenario.container?.format_label}
                              </div>
                            </div>

                            {/* Scénario Optimal */}
                            {!isOptimalOne && (
                              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg border-2 border-green-700 shadow-lg">
                                <div className="text-xs text-green-100 mb-1 font-semibold">
                                  ⭐ OPTIMAL: {optimalScenario.quantity} produits
                                </div>
                                <div className="text-2xl font-bold text-white">
                                  CHF {optimalScenario.cost_unitaire.toFixed(2)}
                                </div>
                                <div className="text-xs text-green-100 mt-1">
                                  {optimalScenario.container?.format_label}
                                </div>
                              </div>
                            )}

                            {isOptimalOne && (
                              <div className="p-3 bg-green-100 rounded-lg border border-green-300">
                                <div className="text-xs text-green-700 mb-1 font-semibold">
                                  ✓ Déjà optimal !
                                </div>
                                <div className="text-sm text-green-800">
                                  Le tarif pour 1 produit est déjà le meilleur rapport qualité/prix.
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Message d'Action */}
                          {!isOptimalOne && (
                            <div className="p-3 bg-white rounded-lg border-l-4 border-green-600">
                              <div className="font-semibold text-green-900 mb-1">
                                💰 Économie: CHF {optimalScenario.savings_vs_single.toFixed(2)} par produit
                              </div>
                              <div className="text-sm text-green-800">
                                En commandant {optimalScenario.quantity} produits au lieu d'un seul,
                                vous économisez <strong>CHF {(optimalScenario.savings_vs_single * optimalScenario.quantity).toFixed(2)}</strong> sur le transport total.
                              </div>
                            </div>
                          )}

                          {/* Visualisation du scénario optimal */}
                          {optimalScenario.container?.dimensions && optimalScenario.arrangement && (
                            <PackingVisualization
                              containerLength={optimalScenario.container.dimensions.length_cm}
                              containerWidth={optimalScenario.container.dimensions.width_cm}
                              containerHeight={optimalScenario.container.dimensions.height_cm}
                              productLength={parseFloat(lengthCm)}
                              productWidth={parseFloat(widthCm)}
                              productHeight={parseFloat(heightCm)}
                              productsPerLayer={optimalScenario.arrangement.products_per_layer}
                              layersPerContainer={optimalScenario.arrangement.layers_needed}
                              containerType={optimalScenario.container.format_label}
                              productBaseLength={optimalScenario.arrangement.product_base_length}
                              productBaseWidth={optimalScenario.arrangement.product_base_width}
                              productStackHeight={optimalScenario.arrangement.product_stack_height}
                              orientationUsed={optimalScenario.arrangement.orientation_used}
                            />
                          )}

                          {/* Détails (repliable) */}
                          <details className="text-xs">
                            <summary className="cursor-pointer text-blue-700 hover:text-blue-900 font-medium">
                              Voir tous les scénarios ({scenarios.filter(s => s.container).length})
                            </summary>
                            <div className="mt-2 space-y-2">
                              {scenarios.filter(s => s.container).map((scenario, idx) => (
                                <div
                                  key={idx}
                                  className={`p-3 rounded border ${
                                    scenario.is_optimal
                                      ? 'bg-green-50 border-green-400'
                                      : 'bg-white border-blue-200'
                                  }`}
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <div>
                                      <span className="font-bold text-base">Q={scenario.quantity}</span>
                                      {scenario.is_optimal && <span className="ml-2 text-green-700">⭐ OPTIMAL</span>}
                                    </div>
                                    <div className="text-right">
                                      <div className="font-bold text-base">CHF {scenario.cost_unitaire.toFixed(2)}/u</div>
                                      {scenario.savings_vs_single > 0 && (
                                        <div className="text-green-700 text-xs">Économie: -{scenario.savings_vs_single.toFixed(2)}</div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Détails du colis */}
                                  <div className="pl-2 border-l-2 border-blue-300 space-y-1">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">📦 Colis:</span>
                                      <span className="font-medium text-gray-900">{scenario.container?.format_label}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">🚚 Transporteur:</span>
                                      <span className="text-gray-700">{scenario.container?.carrier} - {scenario.container?.mode}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">💰 Coût total:</span>
                                      <span className="font-semibold text-gray-900">CHF {scenario.cost_total.toFixed(2)}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </details>
                        </div>
                      )
                    })()}
                  </div>
                )}

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
