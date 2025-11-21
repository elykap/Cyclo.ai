import { useNavigate } from 'react-router-dom'

function Settings() {
  const navigate = useNavigate()

  return (
    <div className="section-content">
      <div className="content-card">
        <div className="card-header">
          <h3>Settings</h3>
          <button 
            className="login-button" 
            onClick={() => navigate('/profile')}
          >
            Edit business profile
          </button>
        </div>
        <p className="muted">Account settings and preferences will be displayed here.</p>

        <div className="subscription-status">
          <h4>Subscription</h4>
          <p className="muted">Current plan: <strong>Premium</strong></p>
          <ul className="feature-checklist">
            <li>✓ Messaging access</li>
            <li>✓ Demographics access</li>
            <li>✓ Inventory access</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default Settings
