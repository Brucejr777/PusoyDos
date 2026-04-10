import { useCallback, useRef, useEffect, useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { clsx } from 'clsx'
import type { MonteCarloResult } from '@/types'

export default function ScoringSummary() {
  const arrangement = useGameStore(s => s.arrangement)
  const isValid = useGameStore(s => s.isValid)
  const setValid = useGameStore(s => s.setValid)
  const setScore = useGameStore(s => s.setScore)
  const score = useGameStore(s => s.score)
  const hand = useGameStore(s => s.hand)

  const workerRef = useRef<Worker | null>(null)
  const [scored, setScored] = useState(false)
  const [mcRunning, setMcRunning] = useState(false)
  const [mcResult, setMcResult] = useState<MonteCarloResult | null>(null)

  // Initialize worker
  useEffect(() => {
    const worker = new Worker(
      new URL('@/solver/worker.ts', import.meta.url),
      { type: 'module' }
    )
    workerRef.current = worker
    return () => worker.terminate()
  }, [])

  // Listen for worker responses
  useEffect(() => {
    if (!workerRef.current) return

    const handler = (event: MessageEvent) => {
      const { type, data } = event.data

      if (type === 'VALIDATE') {
        setValid(data)
      }

      if (type === 'SCORE') {
        setScore(data)
        setScored(true)
      }

      if (type === 'MONTE_CARLO') {
        setMcResult(data)
        setMcRunning(false)
      }
    }

    workerRef.current.addEventListener('message', handler)
    return () => workerRef.current?.removeEventListener('message', handler)
  }, [setValid, setScore])

  const isComplete = arrangement.front.length === 3 &&
    arrangement.middle.length === 5 &&
    arrangement.back.length === 5

  const requestValidation = useCallback(() => {
    if (!workerRef.current || !isComplete) return
    workerRef.current.postMessage({
      type: 'VALIDATE',
      arrangement,
    })
  }, [arrangement, isComplete])

  const requestScore = useCallback(() => {
    if (!workerRef.current || !isComplete) return
    workerRef.current.postMessage({
      type: 'SCORE',
      arrangement,
    })
  }, [arrangement, isComplete])

  const requestMonteCarlo = useCallback(() => {
    if (!workerRef.current || !isComplete || hand.length < 13) return
    setMcRunning(true)
    setMcResult(null)
    workerRef.current.postMessage({
      type: 'MONTE_CARLO',
      hand,
      arrangement,
      numOpponents: 3,
      simulations: 2000,
    })
  }, [arrangement, hand, isComplete])

  // Auto-validate when arrangement is complete
  useEffect(() => {
    if (isComplete) {
      requestValidation()
      requestScore()
    }
  }, [isComplete, requestValidation, requestScore])

  if (!isComplete) {
    return (
      <div className="bg-bg-secondary rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">Scoring Summary</h3>
        <p className="text-gray-500 text-sm text-center py-4">
          Fill all 13 cards to see scoring
        </p>
      </div>
    )
  }

  return (
    <div className="bg-bg-secondary rounded-xl p-4 space-y-4">
      <h3 className="text-sm font-semibold text-gray-400">Scoring Summary</h3>

      {/* Validation Status */}
      <div className={clsx(
        'rounded-lg p-3 text-sm font-medium text-center',
        isValid ? 'badge-green' : 'badge-red'
      )}>
        {isValid ? '✓ Valid — No foul' : '✗ Foul — Loses all rows'}
      </div>

      {/* Score Breakdown */}
      {scored && (
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">Front</span>
            <span className={clsx(score.front > 0 ? 'text-green-400' : score.front < 0 ? 'text-red-400' : 'text-gray-500')}>
              {score.front > 0 ? '+' : ''}{score.front} pt
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">Middle</span>
            <span className={clsx(score.middle > 0 ? 'text-green-400' : score.middle < 0 ? 'text-red-400' : 'text-gray-500')}>
              {score.middle > 0 ? '+' : ''}{score.middle} pt
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">Back</span>
            <span className={clsx(score.back > 0 ? 'text-green-400' : score.back < 0 ? 'text-red-400' : 'text-gray-500')}>
              {score.back > 0 ? '+' : ''}{score.back} pt
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">Bonus</span>
            <span className={clsx(score.bonus > 0 ? 'text-yellow-400' : 'text-gray-500')}>
              {score.bonus > 0 ? '+' : ''}{score.bonus} pt
            </span>
          </div>
          <div className="border-t border-bg-tertiary pt-2 flex justify-between items-center">
            <span className="font-semibold">Total</span>
            <span className={clsx(
              'text-lg font-bold',
              score.total > 0 ? 'text-green-400' : score.total < 0 ? 'text-red-400' : 'text-gray-400'
            )}>
              {score.total > 0 ? '+' : ''}{score.total}
            </span>
          </div>
        </div>
      )}

      {/* Monte Carlo Section */}
      <div className="border-t border-bg-tertiary pt-3 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Monte Carlo Expectation
          </h4>
          {mcRunning && (
            <span className="badge-yellow">Simulating…</span>
          )}
        </div>

        {mcResult && (
          <div className="space-y-2">
            {/* Expected Value */}
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">Expected Value</span>
              <span className={clsx(
                'text-sm font-bold',
                mcResult.expectedValue > 0 ? 'text-green-400' : 'text-red-400'
              )}>
                {mcResult.expectedValue > 0 ? '+' : ''}{mcResult.expectedValue.toFixed(1)} pts
              </span>
            </div>

            {/* Win Rate */}
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">Win Rate</span>
              <span className="text-sm font-medium text-white">
                {(mcResult.winRate * 100).toFixed(1)}%
              </span>
            </div>

            {/* Row Win Rates */}
            <div className="grid grid-cols-3 gap-2 text-center">
              {(['front', 'middle', 'back'] as const).map(row => (
                <div key={row} className="bg-bg-tertiary rounded-lg py-1.5 px-2">
                  <div className="text-[10px] text-gray-500 uppercase">{row}</div>
                  <div className={clsx(
                    'text-xs font-bold',
                    mcResult.rowWinRates[row] > 0.5 ? 'text-green-400' : 'text-red-400'
                  )}>
                    {(mcResult.rowWinRates[row] * 100).toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>

            {/* Opponent Breakdown */}
            <div className="space-y-1">
              {Object.entries(mcResult.opponentBreakdown).map(([idx, breakdown]) => (
                <div key={idx} className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">vs Opponent {parseInt(idx) + 1}</span>
                  <span className={clsx(
                    breakdown.avgPoints > 0 ? 'text-green-400' : 'text-red-400'
                  )}>
                    {breakdown.avgPoints > 0 ? '+' : ''}{breakdown.avgPoints.toFixed(1)} pts
                  </span>
                </div>
              ))}
            </div>

            {/* Reasoning */}
            <p className="text-xs text-gray-400 bg-bg-tertiary rounded-lg p-2.5 leading-relaxed">
              {mcResult.reasoning}
            </p>

            {/* Sim count */}
            <p className="text-[10px] text-gray-600 text-center">
              {mcResult.simulations.toLocaleString()} simulations • 3 opponents
            </p>
          </div>
        )}

        {/* Run Button */}
        <button
          onClick={mcRunning ? undefined : requestMonteCarlo}
          disabled={mcRunning}
          className={clsx(
            'w-full py-2 px-4 text-sm rounded-lg transition-colors font-medium',
            mcRunning
              ? 'bg-bg-tertiary text-gray-500 cursor-wait'
              : 'bg-accent hover:bg-accent-hover text-white'
          )}
        >
          {mcRunning ? 'Running 2,000 simulations…' : 'Run Monte Carlo'}
        </button>
      </div>

      {/* Manual Refresh */}
      <button
        onClick={() => {
          requestValidation()
          requestScore()
        }}
        className="w-full py-2 px-4 bg-bg-tertiary hover:bg-bg-tertiary/80 text-gray-300 text-sm rounded-lg transition-colors"
      >
        Refresh Score
      </button>
    </div>
  )
}
