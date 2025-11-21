/**
 * PDF Parser utility
 * Extracts text content from PDF files using pdf.js
 */

import * as pdfjsLib from 'pdfjs-dist'

// Set worker source for pdf.js
// Use the worker from public directory - Vite serves /public files at root
if (typeof window !== 'undefined') {
  // Force set the worker path - this must be set before any PDF operations
  // Use absolute URL to ensure it works
  try {
    const workerPath = `${window.location.origin}/pdf.worker.min.mjs`
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath
    console.log('PDF.js worker path set to:', workerPath)
  } catch (e) {
    console.warn('Failed to set worker path:', e)
    // Fallback: disable worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = ''
  }
}

/**
 * Extract text content from a PDF file
 * @param {File|Blob} pdfFile - PDF file object
 * @returns {Promise<{text: string, pageCount: number}>} Extracted text and page count
 */
export async function extractTextFromPDF(pdfFile) {
  try {
    // Ensure worker is configured before loading PDF (use absolute URL)
    if (typeof window !== 'undefined') {
      const workerPath = `${window.location.origin}/pdf.worker.min.mjs`
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath
    }
    
    // Convert file to ArrayBuffer
    const arrayBuffer = await pdfFile.arrayBuffer()
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ 
      data: arrayBuffer,
      useWorkerFetch: false // Disable worker fetch to avoid CDN issues
    })
    const pdf = await loadingTask.promise
    
    let fullText = ''
    const pageCount = pdf.numPages
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const textContent = await page.getTextContent()
      
      // Combine all text items from the page
      const pageText = textContent.items
        .map(item => item.str)
        .join(' ')
      
      fullText += `\n\n--- Page ${pageNum} ---\n\n${pageText}`
    }
    
    return {
      text: fullText.trim(),
      pageCount
    }
  } catch (error) {
    console.error('Error extracting text from PDF:', error)
    throw new Error(`Failed to extract text from PDF: ${error.message}`)
  }
}

/**
 * Chunk text into smaller pieces for embedding
 * @param {string} text - Text to chunk
 * @param {Object} options - Chunking options
 * @returns {Array<{text: string, index: number, metadata: Object}>} Array of text chunks
 */
export function chunkText(text, options = {}) {
  const {
    chunkSize = 1000, // Characters per chunk
    chunkOverlap = 200, // Overlap between chunks
    separator = '\n\n' // Separator to prefer when splitting
  } = options

  const chunks = []
  let currentIndex = 0
  let chunkIndex = 0

  // Split by paragraphs first (better semantic boundaries)
  const paragraphs = text.split(separator).filter(p => p.trim().length > 0)

  let currentChunk = ''

  for (const paragraph of paragraphs) {
    const paragraphWithSeparator = paragraph + separator

    // If adding this paragraph would exceed chunk size, save current chunk
    if (currentChunk.length + paragraphWithSeparator.length > chunkSize && currentChunk.length > 0) {
      chunks.push({
        text: currentChunk.trim(),
        index: chunkIndex++,
        metadata: {
          startChar: currentIndex - currentChunk.length,
          endChar: currentIndex
        }
      })

      // Start new chunk with overlap from previous
      const overlapText = currentChunk.slice(-chunkOverlap)
      currentChunk = overlapText + paragraphWithSeparator
    } else {
      currentChunk += paragraphWithSeparator
    }

    currentIndex += paragraphWithSeparator.length
  }

  // Add the last chunk if it exists
  if (currentChunk.trim().length > 0) {
    chunks.push({
      text: currentChunk.trim(),
      index: chunkIndex,
      metadata: {
        startChar: currentIndex - currentChunk.length,
        endChar: currentIndex
      }
    })
  }

  // If no chunks were created (text is shorter than chunkSize), return single chunk
  if (chunks.length === 0 && text.trim().length > 0) {
    chunks.push({
      text: text.trim(),
      index: 0,
      metadata: {
        startChar: 0,
        endChar: text.length
      }
    })
  }

  return chunks
}

