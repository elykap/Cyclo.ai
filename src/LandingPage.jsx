import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthModal from './AuthModal'

function LandingPage({ theme, toggleTheme, user }) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const navigate = useNavigate()

  const handleAuthSuccess = () => {
    // Always collect profile details after authentication
    navigate('/profile')
  }

  const handleGetStarted = () => {
    if (user) {
      navigate('/overview')
    } else {
      setIsAuthModalOpen(true)
    }
  }

  return (
    <div className="landing-page">
      {/* Header */}
      <header className="landing-header">
        <div className="landing-header-content">
          <h1 className="landing-logo">Cyclo</h1>
          <div className="landing-header-actions">
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
            {user ? (
              <button className="login-button" onClick={() => navigate('/overview')}>
                Go to Dashboard
              </button>
            ) : (
              <button className="login-button" onClick={() => setIsAuthModalOpen(true)}>
                Login
              </button>
            )}
          </div>
        </div>
      </header>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="landing-hero-content">
          <h2 className="landing-title">Streamline Your Business Operations</h2>
          <p className="landing-subtitle">
            Cyclo is your all-in-one platform for inventory management, customer communication, 
            and demographic forecasting. Make data-driven decisions and stay ahead of the curve.
          </p>
          <button 
            className="get-started-button" 
            onClick={handleGetStarted}
          >
            Get Started
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section className="landing-features">
        <div className="features-grid">
          <div className="feature-card feature-card-1">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
            </div>
            <h3 className="feature-title">Inventory Tracker</h3>
            <p className="feature-description">
              Keep track of your inventory in real-time. Monitor stock levels, 
              track products, and never run out of essential items.
            </p>
          </div>

          <div className="feature-card feature-card-2">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <h3 className="feature-title">Customer Messaging</h3>
            <p className="feature-description">
              Chat with a personalized agent trained on your data to answer questions 
              and respond to customers automatically.
            </p>
          </div>

          <div className="feature-card feature-card-3">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
                <line x1="3" y1="21" x2="3" y2="15"></line>
                <line x1="6" y1="21" x2="6" y2="12"></line>
                <line x1="9" y1="21" x2="9" y2="18"></line>
              </svg>
            </div>
            <h3 className="feature-title">Demographic Forecast</h3>
            <p className="feature-description">
              Predict upcoming events and understand who will be in your area. 
              Plan ahead with data-driven demographic insights.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default LandingPage
