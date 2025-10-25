'use client'

import { Package } from 'lucide-react'

interface PackingVisualizationProps {
  containerLength: number
  containerWidth: number
  containerHeight: number
  productLength: number
  productWidth: number
  productHeight: number
  productsPerLayer: number
  layersPerContainer: number
  containerType: string
  // Optional: orientation data from SQL (if available)
  productBaseLength?: number
  productBaseWidth?: number
  productStackHeight?: number
  orientationUsed?: number
  availableHeight?: number  // Height available for products (excluding pallet height)
  palletHeight?: number     // Physical height of the pallet itself
}

export function PackingVisualization({
  containerLength,
  containerWidth,
  containerHeight,
  productLength,
  productWidth,
  productHeight,
  productsPerLayer,
  layersPerContainer,
  containerType,
  productBaseLength,
  productBaseWidth,
  productStackHeight,
  orientationUsed,
  availableHeight,
  palletHeight
}: PackingVisualizationProps) {
  // If SQL provides orientation data, use it directly
  let productDisplayLength: number
  let productDisplayWidth: number
  let actualCapacity: number
  let actualPerRow: number
  let actualPerColumn: number
  let has3DRotation: boolean = false

  if (productBaseLength && productBaseWidth && productStackHeight) {
    // Use the orientation provided by SQL (guaranteed correct)
    actualCapacity = productsPerLayer

    // Calculate arrangement - try both orientations
    const option1 = {
      perRow: Math.floor(containerLength / productBaseLength),
      perColumn: Math.floor(containerWidth / productBaseWidth),
      total: Math.floor(containerLength / productBaseLength) * Math.floor(containerWidth / productBaseWidth),
      displayLength: productBaseLength,
      displayWidth: productBaseWidth
    }
    const option2 = {
      perRow: Math.floor(containerLength / productBaseWidth),
      perColumn: Math.floor(containerWidth / productBaseLength),
      total: Math.floor(containerLength / productBaseWidth) * Math.floor(containerWidth / productBaseLength),
      displayLength: productBaseWidth,  // Swapped!
      displayWidth: productBaseLength    // Swapped!
    }

    const bestMatch = option1.total >= option2.total ? option1 : option2
    actualPerRow = bestMatch.perRow
    actualPerColumn = bestMatch.perColumn
    productDisplayLength = bestMatch.displayLength
    productDisplayWidth = bestMatch.displayWidth
  } else {
    // Fallback: try to guess orientation (old behavior)
    const option1 = {
      perRow: Math.floor(containerLength / productLength),
      perColumn: Math.floor(containerWidth / productWidth),
      total: Math.floor(containerLength / productLength) * Math.floor(containerWidth / productWidth),
      displayLength: productLength,
      displayWidth: productWidth
    }

    const option2 = {
      perRow: Math.floor(containerLength / productWidth),
      perColumn: Math.floor(containerWidth / productLength),
      total: Math.floor(containerLength / productWidth) * Math.floor(containerWidth / productLength),
      displayLength: productWidth,
      displayWidth: productLength
    }

    // Choose the best orientation that can actually fit
    const bestOption = option1.total >= option2.total ? option1 : option2

    // Use the actual capacity, not what SQL says (SQL might use 3D rotations we can't visualize)
    actualCapacity = Math.min(bestOption.total, productsPerLayer)

    actualPerRow = bestOption.perRow
    actualPerColumn = bestOption.perColumn
    productDisplayLength = bestOption.displayLength
    productDisplayWidth = bestOption.displayWidth

    // If SQL says more products than physically fit in this 2D view,
    // it means SQL used 3D rotation - show warning
    has3DRotation = productsPerLayer > bestOption.total
  }

  // Calculate fixed container display size based on proportions
  const maxDisplayWidth = 220
  const aspectRatio = containerWidth / containerLength

  let topViewWidth: number
  let topViewHeight: number

  if (aspectRatio <= 1) {
    // Container is wider than tall
    topViewWidth = maxDisplayWidth
    topViewHeight = maxDisplayWidth * aspectRatio
  } else {
    // Container is taller than wide
    topViewHeight = maxDisplayWidth
    topViewWidth = maxDisplayWidth / aspectRatio
  }

  // Calculate effective height early (needed for side view calculations)
  // Use available height if provided (height minus pallet), otherwise use total container height
  const effectiveHeight = availableHeight || containerHeight

  // Side view dimensions - use effective height for aspect ratio
  const sideAspectRatio = effectiveHeight / containerLength
  let sideViewWidth: number
  let sideViewHeight: number

  if (sideAspectRatio <= 1.5) {
    sideViewWidth = maxDisplayWidth
    sideViewHeight = maxDisplayWidth * sideAspectRatio
  } else {
    sideViewHeight = maxDisplayWidth * 1.5
    sideViewWidth = sideViewHeight / sideAspectRatio
  }

  // Calculate empty spaces
  const usedLength = actualPerRow * productDisplayLength
  const usedWidth = actualPerColumn * productDisplayWidth
  const emptyLength = containerLength - usedLength
  const emptyWidth = containerWidth - usedWidth
  const hasEmptySpace = emptyLength > 0.1 || emptyWidth > 0.1

  // Use the actual stack height (from SQL orientation) or fallback to productHeight
  const actualStackHeight = productStackHeight || productHeight
  const usedHeight = layersPerContainer * actualStackHeight

  // Calculate empty height using the effectiveHeight defined earlier
  const emptyHeight = effectiveHeight - usedHeight
  const hasEmptyHeight = emptyHeight > 0.1

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
      <div className="flex items-center gap-2 mb-4">
        <Package className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-blue-900">Visualisation de l'arrangement</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vue de dessus */}
        <div>
          <div className="text-sm font-medium text-blue-900 mb-2">
            Vue de dessus - 1 couche
          </div>
          <div className="bg-white rounded-lg p-4 border-2 border-blue-300 overflow-x-auto">
            <div
              className="relative border-4 border-neutral-400 bg-neutral-100"
              style={{
                width: `${topViewWidth}px`,
                height: `${topViewHeight}px`,
                minWidth: '200px'
              }}
            >
              {/* Produits positionnés */}
              <div className="relative w-full h-full">
                {Array.from({ length: actualCapacity }).map((_, idx) => {
                  const row = Math.floor(idx / actualPerRow)
                  const col = idx % actualPerRow

                  // Calculate position and size in pixels for accuracy
                  const productPixelLength = (productDisplayLength / containerLength) * topViewWidth
                  const productPixelWidth = (productDisplayWidth / containerWidth) * topViewHeight

                  const leftPx = (col * productDisplayLength / containerLength) * topViewWidth
                  const topPx = (row * productDisplayWidth / containerWidth) * topViewHeight

                  // Calculate actual pixel size for font sizing
                  const minDimension = Math.min(productPixelLength, productPixelWidth)

                  // Only show label if product is large enough
                  const showLabel = minDimension > 30 && productsPerLayer <= 20

                  // Show dimension annotations only on first product (top-left)
                  const isFirstProduct = idx === 0
                  const showDimensions = productPixelLength > 35 && productPixelWidth > 35

                  return (
                    <div key={idx} className="absolute" style={{
                      left: `${leftPx}px`,
                      top: `${topPx}px`,
                      width: `${productPixelLength}px`,
                      height: `${productPixelWidth}px`
                    }}>
                      {/* Product box */}
                      <div
                        className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-blue-500 border border-blue-700 flex flex-col items-center justify-center font-bold text-white shadow-sm overflow-hidden"
                      >
                        {showLabel ? (
                          <>
                            <div style={{ fontSize: `${Math.min(minDimension / 4, 10)}px` }}>
                              {idx + 1}
                            </div>
                            <div style={{ fontSize: `${Math.min(minDimension / 5, 8)}px` }} className="opacity-75">
                              {productDisplayLength.toFixed(0)}×{productDisplayWidth.toFixed(0)}
                            </div>
                          </>
                        ) : minDimension > 15 ? (
                          <div style={{ fontSize: `${Math.min(minDimension / 3, 8)}px` }}>
                            {idx + 1}
                          </div>
                        ) : null}
                      </div>

                      {/* Dimension annotations - only on first product */}
                      {isFirstProduct && showDimensions && (
                        <>
                          {/* Length dimension on top */}
                          <div
                            className="absolute text-[9px] font-bold text-blue-900 whitespace-nowrap bg-white/90 px-1 rounded shadow-sm"
                            style={{
                              top: '2px',
                              left: '50%',
                              transform: 'translateX(-50%)'
                            }}
                          >
                            {productDisplayLength.toFixed(0)} cm
                          </div>
                          {/* Width dimension on left */}
                          <div
                            className="absolute text-[9px] font-bold text-blue-900 whitespace-nowrap bg-white/90 px-1 rounded shadow-sm"
                            style={{
                              left: '2px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              writingMode: 'vertical-rl',
                              textOrientation: 'mixed'
                            }}
                          >
                            {productDisplayWidth.toFixed(0)} cm
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}

                {/* Empty space visualization - Right side (length) */}
                {emptyLength > 0.1 && (
                  <div className="absolute" style={{
                    left: `${(usedLength / containerLength) * topViewWidth}px`,
                    top: '0px',
                    width: `${(emptyLength / containerLength) * topViewWidth}px`,
                    height: `${(usedWidth / containerWidth) * topViewHeight}px`
                  }}>
                    <div
                      className="absolute inset-0 bg-neutral-300 border-2 border-dashed border-neutral-500 flex items-center justify-center"
                    >
                      {(emptyLength / containerLength) * topViewWidth > 40 && (
                        <div className="text-xs text-neutral-700 font-semibold text-center px-1">
                          Vide<br/>{emptyLength.toFixed(0)}cm
                        </div>
                      )}
                    </div>
                    {/* Dimension annotation for empty space */}
                    {(emptyLength / containerLength) * topViewWidth > 25 && (
                      <div
                        className="absolute text-[9px] font-bold text-neutral-700 whitespace-nowrap bg-white/90 px-1 rounded shadow-sm"
                        style={{
                          top: '2px',
                          left: '50%',
                          transform: 'translateX(-50%)'
                        }}
                      >
                        {emptyLength.toFixed(0)} cm
                      </div>
                    )}
                  </div>
                )}

                {/* Empty space visualization - Bottom side (width) */}
                {emptyWidth > 0.1 && (
                  <div className="absolute" style={{
                    left: '0px',
                    top: `${(usedWidth / containerWidth) * topViewHeight}px`,
                    width: `${topViewWidth}px`,
                    height: `${(emptyWidth / containerWidth) * topViewHeight}px`
                  }}>
                    <div
                      className="absolute inset-0 bg-neutral-300 border-2 border-dashed border-neutral-500 flex items-center justify-center"
                    >
                      {(emptyWidth / containerWidth) * topViewHeight > 30 && (
                        <div className="text-xs text-neutral-700 font-semibold text-center">
                          Espace vide ({emptyWidth.toFixed(0)} cm)
                        </div>
                      )}
                    </div>
                    {/* Dimension annotation for empty space */}
                    {(emptyWidth / containerWidth) * topViewHeight > 25 && (
                      <div
                        className="absolute text-[9px] font-bold text-neutral-700 whitespace-nowrap bg-white/90 px-1 rounded shadow-sm"
                        style={{
                          left: '2px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          writingMode: 'vertical-rl',
                          textOrientation: 'mixed'
                        }}
                      >
                        {emptyWidth.toFixed(0)} cm
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Dimensions */}
              <div className="absolute -top-6 left-0 right-0 text-center text-xs text-neutral-600 font-medium">
                {containerLength} cm
              </div>
              <div className="absolute top-0 bottom-0 -left-8 flex items-center">
                <div className="text-xs text-neutral-600 font-medium -rotate-90 whitespace-nowrap">
                  {containerWidth} cm
                </div>
              </div>
            </div>

            <div className="mt-3 text-xs text-neutral-700 space-y-1">
              <div className="flex justify-between">
                <span>Produits par couche:</span>
                <span className="font-bold text-blue-900">{actualCapacity}</span>
              </div>
              <div className="flex justify-between">
                <span>Arrangement:</span>
                <span className="font-semibold text-blue-800">{actualPerRow} × {actualPerColumn}</span>
              </div>
              <div className="flex justify-between">
                <span>Espace utilisé:</span>
                <span className="font-semibold text-neutral-700">
                  {usedLength.toFixed(0)} × {usedWidth.toFixed(0)} cm
                </span>
              </div>
              {hasEmptySpace && (
                <div className="flex justify-between text-amber-700">
                  <span>Espace vide:</span>
                  <span className="font-semibold">
                    {emptyLength > 0.1 ? `${emptyLength.toFixed(0)}cm (L)` : ''}{emptyLength > 0.1 && emptyWidth > 0.1 ? ' + ' : ''}{emptyWidth > 0.1 ? `${emptyWidth.toFixed(0)}cm (l)` : ''}
                  </span>
                </div>
              )}
              {has3DRotation && (
                <div className="mt-2 p-2 bg-red-50 border border-red-300 rounded text-red-800">
                  <strong>⚠️ Erreur de calcul:</strong> Le système a calculé {productsPerLayer} produits mais seulement {actualCapacity} peuvent réellement rentrer dans ce conteneur.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Vue latérale */}
        <div>
          <div className="text-sm font-medium text-blue-900 mb-2">
            Vue latérale - Empilement
          </div>
          <div className="bg-white rounded-lg p-4 border-2 border-blue-300 overflow-x-auto">
            <div
              className="relative border-4 border-neutral-400 bg-neutral-100"
              style={{
                width: `${sideViewWidth}px`,
                height: `${sideViewHeight}px`
              }}
            >
              {/* Couches empilées - positioned from bottom */}
              <div className="relative w-full h-full">
                {layersPerContainer <= 10 ? (
                  // Show individual layers if 10 or less
                  Array.from({ length: layersPerContainer }).map((_, idx) => {
                    const layerNumber = layersPerContainer - idx

                    const layerHeightPx = (actualStackHeight / effectiveHeight) * sideViewHeight
                    const bottomPx = (actualStackHeight * idx / effectiveHeight) * sideViewHeight

                    // Show dimension on first layer only
                    const isFirstLayer = idx === 0
                    const showHeightDimension = layerHeightPx > 25

                    return (
                      <div key={idx} className="absolute left-0 right-0" style={{
                        bottom: `${bottomPx}px`,
                        height: `${layerHeightPx}px`,
                        minHeight: '20px'
                      }}>
                        <div
                          className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-500 border-t-2 border-orange-700 flex items-center justify-center text-xs font-bold text-white"
                        >
                          <span className="mr-1">Couche {layerNumber}</span>
                          <span className="text-[10px] opacity-75">{productsPerLayer} pcs</span>
                        </div>

                        {/* Height dimension annotation */}
                        {isFirstLayer && showHeightDimension && (
                          <div
                            className="absolute text-[9px] font-bold text-orange-900 whitespace-nowrap bg-white/90 px-1 rounded shadow-sm"
                            style={{
                              right: '2px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              writingMode: 'vertical-rl',
                              textOrientation: 'mixed'
                            }}
                          >
                            {actualStackHeight.toFixed(0)} cm
                          </div>
                        )}
                      </div>
                    )
                  })
                ) : (
                  // Show sectioned representation with visual layers even if many
                  (() => {
                    const totalHeightUsedPx = (actualStackHeight * layersPerContainer / effectiveHeight) * sideViewHeight

                    // Show lines every 5 layers to give visual sectioning
                    const showEveryNLayers = Math.max(1, Math.ceil(layersPerContainer / 15))
                    const visibleSections = Math.ceil(layersPerContainer / showEveryNLayers)

                    return (
                      <>
                        {/* Main block with all layers */}
                        <div
                          className="absolute left-0 right-0 bottom-0 bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center font-bold text-white"
                          style={{
                            height: `${totalHeightUsedPx}px`
                          }}
                        >
                          <div className="text-center z-10 relative">
                            <div className="text-base">{layersPerContainer} couches</div>
                            <div className="text-[10px] opacity-75">{productsPerLayer} pcs/couche</div>
                          </div>

                          {/* Total height dimension annotation */}
                          {totalHeightUsedPx > 40 && (
                            <div
                              className="absolute text-[9px] font-bold text-orange-900 whitespace-nowrap bg-white/90 px-1 rounded shadow-sm"
                              style={{
                                right: '2px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                writingMode: 'vertical-rl',
                                textOrientation: 'mixed'
                              }}
                            >
                              {usedHeight.toFixed(0)} cm
                            </div>
                          )}
                        </div>

                        {/* Section lines to show layers visually */}
                        {Array.from({ length: visibleSections }).map((_, idx) => {
                          const sectionBottomPx = (showEveryNLayers * actualStackHeight * idx / effectiveHeight) * sideViewHeight

                          return (
                            <div
                              key={idx}
                              className="absolute left-0 right-0 border-t-2 border-orange-700"
                              style={{
                                bottom: `${sectionBottomPx}px`
                              }}
                            />
                          )
                        })}
                      </>
                    )
                  })()
                )}

                {/* Empty space visualization - Top */}
                {hasEmptyHeight && (
                  <div className="absolute left-0 right-0" style={{
                    top: '0px',
                    height: `${(emptyHeight / effectiveHeight) * sideViewHeight}px`
                  }}>
                    <div
                      className="absolute inset-0 bg-neutral-300 border-2 border-dashed border-neutral-500 flex items-center justify-center"
                    >
                      {(emptyHeight / effectiveHeight) * sideViewHeight > 30 && (
                        <div className="text-xs text-neutral-700 font-semibold text-center">
                          Espace vide<br/>({emptyHeight.toFixed(0)} cm)
                        </div>
                      )}
                    </div>
                    {/* Dimension annotation for empty height */}
                    {(emptyHeight / effectiveHeight) * sideViewHeight > 25 && (
                      <div
                        className="absolute text-[9px] font-bold text-neutral-700 whitespace-nowrap bg-white/90 px-1 rounded shadow-sm"
                        style={{
                          right: '2px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          writingMode: 'vertical-rl',
                          textOrientation: 'mixed'
                        }}
                      >
                        {emptyHeight.toFixed(0)} cm
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Dimensions */}
              <div className="absolute -top-6 left-0 right-0 text-center text-xs text-neutral-600 font-medium">
                {containerLength} cm
              </div>
              <div className="absolute top-0 bottom-0 -left-10 flex items-center">
                <div className="text-xs text-neutral-600 font-medium -rotate-90 whitespace-nowrap">
                  {containerHeight} cm
                </div>
              </div>
            </div>

            <div className="mt-3 text-xs text-neutral-700 space-y-1">
              <div className="flex justify-between">
                <span>Nombre de couches:</span>
                <span className="font-bold text-blue-900">{layersPerContainer}</span>
              </div>
              <div className="flex justify-between">
                <span>Capacité totale:</span>
                <span className="font-bold text-green-700">{productsPerLayer * layersPerContainer} produits</span>
              </div>
              <div className="flex justify-between">
                <span>Hauteur utilisée:</span>
                <span className="font-semibold text-blue-800">{usedHeight.toFixed(0)} cm</span>
              </div>
              {hasEmptyHeight && (
                <div className="flex justify-between text-amber-700">
                  <span>Hauteur vide:</span>
                  <span className="font-semibold">{emptyHeight.toFixed(0)} cm</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Légende */}
      <div className="mt-4 p-3 bg-white rounded border border-blue-200">
        <div className="text-xs text-neutral-700">
          <div className="font-semibold text-blue-900 mb-2">Dimensions du produit :</div>
          <div className="grid grid-cols-3 gap-2">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-cyan-500 rounded"></div>
              <span>L: {productLength} cm</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>l: {productWidth} cm</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-amber-500 rounded"></div>
              <span>H: {productHeight} cm</span>
            </div>
          </div>
          {orientationUsed && orientationUsed !== 1 && productBaseLength && productBaseWidth && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
              <div className="font-semibold text-blue-900 text-xs mb-1">
                ⚙️ Orientation optimisée (3D)
              </div>
              <div className="text-xs text-blue-800">
                Base: {productBaseLength.toFixed(0)} × {productBaseWidth.toFixed(0)} cm • Empilé: {actualStackHeight.toFixed(0)} cm
                {orientationUsed === 2 && <span className="ml-1">(produit couché sur la largeur)</span>}
                {orientationUsed === 3 && <span className="ml-1">(produit couché sur la longueur)</span>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
