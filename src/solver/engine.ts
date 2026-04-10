import type { Card, Arrangement, HandType, ValidationResult, ScoreResult, Suit, Rank, MonteCarloResult } from '@/types'

// ============================================================
// Rank value mapping for comparison
// ============================================================
const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 11, 'Q': 12, 'K': 13, 'A': 14,
}

const ALL_SUITS: Suit[] = ['♠', '♥', '♦', '♣']
const ALL_RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']

function cardValue(card: Card): number {
  return RANK_VALUES[card.rank]
}

function sortCardsByValue(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => cardValue(a) - cardValue(b))
}

function cardKey(card: Card): string {
  return `${card.rank}${card.suit}`
}

// ============================================================
// Full 52-card deck builder
// ============================================================

export function buildDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of ALL_SUITS) {
    for (const rank of ALL_RANKS) {
      deck.push({ suit, rank, id: `${rank}${suit}` })
    }
  }
  return deck
}

// Fisher-Yates shuffle (in-place)
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ============================================================
// Hand Evaluation - Standard Poker Ranking
// ============================================================

export function evaluateHand(cards: Card[]): { type: HandType; value: number } {
  const sorted = sortCardsByValue(cards)
  const n = cards.length

  if (n === 0) return { type: 'high', value: 0 }

  if (n === 3) {
    return evaluateThreeCardHand(sorted)
  }

  return evaluateFiveCardHand(sorted)
}

function evaluateThreeCardHand(cards: Card[]): { type: HandType; value: number } {
  const sorted = sortCardsByValue(cards)
  const rankCounts: Record<string, number> = {}
  sorted.forEach(c => { rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1 })
  const counts = Object.values(rankCounts).sort((a, b) => b - a)

  if (counts[0] === 3) {
    return { type: 'trips', value: 3000000 + cardValue(cards[0]) * 10000 + cardValue(cards[1]) * 100 + cardValue(cards[2]) }
  }

  if (counts[0] === 2) {
    const pairRank = Object.entries(rankCounts).find(([, c]) => c === 2)![0] as Rank
    const kickerRank = Object.entries(rankCounts).find(([, c]) => c === 1)![0] as Rank
    return { type: 'pair', value: 2000000 + RANK_VALUES[pairRank] * 10000 + RANK_VALUES[kickerRank] * 100 }
  }

  return {
    type: 'high',
    value: cardValue(sorted[2]) * 10000 + cardValue(sorted[1]) * 100 + cardValue(sorted[0]),
  }
}

