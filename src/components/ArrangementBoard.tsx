import { useMemo, useState, useCallback } from 'react'
import type { Card, Suit, Position } from '@/types'
import { useGameStore } from '@/store/gameStore'
import { clsx } from 'clsx'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const RED_SUITS: Suit[] = ['♥', '♦']

function isRed(suit: Suit): boolean {
  return RED_SUITS.includes(suit)
}

function ck(card: Card): string {
  return `${card.rank}${card.suit}`
}

// ============================================================
// Sortable Card (inside board rows)
// ============================================================

function SortableBoardCard({
  card,
  onReturnToHand,
}: {
  card: Card
  onReturnToHand: (card: Card) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `board-${ck(card)}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'card-slot-filled group relative',
        isRed(card.suit) ? 'text-red-500' : 'text-gray-800',
        isDragging && 'shadow-lg shadow-accent/20 scale-105'
      )}
      {...attributes}
      {...listeners}
    >
      <span className="text-sm font-bold">{card.rank}{card.suit}</span>
      {/* Return to hand indicator */}
      <button
        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-md"
        onClick={(e) => {
          e.stopPropagation()
          onReturnToHand(card)
        }}
        title="Return to hand"
      >
        ✕
      </button>
    </div>
  )
}

// ============================================================
// Sortable Hand Pill (from hand area to board)
// ============================================================

function SortableHandCard({
  card,
}: {
  card: Card
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `hand-${ck(card)}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={clsx(
        'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold',
        'bg-accent/20 text-accent-muted border border-accent/30',
        'cursor-grab active:cursor-grabbing select-none',
        'hover:bg-accent/30 transition-all',
        isDragging && 'scale-105 shadow-lg'
      )}
    >
      <span className="opacity-40 text-[10px]">⠿</span>
      {card.rank}{card.suit}
    </div>
  )
}

// ============================================================
// Empty Slot (drop target)
// ============================================================

