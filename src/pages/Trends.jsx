import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import trendsService from '../services/trendsService'
import FormattedRecommendations from '../components/FormattedRecommendations'

function Trends() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [topProducts, setTopProducts] = useState([])
  const [trendingProducts, setTrendingProducts] = useState([])
  const [customerPatterns, setCustomerPatterns] = useState([])
  const [adRecommendations, setAdRecommendations] = useState('')
  const [outreachRecommendations, setOutreachRecommendations] = useState('')
  const [generatingAds, setGeneratingAds] = useState(false)
  const [generatingOutreach, setGeneratingOutreach] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user?.id) {
      loadTrendsData()
    }
  }, [user?.id])

  const loadTrendsData = async () => {
    setLoading(true)
    setError('')
    try {
      const [products, trending, customers] = await Promise.all([
        trendsService.getTopSellingProducts(user.id, 10),
        trendsService.getTrendingProducts(user.id, 30),
        trendsService.getCustomerPatterns(user.id, 20)
      ])

      setTopProducts(products)
      setTrendingProducts(trending)
      setCustomerPatterns(customers)
    } catch (err) {
      console.error('Error loading trends data:', err)
      setError('Failed to load trends data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateAdRecommendations = async () => {
    setGeneratingAds(true)
    try {
      const recommendations = await trendsService.generateAdCampaignRecommendations(
        user.id,
        topProducts,
        trendingProducts
      )
      setAdRecommendations(recommendations)
    } catch (err) {
      console.error('Error generating ad recommendations:', err)
      setError('Failed to generate ad recommendations. Please try again.')
    } finally {
      setGeneratingAds(false)
    }
  }

  const handleGenerateOutreachRecommendations = async () => {
    setGeneratingOutreach(true)
    try {
      const recommendations = await trendsService.generateOutreachRecommendations(
        user.id,
        customerPatterns
      )
      setOutreachRecommendations(recommendations)
    } catch (err) {
      console.error('Error generating outreach recommendations:', err)
      setError('Failed to generate outreach recommendations. Please try again.')
    } finally {
      setGeneratingOutreach(false)
    }
  }

  if (loading) {
    return (
      <div className="section-content">
        <div className="content-card">
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
            <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Loading trends data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error && topProducts.length === 0) {
    return (
      <div className="section-content">
        <div className="content-card">
          <div style={{ 
            padding: '2rem', 
            textAlign: 'center',
            color: 'var(--text-error)'
          }}>
            <p>{error}</p>
            <button 
              className="btn btn-primary" 
              onClick={loadTrendsData}
              style={{ marginTop: '1rem' }}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="section-content">
      {error && (
        <div style={{
          padding: '1rem 1.5rem',
          background: 'var(--bg-error)',
          color: 'var(--text-error)',
          borderLeft: '4px solid var(--text-error)',
          margin: '0 1.5rem 1rem',
          borderRadius: '4px'
        }}>
          {error}
        </div>
      )}

      {/* Top Selling Products */}
      <div className="content-card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <h3>Top Selling Products</h3>
          <span style={{ 
            fontSize: '0.875rem', 
            color: 'var(--text-secondary)',
            background: 'var(--bg-tertiary)',
            padding: '0.25rem 0.75rem',
            borderRadius: '12px'
          }}>
            {topProducts.length} products
          </span>
        </div>

        {topProducts.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p>No POS transaction data found. Upload CSV files in your Profile to see trends.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-primary)' }}>
                  <th style={{ 
                    padding: '0.75rem', 
                    textAlign: 'left', 
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: 'var(--text-secondary)'
                  }}>
                    Product
                  </th>
                  <th style={{ 
                    padding: '0.75rem', 
                    textAlign: 'right', 
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: 'var(--text-secondary)'
                  }}>
                    Revenue
                  </th>
                  <th style={{ 
                    padding: '0.75rem', 
                    textAlign: 'right', 
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: 'var(--text-secondary)'
                  }}>
                    Quantity
                  </th>
                  <th style={{ 
                    padding: '0.75rem', 
                    textAlign: 'right', 
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: 'var(--text-secondary)'
                  }}>
                    Transactions
                  </th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((product, index) => (
                  <tr 
                    key={index}
                    style={{ 
                      borderBottom: '1px solid var(--border-primary)',
                      transition: 'background 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '0.75rem', fontWeight: '500' }}>
                      {product.product_name}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-link)' }}>
                      ${product.total_revenue.toFixed(2)}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      {product.total_quantity.toFixed(0)}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      {product.transaction_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Trending Products */}
      {trendingProducts.length > 0 && (
        <div className="content-card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <h3>Trending Products</h3>
            <span style={{ 
              fontSize: '0.875rem', 
              color: 'var(--text-secondary)',
              background: 'var(--bg-tertiary)',
              padding: '0.25rem 0.75rem',
              borderRadius: '12px'
            }}>
              Last 30 days
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {trendingProducts.slice(0, 5).map((product, index) => (
              <div
                key={index}
                style={{
                  padding: '1rem',
                  background: 'var(--bg-tertiary)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-primary)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                    {product.product_name}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    Recent revenue: ${product.recent_revenue.toFixed(2)}
                  </div>
                </div>
                <div style={{ 
                  fontSize: '1.25rem', 
                  fontWeight: '600',
                  color: product.growth_percentage > 0 ? 'var(--text-success)' : 'var(--text-error)'
                }}>
                  {product.growth_percentage > 0 ? '+' : ''}{product.growth_percentage.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ad Campaign Recommendations */}
      <div className="content-card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <h3>Ad Campaign Recommendations</h3>
          <button
            className="btn btn-primary"
            onClick={handleGenerateAdRecommendations}
            disabled={generatingAds || topProducts.length === 0}
            style={{ 
              padding: '0.5rem 1rem',
              fontSize: '0.875rem'
            }}
          >
            {generatingAds ? (
              <>
                <div className="loading-spinner small" style={{ marginRight: '0.5rem' }}></div>
                Generating...
              </>
            ) : (
              'Generate Recommendations'
            )}
          </button>
        </div>

        {adRecommendations ? (
          <FormattedRecommendations content={adRecommendations} />
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p>Click "Generate Recommendations" to get AI-powered ad campaign suggestions for your top-selling products.</p>
          </div>
        )}
      </div>

      {/* Customer Outreach Recommendations */}
      {customerPatterns.length > 0 && (
        <div className="content-card">
          <div className="card-header">
            <h3>Customer Outreach Recommendations</h3>
            <button
              className="btn btn-primary"
              onClick={handleGenerateOutreachRecommendations}
              disabled={generatingOutreach}
              style={{ 
                padding: '0.5rem 1rem',
                fontSize: '0.875rem'
              }}
            >
              {generatingOutreach ? (
                <>
                  <div className="loading-spinner small" style={{ marginRight: '0.5rem' }}></div>
                  Generating...
                </>
              ) : (
                'Generate Recommendations'
              )}
            </button>
          </div>

          {outreachRecommendations ? (
            <FormattedRecommendations content={outreachRecommendations} />
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <p>Click "Generate Recommendations" to get AI-powered customer outreach strategies based on purchase patterns.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Trends