function evaluateFiveCardHand(cards: Card[]): { type: HandType; value: number } {
  const sorted = sortCardsByValue(cards)
  const isFlush = cards.every(c => c.suit === cards[0].suit)
  const isStraight = checkStraight(sorted.map(c => cardValue(c)))

  if (isFlush && isStraight) {
    const ranks = sorted.map(c => c.rank)
    const hasRoyal = (['10', 'J', 'Q', 'K', 'A'] as Rank[]).every(r => ranks.includes(r))
    if (hasRoyal) {
      return { type: 'royal_flush', value: 900000000 }
    }
    return { type: 'straight_flush', value: 800000000 + cardValue(sorted[4]) * 100000 }
  }

  const rankCounts: Record<string, number> = {}
  sorted.forEach(c => { rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1 })
  const counts = Object.values(rankCounts).sort((a, b) => b - a)
  const countMap = new Map<number, Rank[]>()
  for (const [rank, count] of Object.entries(rankCounts)) {
    if (!countMap.has(count)) countMap.set(count, [])
    countMap.get(count)!.push(rank as Rank)
  }

  if (counts[0] === 4) {
    const quadRank = countMap.get(4)![0]
    const kickerRank = countMap.get(1)![0]
    return { type: 'quads', value: 700000000 + RANK_VALUES[quadRank] * 100000 + RANK_VALUES[kickerRank] * 100 }
  }

  if (counts[0] === 3 && counts[1] === 2) {
    const tripRank = countMap.get(3)![0]
    const pairRank = countMap.get(2)![0]
    return { type: 'full_house', value: 600000000 + RANK_VALUES[tripRank] * 100000 + RANK_VALUES[pairRank] * 100 }
  }

  if (isFlush) {
    return { type: 'flush', value: 500000000 + cardValue(sorted[4]) * 1000000 + cardValue(sorted[3]) * 10000 + cardValue(sorted[2]) * 100 + cardValue(sorted[1]) * 10 + cardValue(sorted[0]) }
  }

  if (isStraight) {
    return { type: 'straight', value: 400000000 + cardValue(sorted[4]) * 100000 }
  }

  if (counts[0] === 3) {
    const tripRank = countMap.get(3)![0]
    const kickers = sortCardsByValue(cards.filter(c => c.rank !== tripRank))
    return { type: 'trips', value: 300000000 + RANK_VALUES[tripRank] * 1000000 + cardValue(kickers[1]) * 100 + cardValue(kickers[0]) }
  }

  if (counts[0] === 2 && counts[1] === 2) {
    const pairRanks = countMap.get(2)!.sort((a, b) => RANK_VALUES[b] - RANK_VALUES[a])
    const kickerRank = countMap.get(1)![0]
    return { type: 'two_pair', value: 200000000 + RANK_VALUES[pairRanks[0]] * 100000 + RANK_VALUES[pairRanks[1]] * 100 + RANK_VALUES[kickerRank] }
  }

  if (counts[0] === 2) {
    const pairRank = countMap.get(2)![0]
    const kickers = sortCardsByValue(cards.filter(c => c.rank !== pairRank))
    return { type: 'pair', value: 100000000 + RANK_VALUES[pairRank] * 1000000 + cardValue(kickers[2]) * 10000 + cardValue(kickers[1]) * 100 + cardValue(kickers[0]) }
  }

  return { type: 'high', value: cardValue(sorted[4]) * 1000000 + cardValue(sorted[3]) * 10000 + cardValue(sorted[2]) * 100 + cardValue(sorted[1]) * 10 + cardValue(sorted[0]) }
}

function checkStraight(values: number[]): boolean {
  const sorted = [...values].sort((a, b) => a - b)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) {
      return false
    }
  }
  return true
}

// ============================================================
// Arrangement Validation
// ============================================================

export function checkValid(arrangement: Arrangement): ValidationResult {
  const { front, middle, back } = arrangement

  if (front.length !== 3) return { isValid: false, error: 'Front must have exactly 3 cards' }
  if (middle.length !== 5) return { isValid: false, error: 'Middle must have exactly 5 cards' }
  if (back.length !== 5) return { isValid: false, error: 'Back must have exactly 5 cards' }

  const allCards = [...front, ...middle, ...back]
  const uniqueKeys = new Set(allCards.map(cardKey))
  if (uniqueKeys.size !== 13) return { isValid: false, error: 'All cards must be unique' }

  const frontEval = evaluateHand(front)
  const middleEval = evaluateHand(middle)
  const backEval = evaluateHand(back)

  if (backEval.value < middleEval.value) {
    return { isValid: false, error: `Foul: Back (${backEval.type}) must be stronger than Middle (${middleEval.type})` }
  }

  if (middleEval.value < frontEval.value) {
    return { isValid: false, error: `Foul: Middle (${middleEval.type}) must be stronger than Front (${frontEval.type})` }
  }

  return { isValid: true }
}

// ============================================================
// Score Calculation
// ============================================================

