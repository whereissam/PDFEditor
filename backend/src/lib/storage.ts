import { mkdir, readFile, writeFile, unlink, readdir, stat } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// Storage directory for uploaded files
const STORAGE_DIR = join(process.cwd(), 'storage')

export interface StoredFile {
  id: string
  filename: string
  data: Uint8Array
  createdAt: Date
}

export interface FileMetadata {
  id: string
  filename: string
  size: number
  createdAt: string
}

// Ensure storage directory exists
async function ensureStorageDir(): Promise<void> {
  if (!existsSync(STORAGE_DIR)) {
    await mkdir(STORAGE_DIR, { recursive: true })
  }
}

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

// Get file path for a document
function getFilePath(id: string): string {
  return join(STORAGE_DIR, `${id}.pdf`)
}

// Get metadata path for a document
function getMetaPath(id: string): string {
  return join(STORAGE_DIR, `${id}.meta.json`)
}

// Save file to storage
export async function saveFile(
  id: string,
  data: Uint8Array,
  filename: string
): Promise<void> {
  await ensureStorageDir()

  const filePath = getFilePath(id)
  const metaPath = getMetaPath(id)

  // Save PDF data
  await writeFile(filePath, data)

  // Save metadata
  const metadata: FileMetadata = {
    id,
    filename,
    size: data.length,
    createdAt: new Date().toISOString(),
  }
  await writeFile(metaPath, JSON.stringify(metadata, null, 2))
}

// Get file from storage
export async function getFile(id: string): Promise<StoredFile | null> {
  try {
    const filePath = getFilePath(id)
    const metaPath = getMetaPath(id)

    if (!existsSync(filePath) || !existsSync(metaPath)) {
      return null
    }

    const data = await readFile(filePath)
    const metaContent = await readFile(metaPath, 'utf-8')
    const metadata: FileMetadata = JSON.parse(metaContent)

    return {
      id: metadata.id,
      filename: metadata.filename,
      data: new Uint8Array(data),
      createdAt: new Date(metadata.createdAt),
    }
  } catch {
    return null
  }
}

// Delete file from storage
export async function deleteFile(id: string): Promise<boolean> {
  try {
    const filePath = getFilePath(id)
    const metaPath = getMetaPath(id)

    if (!existsSync(filePath)) {
      return false
    }

    await unlink(filePath)
    if (existsSync(metaPath)) {
      await unlink(metaPath)
    }

    return true
  } catch {
    return false
  }
}

// List all files in storage
export async function listFiles(): Promise<FileMetadata[]> {
  await ensureStorageDir()

  try {
    const files = await readdir(STORAGE_DIR)
    const metaFiles = files.filter((f) => f.endsWith('.meta.json'))

    const documents: FileMetadata[] = []

    for (const metaFile of metaFiles) {
      try {
        const content = await readFile(join(STORAGE_DIR, metaFile), 'utf-8')
        const metadata: FileMetadata = JSON.parse(content)
        documents.push(metadata)
      } catch {
        // Skip invalid metadata files
      }
    }

    // Sort by creation date, newest first
    documents.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    return documents
  } catch {
    return []
  }
}