function EmptySlot({
  position,
  index,
  onDropCard,
}: {
  position: Position
  index: number
  onDropCard: (position: Position, index: number) => void
}) {
  const [isOver, setIsOver] = useState(false)

  return (
    <div
      className={clsx(
        'card-slot transition-all',
        isOver && 'border-accent bg-accent/10 scale-105'
      )}
      onDragOver={(e) => {
        e.preventDefault()
        setIsOver(true)
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={() => {
        setIsOver(false)
        onDropCard(position, index)
      }}
    >
      <span className="text-gray-600 text-xs">+</span>
    </div>
  )
}

// ============================================================
// Main Component
// ============================================================

export default function ArrangementBoard() {
  const arrangement = useGameStore(s => s.arrangement)
  const hand = useGameStore(s => s.hand)
  const isValid = useGameStore(s => s.isValid)
  const assignCard = useGameStore(s => s.assignCard)
  const removeCard = useGameStore(s => s.removeCard)
  const moveCard = useGameStore(s => s.moveCard)

  const [activeCard, setActiveCard] = useState<Card | null>(null)

  // Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Build padded arrays for display
  const frontRow = useMemo(() => {
    const cards = [...arrangement.front]
    while (cards.length < 3) cards.push(null as unknown as Card)
    return cards.slice(0, 3)
  }, [arrangement.front])

  const middleRow = useMemo(() => {
    const cards = [...arrangement.middle]
    while (cards.length < 5) cards.push(null as unknown as Card)
    return cards.slice(0, 5)
  }, [arrangement.middle])

  const backRow = useMemo(() => {
    const cards = [...arrangement.back]
    while (cards.length < 5) cards.push(null as unknown as Card)
    return cards.slice(0, 5)
  }, [arrangement.back])

  // Drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event

    // Find the card being dragged
    if (active.id.toString().startsWith('board-')) {
      const key = active.id.toString().replace('board-', '')
      const card = [...arrangement.front, ...arrangement.middle, ...arrangement.back]
        .find(c => ck(c) === key)
      setActiveCard(card ?? null)
    } else if (active.id.toString().startsWith('hand-')) {
      const key = active.id.toString().replace('hand-', '')
      const card = hand.find(c => ck(c) === key)
      setActiveCard(card ?? null)
    }
  }

  // Drag end — process the drop
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setActiveCard(null)

    if (!over || !activeCard) return

    const activeStr = active.id.toString()
    const overStr = over.id.toString()

    // Determine source position
    let sourcePosition: Position | 'hand' = 'hand'
    if (activeStr.startsWith('board-')) {
      const key = activeStr.replace('board-', '')
      const card = arrangement.front.find(c => ck(c) === key)
      if (card) sourcePosition = 'front'
      else if (arrangement.middle.find(c => ck(c) === key)) sourcePosition = 'middle'
      else if (arrangement.back.find(c => ck(c) === key)) sourcePosition = 'back'
    }

    // Handle drop on empty slot
    if (overStr.startsWith('slot-')) {
      const parts = overStr.replace('slot-', '').split('-')
      const targetPosition = parts[0] as Position

      // Check capacity
      const row = arrangement[targetPosition]
      const maxLen = targetPosition === 'front' ? 3 : 5
      if (row.length >= maxLen) return

      // If dragging from another board position, remove from source first
      if (sourcePosition !== 'hand' && sourcePosition !== targetPosition) {
        const arr = { ...arrangement }
        arr[sourcePosition as Position] = arr[sourcePosition as Position].filter(c => ck(c) !== ck(activeCard))
        // We'll handle assignment through moveCard
      }

      if (sourcePosition === 'hand') {
        assignCard(activeCard, targetPosition)
      } else if (sourcePosition !== targetPosition) {
        moveCard(activeCard, sourcePosition, targetPosition)
      }

      return
    }

    // Handle drop on another board card (swap or reorder within row)
    if (overStr.startsWith('board-')) {
      const targetKey = overStr.replace('board-', '')
      let targetPosition: Position | null = null
      if (arrangement.front.find(c => ck(c) === targetKey)) targetPosition = 'front'
      else if (arrangement.middle.find(c => ck(c) === targetKey)) targetPosition = 'middle'
      else if (arrangement.back.find(c => ck(c) === targetKey)) targetPosition = 'back'

      if (!targetPosition) return

      // From hand to board: assign before the target card
      if (sourcePosition === 'hand') {
        assignCard(activeCard, targetPosition)
        return
      }

      // Within same row: reorder via sortable context (handled by dnd-kit)
      if (sourcePosition === targetPosition) {
        // dnd-kit sortable handles this automatically
        return
      }

      // Cross-row move
      if (sourcePosition !== targetPosition) {
        moveCard(activeCard, sourcePosition, targetPosition)
      }
    }

    // Handle drop on hand area
    if (overStr === 'hand-zone') {
      if (sourcePosition !== 'hand') {
        removeCard(activeCard)
      }
    }
  }, [activeCard, arrangement, assignCard, removeCard, moveCard])

  const handleReturnToHand = useCallback((card: Card) => {
    removeCard(card)
  }, [removeCard])

  const handleDropOnSlot = useCallback((position: Position, _index: number) => {
    if (!activeCard) return
    assignCard(activeCard, position)
  }, [activeCard, assignCard])

  const renderRow = (
    label: string,
    cards: (Card | null)[],
    position: Position,
  ) => {
    const rowCards = arrangement[position]
    const maxLen = position === 'front' ? 3 : 5

    return (
      <div className="bg-bg-secondary rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="row-label">{label}</span>
          <span className="text-xs text-gray-500">
            {rowCards.length}/{maxLen}
          </span>
        </div>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={rowCards.map(ck)}
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex flex-wrap gap-2">
              {cards.map((card, i) => {
                if (!card) {
                  return (
                    <EmptySlot
                      key={`${position}-empty-${i}`}
                      position={position}
                      index={i}
                      onDropCard={handleDropOnSlot}
                    />
                  )
                }
                return (
                  <SortableBoardCard
                    key={ck(card)}
                    card={card}
                    onReturnToHand={handleReturnToHand}
                  />
                )
              })}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Arrangement Rows */}
      {renderRow('Front (3 cards)', frontRow, 'front')}
      {renderRow('Middle (5 cards)', middleRow, 'middle')}
      {renderRow('Back (5 cards)', backRow, 'back')}

      {/* Validation Status */}
      {arrangement.front.length === 3 && arrangement.middle.length === 5 && arrangement.back.length === 5 && (
        <div className={clsx(
          'rounded-lg p-3 text-sm font-medium text-center',
          isValid ? 'badge-green' : 'badge-red'
        )}>
          {isValid ? '✓ Valid Arrangement' : '✗ Foul — Back ≥ Middle ≥ Front required'}
        </div>
      )}

      {/* Hand Area — Draggable pills */}
      {hand.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div
            id="hand-zone"
            className="bg-bg-secondary rounded-xl p-4"
          >
            <h3 className="text-sm font-semibold text-gray-400 mb-2">
              Unassigned Cards ({hand.length})
            </h3>
            <SortableContext
              items={hand.map(ck)}
              strategy={horizontalListSortingStrategy}
            >
              <div className="flex flex-wrap gap-1.5">
                {hand.map(card => (
                  <SortableHandCard key={ck(card)} card={card} />
                ))}
              </div>
            </SortableContext>
            <p className="text-xs text-gray-500 mt-2">
              💡 Drag cards to empty slots on the board, or drag board cards here to return them
            </p>
          </div>
          <DragOverlay>
            {activeCard ? (
              <div className={clsx(
                'card-slot-filled shadow-xl scale-110',
                isRed(activeCard.suit) ? 'text-red-500' : 'text-gray-800'
              )}>
                <span className="text-sm font-bold">{activeCard.rank}{activeCard.suit}</span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  )
}
