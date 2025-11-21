import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../hooks/useAuth'
import PostCard from '../components/PostCard'
import PostForm from '../components/PostForm'
import PostDetail from '../components/PostDetail'

function Community() {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('recent') // 'recent' or 'top'
  const [showPostForm, setShowPostForm] = useState(false)
  const [selectedPost, setSelectedPost] = useState(null)
  const [userLikes, setUserLikes] = useState(new Set())

  useEffect(() => {
    fetchPosts()
    if (user) {
      fetchUserLikes()
    }
  }, [user, sortBy])

  useEffect(() => {
    const handlePostDeleted = () => {
      fetchPosts()
    }
    window.addEventListener('postDeleted', handlePostDeleted)
    return () => window.removeEventListener('postDeleted', handlePostDeleted)
  }, [])

  const fetchPosts = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('posts')
        .select(`
          *,
          profiles (
            id,
            business_name
          )
        `)
        .order(sortBy === 'recent' ? 'created_at' : 'like_count', { ascending: false })

      const { data, error } = await query

      if (error) throw error
      setPosts(data || [])
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserLikes = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', user.id)

      if (error) throw error
      setUserLikes(new Set(data?.map(like => like.post_id) || []))
    } catch (error) {
      console.error('Error fetching user likes:', error)
    }
  }

  const handlePostCreated = () => {
    setShowPostForm(false)
    fetchPosts()
  }

  const handlePostUpdated = () => {
    fetchPosts()
    if (selectedPost) {
      fetchPostDetail(selectedPost.id)
    }
  }

  const handlePostDeleted = () => {
    setSelectedPost(null)
    fetchPosts()
  }

  const handleLikeToggle = async (postId) => {
    if (!user) return

    const isLiked = userLikes.has(postId)

    try {
      if (isLiked) {
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id)

        if (error) throw error
        setUserLikes(prev => {
          const newSet = new Set(prev)
          newSet.delete(postId)
          return newSet
        })
      } else {
        const { error } = await supabase
          .from('post_likes')
          .insert({ post_id: postId, user_id: user.id })

        if (error) throw error
        setUserLikes(prev => new Set([...prev, postId]))
      }

      // Refresh posts to update like counts
      fetchPosts()
      if (selectedPost && selectedPost.id === postId) {
        fetchPostDetail(postId)
      }
    } catch (error) {
      console.error('Error toggling like:', error)
    }
  }

  const fetchPostDetail = async (postId) => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles (
            id,
            business_name
          )
        `)
        .eq('id', postId)
        .single()

      if (error) throw error
      setSelectedPost(data)
    } catch (error) {
      console.error('Error fetching post detail:', error)
    }
  }

  const handlePostClick = (post) => {
    setSelectedPost(post)
    fetchPostDetail(post.id)
  }

  const filteredPosts = posts.filter(post => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      post.title.toLowerCase().includes(query) ||
      post.content.toLowerCase().includes(query)
    )
  })

  if (selectedPost) {
    return (
      <PostDetail
        post={selectedPost}
        userLikes={userLikes}
        onBack={() => setSelectedPost(null)}
        onLikeToggle={handleLikeToggle}
        onPostUpdated={handlePostUpdated}
        onPostDeleted={handlePostDeleted}
        onRefresh={() => fetchPostDetail(selectedPost.id)}
      />
    )
  }

  return (
    <div className="community-page">
      <div className="community-header">
        <div className="community-header-top">
          <h1>Community</h1>
          {user && (
            <button
              className="btn btn-primary"
              onClick={() => setShowPostForm(true)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              New Post
            </button>
          )}
        </div>
        <p className="community-subtitle">
          Share your questions, struggles, and insights with the community
        </p>
      </div>

      <div className="community-filters">
        <div className="search-box">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input
            type="text"
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="sort-buttons">
          <button
            className={`sort-btn ${sortBy === 'recent' ? 'active' : ''}`}
            onClick={() => setSortBy('recent')}
          >
            Recent
          </button>
          <button
            className={`sort-btn ${sortBy === 'top' ? 'active' : ''}`}
            onClick={() => setSortBy('top')}
          >
            Top Posts
          </button>
        </div>
      </div>

      {showPostForm && (
        <PostForm
          onClose={() => setShowPostForm(false)}
          onSuccess={handlePostCreated}
        />
      )}

      <div className="posts-container">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <h3>No posts found</h3>
            <p>
              {searchQuery
                ? 'Try adjusting your search query'
                : 'Be the first to share something with the community!'}
            </p>
            {user && !searchQuery && (
              <button
                className="btn btn-primary"
                onClick={() => setShowPostForm(true)}
              >
                Create First Post
              </button>
            )}
          </div>
        ) : (
          <div className="posts-list">
            {filteredPosts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                isLiked={userLikes.has(post.id)}
                onLikeToggle={() => handleLikeToggle(post.id)}
                onClick={() => handlePostClick(post)}
                canEdit={user && user.id === post.user_id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Community

