import { Hono } from 'hono'
import { saveFile, generateId } from '../lib/storage'

const app = new Hono()

// Upload PDF file
app.post('/', async (c) => {
  try {
    const body = await c.req.parseBody()
    const file = body['file']

    if (!file || !(file instanceof File)) {
      return c.json({ error: 'No file provided' }, 400)
    }

    if (file.type !== 'application/pdf') {
      return c.json({ error: 'File must be a PDF' }, 400)
    }

    // Generate document ID
    const docId = generateId()

    // Save file
    const arrayBuffer = await file.arrayBuffer()
    const data = new Uint8Array(arrayBuffer)

    await saveFile(docId, data, file.name)

    return c.json({
      success: true,
      documentId: docId,
      filename: file.name,
      size: file.size,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return c.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      500
    )
  }
})

export default app
