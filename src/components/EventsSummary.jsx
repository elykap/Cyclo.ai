import { useState, useEffect } from 'react'
import predicthqService from '../services/predicthqService'
import watsonxService from '../services/watsonxServiceProxy'

function EventsSummary({ location = '42.3314,-83.0458', radius = 50 }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [summary, setSummary] = useState(null)
  const [events, setEvents] = useState([])

  useEffect(() => {
    loadSummary()
  }, [location, radius])

  const loadSummary = async () => {
    setLoading(true)
    setError(null)

    try {
      // Get events for the next 30 days
      const startDate = new Date().toISOString().split('T')[0]
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const eventsResponse = await predicthqService.searchEvents({
        location_around: {
          origin: location,
          radius: radius
        },
        start: startDate,
        end: endDate,
        limit: 50 // Get more events for better analysis
      })

      const eventsData = eventsResponse.results || []
      setEvents(eventsData)

      if (eventsData.length === 0) {
        setSummary({
          totalEvents: 0,
          actionItems: [],
          insights: 'No upcoming events found in this area.',
          recommendations: []
        })
        setLoading(false)
        return
      }

      // Use Watson AI to analyze events and generate insights
      const analysisPrompt = `Analyze the following upcoming events and provide:
1. A brief summary of major events
2. Key action items for a business owner (inventory, staffing, marketing opportunities)
3. Business impact insights
4. Top 3-5 recommendations

Events data:
${JSON.stringify(eventsData.slice(0, 30).map(e => ({
  title: e.title,
  category: e.category,
  start: e.start,
  location: e.location?.name || `${e.location?.lat}, ${e.location?.lon}`,
  attendance: e.phq_attendance ? `${e.phq_attendance.low}-${e.phq_attendance.high}` : 'unknown',
  description: e.description?.substring(0, 200)
})), null, 2)}

Provide your analysis in a structured format with clear action items and recommendations.`

      const watsonResponse = await watsonxService.chatCompletion({
        messages: [
          {
            role: 'system',
            content: 'You are a business intelligence assistant that analyzes events data and provides actionable insights for business owners. Focus on practical recommendations for inventory, staffing, marketing, and revenue opportunities.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        model_id: 'ibm/granite-3-8b-instruct',
        parameters: {
          max_tokens: 1500,
          temperature: 0.7
        }
      })

      // Extract the assistant's response
      let analysisText = '';
      if (watsonResponse.results && watsonResponse.results.length > 0) {
        analysisText = watsonResponse.results[0].generated_text || 
                      watsonResponse.results[0].content || '';
      } else if (watsonResponse.choices && watsonResponse.choices.length > 0) {
        analysisText = watsonResponse.choices[0].message?.content || '';
      } else if (watsonResponse.message) {
        analysisText = watsonResponse.message;
      } else if (typeof watsonResponse === 'string') {
        analysisText = watsonResponse;
      }

      // Parse the analysis to extract structured information
      const parsedSummary = parseAnalysis(analysisText, eventsData)

      setSummary(parsedSummary)

    } catch (err) {
      console.error('Error loading summary:', err)
      setError(err.message || 'Failed to load events summary')
    } finally {
      setLoading(false)
    }
  }

  const parseAnalysis = (analysisText, eventsData) => {
    // Extract key information from the analysis
    const totalEvents = eventsData.length
    
    // Try to extract action items (lines starting with bullet points, numbers, or dashes)
    const actionItems = []
    const lines = analysisText.split('\n')
    let currentSection = null

    lines.forEach(line => {
      const trimmed = line.trim()
      if (!trimmed) return

      // Detect action items
      if (trimmed.match(/^[-•*]\s+|^\d+[.)]\s+|^Action|^Recommend/i)) {
        const item = trimmed.replace(/^[-•*]\s+|^\d+[.)]\s+/i, '').trim()
        if (item && item.length > 10) {
          actionItems.push(item)
        }
      }
    })

    // If no structured items found, create from the text
    if (actionItems.length === 0 && analysisText) {
      // Split by sentences and take key points
      const sentences = analysisText.split(/[.!?]+/).filter(s => s.trim().length > 20)
      actionItems.push(...sentences.slice(0, 5))
    }

    // Categorize events
    const eventCategories = {}
    eventsData.forEach(event => {
      const category = event.category || 'other'
      eventCategories[category] = (eventCategories[category] || 0) + 1
    })

    const topCategory = Object.entries(eventCategories)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'various'

    return {
      totalEvents,
      actionItems: actionItems.slice(0, 5),
      insights: analysisText.substring(0, 500) + (analysisText.length > 500 ? '...' : ''),
      recommendations: actionItems.slice(0, 3),
      topCategory,
      eventCategories
    }
  }

  if (loading) {
    return (
      <div className="content-card" style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Analyzing events...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="content-card" style={{ 
        padding: '1.5rem',
        background: 'var(--bg-error)',
        color: 'var(--text-error)',
        border: '1px solid var(--text-error)',
        borderRadius: '8px'
      }}>
        <strong>Error loading summary:</strong> {error}
        <button 
          onClick={loadSummary}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            background: 'var(--text-error)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  if (!summary) {
    return null
  }

  return (
    <div className="content-card">
      <div className="card-header">
        <h3>Events Summary & Action Items</h3>
        <span style={{ 
          fontSize: '0.875rem', 
          color: 'var(--text-secondary)',
          background: 'var(--bg-tertiary)',
          padding: '0.25rem 0.75rem',
          borderRadius: '12px'
        }}>
          {summary.totalEvents} events found
        </span>
      </div>

      {/* Key Metrics */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
        gap: '1rem',
        marginBottom: '1.5rem',
        padding: '1rem',
        background: 'var(--bg-tertiary)',
        borderRadius: '8px'
      }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
            Total Events
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--text-primary)' }}>
            {summary.totalEvents}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
            Top Category
          </div>
          <div style={{ fontSize: '1rem', fontWeight: '500', color: 'var(--text-primary)', textTransform: 'capitalize' }}>
            {summary.topCategory?.replace(/-/g, ' ') || 'N/A'}
          </div>
        </div>
        {summary.actionItems && summary.actionItems.length > 0 && (
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              Action Items
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--text-primary)' }}>
              {summary.actionItems.length}
            </div>
          </div>
        )}
      </div>

      {/* Action Items */}
      {summary.actionItems && summary.actionItems.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ 
            margin: '0 0 1rem 0', 
            fontSize: '1rem', 
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '20px', height: '20px' }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            Key Action Items
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {summary.actionItems.map((item, index) => (
              <div
                key={index}
                style={{
                  padding: '1rem',
                  background: 'var(--bg-tertiary)',
                  borderLeft: '4px solid var(--bg-sidebar-active)',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  color: 'var(--text-primary)'
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Insights */}
      {summary.insights && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ 
            margin: '0 0 1rem 0', 
            fontSize: '1rem', 
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '20px', height: '20px' }}>
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            AI Analysis
          </h4>
          <div style={{
            padding: '1rem',
            background: 'var(--bg-tertiary)',
            borderRadius: '8px',
            fontSize: '0.875rem',
            color: 'var(--text-primary)',
            lineHeight: '1.6',
            whiteSpace: 'pre-wrap'
          }}>
            {summary.insights}
          </div>
        </div>
      )}

      {/* Event Categories Breakdown */}
      {summary.eventCategories && Object.keys(summary.eventCategories).length > 0 && (
        <div>
          <h4 style={{ 
            margin: '0 0 1rem 0', 
            fontSize: '1rem', 
            color: 'var(--text-primary)'
          }}>
            Events by Category
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {Object.entries(summary.eventCategories)
              .sort((a, b) => b[1] - a[1])
              .map(([category, count]) => (
                <span
                  key={category}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'var(--bg-sidebar-active)',
                    color: 'var(--text-white)',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    textTransform: 'capitalize'
                  }}
                >
                  {category.replace(/-/g, ' ')} ({count})
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-primary)' }}>
        <button
          onClick={loadSummary}
          disabled={loading}
          style={{
            padding: '0.5rem 1rem',
            background: 'var(--bg-sidebar-active)',
            color: 'var(--text-white)',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.875rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1
          }}
        >
          Refresh Analysis
        </button>
      </div>
    </div>
  )
}

export default EventsSummary

