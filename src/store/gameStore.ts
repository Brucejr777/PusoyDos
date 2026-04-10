import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Card, Arrangement, ValidationResult, ScoreResult, Position } from '@/types'

// ============================================================
// Snapshot — point-in-time state for undo/redo
// ============================================================

interface HistorySnapshot {
  hand: Card[]
  arrangement: Arrangement
}

const MAX_HISTORY = 50

const DEFAULT_ARRANGEMENT: Arrangement = { front: [], middle: [], back: [] }
const DEFAULT_SCORE: ScoreResult = { front: 0, middle: 0, back: 0, bonus: 0, total: 0 }

function cardKey(card: Card): string {
  return `${card.rank}${card.suit}`
}

// Deep-clones a snapshot so mutations don't corrupt history
function cloneSnapshot(state: { hand: Card[]; arrangement: Arrangement }): HistorySnapshot {
  return {
    hand: state.hand.map(c => ({ ...c })),
    arrangement: {
      front: state.arrangement.front.map(c => ({ ...c })),
      middle: state.arrangement.middle.map(c => ({ ...c })),
      back: state.arrangement.back.map(c => ({ ...c })),
    },
  }
}

function deepEqual(a: HistorySnapshot, b: HistorySnapshot): boolean {
  if (a.hand.length !== b.hand.length) return false
  if (a.arrangement.front.length !== b.arrangement.front.length) return false
  if (a.arrangement.middle.length !== b.arrangement.middle.length) return false
  if (a.arrangement.back.length !== b.arrangement.back.length) return false

  const keysEq = (arr1: Card[], arr2: Card[]) =>
    arr1.length === arr2.length && arr1.every((c, i) => cardKey(c) === cardKey(arr2[i]))

  return (
    keysEq(a.hand, b.hand) &&
    keysEq(a.arrangement.front, b.arrangement.front) &&
    keysEq(a.arrangement.middle, b.arrangement.middle) &&
    keysEq(a.arrangement.back, b.arrangement.back)
  )
}

// ============================================================
// Store Interface
// ============================================================

interface GameStore {
  hand: Card[]
  arrangement: Arrangement
  isValid: boolean
  score: ScoreResult
  suggestion: Arrangement | null
  reasoning: string

  // History
  canUndo: boolean
  canRedo: boolean

