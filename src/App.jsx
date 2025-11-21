import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './LandingPage'
import ProfilePage from './ProfilePage'
import Dashboard from './components/Dashboard'
import ProtectedRoute from './components/ProtectedRoute'
import Overview from './pages/Overview'
import Inventory from './pages/Inventory'
import RecommendationsPage from './pages/RecommendationsPage'
import MessagingPage from './pages/MessagingPage'
import Trends from './pages/Trends'
import Settings from './pages/Settings'
import PredictHQTest from './pages/PredictHQTest'
import { supabase } from './supabaseClient'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileComplete, setProfileComplete] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [theme, setTheme] = useState(() => {
    // Check for saved theme preference first
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      return savedTheme
    }
    // If no saved preference, check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
    // Default to light if no system preference detected
    return 'light'
  })

  // Supabase auth: listen for auth state changes
  useEffect(() => {
    let mounted = true
    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        const session = data.session
        if (session?.user && mounted) {
          setUser(session.user)
        }
        if (!session?.user && mounted) {
          setProfileComplete(null)
        }
      } catch (err) {
        console.warn('Error getting supabase session', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    init()

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user)
      } else {
        setUser(null)
        setProfileComplete(null)
      }
    })

    return () => {
      mounted = false
      listener?.subscription?.unsubscribe?.()
    }
  }, [])

  useEffect(() => {
    let active = true
    const fetchProfileStatus = async () => {
      if (!user) {
        setProfileComplete(null)
        setProfileLoading(false)
        return
      }
      setProfileLoading(true)
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('profile_complete')
          .eq('id', user.id)
          .maybeSingle()
        if (!active) return
        if (error) {
          console.warn('Error fetching profile', error)
          setProfileComplete(null)
        } else {
          setProfileComplete(data?.profile_complete === true)
        }
      } catch (err) {
        if (active) {
          console.warn('Unexpected error fetching profile', err)
          setProfileComplete(null)
        }
      } finally {
        if (active) setProfileLoading(false)
      }
    }
    fetchProfileStatus()
    return () => {
      active = false
    }
  }, [user])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemThemeChange = (e) => {
      // Only update if user hasn't manually set a preference
      const savedTheme = localStorage.getItem('theme')
      if (!savedTheme) {
        setTheme(e.matches ? 'dark' : 'light')
      }
    }

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemThemeChange)
      return () => mediaQuery.removeEventListener('change', handleSystemThemeChange)
    } 
    // Fallback for older browsers
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleSystemThemeChange)
      return () => mediaQuery.removeListener(handleSystemThemeChange)
    }
  }, [])

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light')
  }

  // Show loading state
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Landing Page - only show if user is not logged in */}
        <Route 
          path="/" 
          element={
            user ? (
              profileLoading ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                </div>
              ) : profileComplete === false ? (
                <Navigate to="/profile" replace />
              ) : (
                <Navigate to="/overview" replace />
              )
            ) : (
              <LandingPage 
                theme={theme} 
                toggleTheme={toggleTheme} 
                user={user} 
              />
            )
          } 
        />

        {/* Public landing page (accessible even when logged in) */}
        <Route 
          path="/welcome" 
          element={
            <LandingPage 
              theme={theme} 
              toggleTheme={toggleTheme} 
              user={user} 
            />
          } 
        />

        {/* Profile Page - check if profile is complete */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute user={user} loading={loading}>
              {profileLoading ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                </div>
              ) : (
                <ProfilePage 
                  user={user} 
                  theme={theme} 
                  toggleTheme={toggleTheme}
                  onComplete={() => setProfileComplete(true)} 
                />
              )}
            </ProtectedRoute>
          }
        />

        {/* Protected Dashboard Routes */}
        <Route
          element={
            <ProtectedRoute user={user} loading={loading}>
              {profileLoading ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                </div>
              ) : profileComplete === false ? (
                <Navigate to="/profile" replace />
              ) : (
                <Dashboard user={user} theme={theme} toggleTheme={toggleTheme} />
              )}
            </ProtectedRoute>
          }
        >
          <Route path="overview" element={<Overview />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="recommendations" element={<RecommendationsPage />} />
          <Route path="messaging" element={<MessagingPage />} />
          <Route path="trends" element={<Trends />} />
          <Route path="demographics" element={<Navigate to="/trends" replace />} />
          <Route path="settings" element={<Settings />} />
          <Route path="events" element={<PredictHQTest />} />
        </Route>

        {/* Redirect any unknown routes */}
        <Route 
          path="*" 
          element={
            user ? (
              profileComplete === false ? <Navigate to="/profile" replace /> : <Navigate to="/overview" replace />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
