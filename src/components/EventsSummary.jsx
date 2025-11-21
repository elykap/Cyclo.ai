import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../supabaseClient'
import predicthqService from '../services/predicthqService'
import watsonxService from '../services/watsonxServiceProxy'

function EventsSummary({ location = '42.3314,-83.0458', radius = 50 }) {
  const { user } = useAuth()
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

      // Gather business context for personalized recommendations
      let businessContext = {}
      
      if (user?.id) {
        try {
          // Get business profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('business_name, business_type, description')
            .eq('id', user.id)
            .maybeSingle()
          
          if (profile) {
            businessContext.businessName = profile.business_name || 'Business'
            businessContext.businessType = profile.business_type || ''
            businessContext.description = profile.description || ''
          }

          // Get top selling products from inventory
          const { data: topProducts } = await supabase
            .from('inventory')
            .select('product_name, total_sales, current_stock')
            .eq('user_id', user.id)
            .order('total_sales', { ascending: false })
            .limit(10)
          
          if (topProducts && topProducts.length > 0) {
            businessContext.topProducts = topProducts.map(p => ({
              name: p.product_name,
              sales: parseFloat(p.total_sales || 0),
              stock: p.current_stock || 0
            }))
          }

          // Get recent POS transaction patterns
          const { data: recentTransactions } = await supabase
            .from('pos_transactions')
            .select('product_name, amount, date')
            .eq('user_id', user.id)
            .order('date', { ascending: false })
            .limit(50)
          
          if (recentTransactions && recentTransactions.length > 0) {
            const productFrequency = {}
            recentTransactions.forEach(t => {
              const product = t.product_name || 'Unknown'
              productFrequency[product] = (productFrequency[product] || 0) + (parseFloat(t.amount) || 1)
            })
            businessContext.popularProducts = Object.entries(productFrequency)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([name, count]) => ({ name, frequency: count }))
          }
        } catch (contextError) {
          console.warn('Error loading business context:', contextError)
          // Continue without context if it fails
        }
      }

      // Build comprehensive prompt with business context
      const businessInfo = businessContext.businessName 
        ? `\n\nBUSINESS CONTEXT:\n` +
          `Business Name: ${businessContext.businessName}\n` +
          `Business Type: ${businessContext.businessType || 'Not specified'}\n` +
          (businessContext.description ? `Description: ${businessContext.description}\n` : '') +
          (businessContext.topProducts?.length > 0 
            ? `Top Selling Products: ${businessContext.topProducts.map(p => `${p.name} ($${p.sales.toFixed(2)} sales, ${p.stock} in stock)`).join(', ')}\n`
            : '') +
          (businessContext.popularProducts?.length > 0
            ? `Frequently Sold Items: ${businessContext.popularProducts.map(p => p.name).join(', ')}\n`
            : '')
        : ''

      // Use Watson AI to analyze events and generate insights
      const analysisPrompt = `You are a strategic business consultant analyzing upcoming events to create a comprehensive action plan for a business.

${businessInfo}

UPCOMING EVENTS (Next 30 Days):
${JSON.stringify(eventsData.slice(0, 30).map(e => ({
  title: e.title,
  category: e.category,
  start: e.start,
  end: e.end,
  location: e.location?.name || `${e.location?.lat}, ${e.location?.lon}`,
  attendance: e.phq_attendance ? `${e.phq_attendance.low?.toLocaleString()}-${e.phq_attendance.high?.toLocaleString()} attendees` : 'Attendance unknown',
  description: e.description?.substring(0, 300) || 'No description available'
})), null, 2)}

YOUR TASK:
Create a detailed, actionable strategic plan that directly relates these events to the business. Consider:

1. **INVENTORY PLANNING** (if business context available):
   - Which products should be stocked up based on event types and expected attendance?
   - What inventory levels are needed for peak event days?
   - Are there any product gaps that could be filled for these events?

2. **STAFFING & OPERATIONS**:
   - When will you need additional staff based on event attendance and dates?
   - What are the peak hours/days to prepare for?
   - Any special operational considerations for high-traffic events?

3. **MARKETING & PROMOTIONS**:
   - Specific marketing opportunities tied to each major event
   - Event-themed promotions or partnerships
   - Social media content ideas related to events
   - How to position the business to event attendees

4. **REVENUE OPTIMIZATION**:
   - Pricing strategies for event days
   - Bundle deals or special offers for event-goers
   - Cross-selling opportunities based on event types

5. **TIMELINE & ACTION PLAN**:
   - Week-by-week action items leading up to major events
   - Critical deadlines (inventory orders, marketing campaigns, staffing)
   - Priority ranking of events by business impact potential

FORMAT YOUR RESPONSE AS:
- **Executive Summary**: 2-3 sentence overview of the biggest opportunities
- **Top 5 Priority Actions**: Most critical items with specific dates/deadlines
- **Event-Specific Strategies**: For each major event (3+ events), provide:
  * Event name and date
  * Expected business impact (High/Medium/Low)
  * Specific action items (inventory, staffing, marketing)
  * Revenue opportunity estimate
- **Weekly Action Timeline**: Week-by-week breakdown of what to do when
- **Risk Mitigation**: Potential challenges and how to prepare

Be specific, data-driven, and directly tie recommendations to the business context provided.`

      const watsonResponse = await watsonxService.chatCompletion({
        messages: [
          {
            role: 'system',
            content: 'You are an expert business strategist and consultant specializing in event-driven business planning. You analyze upcoming events and create detailed, actionable strategic plans that help businesses maximize revenue opportunities, optimize operations, and prepare effectively. Your recommendations are always specific, data-driven, and tailored to the unique business context provided. You think strategically about inventory, staffing, marketing, and revenue optimization.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        model_id: 'ibm/granite-3-8b-instruct',
        parameters: {
          max_tokens: 3000,
          temperature: 0.6
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

