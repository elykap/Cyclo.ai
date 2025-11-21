import { useAuth } from '../hooks/useAuth'
import Recommendations from '../components/Recommendations'

function RecommendationsPage() {
  const { user } = useAuth()
  
  return (
    <div className="section-content">
      <div className="content-card">
        <Recommendations user={user} />
      </div>
    </div>
  )
}

export default RecommendationsPage