export function calculateScore(
  arrangement: Arrangement,
  opponentArrangement?: Arrangement
): ScoreResult {
  const frontEval = evaluateHand(arrangement.front)
  const middleEval = evaluateHand(arrangement.middle)
  const backEval = evaluateHand(arrangement.back)

  let frontScore = 0
  let middleScore = 0
  let backScore = 0
  let bonus = 0

  if (!opponentArrangement) {
    frontScore = frontEval.value > 0 ? 1 : 0
    middleScore = middleEval.value > 0 ? 1 : 0
    backScore = backEval.value > 0 ? 1 : 0
  } else {
    const oppFront = evaluateHand(opponentArrangement.front)
    const oppMiddle = evaluateHand(opponentArrangement.middle)
    const oppBack = evaluateHand(opponentArrangement.back)

    if (frontEval.value > oppFront.value) frontScore = 1
    else if (frontEval.value < oppFront.value) frontScore = -1

    if (middleEval.value > oppMiddle.value) middleScore = 1
    else if (middleEval.value < oppMiddle.value) middleScore = -1

    if (backEval.value > oppBack.value) backScore = 1
    else if (backEval.value < oppBack.value) backScore = -1

    // Scoop bonus
    if (frontScore > 0 && middleScore > 0 && backScore > 0) bonus += 3
  }

  // Fantasy land bonuses
  if (backEval.type === 'quads') bonus += 4
  if (backEval.type === 'straight_flush') bonus += 5
  if (backEval.type === 'royal_flush') bonus += 10
  if (middleEval.type === 'quads') bonus += 4
  if (middleEval.type === 'straight_flush') bonus += 5
  if (middleEval.type === 'royal_flush') bonus += 10
  if (frontEval.type === 'trips') bonus += 2
  if (frontEval.type === 'pair') {
    const topCard = sortCardsByValue(arrangement.front).pop()!
    if (cardValue(topCard) >= 11) bonus += 1
  }

  const total = frontScore + middleScore + backScore + bonus
  return { front: frontScore, middle: middleScore, back: backScore, bonus, total }
}

// ============================================================
// Monte Carlo Simulation Engine
// ============================================================

/**
 * Deals random valid arrangements to N opponents from the unknown card pool.
 * Each opponent gets exactly 13 cards from the remaining deck.
 */
function dealOpponentHands(
  playerHand: Card[],
  numOpponents: number
): Card[][] {
  const deck = buildDeck()
  const playerKeys = new Set(playerHand.map(cardKey))
  const unknown = deck.filter(c => !playerKeys.has(cardKey(c)))
  const shuffled = shuffle(unknown)

  const hands: Card[][] = []
  for (let i = 0; i < numOpponents; i++) {
    hands.push(shuffled.slice(i * 13, (i + 1) * 13))
  }

  return hands
}

/**
 * Generates a heuristic arrangement for a given 13-card hand.
 * Uses the same strategy as suggestOptimal but without MC overhead.
 */
function generateArrangement(hand: Card[]): Arrangement {
  if (hand.length !== 13) return { front: [], middle: [], back: [] }

  const sorted = sortCardsByValue(hand)
  const bySuit = groupBySuit(hand)
  const byRank = groupByRank(hand)

  const flushCards = Object.values(bySuit).find(c => c.length >= 5) || []
  const straightCards = findBestStraight(hand)
  const quadsEntry = Object.entries(byRank).find(([, r]) => r.length === 4)
  const quadsCards = quadsEntry ? quadsEntry[1] : []
  const trips = Object.entries(byRank).filter(([, r]) => r.length === 3)

  let back: Card[] = []
  let middle: Card[] = []
  let front: Card[] = []

  // Back: strongest combo
  if (flushCards.length >= 5) {
    back = sortCardsByValue(flushCards).slice(0, 5)
  } else if (straightCards.length === 5) {
    back = straightCards
  } else if (quadsCards.length === 4) {
    back = [...quadsCards, sorted[sorted.length - 1]]
  } else if (trips.length > 0) {
    const bestTrip = trips[trips.length - 1]
    back = [...bestTrip[1]]
    const remaining = hand.filter(c => c.rank !== bestTrip[0])
    back.push(...sortCardsByValue(remaining).slice(-2))
  } else {
    back = sortCardsByValue(hand).slice(-5)
  }

  // Middle: from remaining
  const afterBack = hand.filter(c => !back.some(b => cardKey(b) === cardKey(c)))
  if (trips.length > 0 && trips[0][0] !== trips[trips.length - 1]?.[0]) {
    const secondTrip = trips[0]
    middle = [...secondTrip[1]]
    const rem = afterBack.filter(c => c.rank !== secondTrip[0])
    middle.push(...sortCardsByValue(rem).slice(-2))
  } else {
    middle = sortCardsByValue(afterBack).slice(-5)
  }

  // Front: from remaining
  const remaining = hand.filter(c =>
    !back.some(b => cardKey(b) === cardKey(c)) &&
    !middle.some(m => cardKey(m) === cardKey(c))
  )
  front = sortCardsByValue(remaining).slice(-3)

  // Fill gaps
  const allAssigned = [...front, ...middle, ...back]
  if (allAssigned.length < 13) {
    const unused = hand.filter(c => !allAssigned.some(a => cardKey(a) === cardKey(c)))
    while (front.length < 3 && unused.length > 0) front.push(unused.shift()!)
    while (middle.length < 5 && unused.length > 0) middle.push(unused.shift()!)
    while (back.length < 5 && unused.length > 0) back.push(unused.shift()!)
  }

  front = front.slice(-3)
  middle = middle.slice(-5)
  back = back.slice(-5)

  // Validate
  if (!checkValid({ front, middle, back }).isValid) {
    const allSorted = sortCardsByValue(hand)
    front = allSorted.slice(0, 3)
    middle = allSorted.slice(3, 8)
    back = allSorted.slice(8, 13)
  }

  return { front, middle, back }
}

