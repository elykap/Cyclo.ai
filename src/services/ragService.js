/**
 * RAG (Retrieval Augmented Generation) Service
 * Handles document ingestion, embedding generation, and context retrieval for Watson AI
 */

import { supabase } from '../supabaseClient'
import watsonxService from './watsonxServiceProxy'
import { extractTextFromDocument, chunkText } from '../utils/documentParser'

class RAGService {
  /**
   * Process and ingest a document (PDF, TXT, MD, CSV)
   * @param {File} documentFile - Document file to process
   * @param {string} userId - User ID
   * @param {Object} options - Processing options
   * @returns {Promise<{documentId: number, chunksCreated: number, pageCount?: number}>}
   */
  async ingestDocument(documentFile, userId, options = {}) {
    const {
      chunkSize = 1000,
      chunkOverlap = 200
    } = options

    try {
      // Extract text from document (supports PDF, TXT, MD, CSV)
      const { text: content, pageCount } = await extractTextFromDocument(documentFile)
      
      if (!content || content.trim().length === 0) {
        throw new Error('No text content found in document')
      }

      // Upload file to Supabase storage
      const fileName = documentFile.name
      const filePath = `users/${userId}/documents/${Date.now()}_${fileName}`
      
      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(filePath, documentFile, { upsert: true })

      if (uploadError) {
        throw new Error(`Failed to upload document: ${uploadError.message}`)
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath)

      // Create document record
      const { data: document, error: docError } = await supabase
        .from('documents')
        .insert({
          user_id: userId,
          title: fileName.replace(/\.(pdf|txt|md|markdown|csv)$/i, ''),
          file_name: fileName,
          file_url: urlData?.publicUrl || null,
          content: content,
          file_size: documentFile.size,
          chunk_count: 0
        })
        .select()
        .single()

      if (docError) {
        throw new Error(`Failed to create document record: ${docError.message}`)
      }

      // Chunk the text
      const chunks = chunkText(content, { chunkSize, chunkOverlap })

      // Generate embeddings for each chunk
      const chunkTexts = chunks.map(chunk => chunk.text)
      const embeddingResponse = await watsonxService.generateEmbeddings({
        inputs: chunkTexts
        // model_id will use default/fallback in watsonxServiceProxy
      })

      // Handle different response formats
      const embeddingResults = embeddingResponse.results || embeddingResponse.data || []
      
      if (!embeddingResults || embeddingResults.length !== chunks.length) {
        console.error('Embedding response:', embeddingResponse)
        throw new Error(`Failed to generate embeddings for all chunks. Expected ${chunks.length}, got ${embeddingResults.length}`)
      }

      // Prepare chunks for insertion
      const chunksToInsert = chunks.map((chunk, index) => {
        const embedding = embeddingResults[index]?.embedding || embeddingResults[index]?.embedding_vector || null
        
        if (!embedding || !Array.isArray(embedding)) {
          console.error(`Invalid embedding for chunk ${index}:`, embeddingResults[index])
          throw new Error(`Invalid embedding format for chunk ${index}`)
        }

        // Supabase pgvector expects the embedding as an array, which it will convert
        return {
          document_id: document.id,
          user_id: userId,
          chunk_index: chunk.index,
          content: chunk.text,
          content_length: chunk.text.length,
          embedding: embedding, // Array of numbers - Supabase client handles conversion
          metadata: {
            pageCount,
            ...chunk.metadata
          }
        }
      })

      // Insert chunks in batches
      const batchSize = 50
      let insertedCount = 0

      for (let i = 0; i < chunksToInsert.length; i += batchSize) {
        const batch = chunksToInsert.slice(i, i + batchSize)
        
        // Log first batch for debugging
        if (i === 0) {
          console.log('Inserting first batch of chunks:', {
            batchSize: batch.length,
            firstChunkEmbeddingLength: batch[0]?.embedding?.length,
            firstChunkEmbeddingType: Array.isArray(batch[0]?.embedding) ? 'array' : typeof batch[0]?.embedding
          })
        }
        
        const { error: chunkError } = await supabase
          .from('document_chunks')
          .insert(batch)

        if (chunkError) {
          console.error('Error inserting chunks batch:', chunkError)
          console.error('Batch details:', {
            batchIndex: i,
            batchSize: batch.length,
            sampleChunk: batch[0] ? {
              document_id: batch[0].document_id,
              user_id: batch[0].user_id,
              content_length: batch[0].content_length,
              embedding_type: typeof batch[0].embedding,
              embedding_length: Array.isArray(batch[0].embedding) ? batch[0].embedding.length : 'N/A'
            } : null
          })
          throw new Error(`Failed to insert chunks: ${chunkError.message}. Make sure the 'document_chunks' table exists and pgvector extension is enabled.`)
        }

        insertedCount += batch.length
      }
      
      console.log(`Successfully inserted ${insertedCount} chunks for document ${document.id}`)

      // Update document with chunk count
      await supabase
        .from('documents')
        .update({ chunk_count: insertedCount })
        .eq('id', document.id)

      return {
        documentId: document.id,
        chunksCreated: insertedCount,
        pageCount
      }
    } catch (error) {
      console.error('Error ingesting document:', error)
      throw error
    }
  }

