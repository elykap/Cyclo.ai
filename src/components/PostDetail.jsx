import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../hooks/useAuth'
import PostForm from './PostForm'

function PostDetail({ post, userLikes, onBack, onLikeToggle, onPostUpdated, onPostDeleted, onRefresh }) {
  const { user } = useAuth()
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submittingComment, setSubmittingComment] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isLiked = userLikes.has(post.id)
  const canEdit = user && user.id === post.user_id

  useEffect(() => {
    fetchComments()
  }, [post.id])

  const fetchComments = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .select(`
          *,
          profiles (
            id,
            business_name
          )
        `)
        .eq('post_id', post.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      setComments(data || [])
    } catch (error) {
      console.error('Error fetching comments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCommentSubmit = async (e) => {
    e.preventDefault()
    if (!newComment.trim() || !user) return

    setSubmittingComment(true)
    try {
      const { error } = await supabase
        .from('post_comments')
        .insert({
          post_id: post.id,
          user_id: user.id,
          content: newComment.trim()
        })

      if (error) throw error
      setNewComment('')
      fetchComments()
      onRefresh() // Refresh post to update comment count
    } catch (error) {
      console.error('Error submitting comment:', error)
      alert('Failed to post comment. Please try again.')
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleDeletePost = async () => {
    if (!window.confirm('Are you sure you want to delete this post? All comments will also be deleted.')) return

    setDeleting(true)
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', post.id)

      if (error) throw error
      onPostDeleted()
    } catch (error) {
      console.error('Error deleting post:', error)
      alert('Failed to delete post. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return

    try {
      const { error } = await supabase
        .from('post_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id)

      if (error) throw error
      fetchComments()
      onRefresh() // Refresh post to update comment count
    } catch (error) {
      console.error('Error deleting comment:', error)
      alert('Failed to delete comment. Please try again.')
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

  if (showEditForm) {
    return (
      <PostForm
        initialPost={post}
        onClose={() => setShowEditForm(false)}
        onSuccess={() => {
          setShowEditForm(false)
          onPostUpdated()
        }}
      />
    )
  }

  return (
    <div className="post-detail">
      <button className="back-button" onClick={onBack}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5"></path>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        Back to Community
      </button>

      <div className="post-detail-card">
        <div className="post-detail-header">
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
            <div className="post-actions">
              <button
                className="post-action-btn"
                onClick={() => setShowEditForm(true)}
                title="Edit post"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
              <button
                className="post-action-btn"
                onClick={handleDeletePost}
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
            </div>
          )}
        </div>

        <h1 className="post-detail-title">{post.title}</h1>
        <div className="post-detail-content">{post.content}</div>

        <div className="post-detail-footer">
          <button
            className={`post-action-btn large ${isLiked ? 'liked' : ''}`}
            onClick={() => onLikeToggle()}
            disabled={!user}
            title={user ? (isLiked ? 'Unlike' : 'Like') : 'Sign in to like'}
          >
            <svg viewBox="0 0 24 24" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            <span>{post.like_count || 0} {post.like_count === 1 ? 'Like' : 'Likes'}</span>
          </button>
        </div>
      </div>

      <div className="comments-section">
        <h2 className="comments-title">
          Comments ({post.comment_count || 0})
        </h2>

        {user && (
          <form onSubmit={handleCommentSubmit} className="comment-form">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              rows={3}
              required
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submittingComment || !newComment.trim()}
            >
              {submittingComment ? (
                <>
                  <div className="loading-spinner small"></div>
                  Posting...
                </>
              ) : (
                'Post Comment'
              )}
            </button>
          </form>
        )}

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
          </div>
        ) : comments.length === 0 ? (
          <div className="empty-comments">
            <p>No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          <div className="comments-list">
            {comments.map(comment => {
              const commentAuthorName = comment.profiles?.business_name || 'Anonymous User'
              const canEditComment = user && user.id === comment.user_id

              return (
                <div key={comment.id} className="comment-card">
                  <div className="comment-header">
                    <div className="comment-author">
                      <div className="comment-avatar">
                        {commentAuthorName.charAt(0).toUpperCase()}
                      </div>
                      <div className="comment-author-info">
                        <div className="comment-author-name">{commentAuthorName}</div>
                        <div className="comment-date">{formatDate(comment.created_at)}</div>
                      </div>
                    </div>
                    {canEditComment && (
                      <button
                        className="comment-delete-btn"
                        onClick={() => handleDeleteComment(comment.id)}
                        title="Delete comment"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18"></path>
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className="comment-content">{comment.content}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default PostDetail

