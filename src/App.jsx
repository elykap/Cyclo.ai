import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase'
import LandingPage from './LandingPage'
import Dashboard from './components/Dashboard'
import ProtectedRoute from './components/ProtectedRoute'
import Overview from './pages/Overview'
import Inventory from './pages/Inventory'
import MessagingPage from './pages/MessagingPage'
import Demographics from './pages/Demographics'
import Settings from './pages/Settings'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
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

  // Check authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

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
              <Navigate to="/overview" replace />
            ) : (
              <LandingPage 
                theme={theme} 
                toggleTheme={toggleTheme} 
                user={user} 
              />
            )
          } 
        />

        {/* Protected Dashboard Routes */}
        <Route
          element={
            <ProtectedRoute user={user} loading={loading}>
              <Dashboard user={user} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        >
          <Route path="overview" element={<Overview />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="messaging" element={<MessagingPage />} />
          <Route path="demographics" element={<Demographics />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Redirect any unknown routes */}
        <Route path="*" element={<Navigate to={user ? "/overview" : "/"} replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