/**
 * Runs Monte Carlo simulation to estimate expected value of an arrangement.
 *
 * @param playerHand - The player's 13 known cards
 * @param arrangement - The arrangement to evaluate
 * @param numOpponents - Number of opponents (1-3)
 * @param simulations - Number of Monte Carlo iterations (default 2000)
 * @returns MonteCarloResult with expected value, win rates, and breakdown
 */
export function monteCarloExpectation(
  playerHand: Card[],
  arrangement: Arrangement,
  numOpponents: number = 3,
  simulations: number = 2000
): MonteCarloResult {
  if (playerHand.length !== 13 || arrangement.front.length !== 3 ||
      arrangement.middle.length !== 5 || arrangement.back.length !== 5) {
    return {
      expectedValue: 0,
      winRate: 0,
      foulRate: 0,
      simulations: 0,
      rowWinRates: { front: 0, middle: 0, back: 0 },
      opponentBreakdown: {},
      reasoning: 'Invalid hand or arrangement for simulation',
    }
  }

  const playerValid = checkValid(arrangement)
  const playerFouls = !playerValid.isValid

  // Pre-evaluate player's rows
  const pFront = evaluateHand(arrangement.front)
  const pMiddle = evaluateHand(arrangement.middle)
  const pBack = evaluateHand(arrangement.back)

  let totalPoints = 0
  let wins = 0
  let fouls = 0

  let frontWins = 0
  let middleWins = 0
  let backWins = 0

  const opponentTotals: Record<number, { sumPoints: number; wins: number }> = {}
  for (let i = 0; i < numOpponents; i++) {
    opponentTotals[i] = { sumPoints: 0, wins: 0 }
  }

  for (let sim = 0; sim < simulations; sim++) {
    const oppHands = dealOpponentHands(playerHand, numOpponents)
    let simPoints = 0

    for (let opp = 0; opp < numOpponents; opp++) {
      const oppArr = generateArrangement(oppHands[opp])
      const oppValid = checkValid(oppArr)

      if (playerFouls && !oppValid.isValid) {
        // Both foul: 0 points
        continue
      }

      if (playerFouls) {
        simPoints -= 3
        opponentTotals[opp].sumPoints += 3
        opponentTotals[opp].wins++
        continue
      }

      if (!oppValid.isValid) {
        // Opponent fouls: player gets 3 + bonus
        const bonus = calculateScore(arrangement).bonus
        simPoints += 3 + bonus
        opponentTotals[opp].sumPoints -= 3
        continue
      }

      // Neither fouls: compare rows
      const oFront = evaluateHand(oppArr.front)
      const oMiddle = evaluateHand(oppArr.middle)
      const oBack = evaluateHand(oppArr.back)

      let rowPoints = 0

      if (pFront.value > oFront.value) {
        rowPoints++
        frontWins++
      } else {
        rowPoints--
      }

      if (pMiddle.value > oMiddle.value) {
        rowPoints++
        middleWins++
      } else {
        rowPoints--
      }

      if (pBack.value > oBack.value) {
        rowPoints++
        backWins++
      } else {
        rowPoints--
      }

      // Scoop
      if (rowPoints === 3) rowPoints += 3

      // Bonuses
      const score = calculateScore(arrangement, oppArr)
      rowPoints += score.bonus

      simPoints += rowPoints
      opponentTotals[opp].sumPoints -= rowPoints
      if (rowPoints > 0) opponentTotals[opp].wins++
    }

    totalPoints += simPoints
    if (simPoints > 0) wins++
    if (playerFouls) fouls++
  }

  const expectedValue = totalPoints / simulations
  const winRate = wins / simulations
  const foulRate = fouls / simulations
  const totalComparisons = simulations * numOpponents

  const opponentBreakdown: Record<number, { avgPoints: number; winRate: number }> = {}
  for (let i = 0; i < numOpponents; i++) {
    opponentBreakdown[i] = {
      avgPoints: opponentTotals[i].sumPoints / simulations,
      winRate: opponentTotals[i].wins / simulations,
    }
  }

  // Build reasoning string
  const reasoning = buildMonteCarloReasoning({
    expectedValue,
    winRate,
    foulRate,
    simulations,
    frontWinRate: frontWins / totalComparisons,
    middleWinRate: middleWins / totalComparisons,
    backWinRate: backWins / totalComparisons,
    opponentBreakdown,
    playerArrangement: arrangement,
  })

  return {
    expectedValue: Math.round(expectedValue * 100) / 100,
    winRate: Math.round(winRate * 1000) / 1000,
    foulRate: Math.round(foulRate * 1000) / 1000,
    simulations,
    rowWinRates: {
      front: Math.round((frontWins / totalComparisons) * 1000) / 1000,
      middle: Math.round((middleWins / totalComparisons) * 1000) / 1000,
      back: Math.round((backWins / totalComparisons) * 1000) / 1000,
    },
    opponentBreakdown,
    reasoning,
  }
}

