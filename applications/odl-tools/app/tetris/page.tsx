'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { BackToDashboard } from '@/components/ui/BackToDashboard'
import { Gamepad2, Play, Pause, RotateCcw, Trophy, Zap } from 'lucide-react'

// Dimensions de la grille
const ROWS = 20
const COLS = 10
const CELL_SIZE = 30

// Types de pièces Tetris
const TETROMINOS = {
  I: {
    shape: [[1, 1, 1, 1]],
    color: '#00f0f0',
  },
  O: {
    shape: [
      [1, 1],
      [1, 1],
    ],
    color: '#f0f000',
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
    ],
    color: '#a000f0',
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
    ],
    color: '#00f000',
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
    ],
    color: '#f00000',
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
    ],
    color: '#0000f0',
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
    ],
    color: '#f0a000',
  },
}

// Logo ODEAL en pixels (5x30 pour "ODEAL")
const ODEAL_LOGO = [
  [0,1,1,1,0,0,0,1,1,1,0,0,0,1,1,1,0,0,0,1,1,1,0,0,0,1,0,0,0,1],
  [1,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,0,0,1,0,0,0,1,0,1,0,0,0,1,0],
  [1,0,0,0,1,0,1,0,0,0,1,0,1,1,1,0,0,0,1,1,1,1,1,0,1,0,0,0,1,0],
  [1,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,0,0,1,0,0,0,1,0,1,0,0,0,1,0],
  [0,1,1,1,0,0,0,1,1,1,0,0,0,1,1,1,0,0,0,1,0,0,1,0,0,1,1,1,0,0],
]

type TetrominoType = keyof typeof TETROMINOS

interface Cell {
  filled: boolean
  color: string
}

interface Position {
  x: number
  y: number
}

interface Piece {
  shape: number[][]
  color: string
  position: Position
  type: TetrominoType
}

