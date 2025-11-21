import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Outlet } from 'react-router-dom'
import { supabase } from '../supabaseClient'

function Dashboard({ user, theme, toggleTheme }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(() => {
    // Get active tab from current path
    const path = location.pathname.split('/').pop() || 'overview'
    return path === 'dashboard' ? 'overview' : path
  })

  // Update active tab when route changes
  useEffect(() => {
    const path = location.pathname.split('/').pop() || 'overview'
    setActiveTab(path === 'dashboard' ? 'overview' : path)
  }, [location.pathname])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      navigate('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const getPageTitle = () => {
    switch (activeTab) {
      case 'overview': return 'Overview'
      case 'inventory': return 'Inventory'
      case 'messaging': return 'Messaging'
      case 'demographics': return 'Demographics'
      case 'settings': return 'Settings'
      default: return 'Dashboard'
    }
  }

  const getPageSubtitle = () => {
    switch (activeTab) {
      case 'overview': return 'Welcome back! Here\'s your overview.'
      case 'inventory': return 'Manage your inventory and track stock levels.'
      case 'messaging': return 'Communicate with your customers.'
      case 'demographics': return 'View demographic forecasts and upcoming events.'
      case 'settings': return 'Configure your account and preferences.'
      default: return ''
    }
  }

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <Link to="/" className="logo logo-clickable">
            <h1>Cyclo</h1>
          </Link>
        </div>
        <nav className="sidebar-nav">
          <Link 
            to="/overview"
            className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
          >
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            <span className="nav-label">Overview</span>
          </Link>
          <Link 
            to="/inventory"
            className={`nav-item ${activeTab === 'inventory' ? 'active' : ''}`}
          >
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
            <span className="nav-label">Inventory</span>
          </Link>
          <Link 
            to="/messaging"
            className={`nav-item ${activeTab === 'messaging' ? 'active' : ''}`}
          >
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span className="nav-label">Messaging</span>
          </Link>
          <Link 
            to="/demographics"
            className={`nav-item ${activeTab === 'demographics' ? 'active' : ''}`}
          >
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
              <line x1="3" y1="21" x2="3" y2="15"></line>
              <line x1="6" y1="21" x2="6" y2="12"></line>
              <line x1="9" y1="21" x2="9" y2="18"></line>
            </svg>
            <span className="nav-label">Demographics</span>
          </Link>
          <Link 
            to="/settings"
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          >
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 1v6m0 6v6m9-9h-6m-6 0H3m15.364 6.364l-4.243-4.243m-4.242 0L5.636 18.364m12.728 0l-4.243-4.243m-4.242 0L5.636 5.636"></path>
            </svg>
            <span className="nav-label">Settings</span>
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <header className="dashboard-header">
          <div className="header-left">
            <h2>{getPageTitle()}</h2>
            <p className="header-subtitle">{getPageSubtitle()}</p>
          </div>
          <div className="header-right">
            <button className="icon-button" onClick={toggleTheme} title="Toggle theme">
              {theme === 'light' ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"></circle>
                  <line x1="12" y1="1" x2="12" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="23"></line>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                  <line x1="1" y1="12" x2="3" y2="12"></line>
                  <line x1="21" y1="12" x2="23" y2="12"></line>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
              )}
            </button>
            <button className="icon-button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
            </button>
            <div className="user-profile">
              <div className="avatar">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span>{user?.email || 'User'}</span>
              <button className="logout-button" onClick={handleLogout} title="Logout">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <Outlet />
      </main>
    </div>
  )
}

export default Dashboard

