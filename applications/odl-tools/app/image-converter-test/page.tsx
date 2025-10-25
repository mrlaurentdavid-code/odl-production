'use client'

import { useState, useEffect, useRef } from 'react'
import { BackToDashboard } from '@/components/ui/BackToDashboard'
import { Image as ImageIcon, Upload, Zap, Download, Loader2, CheckCircle2, RefreshCw } from 'lucide-react'

export default function ImageConverterTestPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Image dimensions (le viewport fixe)
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 })

  // Transformation parameters
  const [offsetX, setOffsetX] = useState(0) // Décalage horizontal (-width/2 à +width/2)
  const [offsetY, setOffsetY] = useState(0) // Décalage vertical (-height/2 à +height/2)
  const [zoom, setZoom] = useState(1) // 0.5x à 3x
  const [quality, setQuality] = useState(80)
  const [uploadToStorage, setUploadToStorage] = useState(true)

  const canvasRef = useRef<HTMLCanvasElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      setResult(null)
      setError(null)

      // Charger l'image pour obtenir ses dimensions
      const img = new Image()
      img.onload = () => {
        setImageDimensions({ width: img.width, height: img.height })
        setOffsetX(0)
        setOffsetY(0)
        setZoom(1)
      }
      img.src = url
    }
  }

  // Fonction pour dessiner la prévisualisation en temps réel
  useEffect(() => {
    if (!previewUrl || !canvasRef.current || !imageDimensions.width) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.onload = () => {
      // Le canvas garde toujours les dimensions originales de l'image
      canvas.width = imageDimensions.width
      canvas.height = imageDimensions.height

      // Remplir le fond en gris clair
      ctx.fillStyle = '#f5f5f5'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Calculer les dimensions de l'image zoomée
      const scaledWidth = imageDimensions.width * zoom
      const scaledHeight = imageDimensions.height * zoom

      // Calculer la position pour centrer l'image puis appliquer l'offset
      const centerX = (imageDimensions.width - scaledWidth) / 2
      const centerY = (imageDimensions.height - scaledHeight) / 2

      const drawX = centerX + offsetX
      const drawY = centerY + offsetY

      // Dessiner l'image avec le zoom et l'offset
      ctx.drawImage(
        img,
        0, 0, imageDimensions.width, imageDimensions.height, // Source (image complète)
        drawX, drawY, scaledWidth, scaledHeight // Destination (avec zoom et offset)
      )
    }
    img.src = previewUrl
  }, [previewUrl, offsetX, offsetY, zoom, imageDimensions])

  const handleConvert = async () => {
    if (!selectedFile) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('image', selectedFile)

      // Calculer les paramètres de crop basés sur le viewport
      // Le serveur doit crop pour simuler le viewport avec offset et zoom
      const scaledWidth = imageDimensions.width * zoom
      const scaledHeight = imageDimensions.height * zoom

      // Position du centre de l'image zoomée
      const centerX = (imageDimensions.width - scaledWidth) / 2 + offsetX
      const centerY = (imageDimensions.height - scaledHeight) / 2 + offsetY

      // Calculer quel morceau de l'image originale est visible dans le viewport
      const visibleX = Math.max(0, -centerX / zoom)
      const visibleY = Math.max(0, -centerY / zoom)
      const visibleWidth = Math.min(imageDimensions.width, imageDimensions.width / zoom)
      const visibleHeight = Math.min(imageDimensions.height, imageDimensions.height / zoom)

      formData.append('x', Math.round(visibleX).toString())
      formData.append('y', Math.round(visibleY).toString())
      formData.append('zoom', zoom.toString())
      formData.append('cropWidth', Math.round(visibleWidth).toString())
      formData.append('cropHeight', Math.round(visibleHeight).toString())
      formData.append('quality', quality.toString())
      formData.append('uploadToStorage', uploadToStorage.toString())

      const response = await fetch('http://localhost:3005/api/convert', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la conversion')
      }

      const data = await response.json()
      setResult(data)
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  const resetTransformations = () => {
    setOffsetX(0)
    setOffsetY(0)
    setZoom(1)
  }

  const resetForm = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setResult(null)
    setError(null)
    setOffsetX(0)
    setOffsetY(0)
    setZoom(1)
    setQuality(80)
    setUploadToStorage(true)
    setImageDimensions({ width: 0, height: 0 })
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <BackToDashboard className="mb-4" />
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Image Converter - Test Live</h1>
            <p className="text-neutral-600">Conversion d'images en WebP avec prévisualisation en temps réel</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Upload & Live Preview */}
        <div className="space-y-6">
          {/* Upload Section */}
          <div className="bg-white border border-neutral-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">1. Upload Image</h3>

            {!selectedFile ? (
              <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-neutral-300 rounded-lg cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-12 h-12 text-neutral-400 mb-4" />
                  <p className="mb-2 text-sm text-neutral-700">
                    <span className="font-semibold">Cliquez pour uploader</span> ou glissez-déposez
                  </p>
                  <p className="text-xs text-neutral-500">JPG, PNG, WebP, SVG (max 10MB)</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml"
                  onChange={handleFileSelect}
                />
              </label>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-neutral-600">{selectedFile.name}</span>
                  <span className="text-neutral-500">
                    {imageDimensions.width}x{imageDimensions.height}
                  </span>
                </div>
                <button
                  onClick={resetForm}
                  className="w-full px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors"
                >
                  Changer d'image
                </button>
              </div>
            )}
          </div>

          {/* Live Preview */}
          {selectedFile && (
            <div className="bg-white border border-neutral-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-neutral-900">Prévisualisation Live</h3>
                <button
                  onClick={resetTransformations}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reset
                </button>
              </div>
              <div className="border border-neutral-200 rounded-lg p-4 bg-neutral-50 flex items-center justify-center overflow-hidden">
                <canvas
                  ref={canvasRef}
                  className="rounded-lg shadow-lg max-w-full max-h-[500px]"
                  style={{ objectFit: 'contain' }}
                />
              </div>
              <div className="mt-3 text-xs text-neutral-500 text-center">
                Viewport fixe {imageDimensions.width}x{imageDimensions.height}px - Zoom: {zoom.toFixed(1)}x, Offset: ({offsetX}, {offsetY})
              </div>
            </div>
          )}

          {/* Preview Converted Image - Déplacé ici */}
          {result && (result.data.publicUrl || result.data.imageBase64) && (
            <div className="bg-white border border-green-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-semibold text-neutral-900">Image WebP convertie</h3>
              </div>
              <img
                src={result.data.publicUrl || result.data.imageBase64}
                alt="Converted"
                className="w-full rounded-lg border border-neutral-200 mb-4"
              />
              {result.data.publicUrl ? (
                <a
                  href={result.data.publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all"
                >
                  <Download className="w-4 h-4" />
                  Télécharger l'image
                </a>
              ) : (
                <a
                  href={result.data.imageBase64}
                  download="converted-image.webp"
                  className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all"
                >
                  <Download className="w-4 h-4" />
                  Télécharger l'image
                </a>
              )}
            </div>
          )}
        </div>

        {/* Right Column - Controls & Results */}
        <div className="space-y-6">
          {/* Controls */}
          {selectedFile && (
            <div className="bg-white border border-neutral-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">2. Transformations</h3>

              <div className="space-y-6">
                {/* Zoom */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-neutral-700">
                      Zoom
                    </label>
                    <span className="text-sm font-mono text-neutral-900">{zoom.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                  <div className="flex justify-between text-xs text-neutral-500 mt-1">
                    <span>0.5x</span>
                    <span>1x</span>
                    <span>3x</span>
                  </div>
                </div>

                {/* Offset X */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-neutral-700">
                      Décalage Horizontal
                    </label>
                    <span className="text-sm font-mono text-neutral-900">{offsetX}px</span>
                  </div>
                  <input
                    type="range"
                    min={-imageDimensions.width / 2}
                    max={imageDimensions.width / 2}
                    value={offsetX}
                    onChange={(e) => setOffsetX(parseInt(e.target.value))}
                    className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                  <div className="flex justify-between text-xs text-neutral-500 mt-1">
                    <span>← Gauche</span>
                    <span>Centre</span>
                    <span>Droite →</span>
                  </div>
                </div>

                {/* Offset Y */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-neutral-700">
                      Décalage Vertical
                    </label>
                    <span className="text-sm font-mono text-neutral-900">{offsetY}px</span>
                  </div>
                  <input
                    type="range"
                    min={-imageDimensions.height / 2}
                    max={imageDimensions.height / 2}
                    value={offsetY}
                    onChange={(e) => setOffsetY(parseInt(e.target.value))}
                    className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                  <div className="flex justify-between text-xs text-neutral-500 mt-1">
                    <span>↑ Haut</span>
                    <span>Centre</span>
                    <span>Bas ↓</span>
                  </div>
                </div>

                {/* Quality */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-neutral-700">
                      Qualité WebP
                    </label>
                    <span className="text-sm font-mono text-neutral-900">{quality}%</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={quality}
                    onChange={(e) => setQuality(parseInt(e.target.value))}
                    className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                </div>

                {/* Upload to Storage */}
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="uploadStorage"
                    checked={uploadToStorage}
                    onChange={(e) => setUploadToStorage(e.target.checked)}
                    className="w-4 h-4 text-purple-600 border-neutral-300 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="uploadStorage" className="text-sm text-neutral-700">
                    Uploader vers Supabase Storage
                  </label>
                </div>

                {/* Convert Button */}
                <button
                  onClick={handleConvert}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Conversion en cours...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      Convertir en WebP
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-red-900 mb-2">Erreur</h3>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Success Message & Statistics - Déplacé ici */}
          {result && (
            <>
              {/* Success Message avec Stats */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                  <h3 className="text-lg font-semibold text-green-900">Conversion réussie !</h3>
                </div>
                <p className="text-green-700 text-sm mb-4">{result.message}</p>

                {/* Statistics intégrées */}
                <div className="bg-white rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-neutral-600">Taille originale</span>
                    <span className="text-sm font-semibold text-neutral-900">
                      {(result.data.originalSize / 1024).toFixed(2)} KB
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-neutral-600">Taille WebP</span>
                    <span className="text-sm font-semibold text-neutral-900">
                      {(result.data.convertedSize / 1024).toFixed(2)} KB
                    </span>
                  </div>
                  <div className="border-t border-neutral-200 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-neutral-700">Gain</span>
                      <span className="text-lg font-bold text-green-600">
                        {result.data.compressionRatio}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Info Box */}
          {!result && !error && !selectedFile && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-purple-900 mb-2">Comment utiliser</h3>
              <ul className="text-sm text-purple-800 space-y-2">
                <li>1. Uploadez une image (JPG, PNG, WebP, SVG)</li>
                <li>2. Utilisez le Zoom pour agrandir/réduire l'image</li>
                <li>3. Déplacez l'image avec les curseurs Horizontal/Vertical</li>
                <li>4. Le cadre reste fixe, l'image bouge à l'intérieur</li>
                <li>5. Cliquez sur "Convertir en WebP" pour finaliser</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
