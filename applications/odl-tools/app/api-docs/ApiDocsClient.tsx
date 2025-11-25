'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { Code2, Server, Zap, Database, Link as LinkIcon, Calculator, Image as ImageIcon, Languages, ExternalLink, CheckCircle, ShieldCheck, Truck } from 'lucide-react'
import { BackToDashboard } from '@/components/ui/BackToDashboard'
import Link from 'next/link'

type ApiSection = 'tar' | 'transport' | 'image-converter' | 'translation' | 'validation'

export default function ApiDocsClient() {
  const [activeApi, setActiveApi] = useState<ApiSection>('tar')

  const apis = [
    {
      id: 'tar' as ApiSection,
      name: 'TAR Calculator',
      icon: Calculator,
      color: 'blue',
      description: 'Calcul des taxes de recyclage',
      version: 'v2.0.0',
      status: 'active'
    },
    {
      id: 'transport' as ApiSection,
      name: 'Transport Calculator',
      icon: Truck,
      color: 'orange',
      description: 'Calcul des coûts de transport avec optimisation palettes',
      version: 'v2.0.0',
      status: 'active'
    },
    {
      id: 'image-converter' as ApiSection,
      name: 'Image Converter',
      icon: ImageIcon,
      color: 'indigo',
      description: 'Conversion WebP avec transformations',
      version: 'v1.0.0',
      status: 'active'
    },
    {
      id: 'translation' as ApiSection,
      name: 'Traduction',
      icon: Languages,
      color: 'purple',
      description: 'Traduction multilingue (à venir)',
      version: 'v1.0.0',
      status: 'coming-soon'
    },
    {
      id: 'validation' as ApiSection,
      name: 'Validation O!Deal',
      icon: CheckCircle,
      color: 'green',
      description: 'Validation des offres fournisseurs',
      version: 'v1.1.0',
      status: 'active'
    }
  ]

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-80 bg-gradient-to-b from-neutral-50 to-neutral-100 border-r border-neutral-200 flex flex-col">
        <div className="p-6 border-b border-neutral-200">
          <BackToDashboard className="mb-4" />
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">
            Documentation API
          </h1>
          <p className="text-sm text-neutral-600">
            Intégrations Weweb, Supabase, N8N
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {apis.map((api) => {
            const Icon = api.icon
            const isActive = activeApi === api.id
            const isComingSoon = api.status === 'coming-soon'

            return (
              <button
                key={api.id}
                onClick={() => !isComingSoon && setActiveApi(api.id)}
                disabled={isComingSoon}
                className={`
                  w-full text-left p-4 rounded-xl transition-all
                  ${isActive
                    ? 'text-white shadow-lg scale-105'
                    : isComingSoon
                      ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed opacity-60'
                      : 'bg-white hover:bg-neutral-50 text-neutral-900 hover:shadow-md'
                  }
                `}
                style={isActive ? {
                  backgroundColor: api.color === 'blue' ? '#3b82f6' : api.color === 'orange' ? '#f97316' : api.color === 'indigo' ? '#6366f1' : api.color === 'purple' ? '#a855f7' : '#22c55e'
                } : {}}
              >
                <div className="flex items-start gap-3">
                  <div className={`
                    w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                  `}
                  style={!isActive && !isComingSoon ? {
                    backgroundColor: api.color === 'blue' ? '#dbeafe' : api.color === 'orange' ? '#ffedd5' : api.color === 'indigo' ? '#e0e7ff' : api.color === 'purple' ? '#f3e8ff' : '#dcfce7'
                  } : isActive ? { backgroundColor: 'rgba(255,255,255,0.2)' } : { backgroundColor: '#e5e5e5' }}>
                    <Icon className="w-5 h-5"
                      style={!isActive && !isComingSoon ? {
                        color: api.color === 'blue' ? '#2563eb' : api.color === 'orange' ? '#ea580c' : api.color === 'indigo' ? '#4f46e5' : api.color === 'purple' ? '#9333ea' : '#16a34a'
                      } : isActive ? { color: 'white' } : { color: '#a3a3a3' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-semibold text-sm ${isActive ? 'text-white' : 'text-neutral-900'}`}>
                        {api.name}
                      </h3>
                      {isComingSoon && (
                        <span className="px-2 py-0.5 bg-neutral-200 text-neutral-600 text-xs rounded-full">
                          Bientôt
                        </span>
                      )}
                    </div>
                    <p className={`text-xs mt-1 ${isActive ? 'text-white/80' : isComingSoon ? 'text-neutral-400' : 'text-neutral-600'}`}>
                      {api.description}
                    </p>
                    <p className={`text-xs mt-1 font-mono ${isActive ? 'text-white/60' : isComingSoon ? 'text-neutral-400' : 'text-neutral-500'}`}>
                      {api.version}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </nav>

        <div className="p-4 border-t border-neutral-200 bg-white">
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            <Server className="w-4 h-4" />
            <span className="font-medium">{apis.filter(a => a.status === 'active').length} APIs actives</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-white">
        <div className="max-w-5xl mx-auto p-8 space-y-8">
          {activeApi === 'tar' && <TarCalculatorDocs />}
          {activeApi === 'transport' && <TransportCalculatorDocs />}
          {activeApi === 'image-converter' && <ImageConverterDocs />}
          {activeApi === 'translation' && <TranslationDocs />}
          {activeApi === 'validation' && <ValidationApiDocs />}
        </div>
      </main>
    </div>
  )
}

// ===================================
// TAR CALCULATOR API DOCS
// ===================================
function TarCalculatorDocs() {
  return (
    <>
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-neutral-900">TAR Calculator API</h2>
              <p className="text-sm text-neutral-600">v2.0.0 - Calcul automatique des taxes de recyclage</p>
            </div>
          </div>
          <a
            href="https://tar.odl-tools.ch"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Tester en live
          </a>
        </div>
      </div>

      {/* Info Section - 2 Endpoints */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-6">
        <div className="flex items-start gap-3">
          <Zap className="w-6 h-6 text-blue-600 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">2 endpoints disponibles selon votre use case</h3>
            <div className="text-sm text-blue-800 space-y-2">
              <div>
                <strong>• /api/calculate-tar-v2</strong> - Pour recherche libre avec IA
                <br />
                <span className="text-blue-700">Utilise Claude AI pour identifier le produit depuis une description. Idéal pour recherche manuelle ou données non structurées.</span>
              </div>
              <div>
                <strong>• /api/calculate-tar-odeal</strong> - Pour formulaire Odeal
                <br />
                <span className="text-blue-700">Exploite les subcategories et données structurées du formulaire. Calcul instantané sans IA (rapide, précis, déterministe).</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Base URL */}
      <div className="bg-white border border-border rounded-xl p-6">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Server className="w-4 h-4 text-neutral-600" />
            <span className="text-sm font-semibold text-neutral-700">URL de base</span>
          </div>
          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 font-mono text-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-neutral-600 text-xs mb-1">Développement</div>
                <code className="text-blue-600">http://localhost:3004</code>
              </div>
              <div>
                <div className="text-neutral-600 text-xs mb-1">Production</div>
                <code className="text-green-600">https://tar.odl-tools.ch</code>
              </div>
            </div>
          </div>
        </div>

        {/* Endpoint: calculate-tar-v2 */}
        <div className="mb-6 border-l-4 border-blue-500 pl-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">POST</span>
            <code className="text-sm font-mono text-neutral-900">/api/calculate-tar-v2</code>
          </div>

          <p className="text-sm text-neutral-600 mb-4">
            Calcul intelligent de la TAR avec extraction automatique des spécifications (poids, dimensions, taille écran).
            Utilise Claude AI et inclut un cache Supabase pour des performances optimales.
          </p>

          {/* Request Body */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-neutral-900 mb-2">Body (JSON)</h4>
            <div className="bg-neutral-900 text-neutral-100 rounded-lg p-4 font-mono text-sm overflow-x-auto">
              <pre>{`{
  "ean": "5099206071131",                      // EAN (optionnel)
  "description": "Clavier sans fil Logitech K270", // OBLIGATOIRE (min 10 car.)
  "type_produit": "clavier",                   // OBLIGATOIRE (min 3 car.)
  "marque": "Logitech",                        // Optionnel
  "poids": 0.5                                 // Poids en kg (optionnel)
}`}</pre>
            </div>
          </div>

          {/* Response */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-neutral-900 mb-2">Réponse</h4>
            <div className="bg-neutral-900 text-neutral-100 rounded-lg p-4 font-mono text-sm overflow-x-auto">
              <pre>{`{
  "success": true,
  "source": "enriched_extraction",  // ou "cache_enriched"
  "confidence": 95,
  "product": {
    "nom_produit": "Clavier sans fil Logitech K270",
    "marque": "Logitech",
    "poids_kg": 0.5,
    "image_url": "https://...",
    "description": "Clavier compact...",
    "dimensions": {
      "length_cm": 45.0,
      "width_cm": 15.5,
      "height_cm": 2.5
    }
  },
  "tar": {
    "organisme": "SWICO",
    "categorie": "peripherique",
    "type": "Périphérique informatique",
    "tarifHT": "0.46",
    "tarifTTC": "0.50",
    "tva": 8.1,
    "alternatives": null,
    "notes": []
  },
  "enriched_data": { /* Données enrichies complètes */ }
}`}</pre>
            </div>
          </div>

          {/* Validation Notes */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
            <div className="flex items-start gap-2">
              <Zap className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h5 className="font-semibold text-amber-900 text-sm mb-1">Champs obligatoires pour V2</h5>
                <ul className="text-sm text-amber-800 space-y-1">
                  <li>• <code className="bg-amber-100 px-1 rounded">type_produit</code> : minimum 3 caractères (ex: "clavier", "écran", "tablette")</li>
                  <li>• <code className="bg-amber-100 px-1 rounded">description</code> : minimum 10 caractères</li>
                  <li>• Les autres champs sont optionnels mais améliorent la précision</li>
                </ul>
              </div>
            </div>
          </div>

          {/* cURL Example */}
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-neutral-900 mb-2">Exemple cURL</h4>
            <div className="bg-neutral-900 text-neutral-100 rounded-lg p-4 font-mono text-xs overflow-x-auto">
              <pre>{`curl -X POST https://tar.odl-tools.ch/api/calculate-tar-v2 \\
  -H "Content-Type: application/json" \\
  -d '{
    "ean": "5099206071131",
    "description": "Clavier sans fil Logitech K270",
    "type_produit": "clavier",
    "marque": "Logitech",
    "poids": 0.5
  }'`}</pre>
            </div>
          </div>
        </div>

        {/* Endpoint: calculate-tar-odeal */}
        <div className="mb-6 border-l-4 border-purple-500 pl-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">POST</span>
            <code className="text-sm font-mono text-neutral-900">/api/calculate-tar-odeal</code>
            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded">FORMULAIRE ODEAL</span>
          </div>

          <p className="text-sm text-neutral-600 mb-4">
            Endpoint optimisé pour le formulaire Odeal. Exploite les subcategories et données structurées pour un calcul TAR instantané et déterministe (sans IA).
            <strong> Performance : {'<'}50ms</strong> de réponse.
          </p>

          {/* Request Body */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-neutral-900 mb-2">Body (JSON)</h4>
            <div className="bg-neutral-900 text-neutral-100 rounded-lg p-4 font-mono text-sm overflow-x-auto">
              <pre>{`{
  "item_name": "iPhone 15 Pro",           // OBLIGATOIRE - Nom du produit
  "subcategory_id": "s20",                 // OBLIGATOIRE - ID subcategory (s1-s65)
  "has_battery": true,                     // Optionnel - Produit contient batterie
  "battery_type": "lithium_ion_rechargeable", // Si has_battery = true
  "ean": "194252721444",                   // Optionnel
  "sku": "SKU-123",                        // Optionnel
  "weight_kg": 0.221,                      // Optionnel (requis pour SENS)
  "length_cm": 15.5,                       // Optionnel
  "width_cm": 7.5,                         // Optionnel
  "height_cm": 0.8                         // Optionnel
}`}</pre>
            </div>
          </div>

          {/* Response */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-neutral-900 mb-2">Réponse</h4>
            <div className="bg-neutral-900 text-neutral-100 rounded-lg p-4 font-mono text-sm overflow-x-auto">
              <pre>{`{
  "success": true,
  "source": "odeal_form",
  "confidence": 95,
  "product": {
    "nom_produit": "iPhone 15 Pro",
    "subcategory_id": "s20",
    "ean": "194252721444",
    "sku": "SKU-123",
    "poids_kg": 0.221,
    "dimensions": {
      "length_cm": 15.5,
      "width_cm": 7.5,
      "height_cm": 0.8
    },
    "battery": {
      "has_battery": true,
      "type": "lithium_ion_rechargeable"
    }
  },
  "tar": {
    "organisme": "SWICO",
    "categorie": "smartphone",
    "type": "Smartphone/Smartwatch",
    "tarifHT": "0.19",
    "tarifTTC": "0.21",
    "tva": 8.1,
    "calculation_method": "subcategory_mapping",
    "notes": [
      "Catégorie identifiée depuis subcategory s20",
      "Tarif SWICO standard appliqué: CHF 0.19"
    ]
  },
  "validation": {
    "warnings": []
  }
}`}</pre>
            </div>
          </div>

          {/* Subcategories Info */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mt-4">
            <div className="flex items-start gap-2">
              <Database className="w-5 h-5 text-purple-600 mt-0.5" />
              <div>
                <h5 className="font-semibold text-purple-900 text-sm mb-1">Subcategories supportées</h5>
                <div className="text-sm text-purple-800 space-y-1">
                  <p>• <strong>s20</strong> : Téléphonie (SWICO) - CHF 0.19</p>
                  <p>• <strong>s21</strong> : Informatique (SWICO) - Variable selon taille écran</p>
                  <p>• <strong>s24-s25</strong> : Électroménager (SENS) - Variable selon poids</p>
                  <p>• <strong>s1-s19</strong> : Mode, Maison (AUCUN TAR)</p>
                  <p className="mt-2 text-xs">📋 <strong>65 subcategories</strong> mappées → Voir fichier subcategory-tar-mapping.js</p>
                </div>
              </div>
            </div>
          </div>

          {/* Battery Types */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
            <div className="flex items-start gap-2">
              <Zap className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h5 className="font-semibold text-amber-900 text-sm mb-1">Types de batteries supportés</h5>
                <ul className="text-sm text-amber-800 space-y-1">
                  <li>• <code className="bg-amber-100 px-1 rounded">alkaline_non_rechargeable</code> - Pile alcaline</li>
                  <li>• <code className="bg-amber-100 px-1 rounded">lithium_ion_rechargeable</code> - Batterie Li-ion</li>
                  <li>• <code className="bg-amber-100 px-1 rounded">lithium_metal_non_rechargeable</code> - Pile lithium métal</li>
                  <li>• <code className="bg-amber-100 px-1 rounded">lead_acid</code> - Batterie au plomb</li>
                  <li>• <code className="bg-amber-100 px-1 rounded">nickel_metal_hydride</code> - Batterie NiMH</li>
                  <li>• <code className="bg-amber-100 px-1 rounded">other</code> - Autre type</li>
                </ul>
              </div>
            </div>
          </div>

          {/* cURL Examples */}
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-neutral-900 mb-2">Exemples cURL</h4>

            {/* Smartphone Example */}
            <div className="mb-3">
              <p className="text-xs text-neutral-600 mb-1 font-semibold">Exemple 1 : Smartphone</p>
              <div className="bg-neutral-900 text-neutral-100 rounded-lg p-4 font-mono text-xs overflow-x-auto">
                <pre>{`curl -X POST https://tar.odl-tools.ch/api/calculate-tar-odeal \\
  -H "Content-Type: application/json" \\
  -d '{
    "item_name": "iPhone 15 Pro",
    "subcategory_id": "s20",
    "has_battery": true,
    "weight_kg": 0.187
  }'`}</pre>
              </div>
            </div>

            {/* Laptop Example */}
            <div className="mb-3">
              <p className="text-xs text-neutral-600 mb-1 font-semibold">Exemple 2 : Ordinateur portable</p>
              <div className="bg-neutral-900 text-neutral-100 rounded-lg p-4 font-mono text-xs overflow-x-auto">
                <pre>{`curl -X POST https://tar.odl-tools.ch/api/calculate-tar-odeal \\
  -H "Content-Type: application/json" \\
  -d '{
    "item_name": "MacBook Pro 16",
    "subcategory_id": "s21",
    "weight_kg": 2.1,
    "length_cm": 35.57,
    "width_cm": 24.81
  }'`}</pre>
              </div>
            </div>

            {/* Appliance Example */}
            <div className="mb-3">
              <p className="text-xs text-neutral-600 mb-1 font-semibold">Exemple 3 : Électroménager</p>
              <div className="bg-neutral-900 text-neutral-100 rounded-lg p-4 font-mono text-xs overflow-x-auto">
                <pre>{`curl -X POST https://tar.odl-tools.ch/api/calculate-tar-odeal \\
  -H "Content-Type: application/json" \\
  -d '{
    "item_name": "Lave-linge Bosch",
    "subcategory_id": "s24",
    "weight_kg": 68
  }'`}</pre>
              </div>
            </div>
          </div>

          {/* Integration Examples for Odeal */}
          <div className="mt-6">
            <h4 className="text-base font-semibold text-neutral-900 mb-3">Exemples d'intégration Odeal</h4>

            {/* Weweb Odeal */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <LinkIcon className="w-4 h-4 text-blue-600" />
                <h5 className="font-semibold text-neutral-900 text-sm">Weweb (REST API)</h5>
              </div>
              <div className="bg-neutral-900 text-neutral-100 rounded-lg p-4 font-mono text-xs overflow-x-auto">
                <pre>{`// Configuration du REST API Data Source dans Weweb
Base URL: https://tar.odl-tools.ch
Endpoint: /api/calculate-tar-odeal
Method: POST
Headers:
  Content-Type: application/json

// Body (bindings depuis formulaire Odeal)
{
  "item_name": {{form_item_name}},
  "subcategory_id": {{form_subcategory}},
  "has_battery": {{form_has_battery}},
  "battery_type": {{form_battery_type}},
  "weight_kg": {{form_weight}},
  "length_cm": {{form_length}},
  "width_cm": {{form_width}}
}

// Afficher le résultat
{{api_response.data.tar.tarifTTC}} CHF TTC
{{api_response.data.tar.organisme}} ({{api_response.data.tar.type}})`}</pre>
              </div>
            </div>

            {/* N8N Odeal */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <LinkIcon className="w-4 h-4 text-purple-600" />
                <h5 className="font-semibold text-neutral-900 text-sm">N8N (HTTP Request Node)</h5>
              </div>
              <div className="bg-neutral-900 text-neutral-100 rounded-lg p-4 font-mono text-xs overflow-x-auto">
                <pre>{`// Node: HTTP Request
Method: POST
URL: https://tar.odl-tools.ch/api/calculate-tar-odeal

// Body (JSON)
{
  "item_name": "{{$json.item_name}}",
  "subcategory_id": "{{$json.subcategory_id}}",
  "has_battery": {{$json.has_battery}},
  "weight_kg": {{$json.weight_kg}},
  "length_cm": {{$json.length_cm}},
  "width_cm": {{$json.width_cm}}
}

// Extraire les résultats dans le workflow suivant
{{ $json.tar.tarifTTC }}     // Tarif TTC
{{ $json.tar.tarifHT }}      // Tarif HT
{{ $json.tar.organisme }}    // SWICO/SENS/INOBAT
{{ $json.tar.type }}         // Type de produit
{{ $json.confidence }}       // Score de confiance (95% si toutes données OK)`}</pre>
              </div>
            </div>
          </div>
        </div>

        {/* Integration Examples */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Exemples d'intégration V2 (avec IA)</h3>

          {/* Weweb */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <LinkIcon className="w-4 h-4 text-blue-600" />
              <h4 className="font-semibold text-neutral-900">Weweb (REST API)</h4>
            </div>
            <div className="bg-neutral-900 text-neutral-100 rounded-lg p-4 font-mono text-xs overflow-x-auto">
              <pre>{`// Configuration du REST API Data Source dans Weweb
Base URL: http://localhost:3004 (ou https://tar.odl-tools.ch en prod)
Endpoint: /api/calculate-tar-v2
Method: POST
Headers:
  Content-Type: application/json

// Body (bindings Weweb)
{
  "ean": {{input_ean.value}},
  "description": {{input_description.value}},
  "type_produit": {{input_type.value}},
  "marque": {{input_marque.value}},
  "poids": {{input_poids.value}}
}

// Afficher le résultat
{{api_response.data.tar.tarifTTC}} CHF TTC`}</pre>
            </div>
          </div>

          {/* N8N */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <LinkIcon className="w-4 h-4 text-purple-600" />
              <h4 className="font-semibold text-neutral-900">N8N (HTTP Request Node)</h4>
            </div>
            <div className="bg-neutral-900 text-neutral-100 rounded-lg p-4 font-mono text-xs overflow-x-auto">
              <pre>{`// Node: HTTP Request
Method: POST
URL: http://localhost:3004/api/calculate-tar-v2

// Body (JSON)
{
  "ean": "{{$json.ean}}",
  "description": "{{$json.description}}",
  "type_produit": "{{$json.type}}",
  "marque": "{{$json.marque}}"
}

// Extraire les résultats dans le workflow suivant
{{ $json.tar.tarifTTC }}  // Tarif TTC
{{ $json.tar.organisme }} // Organisme TAR
{{ $json.confidence }}     // Score de confiance`}</pre>
            </div>
          </div>

          {/* Supabase Edge Function */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-green-600" />
              <h4 className="font-semibold text-neutral-900">Supabase Edge Function</h4>
            </div>
            <div className="bg-neutral-900 text-neutral-100 rounded-lg p-4 font-mono text-xs overflow-x-auto">
              <pre>{`// supabase/functions/calculate-tar/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const { ean, description, type_produit } = await req.json()

  const response = await fetch('http://localhost:3004/api/calculate-tar-v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ean, description, type_produit })
  })

  const data = await response.json()

  // Sauvegarder dans Supabase
  const { error } = await supabaseClient
    .from('tar_calculations')
    .insert({
      ean,
      product_name: data.product.nom_produit,
      tar_ht: data.tar.tarifHT,
      tar_ttc: data.tar.tarifTTC,
      organism: data.tar.organisme
    })

  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  })
})`}</pre>
            </div>
          </div>
        </div>

        {/* Health Check */}
        <div className="mt-6 border-t border-neutral-200 pt-6">
          <h4 className="text-sm font-semibold text-neutral-900 mb-2">Health Check</h4>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded">GET</span>
            <code className="text-sm font-mono text-neutral-900">/health</code>
          </div>
          <p className="text-sm text-neutral-600 mb-2">Vérifier l'état du serveur et les versions des barèmes</p>
          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 font-mono text-xs">
            <code>{`curl http://localhost:3004/health`}</code>
          </div>
        </div>
      </div>
    </>
  )
}

// ===================================
// TRANSPORT CALCULATOR API DOCS
// ===================================
function TransportCalculatorDocs() {
  return (
    <>
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-orange-500 flex items-center justify-center">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-neutral-900">Transport Calculator API</h2>
              <p className="text-sm text-neutral-600">v2.0.0 - Calcul des coûts de transport avec optimisation palettes</p>
            </div>
          </div>
          <Link
            href="/transport-calculator"
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Tester en live
          </Link>
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-6 mb-6">
        <div className="flex items-start gap-3">
          <Zap className="w-6 h-6 text-orange-600 mt-1" />
          <div>
            <h3 className="font-semibold text-orange-900 mb-2">Calcul intelligent des coûts de transport</h3>
            <div className="text-sm text-orange-800 space-y-2">
              <div>
                <strong>• Optimisation automatique:</strong> Calcule automatiquement le meilleur arrangement palette
                <br />
                <span className="text-orange-700">Support de multiples orientations produit (debout, couché, sur le côté) pour maximiser l'utilisation de l'espace.</span>
              </div>
              <div>
                <strong>• Multi-scénarios:</strong> Compare automatiquement différentes quantités
                <br />
                <span className="text-orange-700">Identifie le point optimal où le coût unitaire est minimal (idéal pour les recommandations clients).</span>
              </div>
              <div>
                <strong>• Multiples options:</strong> Retourne toutes les options de livraison disponibles
                <br />
                <span className="text-orange-700">DHL, Planzer, modes express/economy, formats colis/palette Euro/palette Industrial.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Base URL */}
      <div className="bg-white border border-border rounded-xl p-6">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Server className="w-4 h-4 text-neutral-600" />
            <span className="text-sm font-semibold text-neutral-700">URL de base</span>
          </div>
          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 font-mono text-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-neutral-600 text-xs mb-1">Développement</div>
                <code className="text-blue-600">http://localhost:3001</code>
              </div>
              <div>
                <div className="text-neutral-600 text-xs mb-1">Production</div>
                <code className="text-green-600">https://app.odl-tools.ch</code>
              </div>
            </div>
          </div>
        </div>

        {/* Endpoint: calculate-transport */}
        <div className="mb-6 border-l-4 border-orange-500 pl-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">POST</span>
            <code className="text-sm font-mono text-neutral-900">/api/calculate-transport</code>
          </div>

          <p className="text-sm text-neutral-600 mb-4">
            Calcule les coûts de transport avec optimisation automatique des palettes. Retourne le coût optimal,
            les options de livraison alternatives, et les scénarios d'optimisation pour différentes quantités.
          </p>

          {/* Request Body */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-neutral-900 mb-2">Body (JSON)</h4>
            <div className="bg-neutral-900 text-neutral-100 rounded-lg p-4 font-mono text-sm overflow-x-auto">
              <pre>{`{
  "length_cm": 15.5,              // OBLIGATOIRE - Longueur du produit
  "width_cm": 7.5,                // OBLIGATOIRE - Largeur du produit
  "height_cm": 0.8,               // OBLIGATOIRE - Hauteur du produit
  "weight_kg": 0.221,             // OBLIGATOIRE - Poids du produit
  "quantity": 100,                // Optionnel - Défaut: 1
  "carrier": null,                // Optionnel - "dhl", "planzer" ou null (auto)
  "mode": null,                   // Optionnel - "express", "economy" ou null (auto)
  "provider_id": "ohmex",         // Optionnel - ID fournisseur (défaut: ohmex)
  "pallet_format_id": "euro"      // Optionnel - "euro" ou "industrial" (défaut: euro)
}`}</pre>
            </div>
          </div>

          {/* Response */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-neutral-900 mb-2">Réponse</h4>
            <div className="bg-neutral-900 text-neutral-100 rounded-lg p-4 font-mono text-sm overflow-x-auto">
              <pre>{`{
  "success": true,
  "costs": {
    "transport": {
      "base": 285.00,              // Coût HT transporteur
      "margin": 42.75,             // Marge O!Deal (15%)
      "tva": 26.55,                // TVA 8.1%
      "subtotal": 327.75,          // Total TTC transporteur
      "per_unit": 3.28,            // Coût par unité
      "carrier": "planzer",        // Transporteur sélectionné
      "mode": "economy",           // Mode de livraison
      "format_label": "Palette Euro", // Format conteneur
      "container_dimensions": {    // Dimensions palette
        "length_cm": 120,
        "width_cm": 80,
        "height_cm": 144
      }
    },
    "total_per_unit": 3.28,        // Coût total par unité
    "delivery_options": [          // TOUTES les options disponibles
      {
        "carrier": "planzer",
        "mode": "economy",
        "format_label": "Palette Euro",
        "base": 285.00,
        "margin": 42.75,
        "tva": 26.55,
        "total": 327.75,
        "per_unit": 3.28,
        "is_selected": true        // Option choisie automatiquement
      },
      {
        "carrier": "dhl",
        "mode": "express",
        "format_label": "Palette Euro",
        "base": 420.00,
        "margin": 63.00,
        "tva": 39.12,
        "total": 459.12,
        "per_unit": 4.59,
        "is_selected": false
      }
      // ... autres options
    ]
  },
  "customer_optimization": {       // Optimisation quantités
    "success": true,
    "scenarios": [
      {
        "quantity": 1,
        "container": {
          "format_label": "Colis Standard",
          "carrier": "dhl",
          "mode": "express"
        },
        "cost_total": 45.50,
        "cost_unitaire": 45.50,
        "is_optimal": false,
        "savings_vs_single": 0
      },
      {
        "quantity": 100,
        "container": {
          "format_label": "Palette Euro",
          "carrier": "planzer",
          "mode": "economy",
          "dimensions": {
            "length_cm": 120,
            "width_cm": 80,
            "height_cm": 144
          }
        },
        "arrangement": {
          "products_per_layer": 64,  // Produits par couche
          "max_layers": 8,            // Nombre de couches max
          "layers_needed": 2,         // Couches nécessaires
          "orientation_used": 1       // Orientation choisie (1=debout, 2=couché, 3=côté)
        },
        "cost_total": 327.75,
        "cost_unitaire": 3.28,         // ← COÛT OPTIMAL
        "is_optimal": true,
        "savings_vs_single": 42.22     // Économie vs achat unitaire (CHF)
      }
      // ... autres scénarios (50, 200, 500 unités...)
    ],
    "optimal_quantity": 100,
    "min_cost_unitaire": 3.28
  },
  "pallet_info": {                   // Détails arrangement palette
    "success": true,
    "pallet_format": {
      "id": "euro",
      "name": "Palette Euro (EPAL)",
      "dimensions": {
        "length_cm": 120,
        "width_cm": 80,
        "height_cm": 144,
        "max_weight_kg": 1000,
        "pallet_height_cm": 14.4,
        "available_height_cm": 129.6
      }
    },
    "calculation": {
      "products_per_layer": 64,      // Par couche
      "layers_per_pallet": 8,        // Nombre de couches possibles
      "products_per_pallet_dimension": 512, // Limité par dimensions
      "products_per_pallet_weight": 4524,   // Limité par poids
      "products_per_pallet_final": 512,     // Capacité finale
      "pallets_needed": 1,           // Palettes nécessaires
      "total_products_shipped": 512, // Total expédiable
      "product_loss": 0,             // Produits non expédiés
      "efficiency_percent": 100.00,  // Efficacité utilisation
      "orientation_used": 1,         // Orientation choisie
      "product_base_length": 15.5,   // Dimensions produit utilisées
      "product_base_width": 7.5,
      "product_stack_height": 0.8
    }
  }
}`}</pre>
            </div>
          </div>

          {/* Validation Notes */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
            <div className="flex items-start gap-2">
              <Zap className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h5 className="font-semibold text-amber-900 text-sm mb-1">Champs obligatoires</h5>
                <ul className="text-sm text-amber-800 space-y-1">
                  <li>• <code className="bg-amber-100 px-1 rounded">length_cm</code>, <code className="bg-amber-100 px-1 rounded">width_cm</code>, <code className="bg-amber-100 px-1 rounded">height_cm</code> : Dimensions du produit (nombres {'>'} 0)</li>
                  <li>• <code className="bg-amber-100 px-1 rounded">weight_kg</code> : Poids du produit (nombre {'>'} 0)</li>
                  <li>• Les autres champs sont optionnels et utilisent des valeurs par défaut intelligentes</li>
                </ul>
              </div>
            </div>
          </div>

          {/* cURL Example */}
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-neutral-900 mb-2">Exemple cURL</h4>
            <div className="bg-neutral-900 text-neutral-100 rounded-lg p-4 font-mono text-xs overflow-x-auto">
              <pre>{`curl -X POST https://app.odl-tools.ch/api/calculate-transport \\
  -H "Content-Type: application/json" \\
  -d '{
    "length_cm": 15.5,
    "width_cm": 7.5,
    "height_cm": 0.8,
    "weight_kg": 0.221,
    "quantity": 100
  }'`}</pre>
            </div>
          </div>
        </div>

        {/* WeWeb Integration Section */}
        <div className="mt-8 border-t pt-6">
          <h3 className="text-2xl font-bold text-neutral-900 mb-4 flex items-center gap-2">
            <Code2 className="w-6 h-6 text-orange-600" />
            Intégration WeWeb
          </h3>

          {/* Step 1: API Request */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-neutral-900 mb-3">1. Configuration de l'API Request</h4>
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="font-semibold text-blue-900 mb-2">Créer une nouvelle API Request</div>
                <div className="text-sm text-blue-800 space-y-1">
                  <div>• <strong>Nom:</strong> <code className="bg-blue-100 px-1 rounded">Calculate Transport Cost</code></div>
                  <div>• <strong>Méthode:</strong> POST</div>
                  <div>• <strong>URL:</strong> <code className="bg-blue-100 px-1 rounded">https://app.odl-tools.ch/api/calculate-transport</code></div>
                  <div>• <strong>Headers:</strong></div>
                  <div className="ml-4 bg-blue-100 rounded p-2 font-mono text-xs">
                    Content-Type: application/json
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="font-semibold text-purple-900 mb-2">Body de la requête (depuis votre formulaire)</div>
                <div className="bg-neutral-900 text-neutral-100 rounded-lg p-3 font-mono text-xs overflow-x-auto">
                  <pre>{`{
  "length_cm": item.length_cm,
  "width_cm": item.width_cm,
  "height_cm": item.height_cm,
  "weight_kg": item.weight_kg,
  "quantity": item.quantity || 1
}`}</pre>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Display Results */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-neutral-900 mb-3">2. Afficher les Résultats</h4>
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="font-semibold text-green-900 mb-2">Variables à extraire de la réponse</div>
                <div className="bg-neutral-900 text-neutral-100 rounded-lg p-3 font-mono text-xs overflow-x-auto">
                  <pre>{`// Coût optimal sélectionné automatiquement
transportCostPerUnit = response.data.costs.total_per_unit

// Transporteur et mode choisis
carrier = response.data.costs.transport.carrier
mode = response.data.costs.transport.mode
format = response.data.costs.transport.format_label

// Pour optimisation client (recommandations)
optimalQuantity = response.data.customer_optimization.optimal_quantity
minCostPerUnit = response.data.customer_optimization.min_cost_unitaire
savingsVsSingle = response.data.customer_optimization.scenarios
  .find(s => s.is_optimal).savings_vs_single

// Toutes les options de livraison
deliveryOptions = response.data.costs.delivery_options`}</pre>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Advanced - Display Options */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-neutral-900 mb-3">3. Afficher les Options de Livraison (Avancé)</h4>
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <div className="font-semibold text-indigo-900 mb-2">Créer un Repeater pour les options</div>
              <div className="text-sm text-indigo-800 space-y-2">
                <div>• <strong>Collection:</strong> <code className="bg-indigo-100 px-1 rounded">response.data.costs.delivery_options</code></div>
                <div>• <strong>Afficher pour chaque option:</strong></div>
                <div className="ml-4 space-y-1">
                  <div>- <code className="bg-indigo-100 px-1 rounded">item.carrier</code> + <code className="bg-indigo-100 px-1 rounded">item.mode</code> (ex: "DHL Express")</div>
                  <div>- <code className="bg-indigo-100 px-1 rounded">item.format_label</code> (ex: "Palette Euro")</div>
                  <div>- <code className="bg-indigo-100 px-1 rounded">item.total</code> CHF TTC</div>
                  <div>- <code className="bg-indigo-100 px-1 rounded">item.per_unit</code> CHF par unité</div>
                  <div>- Badge "Recommandé" si <code className="bg-indigo-100 px-1 rounded">item.is_selected === true</code></div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4: Optimization Scenarios */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-neutral-900 mb-3">4. Afficher les Scénarios d'Optimisation</h4>
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
              <div className="font-semibold text-teal-900 mb-2">Recommandations de quantité optimale</div>
              <div className="text-sm text-teal-800 space-y-2">
                <div>• <strong>Collection:</strong> <code className="bg-teal-100 px-1 rounded">response.data.customer_optimization.scenarios</code></div>
                <div>• <strong>Message au client:</strong></div>
                <div className="ml-4 bg-teal-100 rounded p-2 font-mono text-xs">
                  {`"En commandant {optimal_quantity} unités au lieu de 1,
vous économisez {savings_vs_single} CHF
(coût unitaire: {min_cost_unitaire} CHF au lieu de {cost_single} CHF)"`}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Best Practices */}
        <div className="mt-6 bg-neutral-50 border border-neutral-200 rounded-lg p-4">
          <h4 className="font-semibold text-neutral-900 mb-2 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-neutral-600" />
            Bonnes Pratiques
          </h4>
          <ul className="text-sm text-neutral-700 space-y-1">
            <li>• Toujours vérifier <code className="bg-neutral-200 px-1 rounded">response.data.success === true</code> avant d'utiliser les données</li>
            <li>• Utiliser <code className="bg-neutral-200 px-1 rounded">delivery_options</code> pour donner le choix au client entre plusieurs transporteurs</li>
            <li>• Afficher <code className="bg-neutral-200 px-1 rounded">customer_optimization</code> pour encourager les commandes groupées</li>
            <li>• Le champ <code className="bg-neutral-200 px-1 rounded">is_selected: true</code> indique l'option recommandée (meilleur rapport qualité/prix)</li>
            <li>• Les dimensions sont en <strong>centimètres</strong>, le poids en <strong>kilogrammes</strong></li>
          </ul>
        </div>
      </div>
    </>
  )
}

// ===================================
// IMAGE CONVERTER API DOCS
// ===================================
function ImageConverterDocs() {
  return (
    <>
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-indigo-500 flex items-center justify-center">
              <ImageIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-neutral-900">Image Converter API</h2>
              <p className="text-sm text-neutral-600">v1.0.0 - Conversion d'images en WebP avec transformations</p>
            </div>
          </div>
          <Link
            href="/image-converter-test"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Tester en live
          </Link>
        </div>
      </div>

      {/* Base URL */}
      <div className="bg-white border border-border rounded-xl p-6">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Server className="w-4 h-4 text-neutral-600" />
            <span className="text-sm font-semibold text-neutral-700">URL de base</span>
          </div>
          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 font-mono text-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-neutral-600 text-xs mb-1">Développement</div>
                <code className="text-blue-600">http://localhost:3005</code>
              </div>
              <div>
                <div className="text-neutral-600 text-xs mb-1">Production</div>
                <code className="text-green-600">https://img.odl-tools.ch</code>
              </div>
            </div>
          </div>
        </div>

        {/* Endpoint: convert */}
        <div className="mb-6 border-l-4 border-indigo-500 pl-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">POST</span>
            <code className="text-sm font-mono text-neutral-900">/api/convert</code>
          </div>

          <p className="text-sm text-neutral-600 mb-4">
            Convertit une image en WebP avec transformations optionnelles (crop, zoom, resize). Upload automatique vers Supabase Storage.
          </p>

          {/* Request Body */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-neutral-900 mb-2">Body (multipart/form-data)</h4>
            <div className="bg-neutral-900 text-neutral-100 rounded-lg p-4 font-mono text-sm overflow-x-auto">
              <pre>{`// Fichier requis
image: File                    // Image (JPG, PNG, WebP, SVG)

// Transformations optionnelles
x: Number                      // Position X du crop (défaut: 0)
y: Number                      // Position Y du crop (défaut: 0)
zoom: Number                   // Facteur de zoom (défaut: 1)
cropWidth: Number              // Largeur du crop en pixels
cropHeight: Number             // Hauteur du crop en pixels
width: Number                  // Largeur finale en pixels
height: Number                 // Hauteur finale en pixels

// Options de qualité
quality: Number                // Qualité WebP 0-100 (défaut: 80)
effort: Number                 // Effort de compression 0-6 (défaut: 6)

// Options upload
uploadToStorage: String        // "true" pour upload Supabase (défaut: true)
userId: String                 // ID utilisateur pour métadonnées`}</pre>
            </div>
          </div>

          {/* Response avec upload */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-neutral-900 mb-2">Réponse (avec upload)</h4>
            <div className="bg-neutral-900 text-neutral-100 rounded-lg p-4 font-mono text-sm overflow-x-auto">
              <pre>{`{
  "success": true,
  "message": "Image convertie et uploadée avec succès",
  "data": {
    "path": "2025/1/550e8400-e29b-41d4-a716-446655440000.webp",
    "publicUrl": "https://.../converted-images/2025/1/....webp",
    "size": 45678,
    "originalSize": 123456,
    "convertedSize": 45678,
    "compressionRatio": "63.0%",
    "transformations": {
      "x": 100,
      "y": 50,
      "zoom": 1.5,
      "cropWidth": 800,
      "cropHeight": 600,
      "width": null,
      "height": null
    }
  }
}`}</pre>
            </div>
          </div>

          {/* Response sans upload */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-neutral-900 mb-2">Réponse (sans upload)</h4>
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 text-sm">
              <p className="text-neutral-700">
                L'image WebP est retournée directement avec le header <code className="bg-neutral-200 px-1 rounded">Content-Type: image/webp</code>
              </p>
            </div>
          </div>
        </div>

        {/* Integration Examples */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Exemples d'intégration</h3>

          {/* JavaScript / Fetch */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <LinkIcon className="w-4 h-4 text-indigo-600" />
              <h4 className="font-semibold text-neutral-900">JavaScript / Fetch</h4>
            </div>
            <div className="bg-neutral-900 text-neutral-100 rounded-lg p-4 font-mono text-xs overflow-x-auto">
              <pre>{`// Conversion simple
const formData = new FormData();
formData.append('image', fileInput.files[0]);

const response = await fetch('http://localhost:3005/api/convert', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log('Image WebP:', result.data.publicUrl);

// Avec transformations
const formData = new FormData();
formData.append('image', fileInput.files[0]);
formData.append('x', 100);
formData.append('y', 50);
formData.append('zoom', 1.5);
formData.append('cropWidth', 800);
formData.append('cropHeight', 600);
formData.append('quality', 85);

const response = await fetch('http://localhost:3005/api/convert', {
  method: 'POST',
  body: formData
});`}</pre>
            </div>
          </div>

          {/* Weweb */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <LinkIcon className="w-4 h-4 text-blue-600" />
              <h4 className="font-semibold text-neutral-900">Weweb (REST API)</h4>
            </div>
            <div className="bg-neutral-900 text-neutral-100 rounded-lg p-4 font-mono text-xs overflow-x-auto">
              <pre>{`// Configuration du REST API Data Source dans Weweb
Base URL: http://localhost:3005 (ou https://img.odl-tools.ch en prod)
Endpoint: /api/convert
Method: POST
Headers:
  Content-Type: multipart/form-data

// Body (bindings Weweb)
image: {{file_input.files[0]}}
x: {{input_x.value}}
y: {{input_y.value}}
zoom: {{input_zoom.value}}
cropWidth: {{input_cropWidth.value}}
cropHeight: {{input_cropHeight.value}}
quality: {{input_quality.value}}

// Afficher le résultat
{{api_response.data.publicUrl}}
Gain: {{api_response.data.compressionRatio}}`}</pre>
            </div>
          </div>

          {/* N8N */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <LinkIcon className="w-4 h-4 text-purple-600" />
              <h4 className="font-semibold text-neutral-900">N8N (HTTP Request Node)</h4>
            </div>
            <div className="bg-neutral-900 text-neutral-100 rounded-lg p-4 font-mono text-xs overflow-x-auto">
              <pre>{`// Node: HTTP Request
Method: POST
URL: http://localhost:3005/api/convert

// Body (Form-Data)
image: Binary Data ({{$binary.data}})
zoom: "{{$json.zoom}}"
quality: "{{$json.quality}}"
uploadToStorage: "true"

// Extraire les résultats dans le workflow suivant
{{ $json.data.publicUrl }}        // URL publique
{{ $json.data.compressionRatio }} // Gain de compression
{{ $json.data.convertedSize }}    // Taille finale`}</pre>
            </div>
          </div>

          {/* Supabase Edge Function */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-green-600" />
              <h4 className="font-semibold text-neutral-900">Supabase Edge Function</h4>
            </div>
            <div className="bg-neutral-900 text-neutral-100 rounded-lg p-4 font-mono text-xs overflow-x-auto">
              <pre>{`// supabase/functions/convert-image/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const formData = await req.formData()
  const file = formData.get('image')

  const convertFormData = new FormData()
  convertFormData.append('image', file)
  convertFormData.append('quality', '85')
  convertFormData.append('zoom', '1.2')

  const response = await fetch('http://localhost:3005/api/convert', {
    method: 'POST',
    body: convertFormData
  })

  const data = await response.json()

  // Sauvegarder les métadonnées dans Supabase
  const { error } = await supabaseClient
    .from('converted_images')
    .insert({
      original_name: file.name,
      webp_url: data.data.publicUrl,
      original_size: data.data.originalSize,
      converted_size: data.data.convertedSize,
      compression_ratio: data.data.compressionRatio
    })

  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  })
})`}</pre>
            </div>
          </div>
        </div>

        {/* Use Cases */}
        <div className="mt-6 bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Zap className="w-5 h-5 text-indigo-600 mt-0.5" />
            <div>
              <h5 className="font-semibold text-indigo-900 text-sm mb-2">Cas d'usage</h5>
              <ul className="text-sm text-indigo-800 space-y-1">
                <li>• <strong>Crop avec position et zoom</strong> : Sélectionner une zone spécifique d'une image avec zoom 150%</li>
                <li>• <strong>Resize proportionnel</strong> : Redimensionner en gardant les proportions (width ou height)</li>
                <li>• <strong>Conversion SVG</strong> : Rasterisation automatique des SVG avant conversion WebP</li>
                <li>• <strong>Téléchargement direct</strong> : Retourner l'image sans upload (uploadToStorage: false)</li>
                <li>• <strong>Optimisation performance</strong> : Réduction moyenne de 50-70% de la taille originale</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Health Check */}
        <div className="mt-6 border-t border-neutral-200 pt-6">
          <h4 className="text-sm font-semibold text-neutral-900 mb-2">Health Check</h4>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded">GET</span>
            <code className="text-sm font-mono text-neutral-900">/api/health</code>
          </div>
          <p className="text-sm text-neutral-600 mb-2">Vérifier l'état du serveur et la version de Sharp</p>
          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 font-mono text-xs">
            <code>{`curl http://localhost:3005/api/health`}</code>
          </div>
        </div>
      </div>
    </>
  )
}

// ===================================
// TRANSLATION API DOCS
// ===================================
function TranslationDocs() {
  return (
    <>
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-purple-500 flex items-center justify-center">
              <Languages className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-neutral-900">API de Traduction</h2>
              <p className="text-sm text-neutral-600">v1.0.0 - Traduction multilingue (à venir)</p>
            </div>
          </div>
          <Link
            href="/translation-test"
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Voir l'interface
          </Link>
        </div>
      </div>

      {/* Coming Soon */}
      <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-purple-500 flex items-center justify-center mx-auto mb-4">
          <Languages className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-xl font-bold text-purple-900 mb-2">Documentation à venir</h3>
        <p className="text-purple-700 mb-4">
          L'API de traduction est en cours de développement. La documentation sera disponible prochainement.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-200 text-purple-800 rounded-lg text-sm font-medium">
          <Zap className="w-4 h-4" />
          Fonctionnalités prévues : Traduction automatique, détection de langue, support multi-formats
        </div>
      </div>
    </>
  )
}

// ===================================
// VALIDATION O!DEAL API DOCS
// ===================================
function ValidationApiDocs() {
  return (
    <>
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-green-500 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-neutral-900">API Validation O!Deal</h2>
              <p className="text-sm text-neutral-600">v1.1.0 - Validation automatique des offres fournisseurs</p>
            </div>
          </div>
          <a
            href="https://api.odl-tools.ch/api/validate-item"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            API Documentation
          </a>
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 mb-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-6 h-6 text-green-600 mt-1" />
          <div>
            <h3 className="font-semibold text-green-900 mb-2">Validation complète des offres</h3>
            <div className="text-sm text-green-800 space-y-2">
              <div>
                <strong>• Calcul COGS interne</strong> : Achat HT + conversion devise + logistique + douane + frais paiement
              </div>
              <div>
                <strong>• Règles métier hiérarchiques</strong> : Règles globales, par catégorie ou par sous-catégorie (configurables dans ODL Rules)
              </div>
              <div>
                <strong>• Deal status</strong> : top (⭐ excellent), good (✅ bon), almost (⚠️ limite), bad (❌ refusé)
              </div>
              <div>
                <strong>• Projections financières</strong> : BEP, risk score A/B/C/D, scénarios calculés automatiquement
              </div>
              <div>
                <strong>⚠️ Données sensibles protégées</strong> : Les coûts détaillés, marges et seuils ne sont PAS exposés aux fournisseurs
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Base URL */}
      <div className="bg-white border border-border rounded-xl p-6">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Server className="w-4 h-4 text-neutral-600" />
            <span className="text-sm font-semibold text-neutral-700">URL de base</span>
          </div>
          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 font-mono text-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-neutral-600 text-xs mb-1">Développement</div>
                <code className="text-blue-600">http://localhost:3001</code>
              </div>
              <div>
                <div className="text-neutral-600 text-xs mb-1">Production VPS</div>
                <code className="text-green-600">https://api.odl-tools.ch</code>
              </div>
            </div>
          </div>
        </div>

        {/* Endpoint: validate-item */}
        <div className="mb-6 border-l-4 border-green-500 pl-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">POST</span>
            <code className="text-sm font-mono text-neutral-900">/api/validate-item</code>
          </div>

          <p className="text-sm text-neutral-600 mb-4">
            Validation complète d'un item avec calcul COGS, marges, économies client et statut du deal.
            Connexion directe à la base de données Supabase production.
          </p>

          {/* Authentication */}
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h5 className="font-semibold text-amber-900 text-sm mb-1">Authentication requise</h5>
                <p className="text-sm text-amber-800">
                  Ajouter l'API key dans le header <code className="bg-amber-100 px-1 rounded">X-API-Key</code> ou <code className="bg-amber-100 px-1 rounded">Authorization</code>
                </p>
              </div>
            </div>
          </div>

          {/* Request Body */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-neutral-900 mb-2">Body (JSON)</h4>
            <div className="bg-neutral-900 text-neutral-100 rounded-lg p-4 font-mono text-sm overflow-x-auto">
              <pre>{`{
  // ✅ OBLIGATOIRES (6 champs)
  "offer_id": "uuid",                    // UUID de l'offre
  "item_id": null,                       // TEXT ou NULL - Auto-généré si NULL
  "msrp": 299,                           // Prix MSRP TTC CHF
  "street_price": 249,                   // Prix street TTC CHF
  "promo_price": 169,                    // Prix promo TTC CHF
  "purchase_price_ht": 80,               // Prix achat HT

  // ⭐ RECOMMANDÉS (Architecture multilingue avec IDs)
  "category_id": "c1",                   // ID catégorie (recommandé)
  "subcategory_id": "s5",                // ID sous-catégorie (recommandé)
  "purchase_currency": "EUR",            // Devise (EUR|USD|GBP|CHF)

  // 📝 OPTIONNELS (Legacy - compatibilité noms)
  "category_name": "Electronics",        // Catégorie par nom (fallback)
  "subcategory_name": "Smartphones",     // Sous-catégorie par nom (fallback)
  "product_name": "iPhone 15 Pro",       // Nom du produit
  "ean": "0888413779764",                // EAN si différent de item_id
  "quantity": 10,                        // Quantité (défaut: 1)
  "package_weight_kg": 0.8,              // Poids en kg (défaut: 0.5)
  "pesa_fee_ht": 2.50,                   // Frais PESA HT (défaut: 0)
  "warranty_cost_ht": 0                  // Coût garantie HT (défaut: 0)
}`}</pre>
            </div>
          </div>

          {/* Response */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-neutral-900 mb-2">Réponse</h4>
            <div className="bg-neutral-900 text-neutral-100 rounded-lg p-4 font-mono text-sm overflow-x-auto">
              <pre>{`{
  "success": true,
  "is_valid": true,                      // Deal valide selon les règles
  "deal_status": "good",                 // top|good|almost|bad
  "cost_id": "uuid",                     // ID du calcul (référence interne)
  "generated_item_id": "uuid",           // 🆕 UUID auto-généré si item_id NULL

  "item_details": {
    "item_id": null,                     // Code EAN/SKU (null si auto-généré)
    "ean": "0888413779764",              // EAN
    "product_name": "iPhone 15 Pro"      // Nom du produit
  },

  "pricing": {
    "msrp": 1299.00,                     // Prix MSRP TTC CHF
    "street_price": 1199.00,             // Prix street TTC CHF
    "promo_price": 999.00,               // Prix promo TTC CHF
    "purchase_price_original": 750.00,   // Prix achat original
    "purchase_currency": "EUR",          // Devise d'achat
    "currency_rate": 0.95                // Taux de conversion appliqué
  },

  "applied_rule": {
    "rule_id": "uuid",                   // ID de la règle appliquée
    "rule_name": "Electronics - Smartphones Rules",
    "scope": "subcategory",              // global|category|subcategory
    "category": "Electronics",           // Catégorie
    "subcategory": "Smartphones"         // Sous-catégorie
  },

  "validation_issues": [                 // Vide si validé, sinon liste des issues
    {
      "issue": "deal_marginal",
      "message": "Deal acceptable mais pourrait être amélioré"
    }
  ]
}

// ⚠️ DONNÉES NON EXPOSÉES (confidentielles O!Deal):
// - Coûts détaillés (logistique, douane, TAR, PESA, frais paiement)
// - Marges calculées (brute, pourcentage)
// - Seuils de validation (min/max marges, économies)
// - Projections financières (BEP, risk score)
`}</pre>
            </div>
          </div>

          {/* Deal Statuses */}
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <h5 className="font-semibold text-green-900 text-sm mb-2">Statuts de deal</h5>
                <div className="text-sm text-green-800 space-y-2">
                  <div>
                    <strong className="text-green-700">⭐ top</strong> : Excellent deal - Publier immédiatement
                  </div>
                  <div>
                    <strong className="text-blue-700">✅ good</strong> : Bon deal - Publier normalement
                  </div>
                  <div>
                    <strong className="text-amber-700">⚠️ almost</strong> : Deal marginal - Évaluer au cas par cas
                  </div>
                  <div>
                    <strong className="text-red-700">❌ bad</strong> : Deal refusé - Ne PAS publier
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-green-300 text-xs text-green-700">
                  <strong>Note</strong> : Les critères exacts (marges min/max, économies requises) sont définis dans les règles métier ODL (confidentielles) et peuvent varier par catégorie/sous-catégorie.
                </div>
              </div>
            </div>
          </div>

          {/* cURL Example */}
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-neutral-900 mb-2">Exemple cURL</h4>
            <div className="bg-neutral-900 text-neutral-100 rounded-lg p-4 font-mono text-xs overflow-x-auto">
              <pre>{`curl -X POST https://api.odl-tools.ch/api/validate-item \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: WEWEB_PRODUCTION_2025_API_KEY" \\
  -d '{
    "offer_id": "1f218950-3789-4176-a883-958c593a84af",
    "supplier_id": "334773ca-22ab-43bb-834f-eb50aa1d01f8",
    "item_id": "888413779764",
    "ean": "0888413779764",
    "product_name": "iPhone 15 Pro 256GB",
    "category_name": "Electronics",
    "subcategory_name": "Smartphones",
    "msrp": 1299,
    "street_price": 1199,
    "promo_price": 999,
    "purchase_price_ht": 750,
    "purchase_currency": "EUR",
    "quantity": 10,
    "package_weight_kg": 0.8
  }'`}</pre>
            </div>
          </div>
        </div>

        {/* Integration Examples */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Exemples d'intégration</h3>

          {/* WeWeb */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <LinkIcon className="w-4 h-4 text-blue-600" />
              <h4 className="font-semibold text-neutral-900">WeWeb (REST API)</h4>
            </div>
            <div className="bg-neutral-900 text-neutral-100 rounded-lg p-4 font-mono text-xs overflow-x-auto">
              <pre>{`// Configuration du REST API Data Source dans WeWeb
Base URL: https://api.odl-tools.ch
Endpoint: /api/validate-item
Method: POST
Headers:
  Content-Type: application/json
  X-API-Key: {{supplier_api_key}}

// Body (bindings depuis formulaire)
{
  "offer_id": {{offer.id}},
  "supplier_id": {{supplier.id}},
  "item_id": {{product.ean || product.sku}},
  "ean": {{product.ean}},
  "product_name": {{product.name}},
  "category_name": {{product.category.name}},
  "subcategory_name": {{product.subcategory.name}},
  "msrp": {{product.msrp}},
  "street_price": {{product.street_price}},
  "promo_price": {{product.promo_price}},
  "purchase_price_ht": {{product.purchase_price}},
  "purchase_currency": {{product.currency || "CHF"}},
  "quantity": {{product.quantity}},
  "package_weight_kg": {{product.weight}}
}

// Afficher les résultats
Deal Status: {{response.deal_status}}
Valid: {{response.is_valid}}
Product: {{response.item_details.product_name}}
Rule: {{response.applied_rule.rule_name}}`}</pre>
            </div>
          </div>

          {/* N8N */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <LinkIcon className="w-4 h-4 text-purple-600" />
              <h4 className="font-semibold text-neutral-900">N8N (HTTP Request Node)</h4>
            </div>
            <div className="bg-neutral-900 text-neutral-100 rounded-lg p-4 font-mono text-xs overflow-x-auto">
              <pre>{`// Node: HTTP Request
Method: POST
URL: https://api.odl-tools.ch/api/validate-item
Authentication: Generic Credential
Credential Data:
  Header Name: X-API-Key
  Value: {{$credentials.apiKey}}

// Body (JSON)
{
  "offer_id": "{{$json.offer_id}}",
  "supplier_id": "{{$json.supplier_id}}",
  "item_id": "{{$json.ean || $json.sku}}",
  "product_name": "{{$json.product_name}}",
  "category_name": "{{$json.category}}",
  "subcategory_name": "{{$json.subcategory}}",
  "msrp": {{$json.msrp}},
  "street_price": {{$json.street_price}},
  "promo_price": {{$json.promo_price}},
  "purchase_price_ht": {{$json.purchase_price}},
  "purchase_currency": "{{$json.currency}}",
  "quantity": {{$json.quantity}}
}

// Extraire dans le workflow suivant
{{ $json.deal_status }}              // Statut: top|good|almost|bad
{{ $json.is_valid }}                 // Deal valide?
{{ $json.item_details.product_name }} // Nom du produit
{{ $json.applied_rule.rule_name }}   // Règle appliquée`}</pre>
            </div>
          </div>
        </div>

        {/* API Keys Management */}
        <div className="mt-6 border-t border-neutral-200 pt-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Gestion des API Keys</h3>

          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h5 className="font-semibold text-blue-900 text-sm mb-2">API Key de test (production)</h5>
                <div className="text-sm text-blue-800 space-y-1">
                  <p><strong>API Key</strong> : <code className="bg-blue-100 px-2 py-1 rounded">odl_sup_prod_test_xyz789</code></p>
                  <p><strong>Supplier</strong> : Test Company SA - PRODUCTION</p>
                  <p><strong>Quota</strong> : 1000 validations/jour</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <h4 className="text-sm font-semibold text-neutral-900 mb-2">Créer une API key réelle</h4>
            <div className="bg-neutral-900 text-neutral-100 rounded-lg p-4 font-mono text-xs overflow-x-auto">
              <pre>{`# 1. Générer une clé aléatoire sécurisée
API_KEY="odl_sup_prod_$(openssl rand -hex 12)"
echo "API Key: $API_KEY"

# 2. Calculer le hash SHA256
HASH=$(echo -n "$API_KEY" | shasum -a 256 | cut -d' ' -f1)
echo "Hash: $HASH"

# 3. Insérer dans Supabase (via Dashboard SQL Editor)
INSERT INTO supplier_registry (
  supplier_id,
  company_name,
  api_key_hash,
  api_key_prefix,
  validation_status,
  is_active,
  max_daily_validations
)
VALUES (
  gen_random_uuid(),
  'Nom du Fournisseur SA',
  '$HASH',
  'odl_sup_prod',
  'approved',
  true,
  1000
);

# 4. Communiquer UNIQUEMENT l'API_KEY au fournisseur
# ⚠️ NE JAMAIS stocker la clé en clair dans la BDD`}</pre>
            </div>
          </div>
        </div>

        {/* Error Responses */}
        <div className="mt-6 border-t border-neutral-200 pt-6">
          <h4 className="text-sm font-semibold text-neutral-900 mb-2">Codes de réponse</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <span className="px-2 py-1 bg-green-100 text-green-700 font-mono text-xs rounded">200</span>
              <span className="text-neutral-700">Validation réussie (même si deal refusé)</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="px-2 py-1 bg-red-100 text-red-700 font-mono text-xs rounded">400</span>
              <span className="text-neutral-700">Requête invalide (champs manquants, format incorrect)</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="px-2 py-1 bg-amber-100 text-amber-700 font-mono text-xs rounded">401</span>
              <span className="text-neutral-700">API key invalide ou manquante</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="px-2 py-1 bg-amber-100 text-amber-700 font-mono text-xs rounded">429</span>
              <span className="text-neutral-700">Quota journalier dépassé</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="px-2 py-1 bg-red-100 text-red-700 font-mono text-xs rounded">500</span>
              <span className="text-neutral-700">Erreur serveur interne</span>
            </div>
          </div>
        </div>

        {/* Health Check */}
        <div className="mt-6 border-t border-neutral-200 pt-6">
          <h4 className="text-sm font-semibold text-neutral-900 mb-2">Documentation API (GET)</h4>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded">GET</span>
            <code className="text-sm font-mono text-neutral-900">/api/validate-item</code>
          </div>
          <p className="text-sm text-neutral-600 mb-2">Obtenir la documentation complète de l'API</p>
          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 font-mono text-xs">
            <code>{`curl https://api.odl-tools.ch/api/validate-item`}</code>
          </div>
        </div>
      </div>
    </>
  )
}
