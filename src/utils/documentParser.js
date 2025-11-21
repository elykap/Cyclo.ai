/**
 * Universal Document Parser
 * Supports multiple file types: PDF, TXT, MD, CSV
 */

import { extractTextFromPDF, chunkText } from './pdfParser'

/**
 * Extract text content from various document types
 * @param {File} file - Document file
 * @returns {Promise<{text: string, pageCount?: number}>} Extracted text
 */
export async function extractTextFromDocument(file) {
  const fileName = file.name.toLowerCase()
  const fileType = fileName.split('.').pop()

  try {
    switch (fileType) {
      case 'pdf':
        return await extractTextFromPDF(file)
      
      case 'txt':
      case 'md':
      case 'markdown':
        return await extractTextFromTextFile(file)
      
      case 'csv':
        // For CSV, we'll extract it as text but note it's structured data
        return await extractTextFromTextFile(file)
      
      default:
        throw new Error(`Unsupported file type: ${fileType}. Supported types: PDF, TXT, MD, CSV`)
    }
  } catch (error) {
    console.error('Error extracting text from document:', error)
    throw error
  }
}

/**
 * Extract text from plain text files (TXT, MD, etc.)
 * @param {File} file - Text file
 * @returns {Promise<{text: string}>} Extracted text
 */
async function extractTextFromTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      const text = e.target.result
      resolve({
        text: text.trim(),
        pageCount: 1 // Text files don't have pages, but we'll use 1 for consistency
      })
    }
    
    reader.onerror = (e) => {
      reject(new Error('Failed to read text file'))
    }
    
    reader.readAsText(file)
  })
}

/**
 * Chunk text into smaller pieces for embedding (re-export from pdfParser)
 */
export { chunkText }