export default function TetrisPage() {
  const [board, setBoard] = useState<Cell[][]>([])
  const [currentPiece, setCurrentPiece] = useState<Piece | null>(null)
  const [nextPiece, setNextPiece] = useState<TetrominoType>('I')
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [lines, setLines] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [highScore, setHighScore] = useState(0)

  const gameLoopRef = useRef<NodeJS.Timeout | null>(null)

  // Initialiser le tableau
  const initBoard = useCallback(() => {
    const newBoard: Cell[][] = []
    for (let i = 0; i < ROWS; i++) {
      newBoard.push(
        Array(COLS).fill(null).map(() => ({ filled: false, color: '' }))
      )
    }
    return newBoard
  }, [])

  // Générer une pièce aléatoire
  const randomTetromino = useCallback((): TetrominoType => {
    const types = Object.keys(TETROMINOS) as TetrominoType[]
    return types[Math.floor(Math.random() * types.length)]
  }, [])

  // Créer une nouvelle pièce
  const createPiece = useCallback((type: TetrominoType): Piece => {
    const tetromino = TETROMINOS[type]
    return {
      shape: tetromino.shape,
      color: tetromino.color,
      position: { x: Math.floor(COLS / 2) - Math.floor(tetromino.shape[0].length / 2), y: 0 },
      type,
    }
  }, [])

  // Vérifier collision
  const checkCollision = useCallback((piece: Piece, board: Cell[][], offsetX = 0, offsetY = 0) => {
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const newX = piece.position.x + x + offsetX
          const newY = piece.position.y + y + offsetY

          if (newX < 0 || newX >= COLS || newY >= ROWS) {
            return true
          }

          if (newY >= 0 && board[newY][newX].filled) {
            return true
          }
        }
      }
    }
    return false
  }, [])

  // Fusionner la pièce avec le tableau
  const mergePiece = useCallback((piece: Piece, board: Cell[][]) => {
    const newBoard = board.map(row => [...row])
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const boardY = piece.position.y + y
          const boardX = piece.position.x + x
          if (boardY >= 0) {
            newBoard[boardY][boardX] = { filled: true, color: piece.color }
          }
        }
      }
    }
    return newBoard
  }, [])

  // Supprimer les lignes complètes
  const clearLines = useCallback((board: Cell[][]) => {
    let linesCleared = 0
    const newBoard = board.filter(row => {
      const isFull = row.every(cell => cell.filled)
      if (isFull) linesCleared++
      return !isFull
    })

    while (newBoard.length < ROWS) {
      newBoard.unshift(Array(COLS).fill(null).map(() => ({ filled: false, color: '' })))
    }

    return { newBoard, linesCleared }
  }, [])

  // Rotation de la pièce
  const rotatePiece = useCallback((piece: Piece): Piece => {
    const rotated = piece.shape[0].map((_, i) =>
      piece.shape.map(row => row[i]).reverse()
    )
    return { ...piece, shape: rotated }
  }, [])

  // Déplacer la pièce
  const movePiece = useCallback((direction: 'left' | 'right' | 'down') => {
    if (!currentPiece || !isPlaying || isPaused || gameOver) return

    const offsetX = direction === 'left' ? -1 : direction === 'right' ? 1 : 0
    const offsetY = direction === 'down' ? 1 : 0

    if (!checkCollision(currentPiece, board, offsetX, offsetY)) {
      setCurrentPiece({
        ...currentPiece,
        position: {
          x: currentPiece.position.x + offsetX,
          y: currentPiece.position.y + offsetY,
        },
      })
    } else if (direction === 'down') {
      // La pièce touche le fond, on la fusionne
      const mergedBoard = mergePiece(currentPiece, board)
      const { newBoard, linesCleared } = clearLines(mergedBoard)

      const newLines = lines + linesCleared
      const newScore = score + (linesCleared * linesCleared * 100) + 10

      setBoard(newBoard)
      setLines(newLines)
      setScore(newScore)

      // Créer une nouvelle pièce
      const newPiece = createPiece(nextPiece)
      if (checkCollision(newPiece, newBoard)) {
        setGameOver(true)
        setIsPlaying(false)
        if (newScore > highScore) {
          setHighScore(newScore)
          localStorage.setItem('tetris-high-score', newScore.toString())
        }
      } else {
        setCurrentPiece(newPiece)
        setNextPiece(randomTetromino())
      }
    }
  }, [currentPiece, board, isPlaying, isPaused, gameOver, nextPiece, score, lines, highScore, checkCollision, mergePiece, clearLines, createPiece, randomTetromino])

  // Rotation
  const handleRotate = useCallback(() => {
    if (!currentPiece || !isPlaying || isPaused || gameOver) return

    const rotated = rotatePiece(currentPiece)
    if (!checkCollision(rotated, board)) {
      setCurrentPiece(rotated)
    }
  }, [currentPiece, board, isPlaying, isPaused, gameOver, rotatePiece, checkCollision])

  // Drop rapide
  const handleHardDrop = useCallback(() => {
    if (!currentPiece || !isPlaying || isPaused || gameOver) return

    let dropDistance = 0
    while (!checkCollision(currentPiece, board, 0, dropDistance + 1)) {
      dropDistance++
    }

    // Déplacer la pièce à sa position finale
    const droppedPiece = {
      ...currentPiece,
      position: {
        ...currentPiece.position,
        y: currentPiece.position.y + dropDistance,
      },
    }

    // Fusionner immédiatement
    const mergedBoard = mergePiece(droppedPiece, board)
    const { newBoard, linesCleared } = clearLines(mergedBoard)

    const newLines = lines + linesCleared
    const newScore = score + (linesCleared * linesCleared * 100) + 10 + (dropDistance * 2)

    setBoard(newBoard)
    setLines(newLines)
    setScore(newScore)

    // Créer une nouvelle pièce
    const newPiece = createPiece(nextPiece)
    if (checkCollision(newPiece, newBoard)) {
      setGameOver(true)
      setIsPlaying(false)
      if (newScore > highScore) {
        setHighScore(newScore)
        localStorage.setItem('tetris-high-score', newScore.toString())
      }
    } else {
      setCurrentPiece(newPiece)
      setNextPiece(randomTetromino())
    }
  }, [currentPiece, board, isPlaying, isPaused, gameOver, lines, score, highScore, nextPiece, checkCollision, mergePiece, clearLines, createPiece, randomTetromino])

  // Contrôles clavier
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isPlaying || isPaused || gameOver) return

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          movePiece('left')
          break
        case 'ArrowRight':
          e.preventDefault()
          movePiece('right')
          break
        case 'ArrowDown':
          e.preventDefault()
          movePiece('down')
          break
        case 'ArrowUp':
        case ' ':
          e.preventDefault()
          handleRotate()
          break
        case 'Enter':
          e.preventDefault()
          handleHardDrop()
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isPlaying, isPaused, gameOver, movePiece, handleRotate, handleHardDrop])

  // Boucle de jeu
  useEffect(() => {
    if (isPlaying && !isPaused && !gameOver) {
      const speed = Math.max(100, 1000 - (level - 1) * 100)
      gameLoopRef.current = setInterval(() => {
        movePiece('down')
      }, speed)
    }

    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current)
    }
  }, [isPlaying, isPaused, gameOver, level, movePiece])

  // Niveau basé sur les lignes
  useEffect(() => {
    const newLevel = Math.floor(lines / 10) + 1
    if (newLevel !== level) {
      setLevel(newLevel)
    }
  }, [lines, level])

  // Charger le high score
  useEffect(() => {
    const saved = localStorage.getItem('tetris-high-score')
    if (saved) setHighScore(parseInt(saved))
  }, [])

  // Démarrer le jeu
  const startGame = () => {
    const newBoard = initBoard()
    setBoard(newBoard)
    const firstType = randomTetromino()
    setCurrentPiece(createPiece(firstType))
    setNextPiece(randomTetromino())
    setScore(0)
    setLevel(1)
    setLines(0)
    setIsPlaying(true)
    setGameOver(false)
    setIsPaused(false)
  }

  // Pause
  const togglePause = () => {
    if (!gameOver && isPlaying) {
      setIsPaused(!isPaused)
    }
  }

  // Rendre le tableau avec la pièce actuelle
  const renderBoard = () => {
    const displayBoard = board.map(row => row.map(cell => ({ ...cell })))

    // Dessiner la pièce actuelle
    if (currentPiece) {
      for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
          if (currentPiece.shape[y][x]) {
            const boardY = currentPiece.position.y + y
            const boardX = currentPiece.position.x + x
            if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
              displayBoard[boardY][boardX] = { filled: true, color: currentPiece.color }
            }
          }
        }
      }
    }

    return displayBoard
  }

  // Rendre la pièce suivante
  const renderNextPiece = () => {
    const nextShape = TETROMINOS[nextPiece].shape
    const nextColor = TETROMINOS[nextPiece].color

    return (
      <div className="inline-grid gap-1 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
        {nextShape.map((row, y) => (
          <div key={y} className="flex gap-1">
            {row.map((cell, x) => (
              <div
                key={x}
                className="w-6 h-6 rounded-sm border border-neutral-200"
                style={{
                  backgroundColor: cell ? nextColor : 'transparent',
                  boxShadow: cell ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                }}
              />
            ))}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 px-4">
      {/* Header */}
      <div>
        <BackToDashboard className="mb-4" />
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
            <Gamepad2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Tetris ODL</h1>
            <p className="text-neutral-600">Défi de blocs classique</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr_350px] gap-6">
        {/* Colonne de gauche - Stats */}
        <div className="space-y-4">
          {/* Stats de la partie */}
          <div className="bg-white border border-neutral-200 rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-neutral-900">Partie en cours</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-neutral-600">Score</span>
                <span className="text-2xl font-bold text-primary-600">{score}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-600">Niveau</span>
                <span className="text-xl font-semibold text-secondary-600">{level}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-600">Lignes</span>
                <span className="text-xl font-semibold text-success-600">{lines}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-neutral-200">
                <span className="text-neutral-600 flex items-center gap-1">
                  <Trophy className="w-4 h-4" />
                  Record
                </span>
                <span className="text-xl font-bold text-warning-600">{highScore}</span>
              </div>
            </div>
          </div>

          {/* Pièce suivante */}
          <div className="bg-white border border-neutral-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">Prochaine pièce</h3>
            <div className="flex justify-center">
              {renderNextPiece()}
            </div>
          </div>

          {/* Contrôles */}
          <div className="bg-white border border-neutral-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">Contrôles</h3>
            <div className="space-y-2 text-sm text-neutral-600">
              <div className="flex justify-between">
                <span>← / →</span>
                <span className="text-neutral-900 font-medium">Déplacer</span>
              </div>
              <div className="flex justify-between">
                <span>↓</span>
                <span className="text-neutral-900 font-medium">Descendre</span>
              </div>
              <div className="flex justify-between">
                <span>↑ / Espace</span>
                <span className="text-neutral-900 font-medium">Rotation</span>
              </div>
              <div className="flex justify-between">
                <span>Enter</span>
                <span className="text-neutral-900 font-medium">Drop rapide</span>
              </div>
            </div>
          </div>
        </div>

        {/* Colonne centrale - Jeu */}
        <div>
          <div className="bg-white border border-neutral-200 rounded-xl p-8">
            <div className="flex flex-col items-center gap-6">
              {/* Grille de jeu */}
              <div
                className="relative border-4 border-neutral-900 rounded-lg shadow-2xl overflow-hidden"
                style={{
                  width: COLS * CELL_SIZE,
                  height: ROWS * CELL_SIZE,
                  backgroundColor: '#0a0a0a',
                }}
              >
                {/* Logo ODEAL en arrière-plan */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="opacity-20">
                    {ODEAL_LOGO.map((row, y) => (
                      <div key={y} className="flex">
                        {row.map((cell, x) => (
                          <div
                            key={x}
                            style={{
                              width: '8px',
                              height: '8px',
                              backgroundColor: cell ? '#ffffff' : 'transparent',
                            }}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Grille de jeu */}
                {renderBoard().map((row, y) =>
                  row.map((cell, x) => (
                    <div
                      key={`${y}-${x}`}
                      className="absolute"
                      style={{
                        width: CELL_SIZE,
                        height: CELL_SIZE,
                        left: x * CELL_SIZE,
                        top: y * CELL_SIZE,
                        backgroundColor: cell.filled ? cell.color : 'transparent',
                        boxShadow: cell.filled ? 'inset 0 -2px 4px rgba(0,0,0,0.3)' : 'none',
                        border: 'none',
                      }}
                    />
                  ))
                )}

                {/* Game Over overlay */}
                {gameOver && (
                  <div className="absolute inset-0 bg-black/80 flex items-center justify-center backdrop-blur-sm">
                    <div className="text-center space-y-4">
                      <h2 className="text-4xl font-bold text-white">Game Over</h2>
                      <p className="text-xl text-neutral-300">Score: {score}</p>
                      <p className="text-sm text-neutral-400">Niveau {level} • {lines} lignes</p>
                      {score === highScore && score > 0 && (
                        <div className="flex items-center justify-center gap-2 text-warning-400">
                          <Trophy className="w-6 h-6" />
                          <span className="text-lg font-semibold">Nouveau record!</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Pause overlay */}
                {isPaused && !gameOver && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center backdrop-blur-sm">
                    <div className="text-center space-y-2">
                      <Pause className="w-16 h-16 text-white mx-auto" />
                      <p className="text-2xl font-bold text-white">Pause</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Boutons de contrôle */}
              <div className="flex gap-3">
                {!isPlaying || gameOver ? (
                  <button
                    onClick={startGame}
                    className="px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all flex items-center gap-2 shadow-lg hover:shadow-xl"
                  >
                    <Play className="w-5 h-5" />
                    {gameOver ? 'Rejouer' : 'Démarrer'}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={togglePause}
                      className="px-6 py-3 bg-secondary-500 text-white rounded-lg hover:bg-secondary-600 transition-colors flex items-center gap-2 shadow-lg"
                    >
                      {isPaused ? (
                        <>
                          <Play className="w-5 h-5" />
                          Reprendre
                        </>
                      ) : (
                        <>
                          <Pause className="w-5 h-5" />
                          Pause
                        </>
                      )}
                    </button>
                    <button
                      onClick={startGame}
                      className="px-6 py-3 bg-neutral-500 text-white rounded-lg hover:bg-neutral-600 transition-colors flex items-center gap-2 shadow-lg"
                    >
                      <RotateCcw className="w-5 h-5" />
                      Recommencer
                    </button>
                  </>
                )}
              </div>

              {/* Instructions */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4 w-full max-w-md">
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-purple-900">
                    <p className="font-semibold mb-1">Astuce:</p>
                    <p className="text-purple-700">
                      Complète des lignes pour marquer des points! Plus tu complètes de lignes en même temps, plus tu gagnes de points.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Colonne de droite - Info */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-warning-50 to-orange-50 border border-warning-200 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-6 h-6 text-warning-600" />
              <h3 className="text-lg font-semibold text-neutral-900">À propos</h3>
            </div>
            <div className="text-center py-8 text-neutral-600">
              <p className="text-sm mb-3">
                Tetris classique par ODL
              </p>
              <p className="text-xs text-neutral-500">
                Ton meilleur score: <span className="font-bold text-warning-600">{highScore}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
