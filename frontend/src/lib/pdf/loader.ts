import * as pdfjsLib from 'pdfjs-dist'
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'

// PageViewport type from PDF.js
type PageViewport = ReturnType<PDFPageProxy['getViewport']>
type TextContent = Awaited<ReturnType<PDFPageProxy['getTextContent']>>

// Set worker source - using CDN for simplicity
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

export interface PDFLoadOptions {
  url?: string
  data?: ArrayBuffer | Uint8Array
  password?: string
  onProgress?: (progress: { loaded: number; total: number }) => void
}

export interface LoadedPDF {
  document: PDFDocumentProxy
  numPages: number
  fingerprint: string
  metadata: {
    title?: string
    author?: string
    subject?: string
    creator?: string
    producer?: string
    creationDate?: Date
    modificationDate?: Date
  }
}

export async function loadPDF(options: PDFLoadOptions): Promise<LoadedPDF> {
  const loadingTask = pdfjsLib.getDocument({
    url: options.url,
    data: options.data,
    password: options.password,
  })

  if (options.onProgress) {
    loadingTask.onProgress = options.onProgress
  }

  const document = await loadingTask.promise
  const metadata = await document.getMetadata()

  const info = metadata.info as Record<string, unknown>

  return {
    document,
    numPages: document.numPages,
    fingerprint: document.fingerprints[0] || '',
    metadata: {
      title: info?.Title as string | undefined,
      author: info?.Author as string | undefined,
      subject: info?.Subject as string | undefined,
      creator: info?.Creator as string | undefined,
      producer: info?.Producer as string | undefined,
      creationDate: info?.CreationDate
        ? new Date(info.CreationDate as string)
        : undefined,
      modificationDate: info?.ModDate
        ? new Date(info.ModDate as string)
        : undefined,
    },
  }
}

export async function loadPDFFromFile(file: File): Promise<LoadedPDF> {
  const arrayBuffer = await file.arrayBuffer()
  return loadPDF({ data: new Uint8Array(arrayBuffer) })
}

export async function loadPDFFromUrl(url: string): Promise<LoadedPDF> {
  return loadPDF({ url })
}

export async function getPage(
  document: PDFDocumentProxy,
  pageNumber: number
): Promise<PDFPageProxy> {
  return document.getPage(pageNumber)
}

export function getViewport(
  page: PDFPageProxy,
  scale: number,
  rotation: number = 0
): PageViewport {
  return page.getViewport({ scale, rotation })
}

export async function getTextContent(page: PDFPageProxy): Promise<TextContent> {
  return page.getTextContent()
}

export async function computeHash(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export type { PDFDocumentProxy, PDFPageProxy, PageViewport, TextContent }
