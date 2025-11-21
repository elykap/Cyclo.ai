import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../hooks/useAuth'

function PostCard({ post, isLiked, onLikeToggle, onClick, canEdit }) {
  const { user } = useAuth()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async (e) => {
    e.stopPropagation()
    if (!window.confirm('Are you sure you want to delete this post?')) return

    setDeleting(true)
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', post.id)

      if (error) throw error
      // Post will be removed from list via parent component refresh
      // Trigger a custom event that parent can listen to
      window.dispatchEvent(new CustomEvent('postDeleted', { detail: { postId: post.id } }))
    } catch (error) {
      console.error('Error deleting post:', error)
      alert('Failed to delete post. Please try again.')
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const authorName = post.profiles?.business_name || 'Anonymous User'
  const truncatedContent = post.content.length > 200
    ? post.content.substring(0, 200) + '...'
    : post.content

  return (
    <div className="post-card" onClick={onClick}>
      <div className="post-card-header">
        <div className="post-author">
          <div className="author-avatar">
            {authorName.charAt(0).toUpperCase()}
          </div>
          <div className="author-info">
            <div className="author-name">{authorName}</div>
            <div className="post-date">{formatDate(post.created_at)}</div>
          </div>
        </div>
        {canEdit && (
          <button
            className="post-delete-btn"
            onClick={handleDelete}
            disabled={deleting}
            title="Delete post"
          >
            {deleting ? (
              <div className="loading-spinner small"></div>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18"></path>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
              </svg>
            )}
          </button>
        )}
      </div>

      <h3 className="post-title">{post.title}</h3>
      <p className="post-content">{truncatedContent}</p>

      <div className="post-card-footer">
        <button
          className={`post-action-btn ${isLiked ? 'liked' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            if (user) {
              onLikeToggle()
            }
          }}
          disabled={!user}
          title={user ? (isLiked ? 'Unlike' : 'Like') : 'Sign in to like'}
        >
          <svg viewBox="0 0 24 24" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
          <span>{post.like_count || 0}</span>
        </button>

        <button
          className="post-action-btn"
          onClick={(e) => {
            e.stopPropagation()
            onClick()
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <span>{post.comment_count || 0}</span>
        </button>
      </div>
    </div>
  )
}

export default PostCard

