import { useState, useEffect, useRef, useCallback } from 'react'
import type { SolverRequest, SolverResponse } from '@/types'
import { useGameStore } from '@/store/gameStore'
import CardSelector from '@/components/CardSelector'
import ArrangementBoard from '@/components/ArrangementBoard'
import SuggestionPanel from '@/components/SuggestionPanel'
import ScoringSummary from '@/components/ScoringSummary'
import { RotateCcw, Sparkles, Undo2, Redo2 } from 'lucide-react'

export default function App() {
  const resetGame = useGameStore(s => s.resetGame)
  const undo = useGameStore(s => s.undo)
  const redo = useGameStore(s => s.redo)
  const canUndo = useGameStore(s => s.canUndo)
  const canRedo = useGameStore(s => s.canRedo)
  const arrangement = useGameStore(s => s.arrangement)

  const [suggestionLoading, setSuggestionLoading] = useState(false)
  const [solverError, setSolverError] = useState<string | null>(null)

  const workerRef = useRef<Worker | null>(null)

  // Initialize solver worker
  useEffect(() => {
    const worker = new Worker(
      new URL('@/solver/worker.ts', import.meta.url),
      { type: 'module' }
    )
    workerRef.current = worker
    return () => worker.terminate()
  }, [])

  // Auto-validate and score when arrangement changes
  useEffect(() => {
    if (!workerRef.current) return

    const isComplete = arrangement.front.length === 3 &&
      arrangement.middle.length === 5 &&
      arrangement.back.length === 5

    if (isComplete) {
      workerRef.current.postMessage({
        type: 'VALIDATE',
        arrangement,
      } as SolverRequest)

      workerRef.current.postMessage({
        type: 'SCORE',
        arrangement,
      } as SolverRequest)
    }
  }, [arrangement])

  // Handle worker responses
  useEffect(() => {
    if (!workerRef.current) return

    const handler = (event: MessageEvent) => {
      const { error } = event.data as SolverResponse
      if (error) {
        setSolverError(error)
        return
      }
    }

    workerRef.current.addEventListener('message', handler)
    return () => workerRef.current?.removeEventListener('message', handler)
  }, [])

  const handleReset = useCallback(() => {
    resetGame()
    setSolverError(null)
    setSuggestionLoading(false)
  }, [resetGame])

  // Keyboard shortcuts: Ctrl+Z undo, Ctrl+Shift+Z / Ctrl+Y redo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC')
      const mod = isMac ? e.metaKey : e.ctrlKey

      if (mod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
      if (mod && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) {
        e.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo])

  const isComplete = arrangement.front.length === 3 &&
    arrangement.middle.length === 5 &&
    arrangement.back.length === 5

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <header className="border-b border-bg-tertiary bg-bg-secondary/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            <div>
              <h1 className="text-lg font-bold text-white">Pusoy Solver</h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Chinese Poker Strategy Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Undo */}
            <button
              onClick={undo}
              disabled={!canUndo}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-bg-tertiary hover:bg-bg-tertiary/80 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-bg-tertiary"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Undo</span>
            </button>

            {/* Redo */}
            <button
              onClick={redo}
              disabled={!canRedo}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-bg-tertiary hover:bg-bg-tertiary/80 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-bg-tertiary"
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Redo</span>
            </button>

            {/* Reset */}
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-bg-tertiary hover:bg-bg-tertiary/80 rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Top: Board + Side Panel */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 mb-6">
          {/* Center: Arrangement Board */}
          <div className="xl:col-span-7">
            <ArrangementBoard />
          </div>

          {/* Right: Suggestion + Scoring */}
          <div className="xl:col-span-5 space-y-4">
            <SuggestionPanel
              isLoading={suggestionLoading}
              error={solverError}
            />
            {isComplete && <ScoringSummary />}
          </div>
        </div>

        {/* Bottom: Full-width Card Selector */}
        <div className="border-t border-bg-tertiary pt-4">
          <CardSelector />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-bg-tertiary mt-8">
        <div className="max-w-7xl mx-auto px-4 py-3 text-center text-xs text-gray-600">
          Pusoy Strategy Solver — Heuristic engine • Monte Carlo simulation planned
        </div>
      </footer>
    </div>
  )
}
