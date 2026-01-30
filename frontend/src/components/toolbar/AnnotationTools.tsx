import { memo, useState } from 'react'
import { useEditorStore, type Tool } from '@/stores/editor-store'
import { Button } from '@/components/ui/button'
import {
  MousePointer2,
  Highlighter,
  Underline,
  Strikethrough,
  StickyNote,
  Square,
  Circle,
  ArrowRight,
  Minus,
  Pencil,
  Type,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const tools: {
  id: Tool
  icon: React.ComponentType<{ className?: string }>
  label: string
  shortcut: string
}[] = [
  { id: 'select', icon: MousePointer2, label: 'Select', shortcut: 'V' },
  { id: 'highlight', icon: Highlighter, label: 'Highlight', shortcut: 'H' },
  { id: 'underline', icon: Underline, label: 'Underline', shortcut: 'U' },
  { id: 'strikethrough', icon: Strikethrough, label: 'Strikethrough', shortcut: 'S' },
  { id: 'note', icon: StickyNote, label: 'Sticky Note', shortcut: 'N' },
  { id: 'rectangle', icon: Square, label: 'Rectangle', shortcut: 'R' },
  { id: 'ellipse', icon: Circle, label: 'Ellipse', shortcut: 'O' },
  { id: 'arrow', icon: ArrowRight, label: 'Arrow', shortcut: 'A' },
  { id: 'line', icon: Minus, label: 'Line', shortcut: 'L' },
  { id: 'ink', icon: Pencil, label: 'Pen', shortcut: 'P' },
  { id: 'text', icon: Type, label: 'Text Box', shortcut: 'T' },
]

const colors = [
  '#FFEB3B', // Yellow
  '#FF9800', // Orange
  '#F44336', // Red
  '#E91E63', // Pink
  '#9C27B0', // Purple
  '#2196F3', // Blue
  '#00BCD4', // Cyan
  '#4CAF50', // Green
  '#000000', // Black
]

export const AnnotationTools = memo(function AnnotationTools() {
  const activeTool = useEditorStore((s) => s.activeTool)
  const toolStyle = useEditorStore((s) => s.toolStyle)
  const setActiveTool = useEditorStore((s) => s.setActiveTool)
  const setToolStyle = useEditorStore((s) => s.setToolStyle)

  const [showColorPicker, setShowColorPicker] = useState(false)

  return (
    <div className="flex items-center gap-0.5">
      {tools.map((tool) => {
        const Icon = tool.icon
        const isActive = activeTool === tool.id

        return (
          <Button
            key={tool.id}
            variant={isActive ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setActiveTool(tool.id)}
            title={`${tool.label} (${tool.shortcut})`}
            className="h-8 w-8"
          >
            <Icon className={cn('h-4 w-4', isActive && 'text-primary')} />
          </Button>
        )
      })}

      {/* Color picker */}
      <div className="relative ml-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowColorPicker(!showColorPicker)}
          title="Color"
          className="h-8 w-8"
        >
          <div
            className="w-4 h-4 rounded border border-border"
            style={{ backgroundColor: toolStyle.color }}
          />
        </Button>

        {showColorPicker && (
          <div className="absolute top-full mt-1 left-0 z-50 bg-background border border-border rounded-lg p-2 shadow-lg">
            <div className="grid grid-cols-3 gap-1">
              {colors.map((color) => (
                <button
                  key={color}
                  className={cn(
                    'w-6 h-6 rounded border-2 transition-transform hover:scale-110',
                    toolStyle.color === color
                      ? 'border-primary'
                      : 'border-transparent'
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    setToolStyle({ color })
                    setShowColorPicker(false)
                  }}
                />
              ))}
            </div>

            {/* Opacity slider */}
            <div className="mt-2 pt-2 border-t border-border">
              <label className="text-xs text-muted-foreground">Opacity</label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={toolStyle.opacity}
                onChange={(e) =>
                  setToolStyle({ opacity: parseFloat(e.target.value) })
                }
                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Stroke width for shapes/ink */}
            {['rectangle', 'ellipse', 'arrow', 'line', 'ink'].includes(
              activeTool
            ) && (
              <div className="mt-2 pt-2 border-t border-border">
                <label className="text-xs text-muted-foreground">
                  Stroke Width
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={toolStyle.strokeWidth || 2}
                  onChange={(e) =>
                    setToolStyle({ strokeWidth: parseInt(e.target.value) })
                  }
                  className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
})
