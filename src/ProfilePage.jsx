import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { parseCSV, readCSVFile } from './utils/csvParser'

function ProfilePage({ user, onComplete, theme, toggleTheme }) {
  const navigate = useNavigate()
  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [website, setWebsite] = useState('')
  const [description, setDescription] = useState('')
  const [supportingFiles, setSupportingFiles] = useState([])
  const [existingFiles, setExistingFiles] = useState([])
  const [originalFiles, setOriginalFiles] = useState([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [parseStatus, setParseStatus] = useState('')

  const deriveFileName = (url) => {
    try {
      const pathname = new URL(url).pathname
      const parts = pathname.split('/')
      return decodeURIComponent(parts[parts.length - 1]) || url
    } catch {
      const parts = url.split('/')
      return decodeURIComponent(parts[parts.length - 1] || url)
    }
  }

  const getStoragePathFromUrl = (url) => {
    try {
      const parsed = new URL(url)
      // Public bucket pattern: /storage/v1/object/public/uploads/<path>
      const marker = '/storage/v1/object/public/uploads/'
      const idx = parsed.pathname.indexOf(marker)
      if (idx !== -1) {
        return decodeURIComponent(parsed.pathname.slice(idx + marker.length))
      }
      // Signed URL or other patterns may have /object/sign/uploads/<path>
      const signMarker = '/storage/v1/object/sign/uploads/'
      const signIdx = parsed.pathname.indexOf(signMarker)
      if (signIdx !== -1) {
        return decodeURIComponent(parsed.pathname.slice(signIdx + signMarker.length))
      }
      // Fallback: remove leading slash from pathname
      return decodeURIComponent(parsed.pathname.replace(/^\//, ''))
    } catch {
      // Last resort, strip query and host manually
      const noQuery = url.split('?')[0]
      const parts = noQuery.split('/uploads/')
      if (parts.length > 1) {
        return decodeURIComponent(parts[1])
      }
      return null
    }
  }

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) {
        setInitialLoading(false)
        return
      }
      try {
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('business_name,business_type,website,description,supporting_files')
          .eq('id', user.id)
          .maybeSingle()

        if (fetchError) {
          console.warn('Error loading profile', fetchError)
        } else if (data) {
          setBusinessName(data.business_name || '')
          setBusinessType(data.business_type || '')
          setWebsite(data.website || '')
          setDescription(data.description || '')
          if (Array.isArray(data.supporting_files)) {
            const parsed = data.supporting_files.map((url) => ({
              url,
              name: deriveFileName(url)
            }))
            setExistingFiles(parsed)
            setOriginalFiles(parsed)
          }
        }
      } catch (err) {
        console.warn('Unexpected error loading profile', err)
      } finally {
        setInitialLoading(false)
      }
    }
    loadProfile()
  }, [user])

  const uploadFile = async (file, path) => {
    if (!file) return null
    try {
      const { error } = await supabase.storage.from('uploads').upload(path, file, { upsert: true })
      if (error) throw error
      // Get public URL (requires bucket public or will return a URL depending on settings)
      const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(path)
      return urlData?.publicUrl || null
    } catch (err) {
      console.error('Supabase upload error', err)
      throw err
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Basic required validation
    if (!businessName || businessName.trim().length === 0) {
      setError('Business name is required.')
      return
    }
    if (!businessType || businessType.trim().length === 0) {
      setError('Please select a business type.')
      return
    }

    setLoading(true)
    try {
      const uid = user?.id || user?.uid || user?.user_metadata?.sub || null
      if (!uid) throw new Error('Unable to determine user id for upload')
      const uploadedUrls = []
      let totalRowsParsed = 0

      // Process and upload supporting files (if any) and collect URLs
      for (let i = 0; i < supportingFiles.length; i++) {
        const file = supportingFiles[i]
        // Ensure CSV by file extension (basic client-side check)
        if (!file.name.toLowerCase().endsWith('.csv')) {
          throw new Error('Only .CSV files are accepted for supporting files.')
        }

        // Parse CSV and insert into database
        setParseStatus(`Parsing ${file.name}...`)
        try {
          const csvText = await readCSVFile(file)
          const parsedRows = parseCSV(csvText, { hasHeaders: true })
          
          if (parsedRows.length > 0) {
            setParseStatus(`Inserting ${parsedRows.length} transactions from ${file.name}...`)
            
            // Prepare data for insertion
            const transactions = parsedRows.map(row => ({
              user_id: uid,
              product_id: row.product_id || null,
              product_name: row.product_name || null,
              price: row.price || null,
              amount: row.amount || null,
              customer_id: row.customer_id || null,
              date: row.date || null,
              source_file: file.name
            }))

            // Insert in batches to avoid overwhelming the database
            const batchSize = 100
            for (let j = 0; j < transactions.length; j += batchSize) {
              const batch = transactions.slice(j, j + batchSize)
              const { error: insertError } = await supabase
                .from('pos_transactions')
                .insert(batch)
              
              if (insertError) {
                console.error(`Error inserting batch from ${file.name}:`, insertError)
                // Continue with other files even if one fails
                throw new Error(`Failed to import data from ${file.name}: ${insertError.message}`)
              }
            }
            
            totalRowsParsed += parsedRows.length
            setParseStatus(`Successfully imported ${parsedRows.length} transactions from ${file.name}`)
          } else {
            setParseStatus(`No valid data found in ${file.name}`)
          }
        } catch (parseError) {
          console.error(`Error parsing ${file.name}:`, parseError)
          throw new Error(`Failed to parse ${file.name}: ${parseError.message}`)
        }

        // Upload file to storage
        setParseStatus(`Uploading ${file.name}...`)
        const safeName = encodeURIComponent(file.name)
        const path = `users/${uid}/uploads/${safeName}`
        const url = await uploadFile(file, path)
        if (url) uploadedUrls.push(url)
      }

      const existingUrls = existingFiles.map((f) => f.url).filter(Boolean)
      const allFiles = [...existingUrls, ...uploadedUrls]

      const toDelete = originalFiles
        .map((f) => f.url)
        .filter((url) => !existingUrls.includes(url))
        .map((url) => getStoragePathFromUrl(url))
        .filter(Boolean)

      if (toDelete.length > 0) {
        const { error: removeError } = await supabase.storage.from('uploads').remove(toDelete)
        if (removeError) {
          console.warn('Error removing files from storage', removeError)
        }
      }

      // Persist profile to Supabase 'profiles' table (upsert by id)
      const profileRecord = {
        id: uid,
        business_name: businessName || null,
        business_type: businessType || null,
        website: website || null,
        description: description || null,
        supporting_files: allFiles.length ? allFiles : null,
        profile_complete: true
      }

      setParseStatus('Saving profile...')
      const { error: upsertError } = await supabase.from('profiles').upsert(profileRecord)
      if (upsertError) throw upsertError

      if (totalRowsParsed > 0) {
        setParseStatus(`Profile saved! Successfully imported ${totalRowsParsed} transaction${totalRowsParsed !== 1 ? 's' : ''} from CSV files.`)
      } else {
        setParseStatus('Profile saved!')
      }

      // Small delay to show success message
      await new Promise(resolve => setTimeout(resolve, 1500))

      if (onComplete) onComplete()
      navigate('/overview')
    } catch (err) {
      console.error('Error saving profile:', err)
      setError(err.message || 'There was an error saving your profile. Try again.')
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  return (
    <div className="profile-page">
      <header className="landing-header">
        <div className="landing-header-content">
          <h1 className="landing-logo">Cyclo</h1>
          <div className="landing-header-actions">
            <button className="icon-button" onClick={toggleTheme} title="Toggle theme">
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
        </div>
      </header>

      <main className="profile-form-container">
        <h2>Help us get to know you better</h2>
        <p className="muted">This information helps the agent analyze your data and provide tailored recommendations.</p>

        <form className="profile-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Business Name <span style={{color: 'var(--accent, #e11)'}}>*</span></label>
            <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g., Main Street Books" aria-required="true" />
          </div>

          <div className="form-group">
            <label>Business Type <span style={{color: 'var(--accent, #e11)'}}>*</span></label>
            <input value={businessType} onChange={(e) => setBusinessType(e.target.value)} placeholder="e.g., Independent bookstore, Coffee shop, Grocery" aria-required="true" />
            <small className="muted">Free-form text: describe your business (used to build your profile)</small>
          </div>

          <div className="form-group">
            <label>Website (optional)</label>
            <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
          </div>

          <div className="form-group">
            <label>Short description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of your business and goals"></textarea>
          </div>

          <div className="form-group">
            <label>Additional supporting files (.CSV only)</label>

            <input
              id="supporting-files-input"
              type="file"
              accept=".csv,text/csv"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => {
                const list = e.target.files ? Array.from(e.target.files) : []
                setSupportingFiles(list)
              }}
            />

            <label htmlFor="supporting-files-input" className="file-upload-button auth-submit-button" role="button">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 15a4 4 0 0 0-4-4h-1.26A4 4 0 1 0 9 17" />
                <path d="M16 16v6" />
                <path d="M12 20h8" />
              </svg>
              <span>Choose files</span>
            </label>

            {existingFiles.length > 0 && (
              <div className="file-list muted">
                <strong>Existing:</strong>{' '}
                {existingFiles.map((file, idx) => (
                  <span key={file.url} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    {file.name}
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setExistingFiles((prev) => prev.filter((f) => f.url !== file.url))}
                      aria-label={`Remove ${file.name}`}
                    >
                      Remove
                    </button>
                    {idx < existingFiles.length - 1 ? ',' : ''}
                  </span>
                ))}
              </div>
            )}

            {supportingFiles.length > 0 && (
              <div className="file-list muted">
                <strong>Selected:</strong>{' '}
                {supportingFiles.map((f, idx) => (
                  <span key={`${f.name}-${idx}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    {f.name}
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setSupportingFiles((prev) => prev.filter((_, i) => i !== idx))}
                      aria-label={`Remove ${f.name}`}
                    >
                      Remove
                    </button>
                    {idx < supportingFiles.length - 1 ? ',' : ''}
                  </span>
                ))}
              </div>
            )}

            <small className="muted">Upload CSV export(s) from your POS or inventory system to help analysis.</small>
          </div>

          {error && <div className="error-message">{error}</div>}
          {parseStatus && !error && (
            <div className="muted" style={{ marginTop: '10px', fontStyle: 'italic' }}>
              {parseStatus}
            </div>
          )}

          <div className="form-actions">
            <button type="submit" className="auth-submit-button" disabled={loading}>{loading ? 'Saving...' : 'Save and Continue'}</button>
          </div>
        </form>
      </main>
    </div>
  )
}

export default ProfilePage
