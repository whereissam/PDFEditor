import { useState, useCallback, useRef, useEffect, memo } from 'react'
import type { NoteAnnotation as NoteAnnotationType, Point } from '@/stores/editor-store'
import { cn } from '@/lib/utils'

interface NoteAnnotationProps {
  annotation: NoteAnnotationType
  position: Point // Already converted to viewport coordinates
  isSelected: boolean
  onClick: (e: React.MouseEvent) => void
  onUpdate: (changes: Partial<NoteAnnotationType>) => void
}

export const NoteAnnotation = memo(function NoteAnnotation({
  annotation,
  position,
  isSelected,
  onClick,
  onUpdate,
}: NoteAnnotationProps) {
  const { style, content, isOpen } = annotation
  const [isEditing, setIsEditing] = useState(false)
  const [localContent, setLocalContent] = useState(content || '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Focus textarea when opening for editing
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [isEditing])

  // Handle double click to edit
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(true)
  }, [])

  // Handle content change
  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setLocalContent(e.target.value)
    },
    []
  )

  // Handle blur to save
  const handleBlur = useCallback(() => {
    setIsEditing(false)
    if (localContent !== content) {
      onUpdate({ content: localContent })
    }
  }, [localContent, content, onUpdate])

  // Handle key down
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLocalContent(content || '')
        setIsEditing(false)
      } else if (e.key === 'Enter' && e.metaKey) {
        handleBlur()
      }
    },
    [content, handleBlur]
  )

  // Toggle popup
  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onUpdate({ isOpen: !isOpen })
    },
    [isOpen, onUpdate]
  )

  // Note icon size
  const iconSize = 24

  return (
    <g onClick={onClick}>
      {/* Note icon */}
      <g
        transform={`translate(${position.x - iconSize / 2}, ${position.y - iconSize / 2})`}
        style={{ cursor: 'pointer' }}
        onClick={handleToggle}
      >
        {/* Icon background */}
        <rect
          width={iconSize}
          height={iconSize}
          rx={4}
          fill={style.color}
          opacity={style.opacity}
        />
        {/* Note lines */}
        <line
          x1={4}
          y1={8}
          x2={20}
          y2={8}
          stroke="white"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <line
          x1={4}
          y1={12}
          x2={20}
          y2={12}
          stroke="white"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <line
          x1={4}
          y1={16}
          x2={14}
          y2={16}
          stroke="white"
          strokeWidth={2}
          strokeLinecap="round"
        />

        {/* Selection indicator */}
        {isSelected && (
          <rect
            x={-2}
            y={-2}
            width={iconSize + 4}
            height={iconSize + 4}
            rx={6}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="text-primary"
          />
        )}
      </g>

      {/* Popup */}
      {isOpen && (
        <foreignObject
          x={position.x + iconSize / 2 + 4}
          y={position.y - iconSize / 2}
          width={200}
          height={150}
        >
          <div
            className={cn(
              'bg-background border border-border rounded-lg shadow-lg overflow-hidden',
              'flex flex-col'
            )}
            style={{ width: 200, height: 'auto', minHeight: 100 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="px-2 py-1 text-xs font-medium border-b border-border flex items-center justify-between"
              style={{ backgroundColor: style.color, color: 'white' }}
            >
              <span>Note</span>
              <button
                onClick={handleToggle}
                className="text-white/80 hover:text-white"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-2" onDoubleClick={handleDoubleClick}>
              {isEditing ? (
                <textarea
                  ref={textareaRef}
                  value={localContent}
                  onChange={handleContentChange}
                  onBlur={handleBlur}
                  onKeyDown={handleKeyDown}
                  className="w-full h-full min-h-[60px] resize-none border-none outline-none bg-transparent text-sm"
                  placeholder="Add a note..."
                />
              ) : (
                <div className="text-sm whitespace-pre-wrap">
                  {content || (
                    <span className="text-muted-foreground italic">
                      Double-click to add a note...
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </foreignObject>
      )}
    </g>
  )
})
