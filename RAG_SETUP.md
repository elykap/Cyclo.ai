# RAG (Retrieval Augmented Generation) Setup Guide

This guide explains how to set up and use the RAG system with Watson AI and Supabase.

## Overview

The RAG system allows users to:
1. Upload PDF documents
2. Automatically extract and chunk text content
3. Generate embeddings using Watson AI
4. Store embeddings in Supabase with pgvector
5. Query documents using semantic search
6. Get personalized AI responses based on document context

## Prerequisites

1. **Supabase Project** with:
   - pgvector extension enabled
   - Storage bucket for PDF files
   - Database access configured

2. **Watson AI Credentials**:
   - API Key
   - Project ID
   - Access to embedding models (see supported models below)

## Setup Steps

### 1. Enable pgvector Extension

In your Supabase dashboard, go to SQL Editor and run:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2. Run Database Migrations

Execute the migration files in Supabase SQL Editor in order:

1. **First migration** - Creates the base schema:
   ```bash
   # File: supabase/migrations/002_create_documents_vector_store.sql
   ```

2. **Second migration** - Updates to support 384-dimension embeddings:
   ```bash
   # File: supabase/migrations/003_update_embeddings_variable_dimensions.sql
   ```
   **Note**: This migration changes the embedding dimension from 768 to 384 to support models like `slate-30m` and `all-minilm-l6-v2`. If you have existing embeddings, they will need to be regenerated.

This creates:
- `documents` table - stores PDF metadata
- `document_chunks` table - stores text chunks with embeddings (384 dimensions)
- Vector similarity search function
- Row Level Security policies

### 3. Configure Storage Bucket

Ensure you have an `uploads` bucket in Supabase Storage:
- Go to Storage → Create bucket (if needed)
- Set bucket to public or configure RLS policies
- Allow PDF file uploads

### 4. Environment Variables

Make sure your `.env` file has:

```env
VITE_WATSONX_API_KEY=your_api_key
VITE_WATSONX_PROJECT_ID=your_project_id
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Usage

### Uploading Documents

1. Navigate to the Documents page (or add it to your navigation)
2. Click "Upload PDF"
3. Select a PDF file (max 50MB)
4. The system will:
   - Extract text from the PDF
   - Chunk the text into manageable pieces
   - Generate embeddings for each chunk
   - Store everything in the database

### Using RAG in Chat

1. Go to the Messaging page
2. Toggle "Use document context (RAG)" if available
3. Ask questions - the AI will:
   - Search your documents for relevant context
   - Use that context to generate personalized responses

## Architecture

```
User Query
    ↓
Generate Query Embedding (Watson AI)
    ↓
Vector Similarity Search (Supabase pgvector)
    ↓
Retrieve Top-K Relevant Chunks
    ↓
Build Context from Chunks
    ↓
Send Query + Context to Watson AI
    ↓
Return Personalized Response
```

## Components

### `ragService.js`
Main service handling:
- PDF ingestion (`ingestPDF`)
- Document search (`searchRelevantChunks`)
- RAG response generation (`generateRAGResponse`)

### `pdfParser.js`
PDF text extraction and chunking utilities

### `Documents.jsx`
UI component for managing uploaded documents

### `Messaging.jsx`
Updated chat component with RAG support

## Database Schema

### documents
- `id` - Primary key
- `user_id` - Owner
- `title` - Document title
- `file_name` - Original filename
- `file_url` - Storage URL
- `content` - Full extracted text
- `chunk_count` - Number of chunks
- `file_size` - File size in bytes

### document_chunks
- `id` - Primary key
- `document_id` - Foreign key to documents
- `user_id` - Owner
- `chunk_index` - Order in document
- `content` - Text chunk
- `embedding` - Vector embedding (384 dimensions - matches slate-30m and all-minilm-l6-v2 models)
- `metadata` - Additional info (JSONB)

## Troubleshooting

### Embeddings not generating
- Check Watson AI API key and project ID
- Verify embedding models are enabled in your Watson AI project
- Supported models (will auto-fallback if one isn't available):
  - `ibm/slate-30m-english-rtrvr` (384 dimensions - faster, **currently configured**)
  - `sentence-transformers/all-minilm-l6-v2` (384 dimensions - **currently configured**)
  - `ibm/slate-125m-english-rtrvr` (768 dimensions - better performance, requires schema change)
  - `intfloat/multilingual-e5-large` (1024 dimensions - multilingual, requires schema change)
- **Note**: The database schema is configured for **384 dimensions** to support the most commonly available models. If you want to use 768 or 1024 dimension models, you'll need to update the migration file and regenerate embeddings.
- Check API quotas/limits
- You can set a specific model via `VITE_WATSONX_EMBEDDING_MODEL` in your `.env` file

### Vector search not working
- Ensure pgvector extension is enabled
- Verify embeddings are stored correctly (check `document_chunks.embedding`)
- Check RLS policies allow access

### PDF parsing fails
- Verify PDF is not corrupted
- Check file size limits
- Ensure pdf.js worker is loading correctly

## Performance Tips

1. **Chunk Size**: Adjust `chunkSize` (default 1000 chars) based on your documents
2. **Overlap**: Increase `chunkOverlap` (default 200) for better context continuity
3. **Match Count**: Adjust `matchCount` (default 5) for more/less context
4. **Match Threshold**: Lower `matchThreshold` (default 0.7) for more results

## Future Enhancements

- Support for other file types (DOCX, TXT, etc.)
- Document versioning
- Batch upload
- Document preview
- Advanced search filters
- Citation tracking in responses