  setHand: (hand: Card[]) => void
  assignCard: (card: Card, position: Position) => void
  removeCard: (card: Card) => void
  moveCard: (card: Card, fromPosition: Position | 'hand', toPosition: Position | 'hand') => void
  setSuggestion: (arrangement: Arrangement, reasoning: string) => void
  setValid: (result: ValidationResult) => void
  setScore: (result: ScoreResult) => void
  undo: () => void
  redo: () => void
  resetGame: () => void
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => {
      // Private history stacks (not persisted — rehydrated empty on reload)
      let undoStack: HistorySnapshot[] = []
      let redoStack: HistorySnapshot[] = []

      /** Push current state onto undo stack, clear redo stack */
      const pushHistory = () => {
        const state = get()
        const snapshot = cloneSnapshot(state)

        // Skip if identical to last snapshot
        if (undoStack.length > 0 && deepEqual(undoStack[undoStack.length - 1], snapshot)) return

        undoStack.push(snapshot)
        if (undoStack.length > MAX_HISTORY) undoStack = undoStack.slice(-MAX_HISTORY)
        redoStack = [] // Clear redo on new action
      }

      /** Restore state from a snapshot */
      const restoreSnapshot = (snap: HistorySnapshot) => {
        set({
          hand: snap.hand.map(c => ({ ...c })),
          arrangement: {
            front: snap.arrangement.front.map(c => ({ ...c })),
            middle: snap.arrangement.middle.map(c => ({ ...c })),
            back: snap.arrangement.back.map(c => ({ ...c })),
          },
        })
      }

      /** Recompute canUndo/canRedo */
      const updateHistoryFlags = () => {
        set({
          canUndo: undoStack.length > 0,
          canRedo: redoStack.length > 0,
        })
      }

      return {
        hand: [],
        arrangement: DEFAULT_ARRANGEMENT,
        isValid: false,
        score: DEFAULT_SCORE,
        suggestion: null,
        reasoning: '',
        canUndo: false,
        canRedo: false,

        setHand: (hand: Card[]) => {
          pushHistory()
          set({ hand })
        },

        assignCard: (card: Card, position: Position) => {
          const state = get()
          const arr = { ...state.arrangement }
          const row = [...arr[position]]

          const maxLen = position === 'front' ? 3 : 5
          if (row.length >= maxLen) return

          // Remove card from other rows and hand
          for (const key of ['front', 'middle', 'back'] as const) {
            arr[key] = arr[key].filter(c => cardKey(c) !== cardKey(card))
          }

          arr[position] = [...row, card]

          pushHistory()
          set({
            arrangement: arr,
            hand: state.hand.filter(h => cardKey(h) !== cardKey(card)),
          })
        },

        removeCard: (card: Card) => {
          const state = get()
          const arr = { ...state.arrangement }

          for (const key of ['front', 'middle', 'back'] as const) {
            arr[key] = arr[key].filter(c => cardKey(c) !== cardKey(card))
          }

          if (!state.hand.some(h => cardKey(h) === cardKey(card))) {
            pushHistory()
            set({ arrangement: arr, hand: [...state.hand, card] })
          } else {
            pushHistory()
            set({ arrangement: arr })
          }
        },

        moveCard: (card: Card, fromPosition: Position | 'hand', toPosition: Position | 'hand') => {
          const state = get()
          if (fromPosition === toPosition) return

          pushHistory()

          // Remove from source
          if (fromPosition !== 'hand') {
            const arr = { ...state.arrangement }
            arr[fromPosition] = arr[fromPosition].filter(c => cardKey(c) !== cardKey(card))
            set({ arrangement: arr })
          }

          // Add to destination
          if (toPosition === 'hand') {
            set((s) => ({
              hand: s.hand.some(h => cardKey(h) === cardKey(card)) ? s.hand : [...s.hand, card],
            }))
          } else {
            get().assignCard(card, toPosition)
          }
        },

        setSuggestion: (arrangement: Arrangement, reasoning: string) =>
          set({ suggestion: arrangement, reasoning }),

        setValid: (result: ValidationResult) =>
          set({ isValid: result.isValid }),

        setScore: (result: ScoreResult) =>
          set({ score: result }),

        undo: () => {
          if (undoStack.length === 0) return

          const state = get()
          const currentSnapshot = cloneSnapshot(state)

          // Pop last snapshot from undo stack
          const prev = undoStack.pop()!

          // Push current onto redo
          redoStack.push(currentSnapshot)
          if (redoStack.length > MAX_HISTORY) redoStack = redoStack.slice(-MAX_HISTORY)

          restoreSnapshot(prev)
          updateHistoryFlags()
        },

        redo: () => {
          if (redoStack.length === 0) return

          const state = get()
          const currentSnapshot = cloneSnapshot(state)

          // Pop from redo stack
          const next = redoStack.pop()!

          // Push current onto undo
          undoStack.push(currentSnapshot)
          if (undoStack.length > MAX_HISTORY) undoStack = undoStack.slice(-MAX_HISTORY)

          restoreSnapshot(next)
          updateHistoryFlags()
        },

        resetGame: () => {
          pushHistory()
          undoStack = []
          redoStack = []
          set({
            hand: [],
            arrangement: DEFAULT_ARRANGEMENT,
            isValid: false,
            score: DEFAULT_SCORE,
            suggestion: null,
            reasoning: '',
            canUndo: false,
            canRedo: false,
          })
        },
      }
    },
    {
      name: 'pusoy-solver-storage',
      partialize: (state) => ({
        hand: state.hand,
      }),
    }
  )
)
