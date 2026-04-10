import { useMemo } from 'react'
import type { Card, Suit, Rank } from '@/types'
import { useGameStore } from '@/store/gameStore'
import { clsx } from 'clsx'

const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
const SUITS: Suit[] = ['♠', '♥', '♦', '♣']

const RED_SUITS: Suit[] = ['♥', '♦']

function makeId(rank: Rank, suit: Suit): string {
  return `${rank}${suit}`
}

function isRed(suit: Suit): boolean {
  return RED_SUITS.includes(suit)
}

export default function CardSelector() {
  const hand = useGameStore((s) => s.hand)
  const setHand = useGameStore((s) => s.setHand)

  const handKeys = useMemo(() => new Set(hand.map(c => c.id)), [hand])
  const isFull = hand.length >= 13

  const toggleCard = (card: Card) => {
    if (handKeys.has(card.id)) {
      setHand(hand.filter(c => c.id !== card.id))
    } else {
      if (isFull) return
      setHand([...hand, card])
    }
  }

  return (
    <div className="space-y-1.5">
      {/* Header with count */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-gray-400">Select 13 cards</span>
        <span className={clsx(
          'text-xs font-bold px-2 py-0.5 rounded',
          isFull ? 'badge-green' : 'badge-blue'
        )}>
          {hand.length}/13
        </span>
      </div>

      {/* Exactly 4 rows — one per suit */}
      <div className="space-y-1">
        {SUITS.map(suit => (
          <div key={suit} className="flex items-center gap-1.5">
            {/* Suit icon label */}
            <span className={clsx(
              'w-6 h-8 flex items-center justify-center text-lg font-bold shrink-0 rounded',
              isRed(suit) ? 'text-red-400' : 'text-gray-300'
            )}>
              {suit}
            </span>

            {/* 13 rank buttons using flex with equal sizing */}
            <div className="flex-1 flex gap-0.5">
              {RANKS.map(rank => {
                const card: Card = { suit, rank, id: makeId(rank, suit) }
                const selected = handKeys.has(card.id)
                return (
                  <button
                    key={card.id}
                    onClick={() => toggleCard(card)}
                    disabled={!selected && isFull}
                    style={{ flex: '1 1 0', minWidth: 0 }}
                    className={clsx(
                      'h-9 rounded text-xs font-bold transition-all duration-75',
                      'flex items-center justify-center',
                      selected
                        ? 'bg-accent text-white scale-90 shadow'
                        : 'bg-white hover:bg-gray-100 hover:scale-110 active:scale-90',
                      isRed(suit) && !selected && 'text-red-500',
                      !selected && !isRed(suit) && 'text-gray-800',
                      !selected && isFull && 'opacity-20 cursor-not-allowed hover:scale-100'
                    )}
                  >
                    {rank}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
