import { useState, useRef, useEffect } from 'react'
import ragService from '../services/ragService'

function Messaging({ user }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: 'Hello! I\'m your Watson AI assistant. How can I help you today?',
      timestamp: new Date()
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRetrievingContext, setIsRetrievingContext] = useState(false)
  const [error, setError] = useState(null)
  const [useRAG, setUseRAG] = useState(true) // Toggle for RAG vs regular chat
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSendMessage = async (e) => {
    e.preventDefault()
    
    if (!inputMessage.trim() || isLoading) {
      return
    }

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    }

    // Add user message immediately
    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)
    setError(null)

    try {
      let assistantContent = ''

      if (useRAG && user?.id) {
        // Use RAG with document context
        setIsRetrievingContext(true)
        assistantContent = await ragService.generateRAGResponse(
          userMessage.content,
          user.id,
          {
            matchThreshold: 0.3, // Lower threshold to find more matches (0.3 = 70% similarity)
            matchCount: 5,
            includeContext: true,
            systemPrompt: 'You are a helpful AI assistant for the user\'s business. Answer questions based on the provided context from the user\'s uploaded documents. Use the context to provide specific, personalized answers about their business. If the context contains relevant information, use it directly. If the context doesn\'t contain relevant information, acknowledge that you don\'t have that information in the documents but can still help with general knowledge.'
          }
        )
        setIsRetrievingContext(false)
      } else {
        // Fallback to regular chat (no RAG)
        const watsonxService = (await import('../services/watsonxServiceProxy')).default
        
        const chatMessages = messages
          .filter(msg => msg.role !== 'system')
          .map(msg => ({
            role: msg.role,
            content: msg.content
          }))
          .concat([{
            role: 'user',
            content: userMessage.content
          }])

        const response = await watsonxService.chatCompletion({
          messages: chatMessages,
          model_id: 'ibm/granite-3-8b-instruct',
          parameters: {
            max_tokens: 1000,
            temperature: 0.7
          }
        })

        if (response.results && response.results.length > 0) {
          assistantContent = response.results[0].generated_text || 
                            response.results[0].content || ''
        } else if (response.choices && response.choices.length > 0) {
          assistantContent = response.choices[0].message?.content || ''
        } else if (response.message) {
          assistantContent = response.message
        } else if (typeof response === 'string') {
          assistantContent = response
        }
      }
      
      if (!assistantContent || assistantContent.trim() === '') {
        assistantContent = 'I apologize, but I couldn\'t generate a response. Please try again.'
      }

      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (err) {
      console.error('Error calling AI:', err)
      setIsRetrievingContext(false)
      setError(err.message || 'Failed to get response. Please check your configuration.')
      
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `Error: ${err.message || 'Failed to get response. Please check your configuration.'}`,
        timestamp: new Date(),
        isError: true
      }
      
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      setIsRetrievingContext(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(e)
    }
  }

  const clearChat = () => {
    setMessages([
      {
        id: 1,
        role: 'assistant',
        content: 'Hello! I\'m your personalized assistant. How can I help you today?',
        timestamp: new Date()
      }
    ])
    setError(null)
  }

  return (
    <div className="messaging-container">
      <div className="messaging-header">
        <div className="messaging-header-content">
          <h3>Cyclo Consultant</h3>
          <p className="messaging-subtitle">
            {useRAG && user?.id 
              ? 'Ask questions and get personalized responses based on your documents' 
              : 'Voice your questions here to a personalized agent trained on your business data'}
          </p>
          {user?.id && (
            <label className="rag-toggle" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', fontSize: '0.875rem' }}>
              <input
                type="checkbox"
                checked={useRAG}
                onChange={(e) => setUseRAG(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <span>Use document context (RAG)</span>
            </label>
          )}
        </div>
        <button 
          className="clear-chat-button" 
          onClick={clearChat}
          title="Clear chat"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>

      {error && (
        <div className="messaging-error-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div className="messaging-messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.role} ${message.isError ? 'error' : ''}`}
          >
            <div className="message-avatar">
              {message.role === 'user' ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="9" y1="9" x2="15" y2="9"></line>
                  <line x1="9" y1="15" x2="15" y2="15"></line>
                </svg>
              )}
            </div>
            <div className="message-content">
              <div className="message-text">{message.content}</div>
              <div className="message-timestamp">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        
        {(isLoading || isRetrievingContext) && (
          <div className="message assistant loading">
            <div className="message-avatar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="9" y1="9" x2="15" y2="9"></line>
                <line x1="9" y1="15" x2="15" y2="15"></line>
              </svg>
            </div>
            <div className="message-content">
              <div className="message-text">
                {isRetrievingContext ? (
                  <span style={{ fontStyle: 'italic', color: 'var(--text-secondary, #666)' }}>
                    Retrieving relevant context from your documents...
                  </span>
                ) : (
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <form className="messaging-input-form" onSubmit={handleSendMessage}>
        <div className="messaging-input-container">
          <textarea
            ref={inputRef}
            className="messaging-input"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message here... (Press Enter to send, Shift+Enter for new line)"
            rows="1"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="messaging-send-button"
            disabled={!inputMessage.trim() || isLoading}
            title="Send message"
          >
            {isLoading ? (
              <svg className="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="2" x2="12" y2="6"></line>
                <line x1="12" y1="18" x2="12" y2="22"></line>
                <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                <line x1="2" y1="12" x2="6" y2="12"></line>
                <line x1="18" y1="12" x2="22" y2="12"></line>
                <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default Messaging
