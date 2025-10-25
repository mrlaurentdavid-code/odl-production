'use client'

import { useState } from 'react'
import { Code2, Server, Zap, Database, Link as LinkIcon, Calculator, Image as ImageIcon, Languages, ExternalLink, CheckCircle, ShieldCheck } from 'lucide-react'
import { BackToDashboard } from '@/components/ui/BackToDashboard'
import Link from 'next/link'

type ApiSection = 'tar' | 'image-converter' | 'translation' | 'validation'

export default function ApiDocsPage() {
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
      version: 'v1.0.0',
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
                  backgroundColor: api.color === 'blue' ? '#3b82f6' : api.color === 'indigo' ? '#6366f1' : api.color === 'purple' ? '#a855f7' : '#22c55e'
                } : {}}
              >
                <div className="flex items-start gap-3">
                  <div className={`
                    w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                  `}
                  style={!isActive && !isComingSoon ? {
                    backgroundColor: api.color === 'blue' ? '#dbeafe' : api.color === 'indigo' ? '#e0e7ff' : api.color === 'purple' ? '#f3e8ff' : '#dcfce7'
                  } : isActive ? { backgroundColor: 'rgba(255,255,255,0.2)' } : { backgroundColor: '#e5e5e5' }}>
                    <Icon className="w-5 h-5"
                      style={!isActive && !isComingSoon ? {
                        color: api.color === 'blue' ? '#2563eb' : api.color === 'indigo' ? '#4f46e5' : api.color === 'purple' ? '#9333ea' : '#16a34a'
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
              <p className="text-sm text-neutral-600">v1.0.0 - Validation automatique des offres fournisseurs</p>
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
                <strong>• Calcul COGS complet</strong> : Achat HT + conversion devise + logistique (DHL + Swiss Post) + douane + frais paiement
              </div>
              <div>
                <strong>• Validation marges</strong> : Marge brute minimum 20%, cible 30%, maximum 50%
              </div>
              <div>
                <strong>• Économies client</strong> : Minimum 30% vs MSRP, 18% vs street price
              </div>
              <div>
                <strong>• Deal status</strong> : top (excellent), good (bon), almost (limite), bad (refusé)
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
  // OBLIGATOIRES
  "offer_id": "uuid",                    // UUID de l'offre
  "item_id": "uuid",                     // UUID de l'item
  "msrp": 299,                           // Prix MSRP TTC CHF
  "street_price": 249,                   // Prix street TTC CHF
  "promo_price": 169,                    // Prix promo TTC CHF
  "purchase_price_ht": 80,               // Prix achat HT

  // OPTIONNELS
  "purchase_currency": "EUR",            // EUR|USD|GBP|CHF (défaut: CHF)
  "product_name": "AirPods Pro 2",       // Nom du produit
  "ean": "1234567890123",                // Code EAN
  "package_weight_kg": 0.5,              // Poids en kg
  "subcategory_id": "uuid",              // Subcategory ID
  "quantity": 1,                         // Quantité (défaut: 1)
  "pesa_fee_ht": 0,                      // Frais PESA HT (défaut: 0)
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
  "deal_status": "top",                  // top|good|almost|bad
  "cost_id": "uuid",                     // ID de la validation
  "offer_id": "uuid",
  "item_id": "uuid",

  "costs": {
    "purchase_price_ht": 80,             // Prix achat HT
    "purchase_price_chf_ht": 73.98,      // Converti en CHF HT
    "currency_rate": 0.9248,             // Taux EUR→CHF
    "currency_safety_coef": 1.02,        // Coefficient sécurité 2%
    "logistics_inbound_ht": 7.5,         // DHL inbound HT
    "logistics_outbound_ht": 8.4,        // Swiss Post outbound HT
    "logistics_inbound_carrier": "DHL",
    "logistics_outbound_carrier": "Swiss Post",
    "customs_duty_ht": 0,                // Droits douane HT
    "customs_duty_rate": 0,              // Taux douane (%)
    "tar_ht": 0,                         // TAR HT
    "pesa_fee_ht": 0,                    // PESA HT
    "warranty_cost_ht": 0,               // Garantie HT
    "payment_fee_ht": 5.67,              // Frais Stripe HT
    "cogs_total_ht": 95.55,              // COGS total HT
    "cogs_total_ttc": 103.29             // COGS total TTC
  },

  "margins": {
    "marge_brute_chf": 65.71,            // Marge brute CHF
    "marge_brute_percent": 38.89,        // Marge brute %
    "minimum_margin": 20,                // Marge min requise
    "target_margin": 30,                 // Marge cible
    "maximum_margin": 50                 // Marge max autorisée
  },

  "savings": {
    "eco_vs_msrp_chf": 130,              // Économie vs MSRP (CHF)
    "eco_vs_msrp_percent": 43.48,        // Économie vs MSRP (%)
    "eco_vs_street_chf": 80,             // Économie vs street (CHF)
    "eco_vs_street_percent": 32.13       // Économie vs street (%)
  },

  "metadata": {
    "validated_at": "2025-10-25T18:54:26Z",
    "supplier_id": "uuid",
    "user_id": "uuid",
    "product_name": "AirPods Pro 2",
    "ean": "1234567890123",
    "package_weight_kg": 0.5,
    "quantity": 1,
    "subcategory_id": "uuid",
    "gaming_detected": false             // Anti-gaming: true si +5 modifs/h
  },

  "validation_issues": []                // Vide si valid, sinon liste des problèmes
}`}</pre>
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
                    <strong className="text-green-700">• top</strong> : Excellent deal (économie ≥40% MSRP OU ≥25% street, marge ≥30%)
                  </div>
                  <div>
                    <strong className="text-blue-700">• good</strong> : Bon deal (économie ≥30% MSRP ET ≥18% street, marge ≥25%)
                  </div>
                  <div>
                    <strong className="text-amber-700">• almost</strong> : Deal limite (marge ≥20% mais économies insuffisantes)
                  </div>
                  <div>
                    <strong className="text-red-700">• bad</strong> : Deal refusé (marge {'<'}20% OU économies {'<'}seuils)
                  </div>
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
  -H "X-API-Key: odl_sup_prod_test_xyz789" \\
  -d '{
    "offer_id": "aaaa1111-e89b-12d3-a456-426614174000",
    "item_id": "bbbb2222-e89b-12d3-a456-426614174001",
    "msrp": 299,
    "street_price": 249,
    "promo_price": 169,
    "purchase_price_ht": 80,
    "purchase_currency": "EUR",
    "product_name": "AirPods Pro 2",
    "package_weight_kg": 0.3,
    "quantity": 1
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
  "offer_id": {{form.offer_id}},
  "item_id": {{form.item_id}},
  "msrp": {{form.msrp}},
  "street_price": {{form.street_price}},
  "promo_price": {{form.promo_price}},
  "purchase_price_ht": {{form.purchase_price}},
  "purchase_currency": {{form.currency}},
  "product_name": {{form.product_name}},
  "package_weight_kg": {{form.weight}},
  "quantity": {{form.quantity}}
}

// Afficher les résultats
Deal Status: {{api_response.data.deal_status}}
Valid: {{api_response.data.is_valid}}
Marge: {{api_response.data.margins.marge_brute_percent}}%
Économie: {{api_response.data.savings.eco_vs_msrp_percent}}%`}</pre>
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
  "item_id": "{{$json.item_id}}",
  "msrp": {{$json.msrp}},
  "street_price": {{$json.street_price}},
  "promo_price": {{$json.promo_price}},
  "purchase_price_ht": {{$json.purchase_price}},
  "purchase_currency": "{{$json.currency}}",
  "product_name": "{{$json.product_name}}"
}

// Extraire dans le workflow suivant
{{ $json.deal_status }}              // Statut du deal
{{ $json.is_valid }}                 // Deal valide?
{{ $json.margins.marge_brute_percent }} // Marge %
{{ $json.costs.cogs_total_ttc }}    // COGS total`}</pre>
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
