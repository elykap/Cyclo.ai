function Overview() {
  return (
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
  )
}

export default Overview

