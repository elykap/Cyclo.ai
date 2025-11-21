import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../hooks/useAuth'

function PostForm({ onClose, onSuccess, initialPost = null }) {
  const { user } = useAuth()
  const [title, setTitle] = useState(initialPost?.title || '')
  const [content, setContent] = useState(initialPost?.content || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!title.trim() || !content.trim()) {
      setError('Please fill in both title and content')
      return
    }

    if (!user) {
      setError('You must be logged in to create a post')
      return
    }

    setLoading(true)
    try {
      if (initialPost) {
        // Update existing post
        const { error: updateError } = await supabase
          .from('posts')
          .update({
            title: title.trim(),
            content: content.trim(),
            updated_at: new Date().toISOString()
          })
          .eq('id', initialPost.id)
          .eq('user_id', user.id)

        if (updateError) throw updateError
      } else {
        // Create new post
        const { error: insertError } = await supabase
          .from('posts')
          .insert({
            user_id: user.id,
            title: title.trim(),
            content: content.trim()
          })

        if (insertError) throw insertError
      }

      onSuccess()
    } catch (err) {
      console.error('Error saving post:', err)
      setError(err.message || 'Failed to save post. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content post-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{initialPost ? 'Edit Post' : 'Create New Post'}</h2>
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="post-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="post-title">Title</label>
            <input
              id="post-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's your question or topic?"
              maxLength={200}
              required
            />
            <div className="char-count">{title.length}/200</div>
          </div>

          <div className="form-group">
            <label htmlFor="post-content">Content</label>
            <textarea
              id="post-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your thoughts, questions, or struggles..."
              rows={8}
              required
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !title.trim() || !content.trim()}
            >
              {loading ? (
                <>
                  <div className="loading-spinner small"></div>
                  {initialPost ? 'Updating...' : 'Posting...'}
                </>
              ) : (
                initialPost ? 'Update Post' : 'Post'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PostForm

