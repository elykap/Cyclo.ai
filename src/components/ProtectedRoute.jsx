import { Navigate } from 'react-router-dom'

function ProtectedRoute({ children, user, loading }) {
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  return children
}

export default ProtectedRoute

