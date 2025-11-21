import { useState, useEffect } from 'react'
import predicthqService from '../services/predicthqService'
import watsonxService from '../services/watsonxServiceProxy'

function PredictHQTest() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchParams, setSearchParams] = useState({
    location: '42.3314,-83.0458', // Default: Detroit, Michigan
    radius: 50, // km (increased for state-wide coverage)
    start: new Date().toISOString().split('T')[0], // Today
    end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    category: '',
    limit: 20
  })
  const [categories, setCategories] = useState([])
  const [stats, setStats] = useState(null)
  const [aiAnalysis, setAiAnalysis] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [summary, setSummary] = useState(null)

  // Load categories on mount (for future use) and fetch default events
  useEffect(() => {
    loadCategories()
    handleSearch(true)
  }, [])

  const parseAnalysis = (analysisText, eventsData) => {
    // Extract key information from the analysis
    const totalEvents = eventsData.length
    
    // Try to extract action items (lines starting with bullet points, numbers, or dashes)
    const actionItems = []
    const lines = analysisText.split('\n')

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

  const loadCategories = async () => {
    try {
      const response = await predicthqService.getCategories()
      setCategories(response.results || [])
    } catch (err) {
      console.warn('Error loading categories:', err)
      // Use default categories if API call fails
      setCategories([
        { id: 'concerts', label: 'Concerts' },
        { id: 'sports', label: 'Sports' },
        { id: 'conferences', label: 'Conferences' },
        { id: 'festivals', label: 'Festivals' },
        { id: 'performing-arts', label: 'Performing Arts' },
        { id: 'community', label: 'Community' },
        { id: 'expos', label: 'Expos' },
        { id: 'school-holidays', label: 'School Holidays' }
      ])
    }
  }

  const handleSearch = async (auto = false) => {
    setLoading(true)
    setError(null)
    setEvents([])
    setStats(null)
    setAiAnalysis(null)

    try {
      const params = {
        location_around: {
          origin: searchParams.location,
          radius: searchParams.radius
        },
        start: searchParams.start,
        end: searchParams.end,
        limit: searchParams.limit
      }

      if (searchParams.category) {
        params.category = searchParams.category
      }

      // Search events
      const eventsResponse = await predicthqService.searchEvents(params)
      const eventsData = eventsResponse.results || []
      setEvents(eventsData)

      // Get event counts/stats
      const countsResponse = await predicthqService.getEventCounts(params)
      setStats(countsResponse)

      // Analyze events with Watson AI
      if (eventsData.length > 0) {
        setAnalyzing(true)
        try {
          const analysisPrompt = `Analyze the following upcoming events and provide:
1. A brief summary of major events and their significance
2. Key action items for a business owner (inventory, staffing, marketing opportunities)
3. Business impact insights and revenue opportunities
4. Top 3-5 specific recommendations

Events data:
${JSON.stringify(eventsData.slice(0, 30).map(e => ({
  title: e.title,
  category: e.category,
  start: e.start,
  end: e.end,
  location: e.location?.name || `${e.location?.lat}, ${e.location?.lon}`,
  attendance: e.phq_attendance ? `${e.phq_attendance.low?.toLocaleString()}-${e.phq_attendance.high?.toLocaleString()}` : 'unknown',
  description: e.description?.substring(0, 200) || 'No description'
})), null, 2)}

Provide your analysis in a clear, actionable format with specific recommendations.`

          const watsonResponse = await watsonxService.chatCompletion({
            messages: [
              {
                role: 'system',
                content: 'You are a business intelligence assistant that analyzes events data and provides actionable insights for business owners. Focus on practical recommendations for inventory, staffing, marketing, and revenue opportunities. Be specific and actionable.'
              },
              {
                role: 'user',
                content: analysisPrompt
              }
            ],
            model_id: 'ibm/granite-3-8b-instruct',
            parameters: {
              max_tokens: 2000,
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

          setAiAnalysis(analysisText)
          
          // Parse the analysis to create a structured summary
          const parsedSummary = parseAnalysis(analysisText, eventsData)
          setSummary(parsedSummary)
        } catch (analysisError) {
          console.error('Error analyzing with Watson AI:', analysisError)
          setAiAnalysis(null)
          setSummary(null)
          // Don't show error for analysis failure, just continue without it
        } finally {
          setAnalyzing(false)
        }
      } else {
        setAiAnalysis(null)
        setSummary(null)
      }

    } catch (err) {
      console.error('Error searching events:', err)
      
      // Build detailed error message
      let errorMessage = err.message || 'Failed to fetch events.'
      
      if (err.details) {
        // If we have detailed error info from the API
        if (err.details.errors) {
          errorMessage = err.details.errors.map(e => e.message || e).join(', ')
        } else if (err.details.message) {
          errorMessage = err.details.message
        } else if (typeof err.details === 'string') {
          errorMessage = err.details
        }
      }
      
      // Add status code if available
      if (err.status) {
        errorMessage = `[${err.status}] ${errorMessage}`
      }
      
      // Add helpful hints based on error
      if (err.status === 400) {
        errorMessage += '\n\nPossible issues:\n- Invalid location format (use "lat,lng" or address)\n- Invalid date format\n- Missing required parameters'
      } else if (err.status === 401) {
        errorMessage += '\n\nPlease check that VITE_PREDICTHQ_API_TOKEN is set correctly in your .env file and restart the dev server.'
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatLocation = (location) => {
    if (!location) return 'N/A'
    if (location.lat && location.lon) {
      return `${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}`
    }
    return location.name || 'N/A'
  }

  return (
    <div className="section-content">
      <div className="content-card">
        <div className="card-header">
          <h3>Upcoming Events</h3>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            padding: '1rem 1.5rem',
            background: 'var(--bg-error)',
            color: 'var(--text-error)',
            borderLeft: '4px solid var(--text-error)',
            margin: '1rem 1.5rem',
            borderRadius: '4px'
          }}>
            <strong>Error:</strong>
            <pre style={{
              margin: '0.5rem 0 0 0',
              fontSize: '0.875rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: 'monospace',
              background: 'rgba(0,0,0,0.1)',
              padding: '0.5rem',
              borderRadius: '4px'
            }}>
              {error}
            </pre>
            <div style={{ marginTop: '0.75rem', fontSize: '0.875rem', opacity: 0.9 }}>
              <strong>Debug Info:</strong>
              <ul style={{ margin: '0.5rem 0 0 1.5rem', padding: 0 }}>
                <li>Check browser console for detailed error logs</li>
                <li>Verify <code>VITE_PREDICTHQ_API_TOKEN</code> is set in <code>.env</code></li>
                <li>Restart dev server after changing <code>.env</code> file</li>
                <li>Check PredictHQ API documentation: <a href="https://docs.predicthq.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>docs.predicthq.com</a></li>
              </ul>
            </div>
          </div>
        )}

        {/* Events Summary & Action Items - Show FIRST */}
        {analyzing && (
          <div style={{
            padding: '1.5rem',
            margin: '1rem 1.5rem',
            background: 'var(--bg-tertiary)',
            borderRadius: '8px',
            border: '1px solid var(--border-primary)',
            textAlign: 'center'
          }}>
            <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Analyzing events with Watson AI...</p>
          </div>
        )}

        {summary && !analyzing && (
          <div className="content-card" style={{ margin: '1rem 1.5rem' }}>
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
          </div>
        )}

        {/* Full AI Analysis (Optional - can be expanded) */}
        {aiAnalysis && !analyzing && summary && (
          <div style={{
            padding: '1rem 1.5rem',
            margin: '0 1.5rem 1rem',
            background: 'var(--bg-card)',
            borderRadius: '8px',
            border: '1px solid var(--border-primary)'
          }}>
            <details>
              <summary style={{ 
                cursor: 'pointer', 
                fontSize: '0.875rem', 
                color: 'var(--text-secondary)',
                fontWeight: '500'
              }}>
                View Full AI Analysis
              </summary>
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                background: 'var(--bg-tertiary)',
                borderRadius: '6px',
                fontSize: '0.875rem',
                color: 'var(--text-primary)',
                lineHeight: '1.7',
                whiteSpace: 'pre-wrap'
              }}>
                {aiAnalysis}
              </div>
            </details>
          </div>
        )}

        {/* No Results */}
        {!loading && events.length === 0 && !error && (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No events found. Try adjusting your search parameters and click "Search Events".
          </div>
        )}
      </div>
    </div>
  )
}

export default PredictHQTest