interface MCReasoningInput {
  expectedValue: number
  winRate: number
  foulRate: number
  simulations: number
  frontWinRate: number
  middleWinRate: number
  backWinRate: number
  opponentBreakdown: Record<number, { avgPoints: number; winRate: number }>
  playerArrangement: Arrangement
}

function buildMonteCarloReasoning(input: MCReasoningInput): string {
  const parts: string[] = []

  const evStr = input.expectedValue > 0 ? `+${input.expectedValue.toFixed(1)}` : input.expectedValue.toFixed(1)
  parts.push(`Expected value: ${evStr} pts/game over ${input.simulations} sims`)
  parts.push(`Win rate: ${(input.winRate * 100).toFixed(1)}%`)

  if (input.foulRate > 0) {
    parts.push(`⚠ Arrangement fouls in ${(input.foulRate * 100).toFixed(1)}% of sims`)
  }

  const rowNames = ['Front', 'Middle', 'Back']
  const rowRates = [input.frontWinRate, input.middleWinRate, input.backWinRate]
  for (let i = 0; i < 3; i++) {
    parts.push(`${rowNames[i]} wins ${(rowRates[i] * 100).toFixed(0)}%`)
  }

  if (input.expectedValue > 3) {
    parts.push('Strong arrangement — likely to dominate')
  } else if (input.expectedValue > 0) {
    parts.push('Marginal edge — consider alternative arrangements')
  } else if (input.expectedValue > -3) {
    parts.push('Slight disadvantage — try rearranging')
  } else {
    parts.push('Weak arrangement — significant reshuffle recommended')
  }

  return parts.join('. ') + '.'
}

/**
 * Finds the arrangement with the highest expected value via Monte Carlo.
 *
 * Generates multiple candidate arrangements (heuristic variants), runs
 * MC simulation on each, and returns the best one.
 *
 * @param hand - Player's 13 cards
 * @param numOpponents - Number of opponents
 * @param simulations - MC iterations per candidate
 * @param candidates - Number of arrangement variants to test
 * @returns Best arrangement + MC result
 */
