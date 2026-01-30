import { PDFDocument, rgb, StandardFonts, PDFPage, degrees } from 'pdf-lib'
import type {
  Annotation,
  HighlightAnnotation,
  ShapeAnnotation,
  LineAnnotation,
  NoteAnnotation,
  InkAnnotation,
  TextAnnotation,
} from '@/stores/editor-store'

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) {
    return { r: 0, g: 0, b: 0 }
  }
  return {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255,
  }
}

export interface ExportOptions {
  pdfData: Uint8Array
  annotations: Annotation[]
  pageRotations: Record<number, number>
  pageOrder: number[]
  deletedPages: Set<number>
  flatten?: boolean
}

export async function exportPDF(options: ExportOptions): Promise<Uint8Array> {
  const {
    pdfData,
    annotations,
    pageRotations,
    deletedPages,
  } = options

  // Load the original PDF
  const pdfDoc = await PDFDocument.load(pdfData)
  const pages = pdfDoc.getPages()

  // Get a standard font for text annotations
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

  // Handle page deletions - we need to remove pages in reverse order
  const pagesToDelete = Array.from(deletedPages).sort((a, b) => b - a)
  for (const pageIndex of pagesToDelete) {
    if (pageIndex < pages.length) {
      pdfDoc.removePage(pageIndex)
    }
  }

  // Get pages after deletion
  const remainingPages = pdfDoc.getPages()

  // Apply page rotations
  for (const [pageIndex, rotation] of Object.entries(pageRotations)) {
    const idx = parseInt(pageIndex)
    if (idx < remainingPages.length && rotation !== 0) {
      const page = remainingPages[idx]
      const currentRotation = page.getRotation().angle
      page.setRotation(degrees(currentRotation + rotation))
    }
  }

  // Handle page reordering
  // Note: pdf-lib doesn't have native reordering, so we'd need to copy pages
  // For MVP, we skip reordering in export

  // Draw annotations on pages
  for (const annotation of annotations) {
    const pageIndex = annotation.pageIndex
    if (deletedPages.has(pageIndex)) continue

    // Adjust page index for deleted pages
    let adjustedIndex = pageIndex
    for (const deleted of Array.from(deletedPages).sort((a, b) => a - b)) {
      if (deleted < pageIndex) {
        adjustedIndex--
      }
    }

    if (adjustedIndex < 0 || adjustedIndex >= remainingPages.length) continue

    const page = remainingPages[adjustedIndex]

    switch (annotation.type) {
      case 'highlight':
      case 'underline':
      case 'strikethrough':
        drawHighlightAnnotation(page, annotation)
        break
      case 'rectangle':
      case 'ellipse':
        drawShapeAnnotation(page, annotation)
        break
      case 'arrow':
      case 'line':
        drawLineAnnotation(page, annotation)
        break
      case 'note':
        drawNoteAnnotation(page, annotation, font)
        break
      case 'ink':
        drawInkAnnotation(page, annotation)
        break
      case 'text':
        drawTextAnnotation(page, annotation, font)
        break
    }
  }

  // Save and return
  return pdfDoc.save()
}

function drawHighlightAnnotation(
  page: PDFPage,
  annotation: HighlightAnnotation
) {
  const { style, quadPoints, type } = annotation
  const color = hexToRgb(style.color)

  for (const quad of quadPoints.points) {
    // quad is [x1, y1, x2, y2, x3, y3, x4, y4]
    // PDF coordinates are bottom-up, but our annotations are stored in PDF coords already

    if (type === 'highlight') {
      // Draw a filled rectangle for highlight
      const minX = Math.min(quad[0], quad[2], quad[4], quad[6])
      const maxX = Math.max(quad[0], quad[2], quad[4], quad[6])
      const minY = Math.min(quad[1], quad[3], quad[5], quad[7])
      const maxY = Math.max(quad[1], quad[3], quad[5], quad[7])

      page.drawRectangle({
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        color: rgb(color.r, color.g, color.b),
        opacity: style.opacity,
      })
    } else if (type === 'underline') {
      // Draw a line at the bottom
      const minX = Math.min(quad[0], quad[6])
      const maxX = Math.max(quad[2], quad[4])
      const y = Math.min(quad[1], quad[3])

      page.drawLine({
        start: { x: minX, y },
        end: { x: maxX, y },
        color: rgb(color.r, color.g, color.b),
        thickness: style.strokeWidth || 1,
        opacity: style.opacity,
      })
    } else if (type === 'strikethrough') {
      // Draw a line through the middle
      const minX = Math.min(quad[0], quad[6])
      const maxX = Math.max(quad[2], quad[4])
      const minY = Math.min(quad[1], quad[3])
      const maxY = Math.max(quad[5], quad[7])
      const y = (minY + maxY) / 2

      page.drawLine({
        start: { x: minX, y },
        end: { x: maxX, y },
        color: rgb(color.r, color.g, color.b),
        thickness: style.strokeWidth || 1,
        opacity: style.opacity,
      })
    }
  }
}

