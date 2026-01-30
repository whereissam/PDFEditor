import Dexie, { type EntityTable } from 'dexie'
import type { Annotation, Operation } from '@/stores/editor-store'

// Database schema
export interface StoredDocument {
  id: string
  name: string
  originalPdfHash: string
  pdfData: Uint8Array
  numPages: number
  pageRotations: Record<number, number>
  deletedPages: number[]
  pageOrder: number[]
  createdAt: Date
  updatedAt: Date
}

export interface StoredOperation {
  id: string
  documentId: string
  type: string
  payload: string // JSON serialized
  timestamp: number
}

export interface StoredAnnotation {
  id: string
  documentId: string
  type: string
  pageIndex: number
  data: string // JSON serialized
  createdAt: number
  updatedAt: number
}

// Initialize Dexie database
class PDFEditorDB extends Dexie {
  documents!: EntityTable<StoredDocument, 'id'>
  operations!: EntityTable<StoredOperation, 'id'>
  annotations!: EntityTable<StoredAnnotation, 'id'>

  constructor() {
    super('PDFEditorDB')

    this.version(1).stores({
      documents:
        'id, name, originalPdfHash, createdAt, updatedAt',
      operations: 'id, documentId, timestamp',
      annotations: 'id, documentId, pageIndex, createdAt, updatedAt',
    })
  }
}

export const db = new PDFEditorDB()

// Document operations
export async function saveDocument(
  doc: Omit<StoredDocument, 'createdAt' | 'updatedAt'> & {
    createdAt?: Date
    updatedAt?: Date
  }
): Promise<string> {
  const now = new Date()
  const storedDoc: StoredDocument = {
    ...doc,
    createdAt: doc.createdAt || now,
    updatedAt: doc.updatedAt || now,
  }

  await db.documents.put(storedDoc)
  return doc.id
}

export async function getDocument(id: string): Promise<StoredDocument | undefined> {
  return db.documents.get(id)
}

export async function getDocumentByHash(
  hash: string
): Promise<StoredDocument | undefined> {
  return db.documents.where('originalPdfHash').equals(hash).first()
}

export async function getAllDocuments(): Promise<StoredDocument[]> {
  return db.documents.orderBy('updatedAt').reverse().toArray()
}

export async function deleteDocument(id: string): Promise<void> {
  await db.transaction('rw', [db.documents, db.operations, db.annotations], async () => {
    await db.documents.delete(id)
    await db.operations.where('documentId').equals(id).delete()
    await db.annotations.where('documentId').equals(id).delete()
  })
}

export async function updateDocumentTimestamp(id: string): Promise<void> {
  await db.documents.update(id, { updatedAt: new Date() })
}

// Operation operations
export async function saveOperation(
  documentId: string,
  operation: Operation
): Promise<void> {
  const stored: StoredOperation = {
    id: operation.id,
    documentId,
    type: operation.type,
    payload: JSON.stringify(operation),
    timestamp: operation.timestamp,
  }
  await db.operations.put(stored)
}

export async function getOperations(documentId: string): Promise<Operation[]> {
  const stored = await db.operations
    .where('documentId')
    .equals(documentId)
    .sortBy('timestamp')

  return stored.map((s) => JSON.parse(s.payload) as Operation)
}

export async function deleteOperations(documentId: string): Promise<void> {
  await db.operations.where('documentId').equals(documentId).delete()
}

// Annotation operations
export async function saveAnnotation(
  documentId: string,
  annotation: Annotation
): Promise<void> {
  const stored: StoredAnnotation = {
    id: annotation.id,
    documentId,
    type: annotation.type,
    pageIndex: annotation.pageIndex,
    data: JSON.stringify(annotation),
    createdAt: annotation.createdAt,
    updatedAt: annotation.updatedAt,
  }
  await db.annotations.put(stored)
}

export async function saveAnnotations(
  documentId: string,
  annotations: Annotation[]
): Promise<void> {
  const stored: StoredAnnotation[] = annotations.map((a) => ({
    id: a.id,
    documentId,
    type: a.type,
    pageIndex: a.pageIndex,
    data: JSON.stringify(a),
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  }))
  await db.annotations.bulkPut(stored)
}

export async function getAnnotations(documentId: string): Promise<Annotation[]> {
  const stored = await db.annotations.where('documentId').equals(documentId).toArray()
  return stored.map((s) => JSON.parse(s.data) as Annotation)
}

export async function getAnnotationsForPage(
  documentId: string,
  pageIndex: number
): Promise<Annotation[]> {
  const stored = await db.annotations
    .where('documentId')
    .equals(documentId)
    .and((a) => a.pageIndex === pageIndex)
    .toArray()
  return stored.map((s) => JSON.parse(s.data) as Annotation)
}

export async function deleteAnnotation(id: string): Promise<void> {
  await db.annotations.delete(id)
}

export async function deleteAnnotationsForDocument(documentId: string): Promise<void> {
  await db.annotations.where('documentId').equals(documentId).delete()
}

// Recent documents
export interface RecentDocument {
  id: string
  name: string
  updatedAt: Date
  pageCount: number
}

export async function getRecentDocuments(limit: number = 10): Promise<RecentDocument[]> {
  const docs = await db.documents.orderBy('updatedAt').reverse().limit(limit).toArray()

  return docs.map((d) => ({
    id: d.id,
    name: d.name,
    updatedAt: d.updatedAt,
    pageCount: d.numPages,
  }))
}

// Auto-save with debounce
let saveTimeout: ReturnType<typeof setTimeout> | null = null

export function debouncedSave(
  documentId: string,
  annotations: Annotation[],
  delay: number = 1000
): void {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }

  saveTimeout = setTimeout(async () => {
    try {
      await saveAnnotations(documentId, annotations)
      await updateDocumentTimestamp(documentId)
    } catch (error) {
      console.error('Failed to auto-save:', error)
    }
  }, delay)
}

// Clear all data (for testing/reset)
export async function clearAllData(): Promise<void> {
  await db.transaction('rw', [db.documents, db.operations, db.annotations], async () => {
    await db.documents.clear()
    await db.operations.clear()
    await db.annotations.clear()
  })
}

// Export database
export async function exportData(): Promise<{
  documents: StoredDocument[]
  operations: StoredOperation[]
  annotations: StoredAnnotation[]
}> {
  const documents = await db.documents.toArray()
  const operations = await db.operations.toArray()
  const annotations = await db.annotations.toArray()

  return { documents, operations, annotations }
}

// Import database
export async function importData(data: {
  documents: StoredDocument[]
  operations: StoredOperation[]
  annotations: StoredAnnotation[]
}): Promise<void> {
  await db.transaction('rw', [db.documents, db.operations, db.annotations], async () => {
    await db.documents.bulkPut(data.documents)
    await db.operations.bulkPut(data.operations)
    await db.annotations.bulkPut(data.annotations)
  })
}
