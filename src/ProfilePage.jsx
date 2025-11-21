import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'

function ProfilePage({ user, onComplete, theme, toggleTheme }) {
  const navigate = useNavigate()
  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [website, setWebsite] = useState('')
  const [description, setDescription] = useState('')
  const [supportingFiles, setSupportingFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const uploadFile = async (file, path) => {
    if (!file) return null
    try {
      const { data, error } = await supabase.storage.from('uploads').upload(path, file, { upsert: true })
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
      const timestamp = Date.now()
      const uploadedUrls = []

      // Upload supporting files (if any) and collect URLs
      for (let i = 0; i < supportingFiles.length; i++) {
        const file = supportingFiles[i]
        // Ensure CSV by file extension (basic client-side check)
        if (!file.name.toLowerCase().endsWith('.csv')) {
          throw new Error('Only .CSV files are accepted for supporting files.')
        }
        const path = `users/${uid}/uploads/${timestamp}_${i}_${file.name}`
        const url = await uploadFile(file, path)
        if (url) uploadedUrls.push(url)
      }

      // Persist profile to Supabase 'profiles' table (upsert by id)
      const profileRecord = {
        id: uid,
        business_name: businessName || null,
        business_type: businessType || null,
        website: website || null,
        description: description || null,
        supporting_files: uploadedUrls.length ? uploadedUrls : null,
        profile_complete: true
      }

      const { data: upserted, error: upsertError } = await supabase.from('profiles').upsert(profileRecord)
      if (upsertError) throw upsertError

      if (onComplete) onComplete()
      navigate('/overview')
    } catch (err) {
      console.error('Error saving profile:', err)
      setError(err.message || 'There was an error saving your profile. Try again.')
    } finally {
      setLoading(false)
    }
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

            {supportingFiles.length > 0 && (
              <div className="file-list muted">
                <strong>Selected:</strong> {supportingFiles.map(f => f.name).join(', ')}
              </div>
            )}

            <small className="muted">Upload CSV export(s) from your POS or inventory system to help analysis.</small>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            <button type="submit" className="auth-submit-button" disabled={loading}>{loading ? 'Saving...' : 'Save and Continue'}</button>
          </div>
        </form>
      </main>
    </div>
  )
}

export default ProfilePage
