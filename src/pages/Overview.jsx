import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

function Overview() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const loadProfile = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser()
        const authUser = userData?.user || null
        if (!active) return
        setUser(authUser)
        if (authUser?.id) {
          const { data: profileData, error } = await supabase
            .from('profiles')
            .select('business_name,business_type,supporting_files,profile_complete')
            .eq('id', authUser.id)
            .maybeSingle()
          if (!active) return
          if (error) {
            console.warn('Error loading profile for overview', error)
          } else {
            setProfile(profileData)
          }
        }
      } catch (err) {
        if (active) {
          console.warn('Error retrieving overview data', err)
        }
      } finally {
        if (active) setLoading(false)
      }
    }
    loadProfile()
    return () => { active = false }
  }, [])

  const uploadsCount = profile?.supporting_files?.length || 0
  const businessName = profile?.business_name || 'Not provided'
  const businessType = profile?.business_type || 'Add your business type'
  const profileStatus = profile?.profile_complete ? 'Complete' : 'Incomplete'
  const profileStatusTone = profile?.profile_complete ? 'positive' : 'negative'
  const subscriptionStatus = 'Premium'

  const previews = [
    {
      title: 'Messaging',
      description: 'Reach out to customers, respond to inquiries, and keep conversations organized.',
      action: 'Open Messaging',
      icon: (
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      ),
      to: '/messaging'
    },
    {
      title: 'Inventory',
      description: 'Track stock levels and see what needs attention before it runs out.',
      action: 'Manage Inventory',
      icon: (
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
          <line x1="12" y1="22.08" x2="12" y2="12"></line>
        </svg>
      ),
      to: '/inventory'
    },
    {
      title: 'Suggestions',
      description: 'Analysis-based recommendations generated from your customer data.',
      action: 'View Suggestions',
      icon: (
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
      ),
      to: '/demographics'
    },
    {
      title: 'Settings',
      description: 'Update your business profile, preferences, or integrations.',
      action: 'Open Settings',
      icon: (
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M12 1v6m0 6v6m9-9h-6m-6 0H3m15.364 6.364l-4.243-4.243m-4.242 0L5.636 18.364m12.728 0l-4.243-4.243m-4.242 0L5.636 5.636"></path>
        </svg>
      ),
      to: '/settings'
    }
  ]

  return (
    <>
      {/* Highlights */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Profile status</span>
            <span className={`metric-change ${profileStatusTone}`}>{profileStatus}</span>
          </div>
          <div className="metric-value">{businessName}</div>
          <div className="metric-chart">
            <div className="chart-bar"></div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Uploads</span>
            <span className="metric-change positive">{uploadsCount} file{uploadsCount === 1 ? '' : 's'}</span>
          </div>
          <div className="metric-value">{uploadsCount}</div>
          <div className="metric-chart">
            <div className="chart-bar"></div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Business type</span>
            <span className="metric-change">{businessType}</span>
          </div>
          <div className="metric-value">🏷️</div>
          <div className="metric-chart">
            <div className="chart-bar"></div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Account</span>
            <span className="metric-change muted">{subscriptionStatus}</span>
          </div>
          <div className="metric-value">{user?.email || 'Not signed in'}</div>
          <div className="metric-chart">
            <div className="chart-bar"></div>
          </div>
        </div>
      </div>

      {/* App previews */}
      <div className="content-grid">
        {previews.map((item) => (
          <div className="content-card preview-card" key={item.title} onClick={() => navigate(item.to)}>
            <div className="card-header" style={{ alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {item.icon}
                <h3>{item.title}</h3>
              </div>
              <button className="text-button" onClick={(e) => { e.stopPropagation(); navigate(item.to) }}>
                {item.action}
              </button>
            </div>
            <p className="muted">{item.description}</p>
          </div>
        ))}
      </div>
    </>
  )
}

export default Overview