export function findBestArrangement(
  hand: Card[],
  numOpponents: number = 3,
  simulations: number = 1000,
  candidates: number = 5
): { arrangement: Arrangement; mcResult: MonteCarloResult } {
  if (hand.length !== 13) {
    return {
      arrangement: { front: [], middle: [], back: [] },
      mcResult: {
        expectedValue: 0, winRate: 0, foulRate: 0, simulations: 0,
        rowWinRates: { front: 0, middle: 0, back: 0 },
        opponentBreakdown: {},
        reasoning: 'Need exactly 13 cards',
      },
    }
  }

  // Generate candidate arrangements with different strategies
  const arrangementCandidates: Arrangement[] = []

  // 1. Default heuristic
  arrangementCandidates.push(suggestOptimal(hand))

  // 2. Aggressive back (strongest possible back)
  arrangementCandidates.push(generateAggressiveBack(hand))

  // 3. Balanced (even distribution)
  arrangementCandidates.push(generateBalanced(hand))

  // 4. Front-focused (maximize front)
  arrangementCandidates.push(generateFrontFocused(hand))

  // 5. Shuffle-based random variant
  for (let i = 5; i < candidates; i++) {
    arrangementCandidates.push(generateRandomVariant(hand))
  }

  // Deduplicate and validate
  const seen = new Set<string>()
  const unique: Arrangement[] = []
  for (const arr of arrangementCandidates) {
    const key = [...arr.front, ...arr.middle, ...arr.back].map(cardKey).sort().join(',')
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(arr)
    }
  }

  // Run MC on each candidate
  let best: { arrangement: Arrangement; mcResult: MonteCarloResult } | null = null

  for (const arr of unique) {
    const valid = checkValid(arr)
    if (!valid.isValid) continue

    const mc = monteCarloExpectation(hand, arr, numOpponents, simulations)
    if (!best || mc.expectedValue > best.mcResult.expectedValue) {
      best = { arrangement: arr, mcResult: mc }
    }
  }

  // Fallback to default if all candidates foul
  if (!best) {
    const fallback = suggestOptimal(hand)
    const mc = monteCarloExpectation(hand, fallback, numOpponents, simulations)
    best = { arrangement: fallback, mcResult: mc }
  }

  return best
}

// ============================================================
// Arrangement Generation Strategies
// ============================================================

export function suggestOptimal(hand: Card[]): Arrangement {
  return generateArrangement(hand)
}

/**
 * Strategy: Maximize back row strength, even if middle/front are weaker.
 * Good when you have a very strong 5-card combo.
 */
function generateAggressiveBack(hand: Card[]): Arrangement {
  const sorted = sortCardsByValue(hand)
  const bySuit = groupBySuit(hand)
  const byRank = groupByRank(hand)

  let back: Card[] = []
  const flushCards = Object.values(bySuit).find(c => c.length >= 5)
  const straightCards = findBestStraight(hand)
  const quadsEntry = Object.entries(byRank).find(([, r]) => r.length === 4)

  if (flushCards) {
    back = sortCardsByValue(flushCards).slice(0, 5)
  } else if (straightCards.length === 5) {
    back = straightCards
  } else if (quadsEntry) {
    back = [...quadsEntry[1], sorted[sorted.length - 1]]
  } else {
    back = sorted.slice(-5)
  }

  const remaining = hand.filter(c => !back.some(b => cardKey(b) === cardKey(c)))
  const remSorted = sortCardsByValue(remaining)

  return {
    front: remSorted.slice(0, 3),
    middle: remSorted.slice(3, 8),
    back,
  }
}

/**
 * Strategy: Even distribution — minimize variance across rows.
 */
