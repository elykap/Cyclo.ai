import { useState, useEffect } from 'react'
import ragService from '../services/ragService'
import { supabase } from '../supabaseClient'

function Documents({ user }) {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (user?.id) {
      loadDocuments()
    } else {
      setLoading(false)
    }
  }, [user])

  const loadDocuments = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      const docs = await ragService.getUserDocuments(user.id)
      setDocuments(docs)
    } catch (err) {
      console.error('Error loading documents:', err)
      setError(err.message || 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !user?.id) return

    // Validate file type
    const fileName = file.name.toLowerCase()
    const allowedExtensions = ['.pdf', '.txt', '.md', '.markdown', '.csv']
    const isValidFile = allowedExtensions.some(ext => fileName.endsWith(ext))
    
    if (!isValidFile) {
      setError('Please upload a supported file type: PDF, TXT, MD, or CSV')
      return
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      setError('File size must be less than 50MB')
      return
    }

    setUploading(true)
    setError('')
    setUploadProgress(`Processing ${file.name}...`)

    try {
      const result = await ragService.ingestDocument(file, user.id, {
        chunkSize: 1000,
        chunkOverlap: 200
      })

      const pageInfo = result.pageCount ? ` from ${result.pageCount} page${result.pageCount !== 1 ? 's' : ''}` : ''
      setUploadProgress(`Successfully processed ${result.chunksCreated} chunks${pageInfo}`)
      
      // Reload documents
      await loadDocuments()

      // Clear file input
      e.target.value = ''

      // Clear progress after a delay
      setTimeout(() => {
        setUploadProgress('')
      }, 3000)
    } catch (err) {
      console.error('Error uploading document:', err)
      setError(err.message || 'Failed to process document')
      setUploadProgress('')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteDocument = async (documentId) => {
    if (!user?.id || !confirm('Are you sure you want to delete this document?')) {
      return
    }

    try {
      await ragService.deleteDocument(documentId, user.id)
      await loadDocuments()
    } catch (err) {
      console.error('Error deleting document:', err)
      setError(err.message || 'Failed to delete document')
    }
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  return (
    <div className="documents-container">
      <div className="documents-header">
        <div>
          <h3>Document Library</h3>
          <p className="muted">Upload documents (PDF, TXT, MD, CSV) to enable personalized AI responses based on your documents</p>
        </div>
        <label className="file-upload-button auth-submit-button" style={{ cursor: uploading ? 'not-allowed' : 'pointer' }}>
          <input
            type="file"
            accept=".pdf,.txt,.md,.markdown,.csv"
            onChange={handleFileUpload}
            disabled={uploading || !user?.id}
            style={{ display: 'none' }}
          />
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <span>{uploading ? 'Processing...' : 'Upload Document'}</span>
        </label>
      </div>

      {error && (
        <div className="error-message" style={{ marginTop: '16px' }}>
          {error}
        </div>
      )}

      {uploadProgress && (
        <div className="muted" style={{ marginTop: '16px', fontStyle: 'italic', color: 'var(--accent, #007bff)' }}>
          {uploadProgress}
        </div>
      )}

      {documents.length === 0 ? (
        <div className="empty-state" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3, marginBottom: '16px' }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          <h4 style={{ marginBottom: '8px' }}>No documents yet</h4>
          <p className="muted">Upload your first document (PDF, TXT, MD, or CSV) to get started with personalized AI responses</p>
        </div>
      ) : (
        <div className="documents-list" style={{ marginTop: '24px' }}>
          {documents.map((doc) => (
            <div key={doc.id} className="document-card" style={{
              border: '1px solid var(--border, #e0e0e0)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '16px'
            }}>
              <div style={{ flex: 1 }}>
                <h4 style={{ marginBottom: '8px' }}>{doc.title}</h4>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.875rem', color: 'var(--text-secondary, #666)' }}>
                  <span>📄 {doc.file_name}</span>
                  <span>📊 {doc.chunk_count} chunks</span>
                  <span>💾 {formatFileSize(doc.file_size)}</span>
                  <span>📅 {formatDate(doc.uploaded_at)}</span>
                </div>
              </div>
              <button
                className="text-button"
                onClick={() => handleDeleteDocument(doc.id)}
                style={{ color: 'var(--error, #dc3545)' }}
                title="Delete document"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Documents