function drawShapeAnnotation(
  page: PDFPage,
  annotation: ShapeAnnotation
) {
  const { type, rect, style } = annotation
  const color = hexToRgb(style.color)

  if (type === 'rectangle') {
    page.drawRectangle({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      borderColor: rgb(color.r, color.g, color.b),
      borderWidth: style.strokeWidth || 2,
      color: rgb(color.r, color.g, color.b),
      opacity: style.opacity * 0.3,
      borderOpacity: style.opacity,
    })
  } else if (type === 'ellipse') {
    page.drawEllipse({
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2,
      xScale: rect.width / 2,
      yScale: rect.height / 2,
      borderColor: rgb(color.r, color.g, color.b),
      borderWidth: style.strokeWidth || 2,
      color: rgb(color.r, color.g, color.b),
      opacity: style.opacity * 0.3,
      borderOpacity: style.opacity,
    })
  }
}

function drawLineAnnotation(
  page: PDFPage,
  annotation: LineAnnotation
) {
  const { type, start, end, style } = annotation
  const color = hexToRgb(style.color)

  page.drawLine({
    start: { x: start.x, y: start.y },
    end: { x: end.x, y: end.y },
    color: rgb(color.r, color.g, color.b),
    thickness: style.strokeWidth || 2,
    opacity: style.opacity,
  })

  // Draw arrowhead for arrow type
  if (type === 'arrow') {
    const angle = Math.atan2(end.y - start.y, end.x - start.x)
    const headLength = 10

    const p1 = {
      x: end.x - headLength * Math.cos(angle - Math.PI / 6),
      y: end.y - headLength * Math.sin(angle - Math.PI / 6),
    }
    const p2 = {
      x: end.x - headLength * Math.cos(angle + Math.PI / 6),
      y: end.y - headLength * Math.sin(angle + Math.PI / 6),
    }

    page.drawLine({
      start: { x: end.x, y: end.y },
      end: p1,
      color: rgb(color.r, color.g, color.b),
      thickness: style.strokeWidth || 2,
      opacity: style.opacity,
    })

    page.drawLine({
      start: { x: end.x, y: end.y },
      end: p2,
      color: rgb(color.r, color.g, color.b),
      thickness: style.strokeWidth || 2,
      opacity: style.opacity,
    })
  }
}

function drawNoteAnnotation(
  page: PDFPage,
  annotation: NoteAnnotation,
  font: Awaited<ReturnType<typeof PDFDocument.prototype.embedFont>>
) {
  const { position, content, style } = annotation
  const color = hexToRgb(style.color)

  // Draw note icon
  const iconSize = 20
  page.drawSquare({
    x: position.x - iconSize / 2,
    y: position.y - iconSize / 2,
    size: iconSize,
    color: rgb(color.r, color.g, color.b),
    opacity: style.opacity,
  })

  // If there's content, draw it as a text annotation nearby
  if (content) {
    const fontSize = 10
    const textX = position.x + iconSize
    const textY = position.y

    // Draw background for text
    const textWidth = font.widthOfTextAtSize(content, fontSize)
    const lines = content.split('\n')
    const textHeight = lines.length * fontSize * 1.2

    page.drawRectangle({
      x: textX - 2,
      y: textY - textHeight,
      width: textWidth + 4,
      height: textHeight + 4,
      color: rgb(1, 1, 0.9),
      opacity: 0.9,
    })

    page.drawText(content, {
      x: textX,
      y: textY - fontSize,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    })
  }
}

function drawInkAnnotation(
  page: PDFPage,
  annotation: InkAnnotation
) {
  const { paths, style } = annotation
  const color = hexToRgb(style.color)

  for (const path of paths) {
    const { points } = path
    if (points.length < 2) continue

    for (let i = 0; i < points.length - 1; i++) {
      page.drawLine({
        start: { x: points[i].x, y: points[i].y },
        end: { x: points[i + 1].x, y: points[i + 1].y },
        color: rgb(color.r, color.g, color.b),
        thickness: style.strokeWidth || 2,
        opacity: style.opacity,
        lineCap: 1, // Round
      })
    }
  }
}

function drawTextAnnotation(
  page: PDFPage,
  annotation: TextAnnotation,
  font: Awaited<ReturnType<typeof PDFDocument.prototype.embedFont>>
) {
  const { rect, content, style } = annotation

  if (!content) return

  const color = hexToRgb(style.color)
  const fontSize = style.fontSize || 14

  page.drawText(content, {
    x: rect.x,
    y: rect.y + rect.height - fontSize,
    size: fontSize,
    font,
    color: rgb(color.r, color.g, color.b),
    opacity: style.opacity,
    maxWidth: rect.width,
  })
}

export async function downloadPDF(data: Uint8Array, filename: string) {
  const blob = new Blob([data], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)

  URL.revokeObjectURL(url)
}
