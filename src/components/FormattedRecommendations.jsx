import { useMemo } from 'react'

/**
 * Component to format AI-generated recommendations into readable, structured content
 */
function FormattedRecommendations({ content }) {
  const formattedContent = useMemo(() => {
    if (!content) return null

    // Split content into sections
    const lines = content.split('\n').filter(line => line.trim())
    const sections = []
    let currentSection = null

    lines.forEach((line, index) => {
      const trimmed = line.trim()
      
      // Detect headers (lines starting with #, **, or numbered sections)
      if (trimmed.match(/^#{1,3}\s+/) || trimmed.match(/^\*\*[^*]+\*\*$/) || trimmed.match(/^\d+\.\s+\*\*/)) {
        // Save previous section
        if (currentSection) {
          sections.push(currentSection)
        }
        
        // Start new section
        const headerText = trimmed.replace(/^#{1,3}\s+/, '').replace(/\*\*/g, '').trim()
        currentSection = {
          type: 'section',
          header: headerText,
          items: [],
          content: []
        }
      }
      // Detect list items (starting with -, *, •, or numbers)
      else if (trimmed.match(/^[-*•]\s+/) || trimmed.match(/^\d+[.)]\s+/)) {
        if (!currentSection) {
          currentSection = { type: 'section', header: null, items: [], content: [] }
        }
        
        const itemText = trimmed.replace(/^[-*•]\d+[.)]\s+/, '').trim()
        
        // Check if it's a sub-item (indented)
        if (line.startsWith('  ') || line.startsWith('\t')) {
          if (currentSection.items.length > 0) {
            const lastItem = currentSection.items[currentSection.items.length - 1]
            if (!lastItem.subItems) lastItem.subItems = []
            lastItem.subItems.push(itemText)
          }
        } else {
          currentSection.items.push({ text: itemText, subItems: [] })
        }
      }
      // Detect product/campaign headers (lines with colons or specific patterns)
      else if (trimmed.includes(':') && trimmed.length < 100 && !trimmed.includes('http')) {
        if (!currentSection) {
          currentSection = { type: 'section', header: null, items: [], content: [] }
        }
        
        const [key, value] = trimmed.split(':').map(s => s.trim())
        if (key && value) {
          currentSection.items.push({ 
            type: 'keyValue',
            key: key.replace(/\*\*/g, ''),
            value: value.replace(/\*\*/g, '')
          })
        } else {
          currentSection.content.push(trimmed)
        }
      }
      // Regular content
      else if (trimmed.length > 0) {
        if (!currentSection) {
          currentSection = { type: 'section', header: null, items: [], content: [] }
        }
        currentSection.content.push(trimmed)
      }
    })

    // Add last section
    if (currentSection) {
      sections.push(currentSection)
    }

    return sections.length > 0 ? sections : null
  }, [content])

  if (!formattedContent) {
    // Fallback to simple formatted text
    return (
      <div style={{
        padding: '1.5rem',
        background: 'var(--bg-tertiary)',
        borderRadius: '8px',
        fontSize: '0.9375rem',
        lineHeight: '1.7',
        whiteSpace: 'pre-wrap',
        color: 'var(--text-primary)'
      }}>
        {content}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {formattedContent.map((section, sectionIndex) => (
        <div
          key={sectionIndex}
          style={{
            padding: '1.5rem',
            background: 'var(--bg-tertiary)',
            borderRadius: '12px',
            border: '1px solid var(--border-primary)'
          }}
        >
          {section.header && (
            <h4 style={{
              margin: '0 0 1rem 0',
              fontSize: '1.125rem',
              fontWeight: '600',
              color: 'var(--text-primary)',
              borderBottom: '2px solid var(--border-primary)',
              paddingBottom: '0.5rem'
            }}>
              {section.header}
            </h4>
          )}

          {section.items.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {section.items.map((item, itemIndex) => {
                if (item.type === 'keyValue') {
                  return (
                    <div
                      key={itemIndex}
                      style={{
                        padding: '0.75rem',
                        background: 'var(--bg-card)',
                        borderRadius: '8px',
                        border: '1px solid var(--border-primary)'
                      }}
                    >
                      <div style={{
                        fontWeight: '600',
                        color: 'var(--text-link)',
                        marginBottom: '0.25rem',
                        fontSize: '0.9375rem'
                      }}>
                        {item.key}
                      </div>
                      <div style={{
                        color: 'var(--text-primary)',
                        fontSize: '0.9375rem',
                        lineHeight: '1.6'
                      }}>
                        {item.value}
                      </div>
                    </div>
                  )
                }

                return (
                  <div
                    key={itemIndex}
                    style={{
                      padding: '0.75rem 0.75rem 0.75rem 1.5rem',
                      position: 'relative',
                      borderLeft: '3px solid var(--bg-sidebar-active)',
                      background: 'var(--bg-card)',
                      borderRadius: '4px'
                    }}
                  >
                    <div style={{
                      color: 'var(--text-primary)',
                      fontSize: '0.9375rem',
                      lineHeight: '1.6',
                      marginBottom: item.subItems?.length > 0 ? '0.5rem' : 0
                    }}>
                      {item.text}
                    </div>
                    {item.subItems && item.subItems.length > 0 && (
                      <div style={{
                        marginTop: '0.5rem',
                        paddingLeft: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem'
                      }}>
                        {item.subItems.map((subItem, subIndex) => (
                          <div
                            key={subIndex}
                            style={{
                              fontSize: '0.875rem',
                              color: 'var(--text-secondary)',
                              lineHeight: '1.5',
                              paddingLeft: '0.75rem',
                              position: 'relative'
                            }}
                          >
                            <span style={{
                              position: 'absolute',
                              left: 0,
                              color: 'var(--text-link)'
                            }}>•</span>
                            {subItem}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {section.content.length > 0 && (
            <div style={{
              marginTop: section.items.length > 0 ? '1rem' : 0,
              paddingTop: section.items.length > 0 ? '1rem' : 0,
              borderTop: section.items.length > 0 ? '1px solid var(--border-primary)' : 'none',
              color: 'var(--text-primary)',
              fontSize: '0.9375rem',
              lineHeight: '1.7'
            }}>
              {section.content.map((paragraph, pIndex) => (
                <p key={pIndex} style={{ margin: pIndex > 0 ? '0.75rem 0 0 0' : 0 }}>
                  {paragraph}
                </p>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default FormattedRecommendations

