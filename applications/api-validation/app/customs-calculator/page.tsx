'use client'

import { useState } from 'react'
import { BackToDashboard } from '@/components/ui/BackToDashboard'
import { Globe, DollarSign, Info, CheckCircle2, AlertCircle, Settings } from 'lucide-react'

interface CalculationResult {
  success: boolean
  costs?: {
    customs: {
      admin_base: number
      positions_supp: number
      gestion_droits: number
      gestion_tva: number
      subtotal: number
      per_unit: number
      quantity: number
    }
    merchandise_value: number
    total_per_unit: number
  }
  error?: string
}

export default function CustomsCalculatorPage() {
  const [quantity, setQuantity] = useState('1')
  const [merchandiseValue, setMerchandiseValue] = useState('1000')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CalculationResult | null>(null)

  const handleCalculate = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/calculate-customs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: parseInt(quantity),
          merchandise_value: parseFloat(merchandiseValue),
        }),
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ success: false, error: 'Erreur lors de la connexion à l\'API' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <BackToDashboard />
          <div className="flex items-center gap-3 mt-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-neutral-900">Calculateur Douane</h1>
              <p className="text-neutral-600">Calcul des frais de douane uniquement (PESA)</p>
            </div>
            <a
              href="/customs-calculator/admin"
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
            >
              <Settings className="w-4 h-4" />
              Administration
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-neutral-200 p-6 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-semibold text-neutral-900">Informations douanières</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Quantité de produits
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    Valeur totale pour tous les produits
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-semibold text-purple-900 mb-2">ℹ️ Frais PESA inclus</h3>
              <ul className="text-sm text-purple-800 space-y-1">
                <li>• Frais administratifs de base: CHF 80</li>
                <li>• Gestion droits de douane: 3.5% (min CHF 5)</li>
                <li>• Gestion TVA d'import: 2.5% (min CHF 5)</li>
                <li>• Toujours 1 position douanière</li>
              </ul>
            </div>

            <button
              onClick={handleCalculate}
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Calcul en cours...
                </>
              ) : (
                <>
                  <Globe className="w-5 h-5" />
                  Calculer les frais
                </>
              )}
            </button>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-neutral-900">Résultats du calcul</h2>
            </div>

            {!result && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
                  <Info className="w-8 h-8 text-neutral-400" />
                </div>
                <p className="text-neutral-600">Remplissez le formulaire et cliquez sur "Calculer"</p>
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
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-900">Calcul effectué avec succès</span>
                </div>

                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <h3 className="font-semibold text-purple-900 mb-2">
                    Frais de douane (total pour {result.costs.customs.quantity} unité{result.costs.customs.quantity > 1 ? 's' : ''})
                  </h3>
                  <div className="text-sm text-purple-800 space-y-2">
                    <div className="flex justify-between">
                      <span>Valeur marchandise:</span>
                      <span className="font-semibold">CHF {result.costs.merchandise_value.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-neutral-900">Détail des frais</h3>

                  <div className="p-3 bg-purple-50 rounded-lg space-y-2">
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
                      <div className="flex justify-between font-semibold pt-2 border-t border-purple-200 text-purple-900">
                        <span>Total frais de douane</span>
                        <span>CHF {result.costs.customs.subtotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-lg font-semibold text-white">Coût douane par unité</span>
                        {result.costs.customs.quantity > 1 && (
                          <p className="text-xs text-white/80 mt-1">
                            Total: CHF {result.costs.customs.subtotal.toFixed(2)}
                          </p>
                        )}
                      </div>
                      <span className="text-2xl font-bold text-white">
                        CHF {result.costs.total_per_unit.toFixed(2)}
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
