import { useState, useEffect } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from './firebase'
import LandingPage from './LandingPage'
import Messaging from './components/Messaging'

function App() {
  const [activeTab, setActiveTab] = useState('overview')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(() => {
    try {
      const stored = localStorage.getItem('currentPage')
      return stored || 'landing'
    } catch (e) {
      return 'landing'
    }
  })
  const [theme, setTheme] = useState(() => {
    // Check for saved theme preference first
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      return savedTheme
    }
    // If no saved preference, check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
    // Default to light if no system preference detected
    return 'light'
  })

  // Check authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
      // Do NOT auto-redirect to dashboard on auth state change.
      // Keep the user on the current page (e.g., landing) unless
      // navigation is triggered explicitly by UI actions such as
      // clicking "Get Started" or successful sign-in flow.
      if (!currentUser) {
        setCurrentPage('landing')
      }
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  // Persist current page so reloads restore the same page
  useEffect(() => {
    try {
      localStorage.setItem('currentPage', currentPage)
    } catch (e) {
      // ignore write errors (e.g., private mode)
    }
  }, [currentPage])

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemThemeChange = (e) => {
      // Only update if user hasn't manually set a preference
      const savedTheme = localStorage.getItem('theme')
      if (!savedTheme) {
        setTheme(e.matches ? 'dark' : 'light')
      }
    }

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemThemeChange)
      return () => mediaQuery.removeEventListener('change', handleSystemThemeChange)
    } 
    // Fallback for older browsers
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleSystemThemeChange)
      return () => mediaQuery.removeListener(handleSystemThemeChange)
    }
  }, [])

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light')
  }

  const handleGetStarted = () => {
    if (user) {
      setCurrentPage('dashboard')
    }
  }

  const handleGoToLanding = () => {
    setCurrentPage('landing')
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      setCurrentPage('landing')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // Show loading state
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  // Show landing page if not on dashboard or not logged in
  if (currentPage === 'landing' || !user) {
    return <LandingPage onGetStarted={handleGetStarted} theme={theme} toggleTheme={toggleTheme} user={user} />
  }

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="logo logo-clickable" onClick={handleGoToLanding}>Cyclo</h1>
        </div>
        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            <span className="nav-label">Overview</span>
          </button>
          <button 
            className={`nav-item ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
            <span className="nav-label">Inventory</span>
          </button>
          <button 
            className={`nav-item ${activeTab === 'messaging' ? 'active' : ''}`}
            onClick={() => setActiveTab('messaging')}
          >
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span className="nav-label">Messaging</span>
          </button>
          <button 
            className={`nav-item ${activeTab === 'demographics' ? 'active' : ''}`}
            onClick={() => setActiveTab('demographics')}
          >
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
              <line x1="3" y1="21" x2="3" y2="15"></line>
              <line x1="6" y1="21" x2="6" y2="12"></line>
              <line x1="9" y1="21" x2="9" y2="18"></line>
            </svg>
            <span className="nav-label">Demographics</span>
          </button>
          <button 
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 1v6m0 6v6m9-9h-6m-6 0H3m15.364 6.364l-4.243-4.243m-4.242 0L5.636 18.364m12.728 0l-4.243-4.243m-4.242 0L5.636 5.636"></path>
            </svg>
            <span className="nav-label">Settings</span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <header className="dashboard-header">
          <div className="header-left">
            <h2>
              {activeTab === 'overview' ? 'Overview' :
               activeTab === 'inventory' ? 'Inventory' :
               activeTab === 'messaging' ? 'Messaging' :
               activeTab === 'demographics' ? 'Demographics' :
               activeTab === 'settings' ? 'Settings' : 'Dashboard'}
            </h2>
            <p className="header-subtitle">
              {activeTab === 'overview' ? 'Welcome back! Here\'s your overview.' :
               activeTab === 'inventory' ? 'Manage your inventory and track stock levels.' :
               activeTab === 'messaging' ? 'Communicate with your customers.' :
               activeTab === 'demographics' ? 'View demographic forecasts and upcoming events.' :
               activeTab === 'settings' ? 'Configure your account and preferences.' : ''}
            </p>
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

        {/* Overview Section */}
        {activeTab === 'overview' && (
          <>
            {/* Metrics Grid */}
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-header">
                  <span className="metric-label"></span>
                  <span className="metric-change"></span>
                </div>
                <div className="metric-value"></div>
                <div className="metric-chart">
                  <div className="chart-bar"></div>
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-header">
                  <span className="metric-label"></span>
                  <span className="metric-change"></span>
                </div>
                <div className="metric-value"></div>
                <div className="metric-chart">
                  <div className="chart-bar"></div>
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-header">
                  <span className="metric-label"></span>
                  <span className="metric-change"></span>
                </div>
                <div className="metric-value"></div>
                <div className="metric-chart">
                  <div className="chart-bar"></div>
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-header">
                  <span className="metric-label"></span>
                  <span className="metric-change"></span>
                </div>
                <div className="metric-value"></div>
                <div className="metric-chart">
                  <div className="chart-bar"></div>
                </div>
              </div>
            </div>

            {/* Content Grid */}
            <div className="content-grid">
              {/* Chart Section */}
              <div className="content-card">
                <div className="card-header">
                  <h3></h3>
                  <select className="time-selector">
                    <option></option>
                  </select>
                </div>
                <div className="chart-container">
                  <div className="simple-chart">
                    <div className="chart-column">
                      <div className="chart-bar-vertical"></div>
                    </div>
                    <div className="chart-column">
                      <div className="chart-bar-vertical"></div>
                    </div>
                    <div className="chart-column">
                      <div className="chart-bar-vertical"></div>
                    </div>
                    <div className="chart-column">
                      <div className="chart-bar-vertical"></div>
                    </div>
                    <div className="chart-column">
                      <div className="chart-bar-vertical"></div>
                    </div>
                    <div className="chart-column">
                      <div className="chart-bar-vertical"></div>
                    </div>
                    <div className="chart-column">
                      <div className="chart-bar-vertical"></div>
                    </div>
                    <div className="chart-column">
                      <div className="chart-bar-vertical"></div>
                    </div>
                    <div className="chart-column">
                      <div className="chart-bar-vertical"></div>
                    </div>
                    <div className="chart-column">
                      <div className="chart-bar-vertical"></div>
                    </div>
                    <div className="chart-column">
                      <div className="chart-bar-vertical"></div>
                    </div>
                    <div className="chart-column">
                      <div className="chart-bar-vertical"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="content-card">
                <div className="card-header">
                  <h3></h3>
                  <button className="text-button"></button>
                </div>
                <div className="activity-list">
                  <div className="activity-item">
                    <div className="activity-avatar"></div>
                    <div className="activity-content">
                      <p className="activity-text"></p>
                      <span className="activity-time"></span>
                    </div>
                  </div>
                  <div className="activity-item">
                    <div className="activity-avatar"></div>
                    <div className="activity-content">
                      <p className="activity-text"></p>
                      <span className="activity-time"></span>
                    </div>
                  </div>
                  <div className="activity-item">
                    <div className="activity-avatar"></div>
                    <div className="activity-content">
                      <p className="activity-text"></p>
                      <span className="activity-time"></span>
                    </div>
                  </div>
                  <div className="activity-item">
                    <div className="activity-avatar"></div>
                    <div className="activity-content">
                      <p className="activity-text"></p>
                      <span className="activity-time"></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
              <h3></h3>
              <div className="actions-grid">
                <button className="action-button">
                  <svg className="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  <span></span>
                </button>
                <button className="action-button">
                  <svg className="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                  <span></span>
                </button>
                <button className="action-button">
                  <svg className="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                  </svg>
                  <span></span>
                </button>
                <button className="action-button">
                  <svg className="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M12 1v6m0 6v6m9-9h-6m-6 0H3m15.364 6.364l-4.243-4.243m-4.242 0L5.636 18.364m12.728 0l-4.243-4.243m-4.242 0L5.636 5.636"></path>
                  </svg>
                  <span></span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* Inventory Section */}
        {activeTab === 'inventory' && (
          <div className="section-content">
            <div className="content-card">
              <div className="card-header">
                <h3>Inventory Management</h3>
              </div>
              <div className="section-placeholder">
                <p>Inventory tracking and management features will be displayed here.</p>
              </div>
            </div>
          </div>
        )}

        {/* Messaging Section */}
        {activeTab === 'messaging' && (
          <div className="section-content">
            <div className="content-card messaging-card">
              <Messaging />
            </div>
          </div>
        )}

        {/* Demographics Section */}
        {activeTab === 'demographics' && (
          <div className="section-content">
            <div className="content-card">
              <div className="card-header">
                <h3>Demographic Forecast</h3>
              </div>
              <div className="section-placeholder">
                <p>Demographic forecasting and event analysis features will be displayed here.</p>
              </div>
            </div>
          </div>
        )}

        {/* Settings Section */}
        {activeTab === 'settings' && (
          <div className="section-content">
            <div className="content-card">
              <div className="card-header">
                <h3>Settings</h3>
              </div>
              <div className="section-placeholder">
                <p>Account settings and preferences will be displayed here.</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
