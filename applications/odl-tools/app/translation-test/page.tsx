'use client'

import { useState } from 'react'
import { BackToDashboard } from '@/components/ui/BackToDashboard'
import { Languages, ArrowRight, Loader2, Copy, CheckCircle2, Globe } from 'lucide-react'

const LANGUAGES = [
  { code: 'auto', name: 'Détection automatique', flag: '🔍' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'Anglais', flag: '🇬🇧' },
  { code: 'de', name: 'Allemand', flag: '🇩🇪' },
  { code: 'it', name: 'Italien', flag: '🇮🇹' },
  { code: 'es', name: 'Espagnol', flag: '🇪🇸' },
  { code: 'pt', name: 'Portugais', flag: '🇵🇹' },
  { code: 'nl', name: 'Néerlandais', flag: '🇳🇱' },
  { code: 'pl', name: 'Polonais', flag: '🇵🇱' },
  { code: 'ru', name: 'Russe', flag: '🇷🇺' },
  { code: 'ja', name: 'Japonais', flag: '🇯🇵' },
  { code: 'zh', name: 'Chinois', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabe', flag: '🇸🇦' },
]

export default function TranslationTestPage() {
  const [sourceText, setSourceText] = useState('')
  const [sourceLang, setSourceLang] = useState('auto')
  const [targetLang, setTargetLang] = useState('en')
  const [translatedText, setTranslatedText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleTranslate = async () => {
    if (!sourceText.trim()) {
      setError('Veuillez entrer un texte à traduire')
      return
    }

    setLoading(true)
    setError(null)
    setTranslatedText('')

    try {
      const response = await fetch('http://localhost:3006/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sourceText,
          sourceLang,
          targetLang,
        }),
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la traduction')
      }

      const data = await response.json()

      if (data.success) {
        setTranslatedText(data.data.translatedText)
      } else {
        throw new Error(data.error || 'Erreur lors de la traduction')
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de la traduction')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(translatedText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const swapLanguages = () => {
    setSourceLang(targetLang)
    setTargetLang(sourceLang)
    setSourceText(translatedText)
    setTranslatedText(sourceText)
  }

  const exampleTexts = [
    { fr: 'Bonjour, comment allez-vous ?', en: 'Hello, how are you?' },
    { fr: 'Merci beaucoup pour votre aide.', en: 'Thank you very much for your help.' },
    { fr: 'Où se trouve la gare ?', en: 'Where is the train station?' },
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <BackToDashboard className="mb-4" />
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-lg bg-purple-500 flex items-center justify-center">
            <Languages className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Traduction - Test Live</h1>
            <p className="text-neutral-600">Testez la traduction automatique multilingue</p>
          </div>
        </div>
      </div>

      {/* API Status Banner */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-100 border border-green-200 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <Globe className="w-6 h-6 text-green-600" />
          <div>
            <h3 className="font-semibold text-green-900">API de traduction opérationnelle</h3>
            <p className="text-sm text-green-700">
              Traduction automatique par Claude AI (Anthropic). 12 langues + détection automatique.
            </p>
          </div>
        </div>
      </div>

      {/* Main Translation Interface */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        {/* Language Selector */}
        <div className="flex items-center justify-between p-4 bg-neutral-50 border-b border-neutral-200">
          <div className="flex items-center gap-3">
            <select
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
              className="px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={swapLanguages}
            className="p-2 hover:bg-neutral-200 rounded-lg transition-colors"
            title="Inverser les langues"
          >
            <ArrowRight className="w-5 h-5 text-neutral-600" />
          </button>

          <div className="flex items-center gap-3">
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
            >
              {LANGUAGES.filter(lang => lang.code !== 'auto').map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Translation Areas */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-neutral-200">
          {/* Source Text */}
          <div className="p-6">
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Texte source
            </label>
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Entrez votre texte à traduire..."
              rows={10}
              className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-neutral-500">
                {sourceText.length} caractères
              </span>
            </div>
          </div>

          {/* Translated Text */}
          <div className="p-6 bg-neutral-50">
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Traduction
            </label>
            <div className="relative">
              <textarea
                value={translatedText}
                readOnly
                placeholder="La traduction apparaîtra ici..."
                rows={10}
                className="w-full px-4 py-3 border border-neutral-200 rounded-lg bg-white resize-none"
              />
              {translatedText && (
                <button
                  onClick={handleCopy}
                  className="absolute top-2 right-2 p-2 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
                  title="Copier"
                >
                  {copied ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-neutral-600" />
                  )}
                </button>
              )}
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-neutral-500">
                {translatedText.length} caractères
              </span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-200">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
          <button
            onClick={handleTranslate}
            disabled={loading || !sourceText.trim()}
            className="w-full px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Traduction en cours...
              </>
            ) : (
              <>
                <Languages className="w-5 h-5" />
                Traduire
              </>
            )}
          </button>
        </div>
      </div>

      {/* Example Texts */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Exemples de textes</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {exampleTexts.map((example, index) => (
            <button
              key={index}
              onClick={() => setSourceText(example.fr)}
              className="p-3 text-left border border-neutral-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
            >
              <p className="text-sm text-neutral-700">{example.fr}</p>
              <p className="text-xs text-neutral-500 mt-1">→ {example.en}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <h4 className="font-semibold text-purple-900 mb-2">🌍 12 langues supportées</h4>
          <p className="text-sm text-purple-700">
            Français, Anglais, Allemand, Italien, Espagnol, et plus encore
          </p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <h4 className="font-semibold text-purple-900 mb-2">⚡ Traduction instantanée</h4>
          <p className="text-sm text-purple-700">
            Résultats rapides grâce à l'IA de pointe
          </p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <h4 className="font-semibold text-purple-900 mb-2">🎯 Haute précision</h4>
          <p className="text-sm text-purple-700">
            Contexte et nuances préservés dans la traduction
          </p>
        </div>
      </div>
    </div>
  )
}
