import { Hono } from 'hono'
import { getFile, deleteFile, listFiles, type StoredFile } from '../lib/storage'

const app = new Hono()

// Get all documents
app.get('/', async (c) => {
  try {
    const files = await listFiles()
    return c.json({ documents: files })
  } catch (error) {
    console.error('List documents error:', error)
    return c.json({ error: 'Failed to list documents' }, 500)
  }
})

// Get document by ID
app.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const file = await getFile(id)

    if (!file) {
      return c.json({ error: 'Document not found' }, 404)
    }

    return c.json({
      id: file.id,
      filename: file.filename,
      size: file.data.length,
      createdAt: file.createdAt,
    })
  } catch (error) {
    console.error('Get document error:', error)
    return c.json({ error: 'Failed to get document' }, 500)
  }
})

// Download document
app.get('/:id/download', async (c) => {
  try {
    const id = c.req.param('id')
    const file = await getFile(id)

    if (!file) {
      return c.json({ error: 'Document not found' }, 404)
    }

    return new Response(file.data, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${file.filename}"`,
        'Content-Length': file.data.length.toString(),
      },
    })
  } catch (error) {
    console.error('Download error:', error)
    return c.json({ error: 'Failed to download document' }, 500)
  }
})

// Delete document
app.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const success = await deleteFile(id)

    if (!success) {
      return c.json({ error: 'Document not found' }, 404)
    }

    return c.json({ success: true })
  } catch (error) {
    console.error('Delete error:', error)
    return c.json({ error: 'Failed to delete document' }, 500)
  }
})

export default app