function generateBalanced(hand: Card[]): Arrangement {
  const sorted = sortCardsByValue(hand)

  // Distribute cards round-robin: back gets highest, middle next, front next
  const back: Card[] = []
  const middle: Card[] = []
  const front: Card[] = []

  for (let i = sorted.length - 1; i >= 0; i--) {
    const card = sorted[i]
    const pos = (sorted.length - 1 - i) % 3
    if (pos === 0 && back.length < 5) back.push(card)
    else if (pos === 1 && middle.length < 5) middle.push(card)
    else if (pos === 2 && front.length < 3) front.push(card)
    // Overflow handling
    else if (back.length < 5) back.push(card)
    else if (middle.length < 5) middle.push(card)
    else front.push(card)
  }

  // Trim
  const all = [...front.slice(0, 3), ...middle.slice(0, 5), ...back.slice(0, 5)]
  const trimmedFront = all.slice(0, 3)
  const trimmedMiddle = all.slice(3, 8)
  const trimmedBack = all.slice(8, 13)

  return {
    front: trimmedFront,
    middle: trimmedMiddle,
    back: trimmedBack,
  }
}

/**
 * Strategy: Maximize front row (trips/pair in front).
 */
function generateFrontFocused(hand: Card[]): Arrangement {
  const byRank = groupByRank(hand)
  const trips = Object.entries(byRank).find(([, r]) => r.length === 3)
  const pairs = Object.entries(byRank).filter(([, r]) => r.length === 2)

  let front: Card[] = []
  if (trips) {
    front = trips[1]
  } else if (pairs.length > 0) {
    const bestPair = pairs.sort((a, b) => RANK_VALUES[b[0] as Rank] - RANK_VALUES[a[0] as Rank])[0]
    const kicker = sortCardsByValue(hand.filter(c => c.rank !== bestPair[0])).pop()!
    front = [...bestPair[1], kicker]
  } else {
    front = sortCardsByValue(hand).slice(-3)
  }

  const remaining = hand.filter(c => !front.some(f => cardKey(f) === cardKey(c)))
  const remSorted = sortCardsByValue(remaining)

  return {
    front,
    middle: remSorted.slice(0, 5),
    back: remSorted.slice(5, 10),
  }
}

/**
 * Strategy: Slightly randomized variant for MC diversity.
 */
function generateRandomVariant(hand: Card[]): Arrangement {
  const shuffled = shuffle(hand)
  const front = shuffled.slice(0, 3)
  const middle = shuffled.slice(3, 8)
  const back = shuffled.slice(8, 13)

  // Validate and fix if needed
  if (!checkValid({ front, middle, back }).isValid) {
    return generateArrangement(hand)
  }

  return { front, middle, back }
}

// ============================================================
// Helper Functions
// ============================================================

function groupBySuit(cards: Card[]): Record<Suit, Card[]> {
  const result: Record<Suit, Card[]> = { '♠': [], '♥': [], '♦': [], '♣': [] }
  cards.forEach(c => result[c.suit].push(c))
  return result
}

function groupByRank(cards: Card[]): Record<Rank, Card[]> {
  const result: Record<Rank, Card[]> = {} as Record<Rank, Card[]>
  cards.forEach(c => {
    if (!result[c.rank]) result[c.rank] = []
    result[c.rank].push(c)
  })
  return result
}

function findBestStraight(hand: Card[]): Card[] {
  const sorted = sortCardsByValue(hand)

  for (let high = 14; high >= 5; high--) {
    const needed = new Set([high, high - 1, high - 2, high - 3, high - 4])
    const found: Card[] = []
    for (const card of sorted) {
      if (needed.has(cardValue(card)) && found.length < 5) {
        found.push(card)
        needed.delete(cardValue(card))
      }
    }
    if (found.length === 5) return found
  }

  return []
}

// Generate reasoning string for a single arrangement
export function generateReasoning(arrangement: Arrangement): string {
  const backEval = evaluateHand(arrangement.back)
  const middleEval = evaluateHand(arrangement.middle)
  const frontEval = evaluateHand(arrangement.front)

  const parts: string[] = []

  parts.push(`${capitalize(backEval.type)} in back (strongest row)`)
  parts.push(`${capitalize(middleEval.type)} in middle`)
  parts.push(`${capitalize(frontEval.type)} in front`)

  const validation = checkValid(arrangement)
  if (validation.isValid) {
    parts.push('Valid arrangement — no foul risk')
  } else {
    parts.push(`Warning: ${validation.error}`)
  }

  return parts.join('. ') + '.'
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).replace('_', ' ')
}
