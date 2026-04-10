import { useCallback, useRef, useEffect } from 'react'
import type { Card, Suit } from '@/types'
import { useGameStore } from '@/store/gameStore'
import { clsx } from 'clsx'

const RED_SUITS: Suit[] = ['♥', '♦']

function isRed(suit: Suit): boolean {
  return RED_SUITS.includes(suit)
}

interface SuggestionPanelProps {
  isLoading: boolean
  error: string | null
}

export default function SuggestionPanel({ isLoading, error }: SuggestionPanelProps) {
  const hand = useGameStore(s => s.hand)
  const suggestion = useGameStore(s => s.suggestion)
  const reasoning = useGameStore(s => s.reasoning)
  const setSuggestion = useGameStore(s => s.setSuggestion)

  const workerRef = useRef<Worker | null>(null)

  // Initialize worker
  useEffect(() => {
    const worker = new Worker(
      new URL('@/solver/worker.ts', import.meta.url),
      { type: 'module' }
    )
    workerRef.current = worker
    return () => worker.terminate()
  }, [])

  const requestSuggestion = useCallback(() => {
    if (!workerRef.current || hand.length < 13) return

    workerRef.current.postMessage({
      type: 'SUGGEST',
      hand,
    })
  }, [hand])

  // Listen for worker response
  useEffect(() => {
    if (!workerRef.current) return

    const handler = (event: MessageEvent) => {
      const { type, data } = event.data
      if (type === 'SUGGEST' && data.arrangement) {
        setSuggestion(data.arrangement, data.reasoning || '')
      }
    }

    workerRef.current.addEventListener('message', handler)
    return () => workerRef.current?.removeEventListener('message', handler)
  }, [setSuggestion])

  const handleApplySuggestion = () => {
    if (!suggestion) return

    // Clear current arrangement and apply suggestion
    // The store's arrangement will be set by the user confirming
    // For now we just set the suggestion state
  }

  const handleAutoFill = () => {
    if (!suggestion) {
      requestSuggestion()
      return
    }
    handleApplySuggestion()
  }

  const MiniCard = ({ card }: { card: Card }) => (
    <span className={clsx(
      'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/10',
      isRed(card.suit) ? 'text-red-400' : 'text-gray-300'
    )}>
      {card.rank}{card.suit}
    </span>
  )

  return (
    <div className="bg-bg-secondary rounded-xl p-4 space-y-4">
      <h3 className="text-sm font-semibold text-gray-400">AI Suggestion</h3>

      {error && (
        <div className="text-red-400 text-sm bg-red-500/10 rounded-lg p-3">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-bg-tertiary rounded w-1/2" />
          <div className="h-8 bg-bg-tertiary rounded w-3/4" />
          <div className="h-3 bg-bg-tertiary rounded w-full" />
        </div>
      )}

      {!isLoading && !suggestion && hand.length >= 13 && (
        <div className="text-center py-4">
          <p className="text-gray-500 text-sm mb-3">
            Get an AI-suggested arrangement for your hand
          </p>
          <button
            onClick={requestSuggestion}
            className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors"
          >
            Generate Suggestion
          </button>
        </div>
      )}

      {!isLoading && suggestion && (
        <>
          {/* Suggested Arrangement */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-16">Front:</span>
              <div className="flex gap-1">
                {suggestion.front.map(c => <MiniCard key={c.id} card={c} />)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-16">Middle:</span>
              <div className="flex flex-wrap gap-1">
                {suggestion.middle.map(c => <MiniCard key={c.id} card={c} />)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-16">Back:</span>
              <div className="flex flex-wrap gap-1">
                {suggestion.back.map(c => <MiniCard key={c.id} card={c} />)}
              </div>
            </div>
          </div>

          {/* Reasoning */}
          {reasoning && (
            <p className="text-xs text-gray-400 bg-bg-tertiary rounded-lg p-3">
              💡 {reasoning}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleAutoFill}
              className="flex-1 py-2 px-4 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors"
            >
              Apply Suggestion
            </button>
            <button
              onClick={requestSuggestion}
              className="py-2 px-4 bg-bg-tertiary hover:bg-bg-tertiary/80 text-gray-300 text-sm rounded-lg transition-colors"
            >
              Re-roll
            </button>
          </div>
        </>
      )}

      {!isLoading && !suggestion && hand.length < 13 && (
        <p className="text-gray-500 text-sm text-center py-4">
          Select 13 cards to get a suggestion
        </p>
      )}
    </div>
  )
}
