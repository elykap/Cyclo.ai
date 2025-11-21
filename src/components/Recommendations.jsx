import { useState, useEffect } from 'react'
import recommendationService from '../services/recommendationService'

function Recommendations({ user }) {
  const [recommendations, setRecommendations] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lowStockProducts, setLowStockProducts] = useState([])
  const [bestSellingProducts, setBestSellingProducts] = useState([])
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    if (user?.id) {
      loadData()
    }
  }, [user?.id])

  const loadData = async () => {
    if (!user?.id) return

    setLoading(true)
    setError('')

    try {
      // Load all data in parallel
      const [lowStock, bestSellers, summaryData] = await Promise.all([
        recommendationService.getLowStockProducts(user.id, 10),
        recommendationService.getBestSellingProducts(user.id, 10),
        recommendationService.getInventorySummary(user.id)
      ])

      setLowStockProducts(lowStock)
      setBestSellingProducts(bestSellers)
      setSummary(summaryData)
    } catch (err) {
      console.error('Error loading recommendation data:', err)
      setError(err.message || 'Failed to load recommendation data')
    } finally {
      setLoading(false)
    }
  }

  const generateRecommendations = async () => {
    if (!user?.id) return

    setLoading(true)
    setError('')
    setRecommendations('')

    try {
      const aiRecommendations = await recommendationService.generateRecommendations(user.id, {
        includeLowStock: true,
        includeBestSellers: true,
        includeGeneral: true
      })
      setRecommendations(aiRecommendations)
    } catch (err) {
      console.error('Error generating recommendations:', err)
      setError(err.message || 'Failed to generate recommendations')
    } finally {
      setLoading(false)
    }
  }

  if (!user?.id) {
    return (
      <div className="recommendations-container">
        <p className="muted">Please log in to view recommendations.</p>
      </div>
    )
  }

  return (
    <div className="recommendations-container">
      <div className="recommendations-header">
        <h2>Product Recommendations</h2>
        <button
          className="auth-submit-button"
          onClick={generateRecommendations}
          disabled={loading}
        >
          {loading ? 'Generating...' : 'Generate AI Recommendations'}
        </button>
      </div>

      {error && (
        <div className="error-message" style={{ marginTop: '16px', padding: '12px', background: 'var(--error-bg, #fee)', color: 'var(--error-text, #c00)', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      {summary && (
        <div className="inventory-summary" style={{ marginTop: '16px', padding: '16px', background: 'var(--card-bg, #f5f5f5)', borderRadius: '8px' }}>
          <h3>Inventory Summary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '12px' }}>
            <div>
              <strong>Total Products:</strong> {summary.totalProducts}
            </div>
            <div>
              <strong>Total Sales:</strong> ${summary.totalSales.toFixed(2)}
            </div>
            <div>
              <strong>Low Stock Items:</strong> {summary.lowStockCount}
            </div>
            <div>
              <strong>Avg Sales/Product:</strong> ${summary.avgSales.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '20px' }}>
        {lowStockProducts.length > 0 && (
          <div className="recommendation-card" style={{ padding: '16px', background: 'var(--card-bg, #fff)', borderRadius: '8px', border: '1px solid var(--border, #ddd)' }}>
            <h3 style={{ color: 'var(--warning, #f59e0b)', marginBottom: '12px' }}>⚠️ Low Stock Products</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {lowStockProducts.slice(0, 5).map((item) => (
                <li key={item.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border, #eee)' }}>
                  <strong>{item.product_name}</strong>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted, #666)', marginTop: '4px' }}>
                    Stock: {item.current_stock} | Sales: ${parseFloat(item.total_sales || 0).toFixed(2)}
                  </div>
                </li>
              ))}
            </ul>
            {lowStockProducts.length > 5 && (
              <p className="muted" style={{ marginTop: '8px', fontSize: '0.875rem' }}>
                +{lowStockProducts.length - 5} more
              </p>
            )}
          </div>
        )}

        {bestSellingProducts.length > 0 && (
          <div className="recommendation-card" style={{ padding: '16px', background: 'var(--card-bg, #fff)', borderRadius: '8px', border: '1px solid var(--border, #ddd)' }}>
            <h3 style={{ color: 'var(--success, #10b981)', marginBottom: '12px' }}>🏆 Best Selling Products</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {bestSellingProducts.slice(0, 5).map((item, idx) => (
                <li key={item.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border, #eee)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--accent, #e11)' }}>#{idx + 1}</span>
                    <strong>{item.product_name}</strong>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted, #666)', marginTop: '4px' }}>
                    Sales: ${parseFloat(item.total_sales || 0).toFixed(2)} | Stock: {item.current_stock}
                  </div>
                </li>
              ))}
            </ul>
            {bestSellingProducts.length > 5 && (
              <p className="muted" style={{ marginTop: '8px', fontSize: '0.875rem' }}>
                +{bestSellingProducts.length - 5} more
              </p>
            )}
          </div>
        )}
      </div>

      {recommendations && (
        <div className="ai-recommendations" style={{ marginTop: '24px', padding: '20px', background: 'var(--card-bg, #fff)', borderRadius: '8px', border: '1px solid var(--border, #ddd)' }}>
          <h3 style={{ marginBottom: '16px' }}>🤖 AI-Powered Recommendations</h3>
          <div 
            style={{ 
              whiteSpace: 'pre-wrap', 
              lineHeight: '1.6',
              color: 'var(--text, #333)'
            }}
          >
            {recommendations}
          </div>
        </div>
      )}

      {!summary && !loading && (
        <div className="muted" style={{ marginTop: '20px', padding: '16px', textAlign: 'center' }}>
          <p>No inventory data found. Please upload your inventory CSV file in the Profile page.</p>
        </div>
      )}
    </div>
  )
}

export default Recommendations

