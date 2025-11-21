import Messaging from '../components/Messaging'
import { useAuth } from '../hooks/useAuth'

function MessagingPage() {
  const { user } = useAuth()
  
  return (
    <div className="section-content messaging-page">
      <div className="content-card messaging-card">
        <Messaging user={user} />
      </div>
    </div>
  )
}

export default MessagingPage
