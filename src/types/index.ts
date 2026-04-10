export type Suit = '♠' | '♥' | '♦' | '♣'

export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A'

export interface Card {
  suit: Suit
  rank: Rank
  id: string // unique identifier, e.g. "A♠"
}

export type Position = 'front' | 'middle' | 'back'

export type HandType =
  | 'high'
  | 'pair'
  | 'two_pair'
  | 'straight'
  | 'flush'
  | 'trips'
  | 'full_house'
  | 'quads'
  | 'straight_flush'
  | 'royal_flush'

export interface Arrangement {
  front: Card[]  // 3 cards
  middle: Card[] // 5 cards
  back: Card[]   // 5 cards
}

export interface ValidationResult {
  isValid: boolean
  error?: string
}

export interface ScoreResult {
  front: number
  middle: number
  back: number
  bonus: number
  total: number
}

export interface MonteCarloResult {
  expectedValue: number // average points per simulation
  winRate: number // 0-1 fraction of sims won (positive total)
  foulRate: number // 0-1 fraction where arrangement fouls
  simulations: number
  rowWinRates: { front: number; middle: number; back: number }
  opponentBreakdown: Record<number, { avgPoints: number; winRate: number }>
  reasoning: string
}

export type SolverMessageType = 'VALIDATE' | 'SCORE' | 'SUGGEST' | 'MONTE_CARLO'

export type SolverRequest = {
  type: 'VALIDATE'
  arrangement: Arrangement
} | {
  type: 'SCORE'
  arrangement: Arrangement
  opponentArrangement?: Arrangement
} | {
  type: 'SUGGEST'
  hand: Card[]
} | {
  type: 'MONTE_CARLO'
  hand: Card[]
  arrangement: Arrangement
  numOpponents?: number
  simulations?: number
}

export type SolverResponse = {
  type: SolverMessageType
  data: ValidationResult | ScoreResult | Arrangement | { reasoning: string; arrangement: Arrangement } | MonteCarloResult
  error?: string
}
