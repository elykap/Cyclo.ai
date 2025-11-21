import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../supabaseClient'
import { parseInventoryCSV } from '../utils/inventoryParser'
import { readCSVFile } from '../utils/csvParser'

function Inventory() {
  const { user } = useAuth()
  const [inventoryFiles, setInventoryFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [error, setError] = useState('')
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all', 'low_stock', 'best_sellers'

  useEffect(() => {
    if (user?.id) {
      loadInventory()
    }
  }, [user?.id])

  const loadInventory = async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      const { data, error: fetchError } = await supabase
        .from('inventory')
        .select('*')
        .eq('user_id', user.id)
        .order('total_sales', { ascending: false })

      if (fetchError) {
        throw new Error(`Failed to load inventory: ${fetchError.message}`)
      }

      setInventory(data || [])
    } catch (err) {
      console.error('Error loading inventory:', err)
      setError(err.message || 'Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e) => {
    e.preventDefault()
    
    if (inventoryFiles.length === 0) {
      setError('Please select at least one CSV file to upload.')
      return
    }

    if (!user?.id) {
      setError('You must be logged in to upload inventory.')
      return
    }

    setUploading(true)
    setError('')
    setUploadStatus('')
    
    let totalRowsParsed = 0

    try {
      for (let i = 0; i < inventoryFiles.length; i++) {
        const file = inventoryFiles[i]
        
        if (!file.name.toLowerCase().endsWith('.csv')) {
          throw new Error('Only .CSV files are accepted for inventory files.')
        }

        setUploadStatus(`Parsing ${file.name}...`)
        
        try {
          const csvText = await readCSVFile(file)
          const parsedRows = parseInventoryCSV(csvText, { hasHeaders: true })
          
          if (parsedRows.length > 0) {
            setUploadStatus(`Inserting ${parsedRows.length} inventory items from ${file.name}...`)
            
            // Prepare data for insertion (upsert by product_id to avoid duplicates)
            const inventoryItems = parsedRows.map(row => ({
              user_id: user.id,
              product_id: row.product_id,
              product_name: row.product_name,
              total_sales: row.total_sales || 0,
              current_stock: row.current_stock || 0,
              source_file: file.name
            }))

            // Insert/update in batches
            const batchSize = 100
            for (let j = 0; j < inventoryItems.length; j += batchSize) {
              const batch = inventoryItems.slice(j, j + batchSize)
              const { error: insertError } = await supabase
                .from('inventory')
                .upsert(batch, { onConflict: 'user_id,product_id' })
              
              if (insertError) {
                console.error(`Error inserting inventory batch from ${file.name}:`, insertError)
                throw new Error(`Failed to import inventory from ${file.name}: ${insertError.message}`)
              }
            }
            
            totalRowsParsed += parsedRows.length
            setUploadStatus(`Successfully imported ${parsedRows.length} inventory items from ${file.name}`)
          } else {
            setUploadStatus(`No valid data found in ${file.name}`)
          }
        } catch (parseError) {
          console.error(`Error parsing inventory ${file.name}:`, parseError)
          throw new Error(`Failed to parse inventory ${file.name}: ${parseError.message}`)
        }
      }
      
      setUploadStatus(`Successfully processed ${totalRowsParsed} inventory item${totalRowsParsed !== 1 ? 's' : ''}`)
      
      // Clear file selection and reload inventory
      setInventoryFiles([])
      await loadInventory()
      
      // Clear status after 3 seconds
      setTimeout(() => {
        setUploadStatus('')
      }, 3000)
    } catch (err) {
      console.error('Error uploading inventory:', err)
      setError(err.message || 'Failed to upload inventory. Please try again.')
      setUploadStatus('')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteItem = async (itemId) => {
    if (!confirm('Are you sure you want to delete this inventory item?')) {
      return
    }

    try {
      const { error: deleteError } = await supabase
        .from('inventory')
        .delete()
        .eq('id', itemId)
        .eq('user_id', user.id)

      if (deleteError) {
        throw new Error(`Failed to delete item: ${deleteError.message}`)
      }

      // Reload inventory
      await loadInventory()
    } catch (err) {
      console.error('Error deleting inventory item:', err)
      setError(err.message || 'Failed to delete inventory item')
    }
  }

  // Filter inventory based on selected filter
  const filteredInventory = inventory.filter(item => {
    if (filter === 'low_stock') {
      return (item.current_stock || 0) <= 10
    } else if (filter === 'best_sellers') {
      // Top 20% by sales
      const sorted = [...inventory].sort((a, b) => (parseFloat(b.total_sales) || 0) - (parseFloat(a.total_sales) || 0))
      const top20Percent = Math.max(1, Math.floor(sorted.length * 0.2))
      const topSales = sorted.slice(0, top20Percent).map(i => i.id)
      return topSales.includes(item.id)
    }
    return true
  })

  const totalProducts = inventory.length
  const totalSales = inventory.reduce((sum, item) => sum + (parseFloat(item.total_sales) || 0), 0)
  const lowStockCount = inventory.filter(item => (item.current_stock || 0) <= 10).length

  return (
    <div className="section-content">
      <div className="content-card">
        <div className="card-header">
          <h3>Inventory Management</h3>
        </div>

        {/* Upload Section */}
        <div style={{ marginBottom: '24px', padding: '16px', background: 'var(--card-bg, #f5f5f5)', borderRadius: '8px' }}>
          <h4 style={{ marginBottom: '12px' }}>Upload Inventory CSV</h4>
          <p className="muted" style={{ fontSize: '0.875rem', marginBottom: '12px' }}>
            Upload CSV files containing your inventory data (product_name, product_id, total_sales, current_stock).
            Existing products will be updated if they have the same product_id.
          </p>

          <form onSubmit={handleFileUpload}>
            <input
              id="inventory-upload-input"
              type="file"
              accept=".csv"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => {
                const list = e.target.files ? Array.from(e.target.files) : []
                setInventoryFiles(list)
                setError('')
              }}
              disabled={uploading}
            />

            <label htmlFor="inventory-upload-input" className="file-upload-button auth-submit-button" role="button" style={{ marginBottom: '12px', display: 'inline-block' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
              <span>Choose CSV files</span>
            </label>

            {inventoryFiles.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <strong>Selected:</strong>{' '}
                {inventoryFiles.map((f, idx) => (
                  <span key={`file-${idx}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginRight: '8px' }}>
                    {f.name}
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setInventoryFiles((prev) => prev.filter((_, i) => i !== idx))}
                      disabled={uploading}
                    >
                      Remove
                    </button>
                  </span>
                ))}
              </div>
            )}

            <button
              type="submit"
              className="auth-submit-button"
              disabled={uploading || inventoryFiles.length === 0}
              style={{ marginTop: '8px' }}
            >
              {uploading ? 'Uploading...' : 'Upload Inventory'}
            </button>

            {uploadStatus && (
              <div className="muted" style={{ marginTop: '12px', fontStyle: 'italic', fontSize: '0.875rem' }}>
                {uploadStatus}
              </div>
            )}

            {error && (
              <div style={{ marginTop: '12px', padding: '12px', background: 'var(--error-bg, #fee)', color: 'var(--error-text, #c00)', borderRadius: '4px', fontSize: '0.875rem' }}>
                {error}
              </div>
            )}
          </form>
        </div>

        {/* Summary Stats */}
        {!loading && totalProducts > 0 && (
          <div style={{ marginBottom: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={{ padding: '16px', background: 'var(--card-bg, #fff)', borderRadius: '8px', border: '1px solid var(--border, #ddd)' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted, #666)', marginBottom: '4px' }}>Total Products</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{totalProducts}</div>
            </div>
            <div style={{ padding: '16px', background: 'var(--card-bg, #fff)', borderRadius: '8px', border: '1px solid var(--border, #ddd)' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted, #666)', marginBottom: '4px' }}>Total Sales</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>${totalSales.toFixed(2)}</div>
            </div>
            <div style={{ padding: '16px', background: 'var(--card-bg, #fff)', borderRadius: '8px', border: '1px solid var(--border, #ddd)' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted, #666)', marginBottom: '4px' }}>Low Stock Items</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: lowStockCount > 0 ? 'var(--warning, #f59e0b)' : 'inherit' }}>
                {lowStockCount}
              </div>
            </div>
          </div>
        )}

        {/* Filter and Inventory List */}
        {!loading && (
          <>
            <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <label style={{ fontWeight: '500' }}>Filter:</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--border, #ddd)' }}
              >
                <option value="all">All Products</option>
                <option value="low_stock">Low Stock (≤10)</option>
                <option value="best_sellers">Best Sellers (Top 20%)</option>
              </select>
              <span className="muted" style={{ fontSize: '0.875rem' }}>
                Showing {filteredInventory.length} of {totalProducts} products
              </span>
            </div>

            {filteredInventory.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border, #ddd)' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Product ID</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Product Name</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>Total Sales</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>Current Stock</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInventory.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--border, #eee)' }}>
                        <td style={{ padding: '12px' }}>{item.product_id}</td>
                        <td style={{ padding: '12px', fontWeight: '500' }}>{item.product_name}</td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>${parseFloat(item.total_sales || 0).toFixed(2)}</td>
                        <td style={{ 
                          padding: '12px', 
                          textAlign: 'right',
                          color: (item.current_stock || 0) <= 10 ? 'var(--warning, #f59e0b)' : 'inherit',
                          fontWeight: (item.current_stock || 0) <= 10 ? '600' : 'normal'
                        }}>
                          {item.current_stock || 0}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <button
                            className="text-button"
                            onClick={() => handleDeleteItem(item.id)}
                            style={{ color: 'var(--error-text, #c00)' }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="section-placeholder">
                <p>
                  {totalProducts === 0 
                    ? 'No inventory data found. Upload a CSV file to get started.'
                    : `No products match the "${filter === 'low_stock' ? 'Low Stock' : filter === 'best_sellers' ? 'Best Sellers' : 'All'}" filter.`
                  }
                </p>
              </div>
            )}
          </>
        )}

        {loading && (
          <div className="section-placeholder">
            <p>Loading inventory...</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Inventory
