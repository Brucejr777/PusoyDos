import type { SolverRequest, SolverResponse } from '@/types'
import { checkValid, calculateScore, suggestOptimal, generateReasoning, monteCarloExpectation } from './engine'

self.onmessage = (event: MessageEvent<SolverRequest>) => {
  try {
    const { type } = event.data

    let response: SolverResponse

    switch (type) {
      case 'VALIDATE': {
        const { arrangement } = event.data
        const result = checkValid(arrangement)
        response = { type: 'VALIDATE', data: result }
        break
      }

      case 'SCORE': {
        const { arrangement, opponentArrangement } = event.data
        const result = calculateScore(arrangement, opponentArrangement)
        response = { type: 'SCORE', data: result }
        break
      }

      case 'SUGGEST': {
        const { hand } = event.data
        const arrangement = suggestOptimal(hand)
        const reasoning = generateReasoning(arrangement)
        response = {
          type: 'SUGGEST',
          data: { arrangement, reasoning },
        }
        break
      }

      case 'MONTE_CARLO': {
        const { hand, arrangement, numOpponents, simulations } = event.data
        // Run MC expectation on the given arrangement
        const mcResult = monteCarloExpectation(
          hand,
          arrangement,
          numOpponents ?? 3,
          simulations ?? 2000
        )
        response = {
          type: 'MONTE_CARLO',
          data: mcResult,
        }
        break
      }

      default:
        response = {
          type: 'VALIDATE',
          data: { isValid: false, error: `Unknown request type: ${(event.data as { type: string }).type}` },
        }
    }

    postMessage(response)
  } catch (err) {
    postMessage({
      type: 'VALIDATE',
      data: { isValid: false, error: err instanceof Error ? err.message : 'Unknown error' },
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

export {}