  /**
   * @deprecated Use ingestDocument instead
   * Process and ingest a PDF document (kept for backward compatibility)
   */
  async ingestPDF(pdfFile, userId, options = {}) {
    return this.ingestDocument(pdfFile, userId, options)
  }

  /**
   * Search for relevant document chunks based on query
   * @param {string} query - User query
   * @param {string} userId - User ID
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Array of relevant chunks with similarity scores
   */
  async searchRelevantChunks(query, userId, options = {}) {
    const {
      matchThreshold = 0.3, // Lower default threshold to find more matches
      matchCount = 5
    } = options

    try {
      // First, check if user has any documents
      const { data: documents, error: docError } = await supabase
        .from('documents')
        .select('id, title')
        .eq('user_id', userId)
        .limit(1)

      if (docError) {
        console.error('[RAG] Error checking documents:', docError)
      } else {
        console.log(`[RAG] User has ${documents?.length || 0} document(s)`)
        if (documents && documents.length > 0) {
          console.log(`[RAG] Sample document: ${documents[0].title}`)
        } else {
          console.warn('[RAG] No documents found for user. Please upload documents first.')
          return []
        }
      }

      // Check if user has any chunks
      const { count: chunkCount, error: chunkError } = await supabase
        .from('document_chunks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      if (chunkError) {
        console.error('[RAG] Error checking chunks:', chunkError)
      } else {
        console.log(`[RAG] User has ${chunkCount || 0} document chunks`)
        if (!chunkCount || chunkCount === 0) {
          console.warn('[RAG] No document chunks found. Documents may not have been processed yet.')
          return []
        }
      }

      // Generate embedding for the query
      // Use the same model/fallback logic as document ingestion
      // This ensures query embeddings match stored embeddings (384 dimensions)
      const embeddingResponse = await watsonxService.generateEmbeddings({
        inputs: [query]
        // model_id will use default/fallback in watsonxServiceProxy
      })

      const embeddingResults = embeddingResponse.results || embeddingResponse.data || []
      
      if (!embeddingResults || embeddingResults.length === 0) {
        throw new Error('Failed to generate query embedding')
      }

      const queryEmbedding = embeddingResults[0]?.embedding || embeddingResults[0]?.embedding_vector
      
      if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
        throw new Error('Invalid query embedding format')
      }

      // Search for similar chunks using the database function
      // Convert array to string format for PostgreSQL vector type
      const queryEmbeddingString = `[${queryEmbedding.join(',')}]`
      
      console.log(`[RAG] Searching for chunks with threshold: ${matchThreshold}, max results: ${matchCount}`)
      console.log(`[RAG] Query embedding dimension: ${queryEmbedding.length}`)
      
      const { data, error } = await supabase.rpc('search_document_chunks', {
        query_embedding: queryEmbeddingString,
        user_uuid: userId,
        match_threshold: matchThreshold,
        match_count: matchCount
      })

      if (error) {
        console.error('[RAG] Search error:', error)
        throw new Error(`Failed to search chunks: ${error.message}`)
      }

      console.log(`[RAG] Search returned ${data?.length || 0} chunks`)
      return data || []
    } catch (error) {
      console.error('Error searching relevant chunks:', error)
      throw error
    }
  }

  /**
   * Generate RAG response using Watson AI with retrieved context
   * @param {string} query - User query
   * @param {string} userId - User ID
   * @param {Object} options - RAG options
   * @returns {Promise<string>} Generated response
   */
  async generateRAGResponse(query, userId, options = {}) {
    const {
      matchThreshold = 0.7,
      matchCount = 5,
      includeContext = true,
      systemPrompt = null
    } = options

    try {
      let context = ''
      let relevantChunks = []

      // Retrieve relevant context if enabled
      if (includeContext) {
        relevantChunks = await this.searchRelevantChunks(query, userId, {
          matchThreshold,
          matchCount
        })

        if (relevantChunks.length > 0) {
          console.log(`[RAG] Found ${relevantChunks.length} relevant chunks for query: "${query}"`)
          // Build context from retrieved chunks
          context = relevantChunks
            .map((chunk, index) => {
              return `[Document ${index + 1}: ${chunk.document_title}]\n${chunk.content}`
            })
            .join('\n\n---\n\n')

          context = `\n\nRelevant context from your documents:\n\n${context}\n\n`
        } else {
          console.warn(`[RAG] No relevant chunks found for query: "${query}". Lowering threshold or checking if documents exist.`)
          // If no chunks found, still provide context that we searched but found nothing
          context = `\n\nNote: I searched through your uploaded documents but couldn't find relevant information to answer this question. I'll do my best to help based on general knowledge.\n\n`
        }
      }

      // Build the prompt
      const defaultSystemPrompt = `You are a helpful AI assistant for the user's business. Answer questions based on the provided context from the user's uploaded documents. Use the context to provide specific, personalized answers. If the context contains relevant information, use it directly. If the context doesn't contain relevant information, acknowledge that you don't have that information in the documents but can still help with general knowledge.`
      
      const messages = [
        {
          role: 'system',
          content: systemPrompt || defaultSystemPrompt
        },
        {
          role: 'user',
          content: `User question: ${query}${context}`
        }
      ]
      
      console.log(`[RAG] Generating response with ${relevantChunks.length} chunks of context`)

      // Generate response using Watson AI
      const response = await watsonxService.chatCompletion({
        messages,
        model_id: 'ibm/granite-3-8b-instruct',
        parameters: {
          max_tokens: 1000,
          temperature: 0.7
        }
      })

      // Extract response text
      let responseText = ''
      if (response.results && response.results.length > 0) {
        responseText = response.results[0].generated_text || 
                      response.results[0].content || ''
      } else if (response.choices && response.choices.length > 0) {
        responseText = response.choices[0].message?.content || ''
      } else if (response.message) {
        responseText = response.message
      } else if (typeof response === 'string') {
        responseText = response
      }

      return responseText || 'I apologize, but I couldn\'t generate a response. Please try again.'
    } catch (error) {
      console.error('Error generating RAG response:', error)
      throw error
    }
  }

  /**
   * Get all documents for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of documents
   */
  async getUserDocuments(userId) {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch documents: ${error.message}`)
    }

    return data || []
  }

  /**
   * Delete a document and all its chunks
   * @param {number} documentId - Document ID
   * @param {string} userId - User ID (for security check)
   * @returns {Promise<void>}
   */
  async deleteDocument(documentId, userId) {
    // Verify ownership
    const { data: doc, error: checkError } = await supabase
      .from('documents')
      .select('id, file_url')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single()

    if (checkError || !doc) {
      throw new Error('Document not found or access denied')
    }

    // Delete document (chunks will be cascade deleted)
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)

    if (deleteError) {
      throw new Error(`Failed to delete document: ${deleteError.message}`)
    }

    // Optionally delete file from storage
    if (doc.file_url) {
      try {
        const pathMatch = doc.file_url.match(/\/uploads\/(.+)$/)
        if (pathMatch) {
          await supabase.storage.from('uploads').remove([pathMatch[1]])
        }
      } catch (storageError) {
        console.warn('Failed to delete file from storage:', storageError)
        // Don't throw - document is already deleted from DB
      }
    }
  }
}

export default new RAGService()

