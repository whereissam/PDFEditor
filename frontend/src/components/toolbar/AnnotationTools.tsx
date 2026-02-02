import { memo, useState, useRef, useEffect, useCallback } from 'react'
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
  Pipette,
  ChevronDown,
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

// Preset color palette - organized by hue
const presetColors = [
  // Row 1 - Warm colors
  ['#FFEB3B', '#FFC107', '#FF9800', '#FF5722', '#F44336'],
  // Row 2 - Cool colors
  ['#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3'],
  // Row 3 - Nature & Neutrals
  ['#00BCD4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39'],
  // Row 4 - Grayscale
  ['#FFFFFF', '#9E9E9E', '#607D8B', '#455A64', '#000000'],
]

const fontSizes = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48]

const fontFamilies = [
  { label: 'Sans Serif', value: 'sans-serif' },
  { label: 'Serif', value: 'serif' },
  { label: 'Monospace', value: 'monospace' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Times New Roman', value: 'Times New Roman, serif' },
  { label: 'Courier New', value: 'Courier New, monospace' },
]

// Local storage key for recent colors
const RECENT_COLORS_KEY = 'pdf-editor-recent-colors'
const MAX_RECENT_COLORS = 5

export const AnnotationTools = memo(function AnnotationTools() {
  const activeTool = useEditorStore((s) => s.activeTool)
  const toolStyle = useEditorStore((s) => s.toolStyle)
  const setActiveTool = useEditorStore((s) => s.setActiveTool)
  const setToolStyle = useEditorStore((s) => s.setToolStyle)

  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showStylePanel, setShowStylePanel] = useState(false)
  const [hexInput, setHexInput] = useState(toolStyle.color)
  const [recentColors, setRecentColors] = useState<string[]>([])

  const colorPickerRef = useRef<HTMLDivElement>(null)
  const stylePanelRef = useRef<HTMLDivElement>(null)
  const colorInputRef = useRef<HTMLInputElement>(null)

  // Load recent colors from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_COLORS_KEY)
      if (saved) {
        setRecentColors(JSON.parse(saved))
      }
    } catch {
      // Ignore errors
    }
  }, [])

  // Update hex input when color changes externally
  useEffect(() => {
    setHexInput(toolStyle.color)
  }, [toolStyle.color])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false)
      }
      if (stylePanelRef.current && !stylePanelRef.current.contains(e.target as Node)) {
        setShowStylePanel(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Add color to recent colors
  const addToRecentColors = useCallback((color: string) => {
    setRecentColors((prev) => {
      const filtered = prev.filter((c) => c.toLowerCase() !== color.toLowerCase())
      const updated = [color, ...filtered].slice(0, MAX_RECENT_COLORS)
      try {
        localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(updated))
      } catch {
        // Ignore errors
      }
      return updated
    })
  }, [])

  // Handle color selection
  const handleColorSelect = useCallback(
    (color: string) => {
      setToolStyle({ color })
      addToRecentColors(color)
      setHexInput(color)
    },
    [setToolStyle, addToRecentColors]
  )

  // Handle hex input change
  const handleHexChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setHexInput(value)

      // Validate and apply hex color
      if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
        setToolStyle({ color: value })
        addToRecentColors(value)
      }
    },
    [setToolStyle, addToRecentColors]
  )

  // Handle native color picker change
  const handleNativeColorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const color = e.target.value
      handleColorSelect(color)
    },
    [handleColorSelect]
  )

  // Show stroke width for these tools
  const showStrokeWidth = ['rectangle', 'ellipse', 'arrow', 'line', 'ink'].includes(activeTool)

  // Show text controls for text tool
  const showTextControls = activeTool === 'text'

  return (
    <div className="flex items-center gap-0.5">
      {/* Tool buttons */}
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

      {/* Divider */}
      <div className="w-px h-6 bg-border mx-1" />

      {/* Color picker */}
      <div className="relative" ref={colorPickerRef}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setShowColorPicker(!showColorPicker)
            setShowStylePanel(false)
          }}
          title="Color"
          className="h-8 w-8"
        >
          <div
            className="w-4 h-4 rounded border border-border shadow-sm"
            style={{ backgroundColor: toolStyle.color }}
          />
        </Button>

        {showColorPicker && (
          <div className="absolute top-full mt-1 left-0 z-50 bg-background border border-border rounded-lg p-3 shadow-lg min-w-[200px]">
            {/* Preset colors grid */}
            <div className="space-y-1">
              {presetColors.map((row, rowIndex) => (
                <div key={rowIndex} className="flex gap-1">
                  {row.map((color) => (
                    <button
                      key={color}
                      className={cn(
                        'w-6 h-6 rounded transition-all hover:scale-110',
                        'border-2 shadow-sm',
                        toolStyle.color.toLowerCase() === color.toLowerCase()
                          ? 'border-primary ring-2 ring-primary/30'
                          : 'border-border/50 hover:border-border'
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => {
                        handleColorSelect(color)
                        setShowColorPicker(false)
                      }}
                      title={color}
                    />
                  ))}
                </div>
              ))}
            </div>

            {/* Recent colors */}
            {recentColors.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <label className="text-xs text-muted-foreground mb-1 block">Recent</label>
                <div className="flex gap-1">
                  {recentColors.map((color, index) => (
                    <button
                      key={`${color}-${index}`}
                      className={cn(
                        'w-6 h-6 rounded transition-all hover:scale-110',
                        'border-2 shadow-sm',
                        toolStyle.color.toLowerCase() === color.toLowerCase()
                          ? 'border-primary'
                          : 'border-border/50'
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => {
                        handleColorSelect(color)
                        setShowColorPicker(false)
                      }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Custom color input */}
            <div className="mt-3 pt-3 border-t border-border">
              <label className="text-xs text-muted-foreground mb-1 block">Custom Color</label>
              <div className="flex items-center gap-2">
                {/* Native color picker */}
                <div className="relative">
                  <input
                    ref={colorInputRef}
                    type="color"
                    value={toolStyle.color}
                    onChange={handleNativeColorChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 pointer-events-none"
                    tabIndex={-1}
                  >
                    <Pipette className="h-4 w-4" />
                  </Button>
                </div>

                {/* Hex input */}
                <input
                  type="text"
                  value={hexInput}
                  onChange={handleHexChange}
                  placeholder="#RRGGBB"
                  maxLength={7}
                  className={cn(
                    'flex-1 px-2 py-1.5 text-sm font-mono',
                    'border border-border rounded bg-background',
                    'focus:outline-none focus:ring-2 focus:ring-primary'
                  )}
                />
              </div>
            </div>

            {/* Opacity slider */}
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-muted-foreground">Opacity</label>
                <span className="text-xs font-mono text-muted-foreground">
                  {Math.round(toolStyle.opacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={toolStyle.opacity}
                onChange={(e) => setToolStyle({ opacity: parseFloat(e.target.value) })}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
          </div>
        )}
      </div>

      {/* Style panel button (for stroke width, font size, etc.) */}
      {(showStrokeWidth || showTextControls) && (
        <div className="relative" ref={stylePanelRef}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowStylePanel(!showStylePanel)
              setShowColorPicker(false)
            }}
            title="Style Options"
            className="h-8 px-2 gap-1"
          >
            <span className="text-xs">
              {showTextControls ? `${toolStyle.fontSize || 14}px` : `${toolStyle.strokeWidth || 2}px`}
            </span>
            <ChevronDown className="h-3 w-3" />
          </Button>

          {showStylePanel && (
            <div className="absolute top-full mt-1 left-0 z-50 bg-background border border-border rounded-lg p-3 shadow-lg min-w-[180px]">
              {/* Stroke width for shapes/ink */}
              {showStrokeWidth && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-muted-foreground">Stroke Width</label>
                    <span className="text-xs font-mono text-muted-foreground">
                      {toolStyle.strokeWidth || 2}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="1"
                    value={toolStyle.strokeWidth || 2}
                    onChange={(e) => setToolStyle({ strokeWidth: parseInt(e.target.value) })}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  {/* Stroke preview */}
                  <div className="mt-2 p-2 bg-muted rounded flex items-center justify-center">
                    <div
                      className="w-full rounded-full"
                      style={{
                        height: `${toolStyle.strokeWidth || 2}px`,
                        backgroundColor: toolStyle.color,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Text controls */}
              {showTextControls && (
                <>
                  {/* Font size */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Font Size</label>
                    <select
                      value={toolStyle.fontSize || 14}
                      onChange={(e) => setToolStyle({ fontSize: parseInt(e.target.value) })}
                      className={cn(
                        'w-full px-2 py-1.5 text-sm',
                        'border border-border rounded bg-background',
                        'focus:outline-none focus:ring-2 focus:ring-primary'
                      )}
                    >
                      {fontSizes.map((size) => (
                        <option key={size} value={size}>
                          {size}px
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Font family */}
                  <div className="mt-3">
                    <label className="text-xs text-muted-foreground mb-1 block">Font Family</label>
                    <select
                      value={toolStyle.fontFamily || 'sans-serif'}
                      onChange={(e) => setToolStyle({ fontFamily: e.target.value })}
                      className={cn(
                        'w-full px-2 py-1.5 text-sm',
                        'border border-border rounded bg-background',
                        'focus:outline-none focus:ring-2 focus:ring-primary'
                      )}
                    >
                      {fontFamilies.map((font) => (
                        <option key={font.value} value={font.value}>
                          {font.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Font preview */}
                  <div className="mt-3 p-2 bg-muted rounded">
                    <p
                      className="text-center truncate"
                      style={{
                        fontSize: `${Math.min(toolStyle.fontSize || 14, 24)}px`,
                        fontFamily: toolStyle.fontFamily || 'sans-serif',
                        color: toolStyle.color,
                      }}
                    >
                      Sample Text
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
})
